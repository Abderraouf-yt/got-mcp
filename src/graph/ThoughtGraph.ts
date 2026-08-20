/**
 * ThoughtGraph Class
 * Core graph data structure for Graph of Thoughts (GoT) reasoning.
 * 
 * @module graph/ThoughtGraph
 * @description Manages nodes and edges in a directed graph structure
 */

import fs from "node:fs";
import path from "node:path";
import type {
    ThoughtNode,
    ThoughtEdge,
    ThoughtRelation,
    ThoughtStatus,
    GraphState,
    GraphLimits,
    GraphMetrics,
    ConfidenceVector,
    ReasoningStep,
    ReasoningTrace,
    ControllerLoopResult,
    IterationLog,
} from "../types.js";
import { DEFAULT_GRAPH_LIMITS } from "../types.js";

/**
 * Custom Errors for strict error handling
 */
export class ThoughtGraphError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ThoughtGraphError";
    }
}

export class ThoughtGraphNotFoundError extends ThoughtGraphError {
    constructor(nodeId: string) {
        super(`Node '${nodeId}' not found in the graph`);
        this.name = "ThoughtGraphNotFoundError";
    }
}

export class ThoughtGraphPersistenceError extends ThoughtGraphError {
    constructor(operation: 'save' | 'load', path: string, originalMessage: string) {
        super(`Failed to ${operation} graph at ${path}: ${originalMessage}`);
        this.name = "ThoughtGraphPersistenceError";
    }
}

/**
 * In-memory graph database for thought nodes and their relationships.
 * Implements the Graph of Thoughts (GoT) pattern for non-linear reasoning.
 */
export class ThoughtGraph {
    private nodes: Map<string, ThoughtNode> = new Map();
    private edges: ThoughtEdge[] = [];
    private nodeCounter: number = 0;
    private persistencePath: string | null = null;
    private limits: GraphLimits;
    private stateVersion: number = 0;

    constructor(persistencePath?: string, limits?: Partial<GraphLimits>) {
        this.limits = { ...DEFAULT_GRAPH_LIMITS, ...limits };
        if (persistencePath) {
            this.persistencePath = persistencePath;
            this.load();
            this.setupWatcher();
        }
    }

    /**
     * Watch the persistence file for changes created by other processes
     * (e.g., the IDE's MCP server vs the Visualizer's HTTP server)
     */
    private setupWatcher(): void {
        if (!this.persistencePath) return;

        // Poll every 1000ms. WatchFile is safer than fs.watch across operating systems for basic JSON sync.
        fs.watchFile(this.persistencePath, { interval: 1000 }, (curr, prev) => {
            if (curr.mtime.getTime() !== prev.mtime.getTime()) {
                this.load();
            }
        });
    }

    /**
     * Save the graph state to disk.
     * @throws {ThoughtGraphPersistenceError} if write fails
     */
    private save(): void {
        if (!this.persistencePath) return;

        try {
            // Write to a temporary file first, then rename, to avoid corrupted reads by other watch processes
            const data = JSON.stringify(this.getGraph(), null, 2);
            const tempPath = `${this.persistencePath}.tmp`;
            fs.writeFileSync(tempPath, data, "utf-8");
            fs.renameSync(tempPath, this.persistencePath);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(new ThoughtGraphPersistenceError('save', this.persistencePath, message).message);
            // We log but don't strictly throw to prevent crashing the agent session on minor I/O hitches.
            // Alternatively, could `throw` depending on exact strictness needs, but currently logging is safer for GoT.
        }
    }

    /**
     * Load the graph state from disk.
     * @throws {ThoughtGraphPersistenceError} if read/parse fails
     */
    private load(): void {
        if (!this.persistencePath || !fs.existsSync(this.persistencePath)) return;

        try {
            const data = fs.readFileSync(this.persistencePath, "utf-8");
            const state = JSON.parse(data) as GraphState;

            this.nodes.clear();
            state.nodes.forEach((node) => this.nodes.set(node.id, node));
            this.edges = state.edges;

            // Update node counter to avoid ID collisions
            const maxId = Array.from(this.nodes.keys())
                .map(id => parseInt(id.replace("node_", ""), 10))
                .filter(num => !isNaN(num))
                .reduce((max, num) => Math.max(max, num), 0);

            this.nodeCounter = maxId;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(new ThoughtGraphPersistenceError('load', this.persistencePath, message).message);
            // If the file is transiently locked/corrupted during a cross-process write,
            // do NOT wipe the graph if we already have data. 
            if (this.nodes.size === 0) {
                this.nodes.clear();
                this.edges = [];
                this.nodeCounter = 0;
            }
        }
    }

    /**
     * Add a new thought node to the graph.
     * @param thought - The reasoning content
     * @param id - Optional custom ID (auto-generated if not provided)
     * @returns The ID of the created node
     */
    addNode(thought: string, id?: string): string {
        // Governance: node cap
        if (this.nodes.size >= this.limits.maxNodes) {
            throw new ThoughtGraphError(
                `Node cap reached (${this.limits.maxNodes}). Cannot add more nodes. ` +
                `Consider pruning dead branches or increasing limits.`
            );
        }

        // Governance: thought length
        if (thought.length > this.limits.maxThoughtLength) {
            throw new ThoughtGraphError(
                `Thought exceeds max length (${thought.length}/${this.limits.maxThoughtLength}). ` +
                `Shorten the thought content.`
            );
        }

        this.nodeCounter++;
        const nodeId = id || `node_${this.nodeCounter}`;
        const now = new Date().toISOString();

        const node: ThoughtNode = {
            id: nodeId,
            thought,
            status: "active",
            score: 0.5,
            createdAt: now,
            updatedAt: now,
        };

        this.nodes.set(nodeId, node);
        this.stateVersion++;
        this.save();
        return nodeId;
    }

    /**
     * Create an edge between two thought nodes.
     * @param from - Source node ID
     * @param to - Target node ID
     * @param relation - Type of relationship
     * @throws {ThoughtGraphNotFoundError} if either node doesn't exist
     */
    addEdge(from: string, to: string, relation: ThoughtRelation): void {
        if (!this.nodes.has(from)) {
            throw new ThoughtGraphNotFoundError(from);
        }
        if (!this.nodes.has(to)) {
            throw new ThoughtGraphNotFoundError(to);
        }

        // Governance: cycle detection — DAG integrity
        if (this.wouldCreateCycle(from, to)) {
            throw new ThoughtGraphError(
                `Adding edge ${from} → ${to} would create a cycle. ` +
                `DAG integrity violation. Choose a different parent.`
            );
        }

        // Governance: branch cap — limit children per node
        const existingChildren = this.edges.filter(e => e.from === from).length;
        if (existingChildren >= this.limits.maxBranchFactor) {
            throw new ThoughtGraphError(
                `Branch cap reached: ${from} already has ${existingChildren} children ` +
                `(max ${this.limits.maxBranchFactor}). Prune or aggregate before branching further.`
            );
        }

        // Governance: depth cap — prevent runaway deep chains
        const newDepth = this.getNodeDepth(from) + 1;
        if (newDepth > this.limits.maxDepth) {
            throw new ThoughtGraphError(
                `Depth cap exceeded: edge would place ${to} at depth ${newDepth} ` +
                `(max ${this.limits.maxDepth}). Aggregate or start a new branch.`
            );
        }

        const edge: ThoughtEdge = {
            from,
            to,
            relation,
            createdAt: new Date().toISOString(),
        };

        this.edges.push(edge);
        this.stateVersion++;
        this.save();
    }

    /**
     * Update properties of an existing thought node.
     * @param id - Node ID to update
     * @param updates - Partial node properties to merge
     * @throws {ThoughtGraphNotFoundError} if node doesn't exist
     */
    updateNode(id: string, updates: Partial<Omit<ThoughtNode, "id" | "createdAt">>): void {
        const node = this.nodes.get(id);
        if (!node) {
            throw new ThoughtGraphNotFoundError(id);
        }

        const updatedNode: ThoughtNode = {
            ...node,
            ...updates,
            updatedAt: new Date().toISOString(),
            metadata: updates.metadata
                ? { ...(node.metadata ?? {}), ...updates.metadata }
                : node.metadata,
        };

        this.nodes.set(id, updatedNode);
        this.save();
    }

    /**
     * Retrieve a specific thought node by ID.
     * @param id - Node ID to retrieve
     * @returns The node if found, undefined otherwise
     */
    getNode(id: string): ThoughtNode | undefined {
        return this.nodes.get(id);
    }

    /**
     * Check if a node exists in the graph.
     * @param id - Node ID to check
     */
    hasNode(id: string): boolean {
        return this.nodes.has(id);
    }

    /**
     * Get all edges originating from a specific node.
     * @param nodeId - Source node ID
     */
    getOutgoingEdges(nodeId: string): ThoughtEdge[] {
        return this.edges.filter((edge) => edge.from === nodeId);
    }

    /**
     * Get all edges pointing to a specific node.
     * @param nodeId - Target node ID
     */
    getIncomingEdges(nodeId: string): ThoughtEdge[] {
        return this.edges.filter((edge) => edge.to === nodeId);
    }

    /**
     * Get nodes by their status.
     * @param status - Status to filter by
     */
    getNodesByStatus(status: ThoughtStatus): ThoughtNode[] {
        return Array.from(this.nodes.values()).filter((node) => node.status === status);
    }

    /**
     * Get the complete graph state as a serializable object.
     * @returns Full graph state with metadata
     */
    getGraph(): GraphState {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: [...this.edges],
            meta: {
                nodeCount: this.nodes.size,
                edgeCount: this.edges.length,
                lastModified: new Date().toISOString(),
            },
        };
    }

    /**
     * Get a simplified graph representation (legacy format).
     * @deprecated Use getGraph() for full metadata
     */
    getSimpleGraph(): { nodes: ThoughtNode[]; edges: ThoughtEdge[] } {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: [...this.edges],
        };
    }

    /**
     * GoT Primitive: AGGREGATE (v3.0 — weighted)
     * Merge 2+ thought nodes into a single synthesized conclusion.
     * Uses weighted scoring: Σ(node_score × weight) / Σ(weights)
     * Retains full provenance and computes aggregation confidence.
     * @param nodeIds - Array of node IDs to aggregate (min 2)
     * @param synthesizedThought - The merged conclusion text
     * @param weights - Optional per-node weights (defaults to each node's own score as weight)
     * @returns The ID of the new aggregated node
     */
    aggregateNodes(nodeIds: string[], synthesizedThought: string, weights?: number[]): string {
        if (nodeIds.length < 2) {
            throw new ThoughtGraphError("Aggregation requires at least 2 source nodes");
        }

        // Governance: max aggregation inputs
        if (nodeIds.length > this.limits.maxAggregationInputs) {
            throw new ThoughtGraphError(
                `Aggregation limited to ${this.limits.maxAggregationInputs} inputs ` +
                `(received ${nodeIds.length}). Split into smaller aggregations.`
            );
        }

        // Validate all source nodes exist
        for (const id of nodeIds) {
            if (!this.nodes.has(id)) {
                throw new ThoughtGraphNotFoundError(id);
            }
        }

        const sourceNodes = nodeIds.map(id => this.nodes.get(id)!);

        // Use provided weights or default to each node's score as its confidence weight
        const w = weights ?? sourceNodes.map(n => n.score);

        // Weighted Score = Σ(node_score × confidence_weight) / Σ(weights)
        const weightSum = w.reduce((sum, wi) => sum + wi, 0);
        const weightedScore = weightSum > 0
            ? sourceNodes.reduce((sum, n, i) => sum + n.score * w[i], 0) / weightSum
            : 0;

        // Aggregation confidence = 1 - stddev of source scores (higher = more agreement)
        const mean = sourceNodes.reduce((s, n) => s + n.score, 0) / sourceNodes.length;
        const variance = sourceNodes.reduce((s, n) => s + (n.score - mean) ** 2, 0) / sourceNodes.length;
        // Clamp confidence to [0, 1] — high variance can push below 0
        const rawConfidence = 1 - Math.sqrt(variance);
        const confidence = Math.round(Math.max(0, Math.min(1, rawConfidence)) * 100) / 100;

        // Build provenance: full source lineage trace
        const provenance = sourceNodes.map(n => ({
            id: n.id,
            score: n.score,
            status: n.status,
            thought: n.thought.substring(0, 100),
            weight: w[nodeIds.indexOf(n.id)],
        }));

        // Create the synthesized node
        const newId = this.addNode(synthesizedThought);
        this.updateNode(newId, {
            score: Math.round(weightedScore * 100) / 100,
            status: "validated",
            metadata: {
                aggregatedFrom: nodeIds,
                aggregationType: "weighted_synthesis",
                sourceCount: nodeIds.length,
                weightedScore: Math.round(weightedScore * 100) / 100,
                confidence,
                provenance,
                formula: "Σ(score×weight)/Σ(weights)",
            },
        });

        // Create aggregation edges from each source → new node
        for (const sourceId of nodeIds) {
            this.addEdge(sourceId, newId, "aggregation");
        }

        return newId;
    }

    /**
     * GoT Primitive: PRUNE (v3.0 — modes)
     * Recursively reject a node and all its descendants.
     * Supports two modes:
     *   - "hard" (default): score=0, status=rejected
     *   - "soft": score *= decayFactor, status remains but flagged
     * @param nodeId - The root node of the branch to prune
     * @param options - Prune configuration
     */
    pruneFromNode(
        nodeId: string,
        reason?: string,
        options?: { mode?: "hard" | "soft"; decayFactor?: number; trigger?: "manual" | "auto" }
    ): { pruned: string[]; mode: string } {
        if (!this.nodes.has(nodeId)) {
            throw new ThoughtGraphNotFoundError(nodeId);
        }

        const mode = options?.mode ?? "hard";
        const decayFactor = options?.decayFactor ?? 0.5;
        const trigger = options?.trigger ?? "manual";
        const pruned: string[] = [];
        const visited = new Set<string>();

        // BFS to find all descendants
        const queue: string[] = [nodeId];
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);

            // Governance: cascade size limit
            if (visited.size > this.limits.maxPruneCascade) {
                throw new ThoughtGraphError(
                    `Prune cascade exceeds limit (${this.limits.maxPruneCascade} nodes). ` +
                    `Prune smaller branches first or increase maxPruneCascade.`
                );
            }

            const node = this.nodes.get(current);
            if (node) {
                if (mode === "hard") {
                    // Hard prune: reject and zero out
                    this.nodes.set(current, {
                        ...node,
                        status: "rejected",
                        score: 0,
                        updatedAt: new Date().toISOString(),
                        metadata: {
                            ...(node.metadata ?? {}),
                            prunedAt: new Date().toISOString(),
                            pruneReason: reason || `Branch pruned from ${nodeId}`,
                            pruneMode: "hard",
                            pruneTrigger: trigger,
                            originalScore: node.score,
                        },
                    });
                } else {
                    // Soft prune: decay score, flag but don't reject
                    const decayedScore = Math.round(node.score * decayFactor * 100) / 100;
                    this.nodes.set(current, {
                        ...node,
                        score: decayedScore,
                        updatedAt: new Date().toISOString(),
                        metadata: {
                            ...(node.metadata ?? {}),
                            prunedAt: new Date().toISOString(),
                            pruneReason: reason || `Soft pruned from ${nodeId}`,
                            pruneMode: "soft",
                            pruneTrigger: trigger,
                            originalScore: node.score,
                            decayFactor,
                        },
                    });
                }
                pruned.push(current);
            }

            // Find children (outgoing edges from this node)
            const children = this.edges
                .filter(e => e.from === current)
                .map(e => e.to);
            queue.push(...children);
        }

        this.stateVersion++;
        this.save();
        return { pruned, mode };
    }

    /**
     * GoT Primitive: CONVERGE (v3.0 — beam search)
     * Trace the k-best scoring paths from roots to leaves.
     * Default k=1 (greedy DFS, backward compatible).
     * @param options - Convergence configuration
     * @returns Array of paths sorted by total score (descending)
     */
    findWinningPath(options?: {
        beamWidth?: number;
        scoreThreshold?: number;
        maxPathLength?: number;
    }): { path: ThoughtNode[]; totalScore: number; pathIds: string[]; allPaths?: Array<{ pathIds: string[]; totalScore: number }> } {
        const beamWidth = options?.beamWidth ?? 1;
        const scoreThreshold = options?.scoreThreshold ?? 0;
        const maxPathLength = options?.maxPathLength ?? Infinity;

        // Find root nodes (nodes with no incoming edges)
        const nodesWithIncoming = new Set(this.edges.map(e => e.to));
        const roots = Array.from(this.nodes.values())
            .filter(n => !nodesWithIncoming.has(n.id) && n.status !== "rejected");

        if (roots.length === 0) {
            return { path: [], totalScore: 0, pathIds: [] };
        }

        // Beam search: explore k-best paths from all roots
        type BeamPath = { nodes: ThoughtNode[]; score: number };
        let beams: BeamPath[] = roots
            .filter(r => r.score >= scoreThreshold)
            .map(r => ({ nodes: [r], score: r.score }));

        let completed: BeamPath[] = [];

        while (beams.length > 0) {
            const nextBeams: BeamPath[] = [];

            for (const beam of beams) {
                const current = beam.nodes[beam.nodes.length - 1];

                // Check path length cap
                if (beam.nodes.length >= maxPathLength) {
                    completed.push(beam);
                    continue;
                }

                // Find non-rejected children above threshold
                const children = this.edges
                    .filter(e => e.from === current.id)
                    .map(e => this.nodes.get(e.to))
                    .filter((n): n is ThoughtNode =>
                        n !== undefined && n.status !== "rejected" && n.score >= scoreThreshold
                    );

                if (children.length === 0) {
                    // Leaf reached — this path is complete
                    completed.push(beam);
                } else {
                    // Expand beam with each valid child
                    for (const child of children) {
                        nextBeams.push({
                            nodes: [...beam.nodes, child],
                            score: beam.score + child.score,
                        });
                    }
                }
            }

            // Keep only top-k beams (beam width pruning)
            beams = nextBeams
                .sort((a, b) => b.score - a.score)
                .slice(0, beamWidth);
        }

        // Sort completed paths by total score
        completed.sort((a, b) => b.score - a.score);

        if (completed.length === 0) {
            return { path: [], totalScore: 0, pathIds: [] };
        }

        const best = completed[0];
        return {
            path: best.nodes,
            totalScore: Math.round(best.score * 100) / 100,
            pathIds: best.nodes.map(n => n.id),
            allPaths: beamWidth > 1
                ? completed.map(p => ({
                    pathIds: p.nodes.map(n => n.id),
                    totalScore: Math.round(p.score * 100) / 100,
                }))
                : undefined,
        };
    }

    // ==========================================
    // GOVERNANCE & OBSERVABILITY METHODS
    // ==========================================

    /**
     * Cycle detection: check if adding an edge from→to would create a cycle.
     * Uses BFS from 'from' following existing edges to see if 'to' is reachable.
     * If 'to' can already reach 'from', adding from→to creates a cycle.
     */
    wouldCreateCycle(from: string, to: string): boolean {
        // If 'from' is reachable from 'to' via existing edges, adding from→to creates a cycle
        const visited = new Set<string>();
        const queue: string[] = [to];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current === from) return true;
            if (visited.has(current)) continue;
            visited.add(current);

            // Follow outgoing edges from current
            const children = this.edges
                .filter(e => e.from === current)
                .map(e => e.to);
            queue.push(...children);
        }

        return false;
    }

    /**
     * Calculate the depth of a node from any root.
     * Depth = longest path from any root to this node.
     */
    getNodeDepth(nodeId: string): number {
        if (!this.nodes.has(nodeId)) return -1;

        // BFS from all roots, tracking depth
        const nodesWithIncoming = new Set(this.edges.map(e => e.to));
        const roots = Array.from(this.nodes.keys())
            .filter(id => !nodesWithIncoming.has(id));

        const depths = new Map<string, number>();
        const queue: Array<{ id: string; depth: number }> = roots.map(id => ({ id, depth: 0 }));

        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;
            const existing = depths.get(id) ?? -1;
            if (depth <= existing) continue;
            depths.set(id, depth);

            const children = this.edges
                .filter(e => e.from === id)
                .map(e => e.to);
            for (const child of children) {
                queue.push({ id: child, depth: depth + 1 });
            }
        }

        return depths.get(nodeId) ?? 0;
    }

    /**
     * Compute structured observability metrics for the graph.
     * Used by the get_graph_metrics tool and monitoring.
     */
    getMetrics(): GraphMetrics {
        const allNodes = Array.from(this.nodes.values());
        const rejected = allNodes.filter(n => n.status === "rejected");
        const active = allNodes.filter(n => n.status === "active");
        const validated = allNodes.filter(n => n.status === "validated");

        // Find roots
        const nodesWithIncoming = new Set(this.edges.map(e => e.to));
        const roots = allNodes.filter(n => !nodesWithIncoming.has(n.id));

        // Calculate max depth via BFS
        let maxDepth = 0;
        const queue: Array<{ id: string; depth: number }> = roots.map(r => ({ id: r.id, depth: 0 }));
        const visited = new Set<string>();

        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;
            if (visited.has(id)) continue;
            visited.add(id);
            maxDepth = Math.max(maxDepth, depth);

            const children = this.edges
                .filter(e => e.from === id)
                .map(e => e.to);
            for (const child of children) {
                queue.push({ id: child, depth: depth + 1 });
            }
        }

        const avgScore = allNodes.length > 0
            ? Math.round((allNodes.reduce((s, n) => s + n.score, 0) / allNodes.length) * 100) / 100
            : 0;

        return {
            nodeCount: allNodes.length,
            edgeCount: this.edges.length,
            maxDepth,
            avgScore,
            pruneRatio: allNodes.length > 0
                ? Math.round((rejected.length / allNodes.length) * 100) / 100
                : 0,
            rejectedCount: rejected.length,
            activeCount: active.length,
            validatedCount: validated.length,
            rootCount: roots.length,
        };
    }

    /**
     * Get the current governance limits.
     */
    getLimits(): GraphLimits {
        return { ...this.limits };
    }

    /**
     * Clear all nodes and edges from the graph.
     * Resets the node counter.
     */
    clear(): void {
        this.nodes.clear();
        this.edges = [];
        this.nodeCounter = 0;
        this.save();
    }

    /**
     * Get the total count of nodes.
     */
    get size(): number {
        return this.nodes.size;
    }

    /**
     * Get the total count of edges.
     */
    get edgeCount(): number {
        return this.edges.length;
    }

    // ==========================================
    // SNAPSHOT / REPLAY METHODS
    // ==========================================

    /**
     * Export a full snapshot of the graph state for replay/recovery.
     * Returns a serializable object that can be saved and restored later.
     */
    exportSnapshot(): { nodes: ThoughtNode[]; edges: ThoughtEdge[]; nodeCounter: number; timestamp: string; version: string; stateVersion: number } {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: [...this.edges],
            nodeCounter: this.nodeCounter,
            timestamp: new Date().toISOString(),
            version: "3.0.0",
            stateVersion: this.stateVersion,
        };
    }

    /**
     * Restore graph state from a snapshot.
     * Completely replaces current state for deterministic replay.
     */
    restoreSnapshot(snapshot: { nodes: ThoughtNode[]; edges: ThoughtEdge[]; nodeCounter: number }): void {
        this.nodes.clear();
        this.edges = [];

        for (const node of snapshot.nodes) {
            this.nodes.set(node.id, node);
        }
        this.edges = [...snapshot.edges];
        this.nodeCounter = snapshot.nodeCounter;

        this.save();
    }

    // ==========================================
    // CONCURRENCY: OPERATION LOCK
    // ==========================================

    private operationLock: Promise<void> = Promise.resolve();

    /**
     * Execute a graph mutation under an async lock.
     * Prevents race conditions between concurrent tool calls.
     */
    async withLock<T>(operation: () => T | Promise<T>): Promise<T> {
        let release: () => void;
        const acquire = new Promise<void>(resolve => { release = resolve; });

        const previous = this.operationLock;
        this.operationLock = acquire;

        await previous;
        try {
            return await operation();
        } finally {
            release!();
        }
    }

    // ==========================================
    // v4.0: Self-Reflection + Multi-Dimensional Scoring
    // ==========================================

    /**
     * Compute a composite score from a ConfidenceVector.
     * Weights: logical (35%), factual (30%), relevance (25%), novelty (10%).
     */
    computeCompositeScore(confidence: ConfidenceVector): number {
        const score = (
            confidence.factual * 0.30 +
            confidence.logical * 0.35 +
            confidence.relevance * 0.25 +
            confidence.novelty * 0.10
        );
        return Math.round(score * 100) / 100;
    }

    /**
     * Self-reflection loop (2026 pattern).
     * Creates a critique node linked via "reflection" edge.
     * If a refined thought is provided, also creates a branch.
     *
     * @param nodeId - Node to reflect on
     * @param critique - The critique text
     * @param confidence - Multi-dimensional confidence assessment
     * @param refinedThought - Optional improved version of the thought
     * @returns IDs of created nodes
     */
    reflectAndRefine(
        nodeId: string,
        critique: string,
        confidence: ConfidenceVector,
        refinedThought?: string
    ): { critiqueId: string; branchId?: string; compositeScore: number } {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new ThoughtGraphNotFoundError(nodeId);
        }

        const compositeScore = this.computeCompositeScore(confidence);

        // Update the original node with confidence data
        this.nodes.set(nodeId, {
            ...node,
            score: compositeScore,
            confidence,
            updatedAt: new Date().toISOString(),
        });

        // Create critique node
        const critiqueId = this.addNode(`[Reflection] ${critique}`);
        this.addEdge(nodeId, critiqueId, "reflection");

        // Update critique node with assessment metadata
        const critiqueNode = this.nodes.get(critiqueId)!;
        this.nodes.set(critiqueId, {
            ...critiqueNode,
            score: compositeScore,
            confidence,
            status: compositeScore >= 0.7 ? "validated" : "active",
            metadata: {
                ...(critiqueNode.metadata ?? {}),
                reflectionOf: nodeId,
                assessmentType: "self-reflection",
            },
        });

        let branchId: string | undefined;

        // If critique reveals a flaw and refined version provided, branch
        if (refinedThought && compositeScore < 0.7) {
            branchId = this.addNode(refinedThought);
            this.addEdge(nodeId, branchId, "branch");

            const branchNode = this.nodes.get(branchId)!;
            this.nodes.set(branchId, {
                ...branchNode,
                status: "active",
                metadata: {
                    ...(branchNode.metadata ?? {}),
                    refinedFrom: nodeId,
                    refinementReason: critique,
                },
            });
        }

        this.stateVersion++;
        this.save();

        return { critiqueId, branchId, compositeScore };
    }

    /**
     * Export the winning path as a structured reasoning trace.
     * Format compatible with Long CoT used by DeepSeek-R1 and o3.
     */
    exportReasoningTrace(): ReasoningTrace {
        const result = this.findWinningPath({ beamWidth: 1 });

        if (result.path.length === 0) {
            return {
                question: "",
                steps: [],
                conclusion: "",
                compositeScore: 0,
                totalNodes: this.nodes.size,
                totalEdges: this.edges.length,
                exportedAt: new Date().toISOString(),
            };
        }

        // Pre-compute reflections and branch edges to reduce O(N*E) to O(N+E)
        const edgeLookup = new Map<string, { reflections: string[]; alternatives: string[] }>();
        for (const edge of this.edges) {
            if (edge.relation === "reflection" || edge.relation === "branch") {
                let lookup = edgeLookup.get(edge.from);
                if (!lookup) {
                    lookup = { reflections: [], alternatives: [] };
                    edgeLookup.set(edge.from, lookup);
                }
                const targetThought = this.nodes.get(edge.to)?.thought;
                if (targetThought) {
                    if (edge.relation === "reflection") {
                        lookup.reflections.push(targetThought);
                    } else if (edge.relation === "branch") {
                        lookup.alternatives.push(targetThought);
                    }
                }
            }
        }

        const steps: ReasoningStep[] = result.path.map((node, index) => {
            const lookup = edgeLookup.get(node.id);
            const reflections = lookup?.reflections ?? [];
            const alternatives = lookup?.alternatives ?? [];

            return {
                step: index + 1,
                nodeId: node.id,
                thought: node.thought,
                score: node.score,
                confidence: node.confidence,
                status: node.status,
                reflections,
                alternatives,
            };
        });

        return {
            question: result.path[0].thought,
            steps,
            conclusion: result.path[result.path.length - 1].thought,
            compositeScore: result.totalScore / result.path.length,
            totalNodes: this.nodes.size,
            totalEdges: this.edges.length,
            exportedAt: new Date().toISOString(),
        };
    }

    // ==========================================
    // v4.0: CONTROLLER LOOP — Autonomous GoT Cycle
    // ==========================================

    /**
     * Controller Loop: Autonomous Graph of Thoughts reasoning cycle.
     *
     * Orchestrates the full GoT pipeline on a given prompt:
     *   1. GENERATE — propose initial thoughts from the prompt
     *   2. EVALUATE — score each active leaf using confidence vectors
     *   3. BRANCH — create alternatives for mid-scoring thoughts
     *   4. REFLECT — auto-critique top candidates via reflectAndRefine
     *   5. PRUNE — remove branches below autoPruneBelow threshold
     *   6. CONVERGE — find the winning path via beam search
     *
     * Governance:
     *   - maxIterations caps the number of generate→evaluate→prune cycles
     *   - convergenceThreshold stops early when the best path score exceeds it
     *   - autoPruneBelow automatically soft-prunes low-scoring branches
     *   - All existing graph limits (node cap, depth cap, etc.) still apply
     *
     * @param prompt - The reasoning question or problem statement
     * @param thoughts - Array of initial thought branches to explore
     * @param options - Controller loop configuration
     * @returns The final winning path, reasoning trace, and iteration metrics
     */
    runControllerLoop(
        prompt: string,
        thoughts: string[],
        options?: {
            maxIterations?: number;
            convergenceThreshold?: number;
            autoPruneBelow?: number;
            beamWidth?: number;
        }
    ): ControllerLoopResult {
        const maxIterations = options?.maxIterations ?? 5;
        const convergenceThreshold = options?.convergenceThreshold ?? 0.85;
        const autoPruneBelow = options?.autoPruneBelow ?? 0.3;
        const beamWidth = options?.beamWidth ?? 2;

        const iterationLog: IterationLog[] = [];

        // Step 1: GENERATE — seed the graph with the prompt + initial thoughts
        const rootId = this.addNode(prompt);
        this.updateNode(rootId, { score: 0.5, status: "active" });

        for (const thought of thoughts) {
            const childId = this.addNode(thought);
            this.addEdge(rootId, childId, "branch");
            this.updateNode(childId, { score: 0.5, status: "active" });
        }

        let converged = false;
        let iteration = 0;

        // Step 2-6: Iterate until convergence or budget exhausted
        while (iteration < maxIterations && !converged) {
            iteration++;

            // --- EVALUATE: score all active leaf nodes ---
            const activeLeaves = this.getActiveLeaves();
            let scored = 0;
            let pruned = 0;
            let branched = 0;
            let reflected = 0;

            for (const leaf of activeLeaves) {
                // Auto-score based on thought quality heuristics:
                // - Length factor: longer = more detailed (diminishing returns)
                // - Depth factor: deeper = more refined thinking
                // - Specificity: presence of numbers, comparisons, evidence markers
                const depth = this.getNodeDepth(leaf.id);
                const lengthScore = Math.min(leaf.thought.length / 500, 1.0);
                const depthBonus = Math.min(depth * 0.05, 0.2);
                const specificity = this.estimateSpecificity(leaf.thought);

                const autoScore = Math.min(
                    Math.round((lengthScore * 0.3 + depthBonus + specificity * 0.5) * 100) / 100,
                    1.0
                );

                this.updateNode(leaf.id, {
                    score: autoScore,
                    status: autoScore >= convergenceThreshold ? "validated" : "active",
                });
                scored++;
            }

            // --- PRUNE: remove low-scoring branches ---
            const lowScorers = Array.from(this.nodes.values())
                .filter(n => n.status === "active" && n.score < autoPruneBelow && n.score > 0);

            for (const weak of lowScorers) {
                try {
                    const result = this.pruneFromNode(weak.id, `Auto-pruned: score ${weak.score} < ${autoPruneBelow}`, {
                        mode: "soft",
                        decayFactor: 0.3,
                        trigger: "auto",
                    });
                    pruned += result.pruned.length;
                } catch {
                    // Skip if prune fails (e.g. cascade limit)
                }
            }

            // --- BRANCH: create alternatives for mid-tier thoughts ---
            const midTier = Array.from(this.nodes.values())
                .filter(n => n.status === "active" && n.score >= autoPruneBelow && n.score < convergenceThreshold);

            for (const mid of midTier.slice(0, 3)) { // Limit branching to top 3
                const existingChildren = this.edges.filter(e => e.from === mid.id).length;
                if (existingChildren < this.limits.maxBranchFactor && this.nodes.size < this.limits.maxNodes - 5) {
                    try {
                        const altId = this.addNode(`[Alternative] What if we reconsider: ${mid.thought.substring(0, 200)}...`);
                        this.addEdge(mid.id, altId, "branch");
                        this.updateNode(altId, { score: 0.5, status: "active" });
                        branched++;
                    } catch {
                        // Skip if limits hit
                    }
                }
            }

            // --- REFLECT: critique the best candidates ---
            const topCandidates = Array.from(this.nodes.values())
                .filter(n => n.status !== "rejected" && n.score >= 0.5)
                .sort((a, b) => b.score - a.score)
                .slice(0, 2);

            for (const top of topCandidates) {
                try {
                    const confidence: ConfidenceVector = {
                        factual: Math.min(top.score + 0.1, 1),
                        logical: Math.min(top.score + 0.05, 1),
                        relevance: Math.min(top.score + 0.15, 1),
                        novelty: Math.max(top.score - 0.1, 0),
                    };
                    this.reflectAndRefine(
                        top.id,
                        `Iteration ${iteration} auto-reflection: evaluating strength of reasoning.`,
                        confidence
                    );
                    reflected++;
                } catch {
                    // Skip if reflection fails
                }
            }

            // --- CONVERGE CHECK ---
            const winningPath = this.findWinningPath({ beamWidth, scoreThreshold: autoPruneBelow });
            const avgPathScore = winningPath.path.length > 0
                ? winningPath.totalScore / winningPath.path.length
                : 0;

            iterationLog.push({
                iteration,
                nodesScored: scored,
                nodesPruned: pruned,
                nodesBranched: branched,
                nodesReflected: reflected,
                totalNodes: this.nodes.size,
                bestPathScore: Math.round(avgPathScore * 100) / 100,
                converged: avgPathScore >= convergenceThreshold,
            });

            if (avgPathScore >= convergenceThreshold) {
                converged = true;
            }
        }

        // Final convergence
        const finalPath = this.findWinningPath({ beamWidth, scoreThreshold: 0 });
        const trace = this.exportReasoningTrace();
        const metrics = this.getMetrics();

        this.stateVersion++;
        this.save();

        return {
            converged,
            iterations: iteration,
            winningPath: {
                pathIds: finalPath.pathIds,
                totalScore: finalPath.totalScore,
                conclusion: finalPath.path.length > 0
                    ? finalPath.path[finalPath.path.length - 1].thought
                    : "No conclusion reached",
            },
            trace,
            metrics,
            iterationLog,
        };
    }

    /**
     * Get active leaf nodes (nodes with no outgoing edges that aren't rejected).
     */
    private getActiveLeaves(): ThoughtNode[] {
        const nodesWithOutgoing = new Set(this.edges.map(e => e.from));
        return Array.from(this.nodes.values())
            .filter(n => !nodesWithOutgoing.has(n.id) && n.status !== "rejected");
    }

    /**
     * Estimate the specificity of a thought based on content heuristics.
     * Higher specificity = more concrete, evidence-based reasoning.
     */
    private estimateSpecificity(thought: string): number {
        let score = 0.3; // Base score

        // Indicators of specific, evidence-based thinking
        if (/\d+/.test(thought)) score += 0.1;           // Contains numbers
        if (/vs\.?|versus|compared|better|worse/i.test(thought)) score += 0.1; // Comparisons
        if (/because|since|therefore|thus|hence/i.test(thought)) score += 0.1; // Causal reasoning
        if (/however|but|although|despite/i.test(thought)) score += 0.1;       // Nuance
        if (/example|specifically|for instance/i.test(thought)) score += 0.1;  // Concreteness
        if (/\b(data|evidence|research|study|benchmark)\b/i.test(thought)) score += 0.1; // Evidence

        return Math.min(score, 1.0);
    }
}

// ==========================================
// SESSION REGISTRY (replaces singleton)
// ==========================================

/**
 * Session-scoped graph instance registry.
 * Each sessionId gets its own isolated ThoughtGraph with separate persistence.
 * Default session ("default") provides backward compatibility.
 */
const sessionRegistry = new Map<string, ThoughtGraph>();

/**
 * Get a ThoughtGraph instance scoped to a session.
 * Creates a new instance if one doesn't exist for this session.
 * @param sessionId - Unique session identifier (defaults to "default" for backward compat)
 */
export function getGraphInstance(sessionId: string = "default"): ThoughtGraph {
    if (!sessionRegistry.has(sessionId)) {
        const stateDir = process.cwd();
        const filename = sessionId === "default"
            ? "thought-graph-state.json"
            : `thought-graph-state-${sessionId}.json`;
        const persistPath = path.join(stateDir, filename);

        sessionRegistry.set(sessionId, new ThoughtGraph(persistPath));
    }
    return sessionRegistry.get(sessionId)!;
}

/**
 * Get all active session IDs.
 */
export function getSessionIds(): string[] {
    return Array.from(sessionRegistry.keys());
}

/**
 * Destroy a session's graph instance and free resources.
 */
export function destroySession(sessionId: string): boolean {
    const graph = sessionRegistry.get(sessionId);
    if (graph) {
        graph.clear();
        sessionRegistry.delete(sessionId);
        return true;
    }
    return false;
}

/**
 * Reset all session instances (useful for testing).
 */
export function resetGraphInstance(): void {
    sessionRegistry.clear();
}
