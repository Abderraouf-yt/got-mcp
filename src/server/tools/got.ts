import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThoughtGraph, getGraphInstance } from "../../graph/index.js";
import { logger } from "../logger.js";
import { ThoughtNodeSchema, ThoughtEdgeSchema, WinningPathSchema, GraphStateSchema } from "./schemas.js";

export function registerGotTools(server: McpServer, defaultGraph: ThoughtGraph, notifyUpdate: (sessionId?: string) => void) {
    server.registerTool(
        "get_thought_graph",
        {
            description: "Retrieve the entire current thought graph.",
            inputSchema: z.object({
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { readOnlyHint: true },
            outputSchema: GraphStateSchema
        },
        async ({ sessionId }) => {
            const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
            const graphState = graph.getGraph();
            return {
                content: [{ type: "text" as const, text: JSON.stringify(graphState, null, 2) }],
                structuredContent: graphState as unknown as Record<string, unknown>
            };
        }
    );

    server.registerTool(
        "aggregate_thoughts",
        {
            description: "GoT Primitive: Merge 2+ thought nodes into a weighted synthesis. Uses formula: Σ(score×weight)/Σ(weights). Retains full provenance and computes aggregation confidence (1 - stddev).",
            inputSchema: z.object({
                nodeIds: z.array(z.string()).min(2, "At least 2 node IDs required").describe("Array of node IDs to merge"),
                synthesis: z.string().min(1, "Synthesis content is required").describe("The merged conclusion that combines insights from all source nodes"),
                weights: z.array(z.number()).optional().describe("Optional per-node weights (defaults to each node's score as its confidence weight)"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { destructiveHint: true },
            outputSchema: z.object({
                newNodeId: z.string().describe("The ID of the newly created synthesized node"),
                aggregatedFrom: z.array(z.string()).describe("List of source node IDs"),
                weightedScore: z.number().describe("The computed score of the new node"),
                confidence: z.number().nullable().describe("Aggregation confidence (1 - stddev)"),
                formula: z.string().describe("The mathematical formula used for aggregation"),
                synthesis: z.string().describe("The synthesized reasoning content")
            }).describe("Result of the weighted aggregation")
        },
        async ({ nodeIds, synthesis, weights, sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const newId = await graph.aggregateNodes(nodeIds, synthesis, weights);
                const newNode = graph.getNode(newId);
                const metadata = newNode?.metadata as Record<string, unknown> | undefined;

                notifyUpdate(sessionId);
                return {
                    content: [{ type: "text" as const, text: `Aggregated ${nodeIds.length} nodes into ${newId}. Weighted score: ${newNode?.score ?? 0}, Confidence: ${metadata?.confidence ?? "N/A"}` }],
                    structuredContent: {
                        newNodeId: newId,
                        aggregatedFrom: nodeIds,
                        weightedScore: newNode?.score ?? 0,
                        confidence: (metadata?.confidence as number) ?? null,
                        formula: "Σ(score×weight)/Σ(weights)",
                        synthesis,
                    }
                };
            } catch (err) {
                logger.error(`Error in aggregate_thoughts: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "prune_branch",
        {
            description: "GoT Primitive: Recursively reject a node and ALL its descendants. Modes: 'hard' (score=0, status=rejected) or 'soft' (score decayed by factor, status preserved). Tracks trigger origin and original scores.",
            inputSchema: z.object({
                nodeId: z.string().min(1, "Node ID is required").describe("The root node of the branch to prune"),
                reason: z.string().optional().describe("Why this branch is being pruned"),
                mode: z.enum(["hard", "soft"]).default("hard").describe("'hard' zeroes scores and rejects; 'soft' decays scores while preserving status"),
                decayFactor: z.number().min(0).max(1).default(0.5).describe("Score multiplier for soft prune (0.5 = halve scores)"),
                trigger: z.enum(["manual", "auto"]).optional().describe("Whether this prune was triggered manually or by an auto-threshold"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { destructiveHint: true },
            outputSchema: z.object({
                prunedCount: z.number().describe("Number of nodes affected by the prune"),
                prunedIds: z.array(z.string()).describe("IDs of all pruned nodes"),
                mode: z.string().describe("Pruning mode used (hard/soft)"),
                reason: z.string().describe("Rationale for pruning"),
                trigger: z.string().describe("Source of the prune command (manual/auto)")
            }).describe("Confirmation of pruned branch")
        },
        async ({ nodeId, reason, mode, decayFactor, trigger, sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const result = await graph.pruneFromNode(nodeId, reason, { mode, decayFactor, trigger });

                notifyUpdate(sessionId);
                return {
                    content: [{ type: "text" as const, text: `${result.mode === "hard" ? "Hard" : "Soft"} pruned ${result.pruned.length} nodes: ${result.pruned.join(", ")}` }],
                    structuredContent: {
                        prunedCount: result.pruned.length,
                        prunedIds: result.pruned,
                        mode: result.mode,
                        reason: reason || "No reason provided",
                        trigger: trigger || "manual",
                    }
                };
            } catch (err) {
                logger.error(`Error in prune_branch: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "find_winning_path",
        {
            description: "GoT Primitive: Trace the best scoring path(s) from root to leaf. Default: greedy (beamWidth=1). Set beamWidth>1 for k-best beam search. Supports score threshold gating and path length caps.",
            inputSchema: z.object({
                beamWidth: z.number().int().min(1).max(10).default(1).describe("Number of top paths to track (1=greedy DFS, >1=beam search)"),
                scoreThreshold: z.number().min(0).max(1).default(0).describe("Minimum node score to include in path (filters low-confidence nodes)"),
                maxPathLength: z.number().int().min(1).default(100).describe("Maximum path depth to prevent runaway traversal"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { readOnlyHint: true },
            outputSchema: WinningPathSchema
        },
        async ({ beamWidth, scoreThreshold, maxPathLength, sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const result = graph.findWinningPath({ beamWidth, scoreThreshold, maxPathLength });

                if (result.path.length === 0) {
                    return {
                        content: [{ type: "text" as const, text: "No winning path found. The graph may be empty, all branches rejected, or no nodes meet the score threshold." }],
                        structuredContent: { path: [], totalScore: 0, pathIds: [], pathLength: 0, allPaths: null, beamWidth: beamWidth ?? 1 }
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
                    content: [{ type: "text" as const, text: `Winning path (${result.path.length} nodes, total score: ${result.totalScore}):\n\n${pathSummary}${beamInfo}` }],
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
                logger.error(`Error in find_winning_path: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "get_graph_metrics",
        {
            description: "Retrieve live metrics: node count, max depth, prune ratio, etc.",
            inputSchema: z.object({
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { readOnlyHint: true },
            outputSchema: z.object({
                metrics: z.object({
                    nodeCount: z.number(),
                    edgeCount: z.number(),
                    maxDepth: z.number(),
                    avgScore: z.number(),
                    pruneRatio: z.number(),
                    activeCount: z.number(),
                    validatedCount: z.number(),
                    rejectedCount: z.number(),
                    rootCount: z.number()
                }).describe("Current graph health and activity metrics"),
                limits: z.object({
                    maxNodes: z.number(),
                    maxDepth: z.number(),
                    maxBranchFactor: z.number()
                }).passthrough().describe("Active engine-level governance limits")
            }).describe("Graph statistics and governance state")
        },
        async ({ sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
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
                    content: [{ type: "text" as const, text: `Graph Metrics:\n${summary}` }],
                    structuredContent: { metrics, limits },
                };
            } catch (err) {
                logger.error(`Error in get_graph_metrics: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );
}
