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
export type ThoughtRelation = "refinement" | "contradiction" | "support" | "branch" | "aggregation" | "reflection" | "supports" | "branches_to" | "aggregates" | "refines" | "contradicts";

/**
 * A node in the thought graph representing a single unit of reasoning.
 */
export interface ThoughtNode {
    id: string;
    thought: string;
    status: ThoughtStatus;
    score: number;
    confidence?: ConfidenceVector;
    authorId?: string;
    agentTarget?: string;
    executionState?: "queued" | "processing" | "done";
    dependencies?: string[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

/**
 * Multi-dimensional confidence scoring (2026 pattern).
 * Each axis is 0.0–1.0. Composite score = weighted mean.
 * @see https://arxiv.org/abs/2601.11595 CA-MCP
 */
export interface ConfidenceVector {
    factual: number;
    logical: number;
    relevance: number;
    novelty: number;
}

/**
 * A single step in an exported reasoning trace.
 */
export interface ReasoningStep {
    step: number;
    nodeId: string;
    thought: string;
    score: number;
    confidence?: ConfidenceVector;
    status: ThoughtStatus;
    reflections: string[];
    alternatives: string[];
}

/**
 * Structured reasoning trace for RL model consumption.
 * Exported via the export_reasoning_trace tool.
 */
export interface ReasoningTrace {
    question: string;
    steps: ReasoningStep[];
    conclusion: string;
    compositeScore: number;
    totalNodes: number;
    totalEdges: number;
    exportedAt: string;
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
    nodeCounter: number;
    limits: GraphLimits;
    timestamp: string;
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
    maxNodes: 1000,
    maxBranchFactor: 5,
    maxDepth: 30,
    maxThoughtLength: 5000,
    maxAggregationInputs: 10,
    maxPruneCascade: 100,
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
    name: "@abderraouf-yt/got-mcp",
    version: "4.3.0",
    description: "Graph of Thoughts (GoT) MCP Server — bounded, auditable reasoning with self-reflection and shared context",
} as const;

/**
 * Resource URIs used by the server.
 */
export const RESOURCE_URIS = {
    currentGraph: "thought-graph://current",
    contextStore: "thought-graph://context",
} as const;

/**
 * Per-iteration log entry for the Controller Loop.
 */
export interface IterationLog {
    iteration: number;
    nodesScored: number;
    nodesPruned: number;
    nodesBranched: number;
    nodesReflected: number;
    totalNodes: number;
    bestPathScore: number;
    converged: boolean;
}

/**
 * Result of a Controller Loop execution.
 */
export interface ControllerLoopResult {
    converged: boolean;
    iterations: number;
    winningPath: {
        pathIds: string[];
        totalScore: number;
        conclusion: string;
    };
    trace: ReasoningTrace;
    metrics: GraphMetrics;
    iterationLog: IterationLog[];
}

/**
 * Analytical perspective for seeding reasoning.
 */
export interface Perspective {
    lens: string;
    thought: string;
    weight: number;
}

/**
 * A single gap identified during reasoning.
 * Mapped from rejected nodes or low-score path branches.
 */
export interface GapItem {
    id: string;
    title: string;
    description: string;
    remediation: string;
    category: string;
    severity: "low" | "medium" | "high" | "critical";
    evidence?: {
        path: string;
        attribute?: string;
        value?: any;
    }[];
}

/**
 * Structured Gap Analysis report.
 * Can be exported as Markdown or PDF.
 */
export interface GapReport {
    sessionId: string;
    title: string;
    executiveSummary: string;
    readinessScore: number;
    gaps: GapItem[];
    winningPathIds: string[];
    generatedAt: string;
    metadata: {
        totalNodes: number;
        totalGaps: number;
        methodology: string;
    };
}
