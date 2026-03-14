import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThoughtGraph, getGraphInstance } from "../../graph/index.js";
import { logger } from "../logger.js";

export function registerIoTools(server: McpServer, defaultGraph: ThoughtGraph, notifyUpdate: (sessionId?: string) => void) {
    server.registerTool(
        "export_snapshot",
        {
            description: "Export a full snapshot of the current graph state for replay, recovery, or debugging. Returns all nodes, edges, and counter as a serializable JSON object.",
            inputSchema: z.object({
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { readOnlyHint: true },
            outputSchema: z.object({}).passthrough()
        },
        async ({ sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const snapshot = graph.exportSnapshot();
                return {
                    content: [{ type: "text" as const, text: `Snapshot exported for ${sessionId || 'default'}: ${snapshot.nodes.length} nodes, ${snapshot.edges.length} edges at ${snapshot.timestamp}` }],
                    structuredContent: snapshot,
                };
            } catch (err) {
                logger.error(`Error in export_snapshot: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "restore_snapshot",
        {
            description: "Restore graph state from a previously exported snapshot. Replaces ALL current state. Use for deterministic replay or recovery.",
            inputSchema: z.object({
                snapshot: z.object({
                    nodes: z.array(z.any()).describe("Array of ThoughtNode objects"),
                    edges: z.array(z.any()).describe("Array of ThoughtEdge objects"),
                    nodeCounter: z.number().int().min(0).describe("The node counter value from the snapshot"),
                }).describe("A snapshot object previously returned by export_snapshot"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { destructiveHint: true },
            outputSchema: z.object({
                restoredNodes: z.number(),
                restoredEdges: z.number(),
                previousNodes: z.number()
            })
        },
        async ({ snapshot, sessionId }: { snapshot: { nodes: any[]; edges: any[]; nodeCounter: number }, sessionId?: string }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const beforeCount = graph.size;
                await graph.restoreSnapshot(snapshot);

                notifyUpdate(sessionId);
                return {
                    content: [{ type: "text" as const, text: `Snapshot restored for ${sessionId || 'default'}: ${beforeCount} → ${graph.size} nodes, ${graph.edgeCount} edges` }],
                    structuredContent: {
                        restoredNodes: graph.size,
                        restoredEdges: graph.edgeCount,
                        previousNodes: beforeCount,
                    },
                };
            } catch (err) {
                logger.error(`Error in restore_snapshot: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "export_reasoning_trace",
        {
            description: "Export the current graph's best reasoning path as a structured trace. Compatible with Long CoT format used by DeepSeek-R1 and o3 for RL training and context.",
            inputSchema: z.object({
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { readOnlyHint: true },
            outputSchema: z.object({}).passthrough()
        },
        async ({ sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const trace = graph.exportReasoningTrace();
                return {
                    content: [{ type: "text" as const, text: JSON.stringify(trace, null, 2) }],
                    structuredContent: trace as unknown as Record<string, unknown>,
                };
            } catch (err) {
                logger.error(`Error in export_reasoning_trace: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "export_proven_memory",
        {
            description: "Export the validated reasoning path terminating at a specific node, structured strictly for the standard `@mcp:memory` Knowledge Graph format. Use this to permanently store the logical conclusions of a GoT session.",
            inputSchema: z.object({
                nodeId: z.string().optional().describe("Optional leaf node ID. If omitted, automatically selects the highest-scoring converged path."),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { readOnlyHint: true },
            outputSchema: z.object({
                entities: z.array(z.any()),
                relations: z.array(z.any())
            })
        },
        async ({ nodeId, sessionId }: { nodeId?: string, sessionId?: string }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
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
                const memoryPayload = mcpMemorySchema.parse(rawPayload);

                return {
                    content: [{ type: "text" as const, text: `Memory exported successfully for ${sessionId || 'default'}. Extracted ${memoryPayload.entities.length} logical entities and ${memoryPayload.relations.length} relations.` }],
                    structuredContent: memoryPayload as unknown as Record<string, unknown>,
                };
            } catch (err) {
                logger.error(`Error in export_proven_memory: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );
}
