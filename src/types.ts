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
export type ThoughtRelation = "refinement" | "contradiction" | "support" | "branch" | "aggregation";

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
 * Configurable limits for graph explosion protection.
 * Enforced at the engine level, not the tool layer.
 */
export interface GraphLimits {
    maxNodes: number;
    maxBranchFactor: number;
    maxDepth: number;
    maxThoughtLength: number;
    maxAggregationInputs: number;
    maxPruneCascade: number;
}

/**
 * Default governance limits per v3.0 Production Constitution.
 */
export const DEFAULT_GRAPH_LIMITS: GraphLimits = {
    maxNodes: 200,
    maxBranchFactor: 5,
    maxDepth: 15,
    maxThoughtLength: 5000,
    maxAggregationInputs: 10,
    maxPruneCascade: 50,
} as const;

/**
 * Session-scoped context for budget tracking and governance.
 */
export interface SessionContext {
    sessionId: string;
    limits: GraphLimits;
    usage: {
        nodesCreated: number;
        edgesCreated: number;
        pruneEvents: number;
        aggregations: number;
        startTime: number;
    };
}

/**
 * Structured metrics for observability.
 */
export interface GraphMetrics {
    nodeCount: number;
    edgeCount: number;
    maxDepth: number;
    avgScore: number;
    pruneRatio: number;
    rejectedCount: number;
    activeCount: number;
    validatedCount: number;
    rootCount: number;
}

/**
 * Server configuration constants.
 */
export const SERVER_CONFIG = {
    name: "got-mcp",
    version: "3.0.0",
    description: "Graph of Thoughts (GoT) MCP Server — bounded, auditable reasoning",
} as const;

/**
 * Resource URIs used by the server.
 */
export const RESOURCE_URIS = {
    currentGraph: "got-mcp://current",
} as const;
