/**
 * MCP Tool Handlers
 * Implements the execution logic for all Thought Graph tools.
 * 
 * @module tools/handlers
 */

import { z } from "zod";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ThoughtGraph } from "../graph/ThoughtGraph.js";
import { RESOURCE_URIS } from "../types.js";
import { TOOL_NAMES } from "./definitions.js";

/**
 * Zod schemas for tool input validation.
 */
const ProposeThoughtSchema = z.object({
    thought: z.string().min(1, "Thought content is required"),
    parentId: z.string().optional(),
    relation: z.enum(["refinement", "contradiction", "support", "branch"]).optional(),
});

const EvaluateThoughtSchema = z.object({
    nodeId: z.string().min(1, "Node ID is required"),
    score: z.number().min(0).max(1).optional(),
    status: z.enum(["active", "validated", "rejected", "branching"]).optional(),
    critique: z.string().optional(),
});

/**
 * Send a resource update notification.
 */
function notifyGraphUpdate(server: Server): void {
    server.notification({
        method: "notifications/resources/updated",
        params: { uri: RESOURCE_URIS.currentGraph },
    });
}

/**
 * Create a success response.
 */
function successResponse(text: string): CallToolResult {
    return {
        content: [{ type: "text", text }],
    };
}

/**
 * Create an error response.
 */
function errorResponse(message: string): CallToolResult {
    return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
    };
}

/**
 * Handle propose_thought tool execution.
 */
export async function handleProposeThought(
    args: unknown,
    graph: ThoughtGraph,
    server: Server
): Promise<CallToolResult> {
    const { thought, parentId, relation } = ProposeThoughtSchema.parse(args);

    const nodeId = graph.addNode(thought);

    if (parentId) {
        if (!graph.hasNode(parentId)) {
            return errorResponse(`Parent node '${parentId}' not found`);
        }
        graph.addEdge(parentId, nodeId, relation || "refinement");
    }

    notifyGraphUpdate(server);
    return successResponse(`Thought added with ID: ${nodeId}`);
}

/**
 * Handle evaluate_thought tool execution.
 */
export async function handleEvaluateThought(
    args: unknown,
    graph: ThoughtGraph,
    server: Server
): Promise<CallToolResult> {
    const { nodeId, score, status, critique } = EvaluateThoughtSchema.parse(args);

    const node = graph.getNode(nodeId);
    if (!node) {
        return errorResponse(`Node '${nodeId}' not found`);
    }

    // If score is omitted, trigger autonomous audit via MCP Sampling
    if (score === undefined) {
        try {
            const auditResult = await triggerAutonomousAudit(server, node, graph);
            return successResponse(auditResult);
        } catch (samplingError: unknown) {
            const message = samplingError instanceof Error
                ? samplingError.message
                : "Unknown sampling error";
            return errorResponse(`Sampling failed: ${message}. Make sure the host supports sampling.`);
        }
    }

    // Manual evaluation
    graph.updateNode(nodeId, {
        score,
        status: status ?? node.status,
        metadata: critique ? { critique } : undefined,
    });

    notifyGraphUpdate(server);
    return successResponse(`Node ${nodeId} updated. Score: ${score}, Status: ${status ?? node.status}`);
}

/**
 * Trigger autonomous LLM audit via MCP Sampling.
 */
async function triggerAutonomousAudit(
    server: Server,
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

    const auditResult = await server.request(
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
}

/**
 * Handle get_thought_graph tool execution.
 */
export async function handleGetThoughtGraph(
    graph: ThoughtGraph
): Promise<CallToolResult> {
    const graphState = graph.getGraph();
    return successResponse(JSON.stringify(graphState, null, 2));
}

/**
 * Handle reset_graph tool execution.
 */
export async function handleResetGraph(
    graph: ThoughtGraph,
    server: Server
): Promise<CallToolResult> {
    graph.clear();
    notifyGraphUpdate(server);
    return successResponse("Thought graph cleared.");
}

/**
 * Main tool router - dispatches to appropriate handler based on tool name.
 */
export async function handleToolCall(
    name: string,
    args: unknown,
    graph: ThoughtGraph,
    server: Server
): Promise<CallToolResult> {
    try {
        switch (name) {
            case TOOL_NAMES.PROPOSE_THOUGHT:
                return await handleProposeThought(args, graph, server);

            case TOOL_NAMES.EVALUATE_THOUGHT:
                return await handleEvaluateThought(args, graph, server);

            case TOOL_NAMES.GET_THOUGHT_GRAPH:
                return await handleGetThoughtGraph(graph);

            case TOOL_NAMES.RESET_GRAPH:
                return await handleResetGraph(graph, server);

            default:
                return errorResponse(`Unknown tool: ${name}`);
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return errorResponse(message);
    }
}
