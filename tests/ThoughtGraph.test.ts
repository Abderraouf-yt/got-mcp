import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ThoughtGraph, ThoughtGraphNotFoundError } from '../src/graph/ThoughtGraph.js';

describe('ThoughtGraph Core Logic', () => {
    let graph: ThoughtGraph;

    beforeEach(() => {
        // Initialize without persistence path for pure in-memory testing
        graph = new ThoughtGraph();
    });

    it('should add a node successfully', () => {
        const id = graph.addNode('Initial thought');
        assert.ok(id);

        const node = graph.getNode(id);
        assert.ok(node);
        assert.equal(node.thought, 'Initial thought');
        assert.equal(node.status, 'active');
        assert.equal(graph.size, 1);
    });

    it('should add an edge between two valid nodes', () => {
        const id1 = graph.addNode('Thought 1');
        const id2 = graph.addNode('Thought 2');

        graph.addEdge(id1, id2, 'refinement');

        assert.equal(graph.edgeCount, 1);
        const outgoing = graph.getOutgoingEdges(id1);
        assert.equal(outgoing.length, 1);
        assert.equal(outgoing[0].to, id2);
        assert.equal(outgoing[0].relation, 'refinement');
    });

    it('should throw ThoughtGraphNotFoundError when adding edge with missing node', () => {
        const id1 = graph.addNode('Thought 1');

        assert.throws(() => {
            graph.addEdge(id1, 'missing_id', 'support');
        }, ThoughtGraphNotFoundError);
    });

    it('should update a node status and score', () => {
        const id = graph.addNode('Test Node');

        graph.updateNode(id, { status: 'validated', score: 0.95 });

        const node = graph.getNode(id);
        assert.equal(node?.status, 'validated');
        assert.equal(node?.score, 0.95);
    });

    it('should merge metadata during update', () => {
        const id = graph.addNode('Metadata test');

        graph.updateNode(id, { metadata: { source: 'User' } });
        graph.updateNode(id, { metadata: { critique: 'Good job' } });

        const node = graph.getNode(id);
        assert.equal(node?.metadata?.source, 'User');
        assert.equal(node?.metadata?.critique, 'Good job');
    });

    it('should clear the entire graph', () => {
        const id1 = graph.addNode('Node 1');
        const id2 = graph.addNode('Node 2');
        graph.addEdge(id1, id2, 'branch');

        assert.equal(graph.size, 2);
        assert.equal(graph.edgeCount, 1);

        graph.clear();

        assert.equal(graph.size, 0);
        assert.equal(graph.edgeCount, 0);
    });
});
