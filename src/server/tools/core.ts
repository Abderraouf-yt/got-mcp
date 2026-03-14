import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThoughtGraph, getGraphInstance } from "../../graph/index.js";
import type { ConfidenceVector } from "../../types.js";
import { logger } from "../logger.js";

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

export function registerCoreTools(server: McpServer, defaultGraph: ThoughtGraph, notifyUpdate: (sessionId?: string) => void) {
    server.registerTool(
        "propose_thought",
        {
            description: "Propose a new unit of reasoning (node) in the thought graph.",
            inputSchema: z.object({
                thought: z.string().min(1, "Thought content is required").max(5000, "Thought exceeds 5000 chars").describe("The content of the thought"),
                parentId: z.string().optional().describe("Optional parent node ID if this thought builds on a previous one"),
                relation: z.enum(["refinement", "contradiction", "support", "branch"])
                    .default("refinement")
                    .describe("How this thought relates to its parent"),
                authorId: z.string().optional().describe("Which sub-agent proposed the thought"),
                agentTarget: z.string().optional().describe("Which specialized agent persona the thought is routed to"),
                executionState: z.enum(["queued", "processing", "done"]).optional().describe("To track swarm fulfillment independently of the logical status"),
                dependencies: z.array(z.string()).optional().describe("Optional explicit node dependencies beyond standard edges"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { destructiveHint: true },
            outputSchema: z.object({
                nodeId: z.string(),
                thought: z.string(),
                relation: z.string().optional(),
                parentId: z.string().optional()
            })
        },
        async ({ thought, parentId, relation, authorId, agentTarget, executionState, dependencies, sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
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
                        return { content: [{ type: "text" as const, text: `Error: Parent node '${parentId}' not found` }], isError: true };
                    }
                    await graph.addEdge(parentId, nodeId, relation || "refinement");
                }

                notifyUpdate(sessionId);
                return {
                    content: [{ type: "text" as const, text: `Thought added with ID: ${nodeId}` }],
                    structuredContent: { nodeId, thought, relation, parentId }
                };
            } catch (err) {
                logger.error(`Error in propose_thought: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "evaluate_thought",
        {
            description: "Assign a score or status to a thought node. If score is omitted, triggers autonomous LLM audit via sampling.",
            inputSchema: z.object({
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
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { destructiveHint: true },
            outputSchema: z.object({
                nodeId: z.string(),
                audited: z.boolean().optional(),
                message: z.string().optional(),
                score: z.number().optional(),
                status: z.string().optional()
            })
        },
        async ({ nodeId, score, status, critique, confidence, authorId, agentTarget, executionState, dependencies, sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const node = graph.getNode(nodeId);
                if (!node) {
                    return { content: [{ type: "text" as const, text: `Error: Node '${nodeId}' not found` }], isError: true };
                }

                if (score === undefined && !confidence) {
                    const message = await triggerAutonomousAudit(server, node, graph);
                    return {
                        content: [{ type: "text" as const, text: message }],
                        structuredContent: { nodeId, audited: true, message }
                    };
                }

                await graph.updateNode(nodeId, {
                    score: score !== undefined ? score : node.score,
                    status: status || node.status,
                    metadata: {
                        ...(node.metadata || {}),
                        critique: critique || node.metadata?.critique,
                    },
                    confidence: confidence || node.confidence,
                    authorId: authorId || node.authorId,
                    agentTarget: agentTarget || node.agentTarget,
                    executionState: executionState || node.executionState,
                    dependencies: dependencies || node.dependencies,
                });

                notifyUpdate(sessionId);
                return {
                    content: [{ type: "text" as const, text: `Node ${nodeId} evaluated (score: ${score !== undefined ? score : 'computed'}, status: ${status || 'unchanged'})` }],
                    structuredContent: { nodeId, score, status }
                };
            } catch (err) {
                logger.error(`Error in evaluate_thought: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "reset_graph",
        {
            description: "Clear all nodes and edges from the reasoning graph and reset the session.",
            inputSchema: z.object({
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { destructiveHint: true },
            outputSchema: z.object({
                success: z.boolean(),
                message: z.string()
            })
        },
        async ({ sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                await graph.clear();
                notifyUpdate(sessionId);
                return {
                    content: [{ type: "text" as const, text: `Graph ${sessionId || 'default'} reset successfully. All nodes and edges cleared.` }],
                    structuredContent: { success: true, message: "Graph cleared" }
                };
            } catch (err) {
                logger.error(`Error in reset_graph: ${err}`);
                return { content: [{ type: "text" as const, text: `Error resetting graph: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );
}
