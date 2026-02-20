/**
 * Thought Graph Type Definitions
 * Shared interfaces for the entire MCP server.
 * 
 * @module types
 * @description Core type definitions for Graph of Thoughts (GoT) reasoning system
 */

/**
 * Status of a thought node in the reasoning graph.
 */
export type ThoughtStatus = "active" | "validated" | "rejected" | "branching";

/**
 * Type of relationship between thought nodes.
 */
export type ThoughtRelation = "refinement" | "contradiction" | "support" | "branch";

/**
 * A node in the thought graph representing a single unit of reasoning.
 */
export interface ThoughtNode {
    id: string;
    thought: string;
    status: ThoughtStatus;
    score: number;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

/**
 * An edge connecting two thought nodes in the graph.
 */
export interface ThoughtEdge {
    from: string;
    to: string;
    relation: ThoughtRelation;
    createdAt: string;
}

/**
 * Complete graph structure containing all nodes and edges.
 */
export interface GraphState {
    nodes: ThoughtNode[];
    edges: ThoughtEdge[];
    meta: {
        nodeCount: number;
        edgeCount: number;
        lastModified: string;
    };
}

/**
 * Server configuration constants.
 */
export const SERVER_CONFIG = {
    name: "thought-graph",
    version: "1.3.0",
    description: "Graph of Thoughts (GoT) MCP Server for non-linear reasoning",
} as const;

/**
 * Resource URIs used by the server.
 */
export const RESOURCE_URIS = {
    currentGraph: "thought-graph://current",
} as const;
