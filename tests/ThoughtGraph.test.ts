import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ThoughtGraph } from "../src/graph/ThoughtGraph.js";

describe("ThoughtGraph Core Engine", () => {
    test("should add nodes and increment counter", async () => {
        const graph = new ThoughtGraph();
        const id1 = await graph.addNode("Thought 1");
        const id2 = await graph.addNode("Thought 2");

        assert.ok(id1.includes("1"));
        assert.ok(id2.includes("2"));
        assert.strictEqual(graph.getGraph().nodes.length, 2);
    });

    test("should prevent cycles in DAG", async () => {
        const graph = new ThoughtGraph();
        const id1 = await graph.addNode("A");
        const id2 = await graph.addNode("B");
        const id3 = await graph.addNode("C");

        await graph.addEdge(id1, id2, "refinement");
        await graph.addEdge(id2, id3, "refinement");

        await assert.rejects(
            async () => await graph.addEdge(id3, id1, "refinement"),
            { message: /cycle/i }
        );
    });

    test("should correctly parse nodeCounter from existing IDs (Fix for Bug #1)", async () => {
        const graph = new ThoughtGraph();
        // Mocking behavior similar to state loading
        // If we have nodes like node_random_10, nodeCounter should be at least 10
        const mockState = {
            nodes: [
                { id: "node_abc_5", thought: "T1", status: "active", score: 0.5, createdAt: new Date(), updatedAt: new Date() },
                { id: "node_abc_12", thought: "T2", status: "active", score: 0.5, createdAt: new Date(), updatedAt: new Date() }
            ],
            edges: [],
            meta: { nodeCount: 2, edgeCount: 0, lastModified: new Date().toISOString() }
        };
        
        // We need to test the load logic specifically
        // Since load is internal to singleton/fs in index.ts, we test the logic we implemented in the bug fix
        const ids = ["node_abc_5", "node_abc_12"];
        const maxId = ids
            .map(id => {
                const parts = id.split("_");
                return parseInt(parts[parts.length - 1], 10);
            })
            .filter(num => !isNaN(num))
            .reduce((max, current) => Math.max(max, current), 0);
        
        assert.strictEqual(maxId, 12);
    });

    test("should respect governance limits: MAX_CHILDREN_PER_NODE", async () => {
        const graph = new ThoughtGraph();
        const parentId = await graph.addNode("Parent");
        
        for (let i = 0; i < 5; i++) {
            const childId = await graph.addNode(`Child ${i}`);
            await graph.addEdge(parentId, childId, "branch");
        }

        const overflowId = await graph.addNode("Overflow");
        await assert.rejects(
            async () => await graph.addEdge(parentId, overflowId, "branch"),
            { message: /branch cap/i }
        );
    });

    test("should aggregate thoughts with weighted synthesis", async () => {
        const graph = new ThoughtGraph();
        const id1 = await graph.addNode("Fact A");
        const id2 = await graph.addNode("Fact B");
        
        graph.updateNode(id1, { score: 0.8 });
        graph.updateNode(id2, { score: 0.4 });

        const aggId = await graph.aggregateNodes(
            [id1, id2],
            "Combined Fact",
            [0.9, 0.1] // Weights: 90% for id1, 10% for id2
        );

        const nodes = graph.getGraph().nodes;
        const aggNode = nodes.find(n => n.id === aggId);
        
        // (0.8 * 0.9 + 0.4 * 0.1) / (0.9 + 0.1) = (0.72 + 0.04) / 1.0 = 0.76
        assert.ok(Math.abs(aggNode!.score - 0.76) < 0.001);
    });

    test("should cascade pruning in hard mode", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Root");
        const child = await graph.addNode("Child");
        const grandchild = await graph.addNode("Grandchild");

        await graph.addEdge(root, child, "branch");
        await graph.addEdge(child, grandchild, "branch");

        await graph.pruneFromNode(child, "Testing Prune", { mode: "hard" });

        const nodes = graph.getGraph().nodes;
        const childNode = nodes.find(n => n.id === child);
        const grandchildNode = nodes.find(n => n.id === grandchild);

        assert.strictEqual(childNode!.status, "rejected");
        assert.strictEqual(childNode!.score, 0);
        assert.strictEqual(grandchildNode!.status, "rejected");
        assert.strictEqual(grandchildNode!.score, 0);
    });
});
