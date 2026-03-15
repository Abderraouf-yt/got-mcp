import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThoughtGraph, getGraphInstance } from "../../graph/index.js";
import { logger } from "../logger.js";
import { createHash } from "node:crypto";

/**
 * Maps a GoT lens to an Antigravity 2026 Taxonomy type.
 */
const ENTITY_TYPE_TAXONOMY: Record<string, string> = {
    "Security": "Directive",
    "Scalability": "ArchitecturePattern",
    "Performance": "ArchitecturePattern",
    "Privacy": "Protocol",
    "ROI": "BusinessCase",
    "Risk": "RiskAssessment",
    "Technical": "TechnicalSpecification",
};

/**
 * Generates a deterministic name for an entity based on its thought content.
 * Fulfills FR-004 (Semantic Identity).
 */
function generateSemanticName(thought: string): string {
    const normalized = thought.toLowerCase().trim();
    const hashInput = normalized.substring(0, 500);
    const hash = createHash("md5").update(hashInput).digest("hex").substring(0, 8);
    const truncated = thought.substring(0, 50).trim().replace(/[^a-z0-9]/gi, "_");
    return `${truncated}_${hash}`;
}

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
                    content: [
                        { type: "text" as const, text: `Snapshot exported for ${sessionId || 'default'}: ${snapshot.nodes.length} nodes, ${snapshot.edges.length} edges at ${snapshot.timestamp}\n\nUse the JSON below to restore this graph later:` },
                        { type: "text" as const, text: `\`\`\`json\n${JSON.stringify(snapshot, null, 2)}\n\`\`\`` }
                    ],
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

    server.registerTool(
        "commit_to_memory",
        {
            description: "Persist a validated GoT reasoning path directly to the permanent @mcp:memory Knowledge Graph. Supports dryRun, deduplication, and chunking.",
            inputSchema: z.object({
                nodeId: z.string().optional().describe("The winning leaf node ID to commit. If omitted, uses the best path."),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
                dryRun: z.boolean().optional().default(false).describe("If true, returns the payload without calling the memory server."),
            }),
            annotations: {
                readOnlyHint: false,
                destructiveHint: false,
            }
        },
        async ({ nodeId, sessionId, dryRun }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const leaf = nodeId ? graph.getNode(nodeId) : (() => {
                    const p = graph.findWinningPath({ beamWidth: 1 }).path;
                    return p.length > 0 ? p[p.length - 1] : undefined;
                })();

                if (!leaf) {
                    return { content: [{ type: "text" as const, text: "Error: No valid winning node found to commit." }], isError: true };
                }

                // T003 & T008: Backwards traversal
                const nodesInPath = graph.getWinningPathNodes(leaf.id);
                // Topological order for creation (root-to-leaf)
                const orderedNodes = nodesInPath.reverse();

                const entities: any[] = [];
                const relations: any[] = [];
                const entityNameMap = new Map<string, string>();

                // FR-010: Provenance injection
                for (const node of orderedNodes) {
                    const semanticName = generateSemanticName(node.thought);
                    entityNameMap.set(node.id, semanticName);

                    const entityType = node.metadata?.lens 
                        ? (ENTITY_TYPE_TAXONOMY[node.metadata.lens as string] || `${node.metadata.lens} Perspective`)
                        : "ThoughtNode";

                    const observations = [
                        node.thought,
                        `Score: ${node.score}`,
                        `Status: ${node.status}`,
                        `GoT-Session: ${sessionId || "default"}`, // FR-010
                        `Instance: ${node.id}`
                    ];

                    if (node.metadata?.confidence) {
                        observations.push(`Confidence: ${JSON.stringify(node.metadata.confidence)}`);
                    }
                    
                    // FR-010: Add Agentic Critique provenance if available
                    if (node.metadata?.critique) {
                        observations.push(`Critique: ${node.metadata.critique}`);
                    }

                    entities.push({
                        name: semanticName,
                        entityType,
                        observations
                    });
                }

                // Build relations using semantic names
                for (const node of orderedNodes) {
                    const incomingEdges = graph.getIncomingEdges(node.id);
                    for (const edge of incomingEdges) {
                        const parentName = entityNameMap.get(edge.from);
                        const childName = entityNameMap.get(edge.to);
                        if (parentName && childName) {
                            relations.push({
                                from: parentName,
                                to: childName,
                                relationType: edge.relation === "contradiction" ? "contradicts" :
                                    edge.relation === "refinement" ? "refines" :
                                        edge.relation === "aggregation" ? "aggregates" :
                                            edge.relation === "branch" ? "branches_to" : "supports"
                            });
                        }
                    }
                }

                const totalNodes = orderedNodes.length;
                const CHUNK_SIZE = 25; // FR-011

                if (dryRun) {
                    return {
                        content: [{ type: "text" as const, text: `Dry Run: Prepared ${entities.length} entities and ${relations.length} relations for commitment.` }],
                        structuredContent: {
                            totalNodes,
                            totalRelations: relations.length,
                            chunkCount: Math.ceil(totalNodes / CHUNK_SIZE),
                            entities,
                            relations
                        }
                    };
                }

                // FR-006 & FR-011: Instructions for chunked commitment
                const chunkInfo = totalNodes > 50 
                    ? `\n\n⚠️ Large path detected (${totalNodes} nodes). Please commit in chunks of ${CHUNK_SIZE} to prevent timeouts.`
                    : "";

                return {
                    content: [{ 
                        type: "text" as const, 
                        text: `Commitment Payload Ready.${chunkInfo}\n\nPlease execute the following tool calls on the '@mcp:memory' server:\n\n1. create_entities(entities: [...])\n2. create_relations(relations: [...])\n\nVerified conclusion from GoT session '${sessionId || "default"}' is now ready for long-term memory.` 
                    }],
                    structuredContent: {
                        totalNodes,
                        totalRelations: relations.length,
                        entities,
                        relations
                    }
                };

            } catch (err) {
                logger.error(`Error in commit_to_memory: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );
}
