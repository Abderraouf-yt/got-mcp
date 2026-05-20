import { z } from "zod";

/**
 * Zod schemas for Thought Graph entities.
 * Fulfills Antigravity 2026 schema validation requirements.
 */

export const ConfidenceVectorSchema = z.object({
    factual: z.number().min(0).max(1).describe("Grounded in verifiable facts"),
    logical: z.number().min(0).max(1).describe("Reasoning chain is valid"),
    relevance: z.number().min(0).max(1).describe("Addresses the problem directly"),
    novelty: z.number().min(0).max(1).describe("Adds new information vs restating"),
}).describe("Multi-dimensional confidence scoring");

export const ThoughtNodeSchema = z.object({
    id: z.string().describe("Unique identifier for the thought node"),
    thought: z.string().describe("The actual reasoning content"),
    status: z.enum(["active", "validated", "rejected", "branching"]).describe("Current status of the reasoning step"),
    score: z.number().min(0).max(1).describe("Confidence score (0.0 - 1.0)"),
    confidence: ConfidenceVectorSchema.optional(),
    authorId: z.string().optional().describe("Identifier of the agent that proposed this thought"),
    agentTarget: z.string().optional().describe("Target agent persona for this reasoning branch"),
    executionState: z.enum(["queued", "processing", "done"]).optional().describe("Fulfillment state for swarm orchestration"),
    dependencies: z.array(z.string()).optional().describe("Explicit node IDs this thought depends on"),
    metadata: z.record(z.any()).optional().describe("Arbitrary metadata for the node"),
    createdAt: z.string().describe("ISO 8601 timestamp of creation"),
    updatedAt: z.string().describe("ISO 8601 timestamp of last update"),
}).describe("A single unit of reasoning in the graph");

export const ThoughtEdgeSchema = z.object({
    from: z.string().describe("Source node ID"),
    to: z.string().describe("Target node ID"),
    relation: z.enum([
        "refinement", "contradiction", "support", "branch", "aggregation", "reflection",
        "supports", "branches_to", "aggregates", "refines", "contradicts"
    ]).describe("Type of logical relationship"),
    createdAt: z.string().describe("ISO 8601 timestamp of creation"),
}).describe("A directed relationship between two thoughts");

export const GraphStateSchema = z.object({
    nodes: z.array(ThoughtNodeSchema).describe("All nodes in the graph"),
    edges: z.array(ThoughtEdgeSchema).describe("All edges in the graph"),
    nodeCounter: z.number().int().min(0).describe("Current node ID counter"),
    timestamp: z.string().describe("State export timestamp"),
    meta: z.object({
        nodeCount: z.number(),
        edgeCount: z.number(),
        lastModified: z.string()
    }).optional().describe("Graph statistics")
}).describe("Complete state of a thought graph session");

export const WinningPathSchema = z.object({
    pathIds: z.array(z.string()).describe("Ordered list of node IDs in the winning path"),
    totalScore: z.number().describe("Aggregated score of the path"),
    path: z.array(ThoughtNodeSchema).describe("Full node objects for the winning path"),
    allPaths: z.array(z.any()).nullable().optional().describe("Alternative paths discovered during beam search"),
    beamWidth: z.number().optional().describe("The beam width used for the search")
}).describe("The result of a path convergence operation");

export const GapItemSchema = z.object({
    id: z.string().describe("Unique identifier for the gap"),
    title: z.string().describe("Short title of the identified gap"),
    description: z.string().describe("Detailed description of the finding"),
    remediation: z.string().describe("Recommended action to close the gap"),
    category: z.string().describe("Classification (e.g., Security, Compliance)"),
    severity: z.enum(["low", "medium", "high", "critical"]).describe("Risk severity level"),
    evidence: z.array(z.object({
        path: z.string(),
        attribute: z.string().optional(),
        value: z.any().optional()
    })).optional().describe("Verifiable data points linked to this gap")
}).describe("An identified compliance or architectural gap");

export const GapReportSchema = z.object({
    sessionId: z.string().describe("Identifier of the reasoning session"),
    title: z.string().describe("Report title"),
    executiveSummary: z.string().describe("High-level summary of findings"),
    readinessScore: z.number().min(0).max(100).describe("Overall readiness percentage"),
    gaps: z.array(GapItemSchema).describe("List of identified gaps"),
    winningPathIds: z.array(z.string()).describe("The reasoning path that led to these findings"),
    generatedAt: z.string().describe("ISO 8601 generation timestamp"),
    metadata: z.object({
        totalNodes: z.number(),
        totalGaps: z.number(),
        methodology: z.string()
    }).describe("Report generation metadata")
}).describe("A professional analysis report exported from the graph");

export const IterationLogSchema = z.object({
    iteration: z.number(),
    nodesScored: z.number(),
    nodesPruned: z.number(),
    nodesBranched: z.number(),
    nodesReflected: z.number(),
    totalNodes: z.number(),
    bestPathScore: z.number(),
    converged: z.boolean()
}).describe("Metrics for a single reasoning iteration");

export const ControllerLoopResultSchema = z.object({
    converged: z.boolean().describe("Whether the reasoning goal was reached"),
    iterations: z.number().describe("Number of cycles performed"),
    winningPath: z.object({
        pathIds: z.array(z.string()),
        totalScore: z.number(),
        conclusion: z.string()
    }).describe("The optimal reasoning path discovered"),
    trace: z.any().describe("Full execution trace"),
    metrics: z.any().describe("Final graph metrics"),
    iterationLog: z.array(IterationLogSchema).describe("Chronological log of reasoning progress")
}).describe("Comprehensive result of an autonomous reasoning loop");
