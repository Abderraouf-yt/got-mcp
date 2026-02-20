/**
 * MCP Tool Definitions
 * Defines all available tools for the Thought Graph MCP server.
 * 
 * @module tools/definitions
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * All available tools exposed by the Thought Graph MCP server.
 */
export const TOOLS: Tool[] = [
    {
        name: "propose_thought",
        description:
            "Propose a new unit of reasoning (node) in the thought graph.",
        inputSchema: {
            type: "object",
            properties: {
                thought: {
                    type: "string",
                    description: "The content of the thought",
                },
                parentId: {
                    type: "string",
                    description: "Optional parent node ID if this thought builds on a previous one",
                },
                relation: {
                    type: "string",
                    enum: ["refinement", "contradiction", "support", "branch"],
                    default: "refinement",
                },
            },
            required: ["thought"],
        },
    },
    {
        name: "evaluate_thought",
        description:
            "Assign a score or status to a thought node (Self-Critique). If score is omitted, triggers autonomous audit.",
        inputSchema: {
            type: "object",
            properties: {
                nodeId: { type: "string" },
                score: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Omit to trigger autonomous LLM audit.",
                },
                status: {
                    type: "string",
                    enum: ["active", "validated", "rejected", "branching"],
                },
                critique: {
                    type: "string",
                    description: "Reasoning for the evaluation",
                },
            },
            required: ["nodeId"],
        },
    },
    {
        name: "get_thought_graph",
        description: "Retrieve the entire current thought graph.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "reset_graph",
        description: "Clear the current reasoning session.",
        inputSchema: { type: "object", properties: {} },
    },
];

/**
 * Tool names as a const object for type-safe references.
 */
export const TOOL_NAMES = {
    PROPOSE_THOUGHT: "propose_thought",
    EVALUATE_THOUGHT: "evaluate_thought",
    GET_THOUGHT_GRAPH: "get_thought_graph",
    RESET_GRAPH: "reset_graph",
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];
