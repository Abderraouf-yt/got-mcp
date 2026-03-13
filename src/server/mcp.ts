import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SERVER_CONFIG, RESOURCE_URIS } from "../types.js";
import type { ConfidenceVector } from "../types.js";
import { getGraphInstance, ThoughtGraph } from "../graph/index.js";
import { getContextInstance } from "../context/index.js";

/**
 * Trigger autonomous LLM audit via MCP Sampling.
 */
async function triggerAutonomousAudit(
    server: McpServer,
    node: { id: string; thought: string; score: number },
    graph: ThoughtGraph
): Promise<string> {
    const clientCaps = server.server.getClientCapabilities();
    if (!clientCaps?.sampling) {
        throw new Error("The connected client (e.g., Claude Desktop) does not support LLM sampling. Autonomous audit is disabled. Please provide a manual 'score' to evaluate_thought.");
    }

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
        throw new Error(`Autonomous audit failed: ${message}`);
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
    const contextStore = getContextInstance();

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

    // v4.0: Shared Context Store resource (CA-MCP pattern)
    server.resource(
        "Shared Context Store",
        RESOURCE_URIS.contextStore,
        async (uri: URL) => ({
            contents: [{
                uri: uri.href,
                text: JSON.stringify(contextStore.getAll(), null, 2),
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

    server.registerTool(
        "propose_thought",
        {
            description: "Propose a new unit of reasoning (node) in the thought graph.",
            inputSchema: {
                thought: z.string().min(1, "Thought content is required").max(5000, "Thought exceeds 5000 chars").describe("The content of the thought"),
                parentId: z.string().optional().describe("Optional parent node ID if this thought builds on a previous one"),
                relation: z.enum(["refinement", "contradiction", "support", "branch"])
                    .default("refinement")
                    .describe("How this thought relates to its parent"),
                authorId: z.string().optional().describe("Which sub-agent proposed the thought"),
                agentTarget: z.string().optional().describe("Which specialized agent persona the thought is routed to"),
                executionState: z.enum(["queued", "processing", "done"]).optional().describe("To track swarm fulfillment independently of the logical status"),
                dependencies: z.array(z.string()).optional().describe("Optional explicit node dependencies beyond standard edges"),
            },
            annotations: { destructiveHint: true }
        },
        async ({ thought, parentId, relation, authorId, agentTarget, executionState, dependencies }: { thought: string; parentId?: string; relation?: "refinement" | "contradiction" | "support" | "branch"; authorId?: string; agentTarget?: string; executionState?: "queued" | "processing" | "done"; dependencies?: string[] }) => {
            try {
                const nodeId = await graph.addNode(thought);

                if (authorId || agentTarget || executionState || dependencies) {
                    await graph.updateNode(nodeId, {
                        authorId,
                        agentTarget,
                        executionState,
                        dependencies
                    });
                }

                if (parentId) {
                    if (!graph.hasNode(parentId)) {
                        return { content: [{ type: "text", text: `Error: Parent node '${parentId}' not found` }], isError: true };
                    }
                    await graph.addEdge(parentId, nodeId, relation || "refinement");
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

    server.registerTool(
        "evaluate_thought",
        {
            description: "Assign a score or status to a thought node. If score is omitted, triggers autonomous LLM audit via sampling.",
            inputSchema: {
                nodeId: z.string().min(1, "Node ID is required").describe("The ID of the node to evaluate"),
                score: z.number().min(0).max(1).optional().describe("Omit to trigger autonomous LLM audit (0.0 to 1.0)"),
                status: z.enum(["active", "validated", "rejected", "branching"]).optional().describe("Update the node status"),
                critique: z.string().max(2000, "Critique exceeds 2000 chars").optional().describe("Reasoning for the evaluation"),
                confidence: z.object({
                    factual: z.number().min(0).max(1).describe("Grounded in verifiable facts"),
                    logical: z.number().min(0).max(1).describe("Reasoning chain is valid"),
                    relevance: z.number().min(0).max(1).describe("Addresses the problem directly"),
                    novelty: z.number().min(0).max(1).describe("Adds new information"),
                }).optional().describe("v4.0: Multi-dimensional confidence — if provided, composite score is auto-computed"),
                authorId: z.string().optional().describe("Which sub-agent explicitly evaluated this thought"),
                agentTarget: z.string().optional().describe("Re-route to another specialized agent persona"),
                executionState: z.enum(["queued", "processing", "done"]).optional().describe("Update swarm fulfillment state"),
                dependencies: z.array(z.string()).optional().describe("Update explicit node dependencies"),
            },
            annotations: { destructiveHint: true }
        },
        async ({ nodeId, score, status, critique, confidence, authorId, agentTarget, executionState, dependencies }: { nodeId: string; score?: number; status?: "active" | "validated" | "rejected" | "branching"; critique?: string; confidence?: ConfidenceVector; authorId?: string; agentTarget?: string; executionState?: "queued" | "processing" | "done"; dependencies?: string[] }) => {
            try {
                const node = graph.getNode(nodeId);
                if (!node) {
                    return { content: [{ type: "text", text: `Error: Node '${nodeId}' not found` }], isError: true };
                }

                // v4.0: if confidence provided, compute composite score automatically
                const finalScore = confidence
                    ? graph.computeCompositeScore(confidence)
                    : score;

                if (finalScore === undefined) {
                    const auditResult = await triggerAutonomousAudit(server, node, graph);
                    notifyUpdate();
                    return {
                        content: [{ type: "text", text: auditResult }],
                        structuredContent: { nodeId, audited: true, message: auditResult }
                    };
                }

                await graph.updateNode(nodeId, {
                    score: finalScore,
                    confidence,
                    status: status ?? node.status,
                    authorId: authorId ?? node.authorId,
                    agentTarget: agentTarget ?? node.agentTarget,
                    executionState: executionState ?? node.executionState,
                    dependencies: dependencies ?? node.dependencies,
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

    server.registerTool(
        "get_thought_graph",
        {
            description: "Retrieve the entire current thought graph.",
            inputSchema: {},
            annotations: { readOnlyHint: true }
        },
        async () => {
            const graphState = graph.getGraph();
            return {
                content: [{ type: "text", text: JSON.stringify(graphState, null, 2) }],
                structuredContent: graphState as unknown as Record<string, unknown>
            };
        }
    );

    server.registerTool(
        "reset_graph",
        {
            description: "Clear the current reasoning session, emptying all nodes and edges.",
            inputSchema: {},
            annotations: { destructiveHint: true }
        },
        async () => {
            await graph.clear();
            notifyUpdate();
            return {
                content: [{ type: "text", text: "Thought graph cleared." }],
                structuredContent: { cleared: true }
            };
        }
    );

    // 3. GoT Primitives — Aggregate, Prune, Converge

    server.registerTool(
        "aggregate_thoughts",
        {
            description: "GoT Primitive: Merge 2+ thought nodes into a weighted synthesis. Uses formula: Σ(score×weight)/Σ(weights). Retains full provenance and computes aggregation confidence (1 - stddev).",
            inputSchema: {
                nodeIds: z.array(z.string()).min(2, "At least 2 node IDs required").describe("Array of node IDs to merge"),
                synthesis: z.string().min(1, "Synthesis content is required").describe("The merged conclusion that combines insights from all source nodes"),
                weights: z.array(z.number().min(0).max(1)).optional().describe("Optional per-node weights (defaults to each node's score as its confidence weight)"),
            },
            annotations: { destructiveHint: true }
        },
        async ({ nodeIds, synthesis, weights }: { nodeIds: string[]; synthesis: string; weights?: number[] }) => {
            try {
                const newId = await graph.aggregateNodes(nodeIds, synthesis, weights);
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

    server.registerTool(
        "prune_branch",
        {
            description: "GoT Primitive: Recursively reject a node and ALL its descendants. Modes: 'hard' (score=0, status=rejected) or 'soft' (score decayed by factor, status preserved). Tracks trigger origin and original scores.",
            inputSchema: {
                nodeId: z.string().min(1, "Node ID is required").describe("The root node of the branch to prune"),
                reason: z.string().optional().describe("Why this branch is being pruned"),
                mode: z.enum(["hard", "soft"]).default("hard").describe("'hard' zeroes scores and rejects; 'soft' decays scores while preserving status"),
                decayFactor: z.number().min(0).max(1).default(0.5).describe("Score multiplier for soft prune (0.5 = halve scores)"),
                trigger: z.enum(["manual", "auto"]).default("manual").describe("Whether this prune was triggered manually or by an auto-threshold"),
            },
            annotations: { destructiveHint: true }
        },
        async ({ nodeId, reason, mode, decayFactor, trigger }: { nodeId: string; reason?: string; mode?: "hard" | "soft"; decayFactor?: number; trigger?: "manual" | "auto" }) => {
            try {
                const result = await graph.pruneFromNode(nodeId, reason, { mode, decayFactor, trigger });

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

    server.registerTool(
        "find_winning_path",
        {
            description: "GoT Primitive: Trace the best scoring path(s) from root to leaf. Default: greedy (beamWidth=1). Set beamWidth>1 for k-best beam search. Supports score threshold gating and path length caps.",
            inputSchema: {
                beamWidth: z.number().int().min(1).max(10).default(1).describe("Number of top paths to track (1=greedy DFS, >1=beam search)"),
                scoreThreshold: z.number().min(0).max(1).default(0).describe("Minimum node score to include in path (filters low-confidence nodes)"),
                maxPathLength: z.number().int().min(1).default(50).describe("Maximum path depth to prevent runaway traversal"),
            },
            annotations: { readOnlyHint: true }
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

    server.registerTool(
        "get_graph_metrics",
        {
            description: "Returns structured observability metrics: node count, edge count, max depth, avg score, prune ratio, status breakdown, and root count. Use this to monitor graph health.",
            inputSchema: {},
            annotations: { readOnlyHint: true }
        },
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

    server.registerTool(
        "export_snapshot",
        {
            description: "Export a full snapshot of the current graph state for replay, recovery, or debugging. Returns all nodes, edges, and counter as a serializable JSON object.",
            inputSchema: {},
            annotations: { readOnlyHint: true }
        },
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

    server.registerTool(
        "restore_snapshot",
        {
            description: "Restore graph state from a previously exported snapshot. Replaces ALL current state. Use for deterministic replay or recovery.",
            inputSchema: {
                snapshot: z.object({
                    nodes: z.array(z.object({
                        id: z.string(),
                        thought: z.string(),
                        status: z.enum(["active", "validated", "rejected", "branching"]),
                        score: z.number(),
                        metadata: z.record(z.string(), z.any()).optional(),
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
            annotations: { destructiveHint: true }
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

    // ==========================================
    // v4.0: Self-Reflection Tool (2026 pattern)
    // ==========================================

    server.registerTool(
        "reflect_and_refine",
        {
            description: "Self-reflection loop: auto-critique a thought, assess confidence on 4 axes (factual, logical, relevance, novelty), and optionally branch a refined version. Implements DeepSeek-R1 self-verification pattern.",
            inputSchema: {
                nodeId: z.string().min(1).describe("Node to reflect on"),
                critique: z.string().min(1).max(5000).describe("Your critique of this thought"),
                confidence: z.object({
                    factual: z.number().min(0).max(1).describe("Grounded in verifiable facts (0-1)"),
                    logical: z.number().min(0).max(1).describe("Reasoning chain is valid (0-1)"),
                    relevance: z.number().min(0).max(1).describe("Addresses the problem directly (0-1)"),
                    novelty: z.number().min(0).max(1).describe("Adds new information vs restating (0-1)"),
                }).describe("Multi-dimensional confidence assessment"),
                refinedThought: z.string().max(5000).optional()
                    .describe("If critique reveals a flaw, provide the improved version to auto-branch"),
                authorId: z.string().optional().describe("Which sub-agent explicitly evaluated this thought"),
                agentTarget: z.string().optional().describe("Re-route to another specialized agent persona"),
                executionState: z.enum(["queued", "processing", "done"]).optional().describe("Update swarm fulfillment state"),
                dependencies: z.array(z.string()).optional().describe("Update explicit node dependencies"),
            },
            annotations: { destructiveHint: true }
        },
        async ({ nodeId, critique, confidence, refinedThought, authorId, agentTarget, executionState, dependencies }: { nodeId: string; critique: string; confidence: ConfidenceVector; refinedThought?: string; authorId?: string; agentTarget?: string; executionState?: "queued" | "processing" | "done"; dependencies?: string[] }) => {
            try {
                const result = await graph.reflectAndRefine(nodeId, critique, confidence, refinedThought);

                if (authorId || agentTarget || executionState || dependencies) {
                    await graph.updateNode(nodeId, {
                        authorId, agentTarget, executionState, dependencies
                    });
                    if (result.branchId) {
                        await graph.updateNode(result.branchId, {
                            authorId, agentTarget, executionState: "queued", dependencies
                        });
                    }
                }

                notifyUpdate();
                const parts = [
                    `Reflection on ${nodeId}: composite score ${result.compositeScore}`,
                    `Critique node: ${result.critiqueId}`,
                ];
                if (result.branchId) {
                    parts.push(`Refined branch: ${result.branchId} (auto-branched because score < 0.7)`);
                }

                return {
                    content: [{ type: "text", text: parts.join("\n") }],
                    structuredContent: {
                        nodeId,
                        critiqueId: result.critiqueId,
                        branchId: result.branchId ?? null,
                        compositeScore: result.compositeScore,
                        confidence,
                    },
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    // ==========================================
    // v4.0: Shared Context Store Tools (CA-MCP)
    // ==========================================

    server.registerTool(
        "context_set",
        {
            description: "Write a key-value pair to the shared context store. Tracks source provenance for trust scoring. Use this to share intermediate results between reasoning steps.",
            inputSchema: {
                key: z.string().min(1).max(200).describe("Context key (e.g. 'user_requirements', 'domain_constraints')"),
                value: z.unknown().describe("Any JSON-serializable value"),
                source: z.string().min(1).max(200).describe("Source of this context (e.g. 'propose_thought:node_3', 'user_input')"),
            },
            annotations: { destructiveHint: true }
        },
        async ({ key, value, source }: { key: string; value: unknown; source: string }) => {
            contextStore.set(key, value, source);
            return {
                content: [{ type: "text", text: `Context set: ${key} (source: ${source})` }],
                structuredContent: { key, source, totalEntries: contextStore.size },
            };
        }
    );

    server.registerTool(
        "context_get",
        {
            description: "Read a value from the shared context store. Returns value + source provenance. Check context before generating redundant thoughts.",
            inputSchema: {
                key: z.string().min(1).describe("Context key to retrieve"),
            },
            annotations: { destructiveHint: true }
        },
        async ({ key }: { key: string }) => {
            const entry = contextStore.getWithProvenance(key);
            if (!entry) {
                return { content: [{ type: "text", text: `Context key '${key}' not found` }], isError: true };
            }
            return {
                content: [{ type: "text", text: JSON.stringify(entry, null, 2) }],
                structuredContent: { key, ...entry },
            };
        }
    );

    server.registerTool(
        "context_list",
        {
            description: "List all keys in the shared context store with their sources. Use to see what knowledge is already available before generating new thoughts.",
            inputSchema: {},
            annotations: { readOnlyHint: true }
        },
        async () => {
            const entries = contextStore.list();
            return {
                content: [{ type: "text", text: entries.length > 0 ? JSON.stringify(entries, null, 2) : "Context store is empty" }],
                structuredContent: { entries, count: entries.length },
            };
        }
    );

    // ==========================================
    // v4.0: Reasoning Trace Export
    // ==========================================

    server.registerTool(
        "export_reasoning_trace",
        {
            description: "Export the current graph's best reasoning path as a structured trace. Compatible with Long CoT format used by DeepSeek-R1 and o3 for RL training and context.",
            inputSchema: {},
            annotations: { readOnlyHint: true }
        },
        async () => {
            try {
                const trace = graph.exportReasoningTrace();
                return {
                    content: [{ type: "text", text: JSON.stringify(trace, null, 2) }],
                    structuredContent: trace as unknown as Record<string, unknown>,
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    // ==========================================
    // v4.1: KGoT Persistence (Framework B)
    // ==========================================

    server.registerTool(
        "export_proven_memory",
        {
            description: "Export the validated reasoning path terminating at a specific node, structured strictly for the standard @mcp:memory Knowledge Graph format. Use this to permanently store the logical conclusions of a GoT session.",
            inputSchema: {
                nodeId: z.string().optional().describe("Optional leaf node ID. If omitted, automatically selects the highest-scoring converged path."),
            },
            annotations: { readOnlyHint: true }
        },
        async ({ nodeId }: { nodeId?: string }) => {
            try {
                // The explicit API boundary defined by the standard `@mcp:memory` server.
                // We enforce this schema at runtime so our internal DAG structure can evolve 
                // without blowing up other agents expecting strict standard Knowledge Graph shapes.
                const mcpMemorySchema = z.object({
                    entities: z.array(z.object({
                        name: z.string(),
                        entityType: z.string(),
                        observations: z.array(z.string())
                    })),
                    relations: z.array(z.object({
                        from: z.string(),
                        to: z.string(),
                        relationType: z.string()
                    }))
                });

                const rawPayload = await graph.exportProvenMemory(nodeId);
                // Schema Coupling Fix: Strip unknown keys, validate strict compliance
                const memoryPayload = mcpMemorySchema.parse(rawPayload);

                return {
                    content: [{ type: "text", text: `Memory exported successfully. Extracted ${memoryPayload.entities.length} logical entities and ${memoryPayload.relations.length} relations.` }],
                    structuredContent: memoryPayload as unknown as Record<string, unknown>,
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    // ==========================================
    // v4.0: Controller Loop — Autonomous GoT Orchestrator
    // ==========================================

    server.registerTool(
        "run_controller_loop",
        {
            description: "Autonomous GoT Controller Loop: Seeds a graph with a prompt + initial thoughts, then iteratively evaluates, branches, reflects, prunes, and converges until a winning path emerges or the iteration budget is exhausted. Returns the winning conclusion, full reasoning trace, and per-iteration metrics.",
            inputSchema: {
                prompt: z.string().min(1).max(5000).describe("The reasoning question or problem statement"),
                thoughts: z.array(z.string().min(1).max(5000)).min(1).max(10).describe("Initial thought branches to explore (1-10)"),
                maxIterations: z.number().int().min(1).max(20).default(5).describe("Maximum reasoning cycles (default: 5)"),
                convergenceThreshold: z.number().min(0).max(1).default(0.85).describe("Stop when best path average score exceeds this (default: 0.85)"),
                autoPruneBelow: z.number().min(0).max(1).default(0.3).describe("Auto soft-prune branches scoring below this (default: 0.3)"),
                beamWidth: z.number().int().min(1).max(10).default(2).describe("Number of top paths to track during convergence (default: 2)"),
            },
            annotations: { destructiveHint: true }
        },
        async ({ prompt, thoughts, maxIterations, convergenceThreshold, autoPruneBelow, beamWidth }: {
            prompt: string;
            thoughts: string[];
            maxIterations?: number;
            convergenceThreshold?: number;
            autoPruneBelow?: number;
            beamWidth?: number;
        }) => {
            try {
                const result = await graph.runControllerLoop(prompt, thoughts, {
                    maxIterations,
                    convergenceThreshold,
                    autoPruneBelow,
                    beamWidth,
                });

                notifyUpdate();

                const summary = [
                    `Controller Loop ${result.converged ? "CONVERGED" : "EXHAUSTED"} after ${result.iterations} iterations.`,
                    `Winning path: ${result.winningPath.pathIds.join(" → ")} (score: ${result.winningPath.totalScore})`,
                    `Conclusion: "${result.winningPath.conclusion.substring(0, 200)}"`,
                    `Graph: ${result.metrics.nodeCount} nodes, ${result.metrics.edgeCount} edges`,
                    `Prune ratio: ${Math.round(result.metrics.pruneRatio * 100)}%`,
                ].join("\n");

                return {
                    content: [{ type: "text", text: summary }],
                    structuredContent: result as unknown as Record<string, unknown>,
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    // ==========================================
    // v4.2: Context Firewall (Framework C Swarm Orchestration)
    // ==========================================

    server.registerTool(
        "compile_node_context",
        {
            description: "SOTA Context Firewall: Compiles the exact reasoning context for a specific node, filtering out all lateral branches. Protects swarm agents against context bottlenecks.",
            inputSchema: {
                nodeId: z.string().min(1).describe("The target node that requires restricted context extraction"),
                ignorePruned: z.boolean().default(true).describe("If true, stop traversing paths that were rejected/soft-pruned (0 score) to prevent context token leaks"),
            },
            annotations: { readOnlyHint: true }
        },
        async ({ nodeId, ignorePruned }: { nodeId: string; ignorePruned?: boolean }) => {
            try {
                const trace = graph.compileNodeContext(nodeId, ignorePruned ?? true);
                return {
                    content: [{ type: "text", text: JSON.stringify(trace, null, 2) }],
                    structuredContent: { contextNodes: trace, count: trace.length },
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "query_nodes",
        {
            description: "Query and filter nodes by swarm orchestration fields (e.g., finding all queued tasks for a specific agent). This is the primary task discovery mechanism for swarm agents.",
            inputSchema: {
                executionState: z.enum(["queued", "processing", "done"]).optional().describe("Filter by execution state"),
                agentTarget: z.string().optional().describe("Filter by targeted agent persona"),
                status: z.enum(["active", "validated", "rejected", "branching"]).optional().describe("Filter by logical status"),
                authorId: z.string().optional().describe("Filter by the authoring agent"),
            },
            annotations: { readOnlyHint: true }
        },
        async (filter: { executionState?: "queued" | "processing" | "done"; agentTarget?: string; status?: "active" | "validated" | "rejected" | "branching"; authorId?: string; }) => {
            try {
                const results = graph.queryNodes(filter);
                return {
                    content: [{ type: "text", text: `Found ${results.length} nodes matching the query.` }],
                    structuredContent: { nodes: results, count: results.length },
                };
            } catch (err) {
                return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    return server;
}
