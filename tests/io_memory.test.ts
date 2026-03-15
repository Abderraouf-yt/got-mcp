import test from 'node:test';
import assert from 'node:assert';
import { ThoughtGraph } from '../src/graph/ThoughtGraph.js';

test('ThoughtGraph Path Traversal', async (t) => {
    const graph = new ThoughtGraph();
    const n1 = await graph.addNode('Root');
    const n2 = await graph.addNode('Child');
    await graph.addEdge(n1, n2, 'refinement');
    const n3 = await graph.addNode('Winning Leaf');
    await graph.addEdge(n2, n3, 'refinement');

    await t.test('should extract path backwards from leaf to root', () => {
        const path = graph.getWinningPathNodes(n3);
        assert.strictEqual(path.length, 3);
        assert.strictEqual(path[0].id, n3);
        assert.strictEqual(path[1].id, n2);
        assert.strictEqual(path[2].id, n1);
    });

    await t.test('should return only leaf for isolated node', async () => {
        const n4 = await graph.addNode('Isolated');
        const path = graph.getWinningPathNodes(n4);
        assert.strictEqual(path.length, 1);
        assert.strictEqual(path[0].id, n4);
    });
});
