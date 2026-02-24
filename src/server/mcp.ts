import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SERVER_CONFIG, RESOURCE_URIS } from "../types.js";
import { getGraphInstance, ThoughtGraph } from "../graph/index.js";

/**
 * Trigger autonomous LLM audit via MCP Sampling.
 */
async function triggerAutonomousAudit(
    server: McpServer,
    node: { id: string; thought: string; score: number },
    graph: ThoughtGraph
): Promise<string> {
    const auditPrompt = `Please audit this thought node:
Thought: "${node.thought}"
Current Score: ${node.score}
Context Graph: ${JSON.stringify(graph.getSimpleGraph())}

Provide a JSON response with:
- score: number (0.0 to 1.0)
- status: "validated" | "rejected" | "branching"
- critique: string`;

    try {
        const auditResult = await server.server.request(
            {
                method: "sampling/createMessage",
                params: {
                    messages: [
                        {
                            role: "user",
                            content: { type: "text", text: auditPrompt },
                        },
                    ],
                    maxTokens: 500,
                },
            },
            z.any()
        ) as { content?: { type: string; text: string } };

        let auditResponse = "Audit completed";
        if (auditResult?.content?.type === "text") {
            auditResponse = auditResult.content.text;
        }

        graph.updateNode(node.id, {
            metadata: {
                auditResponse,
                auditTime: new Date().toISOString(),
                auditTriggered: true,
            },
        });

        return `Autonomous audit triggered for ${node.id}. Result logged in metadata.`;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Autonomous audit failed: ${message}. Host may not support sampling.`);
    }
}

/**
 * Creates and configures the MCP Server instance with modern tool/resource registration.
 */
export function createServerInstance(): McpServer {
    const server = new McpServer({
        name: SERVER_CONFIG.name,
        version: SERVER_CONFIG.version,
    });

    const graph = getGraphInstance();

    // 1. Register Resources
    server.resource(
        "Current Thought Graph",
        RESOURCE_URIS.currentGraph,
        async (uri: URL) => ({
            contents: [{
                uri: uri.href,
                text: JSON.stringify(graph.getGraph(), null, 2),
                mimeType: "application/json"
            }]
        })
    );

    // Helper to notify clients of updates
    const notifyUpdate = () => {
        // @ts-ignore - The MCP SDK expects a stricter Notification type intersection
        server.server.notification({ method: "notifications/resources/updated", params: { uri: RESOURCE_URIS.currentGraph } });
    };

    // 2. Register Tools

    server.tool(
        "propose_thought",
        "Propose a new unit of reasoning (node) in the thought graph.",
        {
            thought: z.string().min(1, "Thought content is required").max(5000, "Thought exceeds 5000 chars").describe("The content of the thought"),
            parentId: z.string().optional().describe("Optional parent node ID if this thought builds on a previous one"),
            relation: z.enum(["refinement", "contradiction", "support", "branch"])
                .default("refinement")
                .describe("How this thought relates to its parent"),
        },
        async ({ thought, parentId, relation }: { thought: string; parentId?: string; relation?: "refinement" | "contradiction" | "support" | "branch" }) => {
            try {
                const nodeId = graph.addNode(thought);

                if (parentId) {
                    if (!graph.hasNode(parentId)) {
                        return { content: [{ type: "text", text: `Error: Parent node '${parentId}' not found` }], isError: true };
                    }
                    graph.addEdge(parentId, nodeId, relation || "refinement");
                }

                notifyUpdate();
                return {
                    content: [{ type: "text", text: `Thought added with ID: ${nodeId}` }],
                    structuredContent: { nodeId, thought, relation, parentId }
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.tool(
        "evaluate_thought",
        "Assign a score or status to a thought node. If score is omitted, triggers autonomous LLM audit via sampling.",
        {
            nodeId: z.string().min(1, "Node ID is required").describe("The ID of the node to evaluate"),
            score: z.number().min(0).max(1).optional().describe("Omit to trigger autonomous LLM audit (0.0 to 1.0)"),
            status: z.enum(["active", "validated", "rejected", "branching"]).optional().describe("Update the node status"),
            critique: z.string().max(2000, "Critique exceeds 2000 chars").optional().describe("Reasoning for the evaluation"),
        },
        async ({ nodeId, score, status, critique }: { nodeId: string; score?: number; status?: "active" | "validated" | "rejected" | "branching"; critique?: string }) => {
            try {
                const node = graph.getNode(nodeId);
                if (!node) {
                    return { content: [{ type: "text", text: `Error: Node '${nodeId}' not found` }], isError: true };
                }

                if (score === undefined) {
                    const auditResult = await triggerAutonomousAudit(server, node, graph);
                    notifyUpdate();
                    return {
                        content: [{ type: "text", text: auditResult }],
                        structuredContent: { nodeId, audited: true, message: auditResult }
                    };
                }

                graph.updateNode(nodeId, {
                    score,
                    status: status ?? node.status,
                    metadata: critique ? { critique } : undefined,
                });

                notifyUpdate();
                return {
                    content: [{ type: "text", text: `Node ${nodeId} updated. Score: ${score}, Status: ${status ?? node.status}` }],
                    structuredContent: { nodeId, score, status: status ?? node.status }
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.tool(
        "get_thought_graph",
        "Retrieve the entire current thought graph.",
        {},
        async () => {
            const graphState = graph.getGraph();
            return {
                content: [{ type: "text", text: JSON.stringify(graphState, null, 2) }],
                structuredContent: graphState as unknown as Record<string, unknown>
            };
        }
    );

    server.tool(
        "reset_graph",
        "Clear the current reasoning session, emptying all nodes and edges.",
        {},
        async () => {
            graph.clear();
            notifyUpdate();
            return {
                content: [{ type: "text", text: "Thought graph cleared." }],
                structuredContent: { cleared: true }
            };
        }
    );

    // 3. GoT Primitives — Aggregate, Prune, Converge

    server.tool(
        "aggregate_thoughts",
        "GoT Primitive: Merge 2+ thought nodes into a weighted synthesis. Uses formula: Σ(score×weight)/Σ(weights). Retains full provenance and computes aggregation confidence (1 - stddev).",
        {
            nodeIds: z.array(z.string()).min(2, "At least 2 node IDs required").describe("Array of node IDs to merge"),
            synthesis: z.string().min(1, "Synthesis content is required").describe("The merged conclusion that combines insights from all source nodes"),
            weights: z.array(z.number().min(0).max(1)).optional().describe("Optional per-node weights (defaults to each node's score as its confidence weight)"),
        },
        async ({ nodeIds, synthesis, weights }: { nodeIds: string[]; synthesis: string; weights?: number[] }) => {
            try {
                const newId = graph.aggregateNodes(nodeIds, synthesis, weights);
                const newNode = graph.getNode(newId);
                const metadata = newNode?.metadata as Record<string, unknown> | undefined;

                notifyUpdate();
                return {
                    content: [{ type: "text", text: `Aggregated ${nodeIds.length} nodes into ${newId}. Weighted score: ${newNode?.score ?? 0}, Confidence: ${metadata?.confidence ?? "N/A"}` }],
                    structuredContent: {
                        newNodeId: newId,
                        aggregatedFrom: nodeIds,
                        weightedScore: newNode?.score ?? 0,
                        confidence: metadata?.confidence ?? null,
                        formula: "Σ(score×weight)/Σ(weights)",
                        synthesis,
                    }
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.tool(
        "prune_branch",
        "GoT Primitive: Recursively reject a node and ALL its descendants. Modes: 'hard' (score=0, status=rejected) or 'soft' (score decayed by factor, status preserved). Tracks trigger origin and original scores.",
        {
            nodeId: z.string().min(1, "Node ID is required").describe("The root node of the branch to prune"),
            reason: z.string().optional().describe("Why this branch is being pruned"),
            mode: z.enum(["hard", "soft"]).default("hard").describe("'hard' zeroes scores and rejects; 'soft' decays scores while preserving status"),
            decayFactor: z.number().min(0).max(1).default(0.5).describe("Score multiplier for soft prune (0.5 = halve scores)"),
            trigger: z.enum(["manual", "auto"]).default("manual").describe("Whether this prune was triggered manually or by an auto-threshold"),
        },
        async ({ nodeId, reason, mode, decayFactor, trigger }: { nodeId: string; reason?: string; mode?: "hard" | "soft"; decayFactor?: number; trigger?: "manual" | "auto" }) => {
            try {
                const result = graph.pruneFromNode(nodeId, reason, { mode, decayFactor, trigger });

                notifyUpdate();
                return {
                    content: [{ type: "text", text: `${result.mode === "hard" ? "Hard" : "Soft"} pruned ${result.pruned.length} nodes: ${result.pruned.join(", ")}` }],
                    structuredContent: {
                        prunedCount: result.pruned.length,
                        prunedIds: result.pruned,
                        mode: result.mode,
                        reason: reason || "No reason provided",
                        trigger: trigger || "manual",
                    }
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.tool(
        "find_winning_path",
        "GoT Primitive: Trace the best scoring path(s) from root to leaf. Default: greedy (beamWidth=1). Set beamWidth>1 for k-best beam search. Supports score threshold gating and path length caps.",
        {
            beamWidth: z.number().int().min(1).max(10).default(1).describe("Number of top paths to track (1=greedy DFS, >1=beam search)"),
            scoreThreshold: z.number().min(0).max(1).default(0).describe("Minimum node score to include in path (filters low-confidence nodes)"),
            maxPathLength: z.number().int().min(1).default(50).describe("Maximum path depth to prevent runaway traversal"),
        },
        async ({ beamWidth, scoreThreshold, maxPathLength }: { beamWidth?: number; scoreThreshold?: number; maxPathLength?: number }) => {
            try {
                const result = graph.findWinningPath({ beamWidth, scoreThreshold, maxPathLength });

                if (result.path.length === 0) {
                    return {
                        content: [{ type: "text", text: "No winning path found. The graph may be empty, all branches rejected, or no nodes meet the score threshold." }],
                        structuredContent: { path: [], totalScore: 0 }
                    };
                }

                // Format the path for readability
                const pathSummary = result.path
                    .map((n, i) => `${i + 1}. [${n.id}] (${n.status}, ${Math.round(n.score * 100)}%) → "${n.thought.substring(0, 80)}${n.thought.length > 80 ? '...' : ''}"`)
                    .join("\n");

                const beamInfo = (beamWidth ?? 1) > 1 && result.allPaths
                    ? `\n\nAlternative paths (${result.allPaths.length} total):\n${result.allPaths.slice(1).map((p, i) => `  ${i + 2}. ${p.pathIds.join(" → ")} (score: ${p.totalScore})`).join("\n")}`
                    : "";

                return {
                    content: [{ type: "text", text: `Winning path (${result.path.length} nodes, total score: ${result.totalScore}):\n\n${pathSummary}${beamInfo}` }],
                    structuredContent: {
                        pathIds: result.pathIds,
                        totalScore: result.totalScore,
                        pathLength: result.path.length,
                        path: result.path,
                        allPaths: result.allPaths ?? null,
                        beamWidth: beamWidth ?? 1,
                    }
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    // 4. Observability — Graph Metrics

    server.tool(
        "get_graph_metrics",
        "Returns structured observability metrics: node count, edge count, max depth, avg score, prune ratio, status breakdown, and root count. Use this to monitor graph health.",
        {},
        async () => {
            try {
                const metrics = graph.getMetrics();
                const limits = graph.getLimits();

                const summary = [
                    `Nodes: ${metrics.nodeCount}/${limits.maxNodes}`,
                    `Edges: ${metrics.edgeCount}`,
                    `Max Depth: ${metrics.maxDepth}/${limits.maxDepth}`,
                    `Avg Score: ${metrics.avgScore}`,
                    `Prune Ratio: ${Math.round(metrics.pruneRatio * 100)}%`,
                    `Active: ${metrics.activeCount} | Validated: ${metrics.validatedCount} | Rejected: ${metrics.rejectedCount}`,
                    `Roots: ${metrics.rootCount}`,
                ].join("\n");

                return {
                    content: [{ type: "text", text: `Graph Metrics:\n${summary}` }],
                    structuredContent: { metrics, limits },
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );
    // 5. Replay — Snapshot Export/Restore

    server.tool(
        "export_snapshot",
        "Export a full snapshot of the current graph state for replay, recovery, or debugging. Returns all nodes, edges, and counter as a serializable JSON object.",
        {},
        async () => {
            try {
                const snapshot = graph.exportSnapshot();
                return {
                    content: [{ type: "text", text: `Snapshot exported: ${snapshot.nodes.length} nodes, ${snapshot.edges.length} edges at ${snapshot.timestamp}` }],
                    structuredContent: snapshot,
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.tool(
        "restore_snapshot",
        "Restore graph state from a previously exported snapshot. Replaces ALL current state. Use for deterministic replay or recovery.",
        {
            snapshot: z.object({
                nodes: z.array(z.object({
                    id: z.string(),
                    thought: z.string(),
                    status: z.enum(["active", "validated", "rejected", "branching"]),
                    score: z.number(),
                    metadata: z.record(z.any()).optional(),
                    createdAt: z.string(),
                    updatedAt: z.string()
                })).describe("Array of ThoughtNode objects"),
                edges: z.array(z.object({
                    from: z.string(),
                    to: z.string(),
                    relation: z.enum(["refinement", "contradiction", "support", "branch", "aggregation"]),
                    createdAt: z.string()
                })).describe("Array of ThoughtEdge objects"),
                nodeCounter: z.number().int().min(0).describe("The node counter value from the snapshot"),
            }).describe("A snapshot object previously returned by export_snapshot"),
        },
        async ({ snapshot }: { snapshot: { nodes: any[]; edges: any[]; nodeCounter: number } }) => {
            try {
                const beforeCount = graph.size;
                graph.restoreSnapshot(snapshot);

                notifyUpdate();
                return {
                    content: [{ type: "text", text: `Snapshot restored: ${beforeCount} → ${graph.size} nodes, ${graph.edgeCount} edges` }],
                    structuredContent: {
                        restoredNodes: graph.size,
                        restoredEdges: graph.edgeCount,
                        previousNodes: beforeCount,
                    },
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    return server;
}
