/**
 * ThoughtGraph Class
 * Core graph data structure for Graph of Thoughts (GoT) reasoning.
 * 
 * @module graph/ThoughtGraph
 * @description Manages nodes and edges in a directed graph structure
 */

import type {
    ThoughtNode,
    ThoughtEdge,
    ThoughtRelation,
    ThoughtStatus,
    GraphState,
} from "../types.js";

/**
 * In-memory graph database for thought nodes and their relationships.
 * Implements the Graph of Thoughts (GoT) pattern for non-linear reasoning.
 */
export class ThoughtGraph {
    private nodes: Map<string, ThoughtNode> = new Map();
    private edges: ThoughtEdge[] = [];
    private nodeCounter: number = 0;

    /**
     * Add a new thought node to the graph.
     * @param thought - The reasoning content
     * @param id - Optional custom ID (auto-generated if not provided)
     * @returns The ID of the created node
     */
    addNode(thought: string, id?: string): string {
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
        return nodeId;
    }

    /**
     * Create an edge between two thought nodes.
     * @param from - Source node ID
     * @param to - Target node ID
     * @param relation - Type of relationship
     * @throws Error if either node doesn't exist
     */
    addEdge(from: string, to: string, relation: ThoughtRelation): void {
        if (!this.nodes.has(from)) {
            throw new Error(`Source node '${from}' not found`);
        }
        if (!this.nodes.has(to)) {
            throw new Error(`Target node '${to}' not found`);
        }

        const edge: ThoughtEdge = {
            from,
            to,
            relation,
            createdAt: new Date().toISOString(),
        };

        this.edges.push(edge);
    }

    /**
     * Update properties of an existing thought node.
     * @param id - Node ID to update
     * @param updates - Partial node properties to merge
     * @throws Error if node doesn't exist
     */
    updateNode(id: string, updates: Partial<Omit<ThoughtNode, "id" | "createdAt">>): void {
        const node = this.nodes.get(id);
        if (!node) {
            throw new Error(`Node '${id}' not found`);
        }

        const updatedNode: ThoughtNode = {
            ...node,
            ...updates,
            updatedAt: new Date().toISOString(),
            // Merge metadata if both exist
            metadata: updates.metadata
                ? { ...node.metadata, ...updates.metadata }
                : node.metadata,
        };

        this.nodes.set(id, updatedNode);
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
     * Clear all nodes and edges from the graph.
     * Resets the node counter.
     */
    clear(): void {
        this.nodes.clear();
        this.edges = [];
        this.nodeCounter = 0;
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
}

/**
 * Singleton instance for the main MCP server.
 * Ensures all handlers share the same graph state.
 */
let graphInstance: ThoughtGraph | null = null;

/**
 * Get the singleton ThoughtGraph instance.
 * Creates a new instance if one doesn't exist.
 */
export function getGraphInstance(): ThoughtGraph {
    if (!graphInstance) {
        graphInstance = new ThoughtGraph();
    }
    return graphInstance;
}

/**
 * Reset the singleton instance (useful for testing).
 */
export function resetGraphInstance(): void {
    graphInstance = null;
}
