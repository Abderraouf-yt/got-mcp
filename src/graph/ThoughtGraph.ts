/**
 * ThoughtGraph Class
 * Core graph data structure for Graph of Thoughts (GoT) reasoning.
 * 
 * @module graph/ThoughtGraph
 * @description Manages nodes and edges in a directed graph structure
 */

import fs from "node:fs";
import * as lockfile from "proper-lockfile";
import { randomUUID } from 'node:crypto';
import path from "node:path";
import { logger } from "../server/logger.js";
import { Persistence } from "./Persistence.js";
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
    private instancePrefix: string;
    private listeners: Array<() => void> = [];

    // Auto-save & Batching state
    private isBatching: boolean = false;
    private isDirty: boolean = false;
    private saveQueue: Promise<void> = Promise.resolve();

    // O(1) Task Discovery Indices (Framework C)
    private indexExecutionState = {
        queued: new Set<string>(),
        processing: new Set<string>(),
        done: new Set<string>()
    };

    constructor(persistencePath?: string, limits?: Partial<GraphLimits>) {
        this.nodes = new Map();
        this.edges = [];
        this.nodeCounter = 0;
        this.limits = { ...DEFAULT_GRAPH_LIMITS, ...limits };
        this.instancePrefix = randomUUID().split('-')[0];

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

        // Poll every 500ms. WatchFile is safer than fs.watch across operating systems for basic JSON sync.
        fs.watchFile(this.persistencePath, { interval: 500 }, (curr, prev) => {
            if (curr.mtime.getTime() !== prev.mtime.getTime()) {
                logger.debug(`Persistence file changed for session, reloading graph...`);
                this.load();
            }
        });
    }

    /**
     * Clean up persistence resources (file watcher, save queue, listeners).
     * MUST be called when a ThoughtGraph instance with persistence is no longer needed,
     * especially in tests, to prevent the Node.js event loop from hanging.
     */
    public async close(): Promise<void> {
        // Drain any in-flight writes before releasing the watcher
        await this.saveQueue;
        if (this.persistencePath) {
            fs.unwatchFile(this.persistencePath);
        }
        this.listeners = [];
    }

    /**
     * Request an auto-save operation.
     * If batching, marks dirty. Otherwise, queues a disk write.
     */
    private async requestSave(): Promise<void> {
        if (this.isBatching) {
            this.isDirty = true;
            return;
        }

        // Serialized save queue prevents concurrent lock attempts within same process
        this.saveQueue = this.saveQueue.then(() => this.save());
        return this.saveQueue;
    }

    /**
     * Force an immediate save, bypassing queue (internal use only).
     */
    private async forceSave(): Promise<void> {
        return this.save();
    }

    /**
     * Wrap multiple mutations into a single unit of work.
     * Only one save occurs at the end.
     */
    async batch<T>(operation: () => Promise<T>): Promise<T> {
        const wasBatching = this.isBatching;
        this.isBatching = true;
        this.isDirty = false;

        try {
            const result = await operation();
            if (this.isDirty) {
                await this.save();
            }
            return result;
        } finally {
            this.isBatching = wasBatching;
            if (!wasBatching) {
                this.isDirty = false;
            }
        }
    }

    /**
     * Save the graph state to disk atomically across processes.
     * Uses asynchronous locks with exponential backoff to handle Swarm contention.
     * Delegates actual I/O to the Persistence class.
     */
    private async save(): Promise<void> {
        // Broadcast to any attached UI listeners (WebSockets/SSE)
        for (const listener of this.listeners) {
            try { listener(); } catch (e) { logger.error("Listener error", e); }
        }

        if (!this.persistencePath) return;

        let releaseLock: (() => Promise<void>) | undefined;
        try {
            // Ensure file exists before locking
            if (!fs.existsSync(this.persistencePath)) {
                await Persistence.save(this.persistencePath, this.getGraph());
            }

            // Acquire asynchronous IPC OS lock with exponential backoff retries
            releaseLock = await lockfile.lock(this.persistencePath, {
                retries: {
                    retries: 50,         // High retry count for heavy swarm contention
                    factor: 1.5,
                    minTimeout: 10,
                    maxTimeout: 1000,
                    randomize: true      // Jitter prevents thundering herd
                }
            });

            // Merge logic remains in memory before delegating to Persistence
            let diskData: any = null;
            try {
                diskData = Persistence.loadSync(this.persistencePath);
            } catch (e) {
                // Initial file might be empty or corrupted
            }

            if (diskData && diskData.nodes) {
                // Merge disk nodes that we don't have locally
                const mergedNodes = new Map(this.nodes);
                for (const dNode of diskData.nodes) {
                    if (!mergedNodes.has(dNode.id)) {
                        mergedNodes.set(dNode.id, dNode as ThoughtNode);
                    } else if ((dNode as ThoughtNode).updatedAt > mergedNodes.get(dNode.id)!.updatedAt) {
                        mergedNodes.set(dNode.id, dNode as ThoughtNode);
                    }
                }

                // Merge edges
                const mergedEdges = [...this.edges];
                const localEdgeIds = new Set(this.edges.map(e => `${e.from}-${e.to}-${e.relation}`));
                for (const dEdge of diskData.edges) {
                    const edgeId = `${dEdge.from}-${dEdge.to}-${dEdge.relation}`;
                    if (!localEdgeIds.has(edgeId)) {
                        mergedEdges.push(dEdge as ThoughtEdge);
                    }
                }

                this.nodes = mergedNodes;
                this.edges = mergedEdges;
                this.nodeCounter = Math.max(this.nodeCounter, diskData.nodeCounter || 0);
            }

            // Delegate to Persistence for atomic temp+rename write
            await Persistence.save(this.persistencePath, this.getGraph());
            this.isDirty = false;

            // Broadcast to any attached UI listeners (WebSockets/SSE)
            // FR-006: Moved after successful disk confirmation
            for (const listener of this.listeners) {
                try { listener(); } catch (e) { logger.error("Listener error", e); }
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to save graph: ${message}`);
        } finally {
            if (releaseLock) {
                try { await releaseLock(); } catch (e) { /* ignore release errors */ }
            }
        }
    }

    /**
     * Load the graph state from disk atomically.
     */
    private load(): void {
        if (!this.persistencePath || !fs.existsSync(this.persistencePath)) return;

        let releaseLock: (() => void) | undefined;
        try {
            releaseLock = lockfile.lockSync(this.persistencePath, { retries: 0 });

            const state = Persistence.loadSync(this.persistencePath) as GraphState;
            if (!state) return;

            this.nodes.clear();
            this.indexExecutionState.queued.clear();
            this.indexExecutionState.processing.clear();
            this.indexExecutionState.done.clear();

            state.nodes.forEach((node) => {
                this.nodes.set(node.id, node);
                if (node.executionState) {
                    this.indexExecutionState[node.executionState].add(node.id);
                }
            });

            this.edges = state.edges;

            // Update node counter to avoid ID collisions
            const maxId = Array.from(this.nodes.keys())
                .map(id => {
                    const parts = id.split("_");
                    return parseInt(parts[parts.length - 1], 10);
                })
                .filter(num => !isNaN(num))
                .reduce((max, num) => Math.max(max, num), 0);

            this.nodeCounter = maxId;

            for (const listener of this.listeners) {
                try { listener(); } catch (e) { logger.error("Listener error", e); }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if ((error as any).code !== 'ELOCKED') {
                logger.error(`Failed to load graph: ${message}`);
            }
        } finally {
            if (releaseLock) {
                try { releaseLock(); } catch (e) { /* ignore release errors */ }
            }
        }
    }

    /**
     * Subscribe to real-time graph mutations.
     * @param listener Callback fired when nodes/edges change
     * @returns Unsubscribe function
     */
    onUpdate(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Add a new thought node to the graph.
     * @param thought - The reasoning content
     * @param id - Optional custom ID (auto-generated if not provided)
     * @returns The ID of the created node
     */
    async addNode(thought: string, id?: string): Promise<string> {
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
        const nodeId = id || `node_${this.instancePrefix}_${this.nodeCounter}`;
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

        // Await persistence lock fully to avoid dropping under load
        await this.requestSave();
        return nodeId;
    }

    /**
     * Create an edge between two thought nodes.
     * @param from - Source node ID
     * @param to - Target node ID
     * @param relation - Type of relationship
     * @throws {ThoughtGraphNotFoundError} if either node doesn't exist
     */
    async addEdge(from: string, to: string, relation: ThoughtRelation): Promise<void> {
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
        await this.requestSave();
    }

    /**
     * Update properties of an existing thought node.
     * @param id - Node ID to update
     * @param updates - Partial node properties to merge
     * @throws {ThoughtGraphNotFoundError} if node doesn't exist
     */
    async updateNode(id: string, updates: Partial<Omit<ThoughtNode, "id" | "createdAt">>): Promise<void> {
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
        await this.requestSave();
    }

    /**
     * Atomically claim or update the execution state of a node (Swarm Orchestration).
     * @param id - Node ID
     * @param expectedOldState - The state we expect the node to be in (e.g. 'queued')
     * @param newState - The new state to apply
     * @param agentId - The authorId claiming it, if applicable
     * @throws {ThoughtGraphError} if the state doesn't match (race condition prevented)
     */
    async updateNodeExecutionState(id: string, expectedOldState: "queued" | "processing" | "done" | undefined, newState: "queued" | "processing" | "done", agentId?: string): Promise<void> {
        const node = this.nodes.get(id);
        if (!node) {
            throw new ThoughtGraphNotFoundError(id);
        }

        if (expectedOldState) {
            if (node.executionState !== expectedOldState) {
                throw new ThoughtGraphError(
                    `Failed to update execution state from '${expectedOldState}' to '${newState}'. ` +
                    `Node is currently in '${node.executionState}'. ` +
                    `This prevents race conditions between competing swarm agents.`
                );
            }
            // Remove from old O(1) Index Set
            this.indexExecutionState[expectedOldState].delete(id);
        } else if (node.executionState) {
            // If we weren't expecting a specific state, just clean up whatever it was in
            this.indexExecutionState[node.executionState].delete(id);
        }

        // Add to new O(1) Index Set
        this.indexExecutionState[newState].add(id);

        const updatedNode: ThoughtNode = {
            ...node,
            executionState: newState,
            authorId: agentId ?? node.authorId,
            updatedAt: new Date().toISOString()
        };

        this.nodes.set(id, updatedNode);
        await this.requestSave();
    }

    /**
     * SOTA Context Firewall: Compiles the exact reasoning context for a specific node,
     * filtering out all lateral branches.
     * @param nodeId - The target node that requires restricted context extraction
     * @param ignorePruned - If true, stops traversing upwards if it hits a rejected or zero-score node (Context Firewall improvement)
     */
    compileNodeContext(nodeId: string, ignorePruned: boolean = true): ThoughtNode[] {
        const targetNode = this.nodes.get(nodeId);
        if (!targetNode) {
            throw new ThoughtGraphNotFoundError(nodeId);
        }

        const contextNodes = new Map<string, ThoughtNode>();

        // Always include the target node itself
        contextNodes.set(nodeId, targetNode);

        // Recursively traverse backwards through all incoming edges
        const traverseBackwards = (currentId: string) => {
            const currentTargetNode = this.nodes.get(currentId);
            if (!currentTargetNode) return;

            const incomingEdges = this.edges.filter(e => e.to === currentId);
            for (const edge of incomingEdges) {
                const parentNode = this.nodes.get(edge.from);
                if (parentNode && !contextNodes.has(parentNode.id)) {
                    // Context Firewall: Stop traversing this path if the parent is explicitly rejected or soft-pruned to 0
                    if (ignorePruned && (parentNode.status === 'rejected' || parentNode.score === 0)) {
                        continue;
                    }
                    contextNodes.set(parentNode.id, parentNode);
                    traverseBackwards(parentNode.id);
                }
            }
            // Follow explicit dependencies
            if (currentTargetNode.dependencies && Array.isArray(currentTargetNode.dependencies)) {
                for (const depId of currentTargetNode.dependencies) {
                    const depNode = this.nodes.get(depId);
                    if (depNode && !contextNodes.has(depNode.id)) {
                        // Context Firewall: Stop here if soft-pruned
                        if (ignorePruned && (depNode.status === 'rejected' || depNode.score === 0)) {
                            continue;
                        }
                        contextNodes.set(depNode.id, depNode);
                        traverseBackwards(depNode.id);
                    }
                }
            }
        };

        // Start from the target node
        traverseBackwards(nodeId);

        // Sort topologically or chronologically to ensure context is read in order
        return Array.from(contextNodes.values()).sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }/**
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
     * Query nodes by specific metadata/swarm fields.
     * Uses O(1) Swarm Task Indices when querying strictly by executionState for massive scale task discovery.
     * @param filter - Object containing optional fields: executionState, agentTarget, status, authorId
     */
    queryNodes(filter: { executionState?: string; agentTarget?: string; status?: string; authorId?: string; }): ThoughtNode[] {
        // Optimization: If we are ONLY querying by executionState (the primary Swarm PULL pattern)
        if (filter.executionState && !filter.agentTarget && !filter.status && !filter.authorId) {
            const index = this.indexExecutionState[filter.executionState as keyof typeof this.indexExecutionState];
            if (index) {
                return Array.from(index).map(id => this.nodes.get(id)!).filter(Boolean);
            }
        }

        // Fallback for complex cross-filtered queries
        return Array.from(this.nodes.values()).filter(node => {
            if (filter.executionState && node.executionState !== filter.executionState) return false;
            if (filter.agentTarget && node.agentTarget !== filter.agentTarget) return false;
            if (filter.status && node.status !== filter.status) return false;
            if (filter.authorId && node.authorId !== filter.authorId) return false;
            return true;
        });
    }

    /**
     * Get all nodes in the winning path terminating at a specific node.
     * Traverses backwards from leaf to root.
     * @param leafNodeId - The ID of the leaf node to start from.
     * @returns Array of ThoughtNodes in the path.
     */
    public getWinningPathNodes(leafNodeId: string): ThoughtNode[] {
        const path: ThoughtNode[] = [];
        let currentId: string | undefined = leafNodeId;

        while (currentId) {
            const node = this.nodes.get(currentId);
            if (!node) break;
            path.push(node);

            // Find parent edge
            const parentEdge = this.edges.find(e => e.to === currentId);
            currentId = parentEdge?.from;
        }

        return path;
    }

    /**
     * Get the complete graph state as a serializable object.
     * @returns Full graph state with metadata
     */
    public getGraph(): GraphState & { nodeCounter: number; timestamp: string; limits: GraphLimits } {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: [...this.edges],
            nodeCounter: this.nodeCounter,
            limits: { ...this.limits },
            timestamp: new Date().toISOString(),
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
    async aggregateNodes(nodeIds: string[], synthesizedThought: string, weights?: number[]): Promise<string> {
        return this.batch(async () => {
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

            // Create the synthesized node
            const newId = await this.addNode(synthesizedThought);
            await this.updateNode(newId, {
                score: Math.round(weightedScore * 100) / 100,
                status: "validated",
                metadata: {
                    aggregatedFrom: nodeIds,
                    aggregationType: "weighted_synthesis",
                    sourceCount: nodeIds.length,
                    weightedScore: Math.round(weightedScore * 100) / 100,
                    confidence,
                    formula: "Σ(score×weight)/Σ(weights)",
                },
            });

            // Create aggregation edges from each source → new node
            for (const sourceId of nodeIds) {
                await this.addEdge(sourceId, newId, "aggregation");
            }

            return newId;
        });
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
    async pruneFromNode(
        nodeId: string,
        reason?: string,
        options?: { mode?: "hard" | "soft"; decayFactor?: number; trigger?: "manual" | "auto" }
    ): Promise<{ pruned: string[]; mode: string }> {
        return this.batch(async () => {
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
            this.isDirty = true; // Ensure batch save is triggered
            return { pruned, mode };
        });
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
        const softPruned = allNodes.filter(n => n.metadata?.pruneMode === "soft");
        const totalPruned = rejected.length + softPruned.length;
        
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
                ? Math.round((totalPruned / allNodes.length) * 100) / 100
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
    /**
     * Clear all nodes and edges from the graph.
     * Hard-resets both memory and disk state without merging.
     */
    async clear(): Promise<void> {
        this.nodes.clear();
        this.indexExecutionState.queued.clear();
        this.indexExecutionState.processing.clear();
        this.indexExecutionState.done.clear();
        this.edges = [];
        this.nodeCounter = 0;

        if (this.persistencePath && fs.existsSync(this.persistencePath)) {
            let releaseLock: (() => Promise<void>) | undefined;
            try {
                releaseLock = await lockfile.lock(this.persistencePath, { retries: { retries: 5 } });
                await Persistence.save(this.persistencePath, this.getGraph());
            } catch (error) {
                logger.error("Failed to clear disk state:", error);
            } finally {
                if (releaseLock) {
                    try { await releaseLock(); } catch (e) { /* ignore release errors */ }
                }
            }
        }

        // Notify visualizer of the complete wipe
        for (const listener of this.listeners) {
            try { listener(); } catch (e) { logger.error("Listener error", e); }
        }
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
    async restoreSnapshot(snapshot: { nodes: ThoughtNode[]; edges: ThoughtEdge[]; nodeCounter: number }): Promise<void> {
        let backupNodes: Map<string, ThoughtNode> | undefined;
        let backupEdges: ThoughtEdge[] | undefined;

        try {
            // Backup current state in case save fails
            backupNodes = new Map(this.nodes);
            backupEdges = [...this.edges];

            this.nodes.clear();
            snapshot.nodes.forEach(n => this.nodes.set(n.id, n));
            this.edges = [...snapshot.edges];
            this.nodeCounter = snapshot.nodeCounter;

            await this.save(); // wait for save here since it's a massive overwrite
        } catch (error) {
            // If save fails, revert to backup
            logger.error("Failed to save snapshot, reverting to previous state:", error);
            if (backupNodes) this.nodes = backupNodes;
            if (backupEdges) this.edges = backupEdges;
            // Note: nodeCounter might not be perfectly restored without a full snapshot of it
            // but for recovery, nodes/edges are most critical.
            throw error; // Re-throw to indicate failure
        }
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
    async reflectAndRefine(
        nodeId: string,
        critique: string,
        confidence: ConfidenceVector,
        refinedThought?: string
    ): Promise<{ critiqueId: string; branchId?: string; compositeScore: number }> {
        return this.batch(async () => {
            const node = this.nodes.get(nodeId);
            if (!node) {
                throw new ThoughtGraphNotFoundError(nodeId);
            }

            const compositeScore = this.computeCompositeScore(confidence);

            // Update the original node with confidence data
            await this.updateNode(nodeId, {
                score: compositeScore,
                confidence,
                updatedAt: new Date().toISOString(),
            });

            // Create critique node
            const critiqueId = await this.addNode(`[Reflection] ${critique}`);
            await this.addEdge(nodeId, critiqueId, "reflection");

            // Update critique node with assessment metadata
            const critiqueNode = this.nodes.get(critiqueId)!;
            await this.updateNode(critiqueId, {
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
                branchId = await this.addNode(refinedThought);
                await this.addEdge(nodeId, branchId, "branch");

                const branchNode = this.nodes.get(branchId)!;
                await this.updateNode(branchId, {
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
            this.isDirty = true;
            return { critiqueId, branchId, compositeScore };
        });
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

        const steps: ReasoningStep[] = result.path.map((node, index) => {
            // Find reflection children
            const reflections = this.edges
                .filter(e => e.from === node.id && e.relation === "reflection")
                .map(e => this.nodes.get(e.to)?.thought ?? "")
                .filter(Boolean);

            // Find branch siblings (alternative paths)
            const alternatives = this.edges
                .filter(e => e.from === node.id && e.relation === "branch")
                .map(e => this.nodes.get(e.to)?.thought ?? "")
                .filter(Boolean);

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

    /**
     * Synthesize a final conclusion from the winning path.
     * Prevents recursive garbage by selecting distinct evidence nodes.
     */
    private synthesizeWinningPath(path: ThoughtNode[]): string {
        if (path.length === 0) return "No conclusion reached";
        
        // Filter out reflection nodes for the main conclusion
        const nonReflectionNodes = path.filter(n => !n.thought.startsWith("[Reflection]"));
        
        if (nonReflectionNodes.length === 0) {
            return path[path.length - 1].thought;
        }

        const mainConclusion = nonReflectionNodes[nonReflectionNodes.length - 1].thought;
        
        // Filter out nodes that are purely structural or repetitive
        // And also exclude the node we just picked as mainConclusion
        const highQualityEvidence = path.filter(n => {
            if (n.thought === mainConclusion) return false;
            
            const isStructural = n.thought.toLowerCase().includes("analyze the risks") || 
                                n.thought.toLowerCase().includes("explore technical trade-offs");
            const isReflection = n.thought.startsWith("[Reflection]");
            
            return n.score > 0.5 && !isStructural && !isReflection;
        });
        
        if (highQualityEvidence.length === 0) return mainConclusion;

        // Deduplicate similar thoughts in the evidence chain
        const uniqueEvidence: string[] = [];
        const seenWords = new Set<string>();

        for (const node of highQualityEvidence) {
            const shortThought = node.thought.substring(0, 100).trim();
            const firstWords = shortThought.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
            if (!seenWords.has(firstWords)) {
                uniqueEvidence.push(shortThought + (node.thought.length > 100 ? "..." : ""));
                seenWords.add(firstWords);
            }
        }

        if (uniqueEvidence.length === 0) return mainConclusion;

        const summary = uniqueEvidence.join("; ");
        return `Conclusion based on [${summary}]: ${mainConclusion}`;
    }

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
    async runControllerLoop(
        prompt: string,
        thoughts: string[],
        options?: {
            maxIterations?: number;
            convergenceThreshold?: number;
            autoPruneBelow?: number;
            beamWidth?: number;
        }
    ): Promise<ControllerLoopResult> {
        return this.batch(async () => {
            const maxIterations = options?.maxIterations ?? 5;
            const convergenceThreshold = options?.convergenceThreshold ?? 0.85;
            const autoPruneBelow = options?.autoPruneBelow ?? 0.3;
            const beamWidth = options?.beamWidth ?? 2;

            const iterationLog: IterationLog[] = [];

            // Step 1: GENERATE — seed the graph with the prompt + initial thoughts
            const rootId = await this.addNode(prompt);
            await this.updateNode(rootId, { score: 0.5, status: "active" });

            for (const thought of thoughts) {
                const childId = await this.addNode(thought);
                await this.addEdge(rootId, childId, "branch");
                await this.updateNode(childId, { score: 0.5, status: "active" });
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
                    const depth = this.getNodeDepth(leaf.id);
                    const lengthScore = Math.min(leaf.thought.length / 400, 1.0); // 400 chars for full length bonus
                    const depthBonus = Math.min(depth * 0.1, 0.3); // Increased depth importance
                    const specificity = this.estimateSpecificity(leaf.thought);

                    // Base score increased to 0.2 to prevent stagnation
                    const autoScore = Math.min(
                        Math.round((0.2 + lengthScore * 0.2 + depthBonus + specificity * 0.4) * 100) / 100,
                        1.0
                    );

                    await this.updateNode(leaf.id, {
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
                        const result = await this.pruneFromNode(weak.id, `Auto-pruned: score ${weak.score} < ${autoPruneBelow}`, {
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

                const branchPrompts = [
                    "Analyze the risks of: ",
                    "Explore technical trade-offs for: ",
                    "Compare alternatives to: ",
                    "Evaluate scalability of: ",
                    "Assess implementation cost for: "
                ];

                for (const mid of midTier.slice(0, 3)) { // Limit branching to top 3
                    const existingChildren = this.edges.filter(e => e.from === mid.id).length;
                    if (existingChildren < this.limits.maxBranchFactor && this.nodes.size < this.limits.maxNodes - 5) {
                        try {
                            const promptPrefix = branchPrompts[Math.floor(Math.random() * branchPrompts.length)];
                            const altId = await this.addNode(`${promptPrefix}${mid.thought.substring(0, 150)}...`);
                            await this.addEdge(mid.id, altId, "branch");
                            await this.updateNode(altId, { score: 0.5, status: "active" });
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
                        await this.reflectAndRefine(
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
            this.isDirty = true;

            return {
                converged,
                iterations: iteration,
                winningPath: {
                    pathIds: finalPath.pathIds,
                    totalScore: finalPath.totalScore,
                    conclusion: this.synthesizeWinningPath(finalPath.path),
                },
                trace,
                metrics,
                iterationLog,
            };
        });
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
        let score = 0.2; // Lower base to allow for more variance

        // Indicators of specific, evidence-based thinking
        if (/\d+/.test(thought)) score += 0.15;           // Contains numbers
        if (/vs\.?|versus|compared|better|worse/i.test(thought)) score += 0.15; // Comparisons
        if (/because|since|therefore|thus|hence/i.test(thought)) score += 0.1; // Causal reasoning
        if (/however|but|although|despite/i.test(thought)) score += 0.1;       // Nuance
        if (/example|specifically|for instance/i.test(thought)) score += 0.1;  // Concreteness
        if (/\b(data|evidence|research|study|benchmark)\b/i.test(thought)) score += 0.2; // Evidence

        // Hallucination/Repetition Detection: Penalize repetitive phrases
        const words = thought.toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        const repetitionRatio = words.length > 0 ? uniqueWords.size / words.length : 1;
        
        if (repetitionRatio < 0.5) score -= 0.4; // High repetition penalty
        if (thought.includes("[Alternative] [Alternative]")) score -= 0.5; // Recursive garbage penalty

        return Math.max(0, Math.min(score, 1.0));
    }

    /**
     * Export the validated reasoning path terminating at a specific node
     * structured strictly for the standard `@mcp:memory` Knowledge Graph format.
     */
    exportProvenMemory(leafNodeId?: string) {
        const leaf = leafNodeId ? this.nodes.get(leafNodeId) : (() => {
            const p = this.findWinningPath({ beamWidth: 1 }).path;
            return p.length > 0 ? p[p.length - 1] : undefined;
        })();

        if (!leaf) {
            throw new Error("No valid leaf node found to export memory from.");
        }

        const visited = new Set<string>();
        const queue = [leaf.id];
        const entities: { name: string; entityType: string; observations: string[] }[] = [];
        const relations: { from: string; to: string; relationType: string }[] = [];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const node = this.nodes.get(currentId);
            if (!node) continue;

            // Only include non-rejected nodes to maintain the logically sound path
            if (node.status === "rejected") continue;

            const observations = [
                node.thought,
                `Score: ${node.score}`,
                `Status: ${node.status}`
            ];

            if (node.metadata?.confidence) {
                observations.push(`Confidence: ${JSON.stringify(node.metadata.confidence)}`);
            }
            if (node.metadata?.synthesis) {
                observations.push(`Synthesis: ${node.metadata.synthesis}`);
            }

            entities.push({
                name: `Thought ${node.id}`,
                entityType: "ThoughtNode",
                observations
            });

            // Find parents to continue backward traversal
            const incomingEdges = this.edges.filter(e => e.to === currentId);
            for (const edge of incomingEdges) {
                const parent = this.nodes.get(edge.from);
                if (parent && parent.status !== "rejected") {
                    queue.push(edge.from);
                    relations.push({
                        from: `Thought ${edge.from}`,
                        to: `Thought ${currentId}`,
                        relationType: edge.relation === "contradiction" ? "contradicts" :
                            edge.relation === "refinement" ? "refines" :
                                edge.relation === "aggregation" ? "aggregates" :
                                    edge.relation === "branch" ? "branches_to" : "supports"
                    });
                }
            }
        }

        return { entities: entities.reverse(), relations: relations.reverse() };
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
 * Sanitize a session ID to prevent path traversal attacks.
 * Only allows alphanumeric, hyphens, underscores, and dots.
 * Rejects any path separator, null byte, or ".." sequences.
 */
function sanitizeSessionId(sessionId: string): string {
    // Reject any sessionId containing path traversal patterns or separators
    if (/\.\./.test(sessionId) || /[/\\]/.test(sessionId) || /\0/.test(sessionId)) {
        throw new Error(`Invalid sessionId: path traversal attempt detected`);
    }
    // Strip any remaining non-alphanumeric characters except ._- 
    // (defense in depth — the above check should catch everything)
    return sessionId.replace(/[^a-zA-Z0-9._-]/g, "");
}

/**
 * Validate that a resolved path stays within the allowed base directory.
 * Prevents symlink escapes and path traversal even after sanitization.
 */
function containPath(resolvedPath: string, baseDir: string): string {
    const normalized = path.resolve(resolvedPath);
    const base = path.resolve(baseDir);
    if (!normalized.startsWith(base + path.sep) && normalized !== base) {
        throw new Error(`Path traversal detected: ${normalized} is outside ${base}`);
    }
    return normalized;
}

/**
 * Get a ThoughtGraph instance scoped to a session.
 * Creates a new instance if one doesn't exist for this session.
 * @param sessionId - Unique session identifier (defaults to "default" for backward compat)
 * @throws {Error} if sessionId contains path traversal characters
 */
export function getGraphInstance(sessionId: string = "default"): ThoughtGraph {
    // Sanitize the session ID to prevent path traversal via crafted sessionId
    const safeSessionId = sessionId === "default" ? sessionId : sanitizeSessionId(sessionId);

    if (!sessionRegistry.has(safeSessionId)) {
        const stateDir = process.env.THOUGHT_GRAPH_STATE_DIR || process.cwd();
        const filename = safeSessionId === "default"
            ? "thought-graph-state.json"
            : `thought-graph-state-${safeSessionId}.json`;
        const rawPath = path.join(stateDir, filename);

        // Contain the resolved path within the state directory
        const persistPath = containPath(rawPath, stateDir);

        sessionRegistry.set(safeSessionId, new ThoughtGraph(persistPath));
    }
    return sessionRegistry.get(safeSessionId)!;
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
