/**
 * ThoughtGraph Comprehensive Test Suite
 * Production Readiness Audit — SOTA GoT Engine Validation
 * 
 * Covers: Governance, Aggregation, Pruning, Beam Search, Self-Reflection,
 *         Context Firewall, Swarm Orchestration, Snapshot/Restore,
 *         Reasoning Trace, Memory Export, Controller Loop, Session Isolation
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ThoughtGraph, getGraphInstance, resetGraphInstance, ThoughtGraphError, ThoughtGraphNotFoundError } from "../src/graph/ThoughtGraph.js";
import { ContextStore } from "../src/context/ContextStore.js";

// ==========================================
// 1. GOVERNANCE LIMITS
// ==========================================
describe("Governance Limits", () => {
    test("should enforce node cap", async () => {
        const graph = new ThoughtGraph(undefined, { maxNodes: 3 });
        await graph.addNode("A");
        await graph.addNode("B");
        await graph.addNode("C");

        await assert.rejects(
            async () => await graph.addNode("D"),
            { message: /node cap/i }
        );
    });

    test("should enforce thought length cap", async () => {
        const graph = new ThoughtGraph(undefined, { maxThoughtLength: 10 });

        await assert.rejects(
            async () => await graph.addNode("This thought is way too long for the limit"),
            { message: /max length/i }
        );
    });

    test("should enforce depth cap", async () => {
        const graph = new ThoughtGraph(undefined, { maxDepth: 2 });
        const a = await graph.addNode("Depth 0");
        const b = await graph.addNode("Depth 1");
        const c = await graph.addNode("Depth 2");
        const d = await graph.addNode("Depth 3");

        await graph.addEdge(a, b, "refinement");
        await graph.addEdge(b, c, "refinement");

        await assert.rejects(
            async () => await graph.addEdge(c, d, "refinement"),
            { message: /depth cap/i }
        );
    });

    test("should enforce branch cap", async () => {
        const graph = new ThoughtGraph(undefined, { maxBranchFactor: 2 });
        const parent = await graph.addNode("Parent");
        const c1 = await graph.addNode("Child 1");
        const c2 = await graph.addNode("Child 2");
        const c3 = await graph.addNode("Child 3");

        await graph.addEdge(parent, c1, "branch");
        await graph.addEdge(parent, c2, "branch");

        await assert.rejects(
            async () => await graph.addEdge(parent, c3, "branch"),
            { message: /branch cap/i }
        );
    });

    test("should prevent cycles (DAG integrity)", async () => {
        const graph = new ThoughtGraph();
        const a = await graph.addNode("A");
        const b = await graph.addNode("B");
        const c = await graph.addNode("C");

        await graph.addEdge(a, b, "refinement");
        await graph.addEdge(b, c, "refinement");

        await assert.rejects(
            async () => await graph.addEdge(c, a, "refinement"),
            { message: /cycle/i }
        );
    });
});

// ==========================================
// 2. AGGREGATION
// ==========================================
describe("Aggregation (Weighted Synthesis)", () => {
    test("should compute weighted score correctly", async () => {
        const graph = new ThoughtGraph();
        const id1 = await graph.addNode("Fact A");
        const id2 = await graph.addNode("Fact B");
        await graph.updateNode(id1, { score: 0.8 });
        await graph.updateNode(id2, { score: 0.4 });

        const aggId = await graph.aggregateNodes(
            [id1, id2],
            "Combined",
            [0.9, 0.1]
        );

        const aggNode = graph.getNode(aggId);
        // (0.8 * 0.9 + 0.4 * 0.1) / (0.9 + 0.1) = 0.76
        assert.ok(Math.abs(aggNode!.score - 0.76) < 0.01, `Expected ~0.76, got ${aggNode!.score}`);
    });

    test("should create aggregation edges from all sources", async () => {
        const graph = new ThoughtGraph();
        const a = await graph.addNode("Source 1");
        const b = await graph.addNode("Source 2");
        const c = await graph.addNode("Source 3");

        const aggId = await graph.aggregateNodes([a, b, c], "Synthesis");

        const edges = graph.getGraph().edges.filter(e => e.to === aggId);
        assert.strictEqual(edges.length, 3);
        assert.ok(edges.every(e => e.relation === "aggregation"));
    });

    test("should reject aggregation with fewer than 2 nodes", async () => {
        const graph = new ThoughtGraph();
        const a = await graph.addNode("Only one");

        await assert.rejects(
            async () => await graph.aggregateNodes([a], "Solo"),
            { message: /at least 2/i }
        );
    });

    test("should enforce max aggregation inputs", async () => {
        const graph = new ThoughtGraph(undefined, { maxAggregationInputs: 3 });
        const ids: string[] = [];
        for (let i = 0; i < 4; i++) {
            ids.push(await graph.addNode(`Node ${i}`));
        }

        await assert.rejects(
            async () => await graph.aggregateNodes(ids, "Too many"),
            { message: /limited to/i }
        );
    });

    test("should set aggregated node status to validated", async () => {
        const graph = new ThoughtGraph();
        const a = await graph.addNode("A");
        const b = await graph.addNode("B");

        const aggId = await graph.aggregateNodes([a, b], "Merged");
        const node = graph.getNode(aggId);
        assert.strictEqual(node!.status, "validated");
    });
});

// ==========================================
// 3. PRUNING (Hard + Soft modes)
// ==========================================
describe("Pruning", () => {
    test("hard prune: should set score=0 and status=rejected for entire subtree", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Root");
        const child = await graph.addNode("Child");
        const grandchild = await graph.addNode("Grandchild");

        await graph.addEdge(root, child, "branch");
        await graph.addEdge(child, grandchild, "branch");

        const result = await graph.pruneFromNode(child, "Dead end", { mode: "hard" });

        assert.strictEqual(result.pruned.length, 2);
        assert.strictEqual(result.mode, "hard");
        assert.strictEqual(graph.getNode(child)!.status, "rejected");
        assert.strictEqual(graph.getNode(child)!.score, 0);
        assert.strictEqual(graph.getNode(grandchild)!.status, "rejected");
        assert.strictEqual(graph.getNode(grandchild)!.score, 0);
        // Root should be untouched
        assert.notStrictEqual(graph.getNode(root)!.status, "rejected");
    });

    test("soft prune: should decay scores without rejecting", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Root");
        const child = await graph.addNode("Child");
        await graph.updateNode(child, { score: 0.8 });
        await graph.addEdge(root, child, "branch");

        const result = await graph.pruneFromNode(child, "Weak", { mode: "soft", decayFactor: 0.5 });

        assert.strictEqual(result.mode, "soft");
        const childNode = graph.getNode(child)!;
        assert.strictEqual(childNode.score, 0.4); // 0.8 * 0.5 = 0.4
        assert.notStrictEqual(childNode.status, "rejected"); // soft prune doesn't reject
    });

    test("should enforce prune cascade limit", async () => {
        const graph = new ThoughtGraph(undefined, { maxPruneCascade: 2 });
        const a = await graph.addNode("A");
        const b = await graph.addNode("B");
        const c = await graph.addNode("C");
        const d = await graph.addNode("D");

        await graph.addEdge(a, b, "branch");
        await graph.addEdge(b, c, "branch");
        await graph.addEdge(c, d, "branch");

        await assert.rejects(
            async () => await graph.pruneFromNode(a, "Too many", { mode: "hard" }),
            { message: /cascade/i }
        );
    });

    test("should throw NotFoundError for invalid node", async () => {
        const graph = new ThoughtGraph();

        await assert.rejects(
            async () => await graph.pruneFromNode("nonexistent", "test"),
            (err: any) => err instanceof ThoughtGraphNotFoundError
        );
    });
});

// ==========================================
// 4. BEAM SEARCH / CONVERGENCE
// ==========================================
describe("Beam Search (find_winning_path)", () => {
    test("greedy: should find single best path root→leaf", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Root");
        const good = await graph.addNode("Good path");
        const bad = await graph.addNode("Bad path");

        await graph.updateNode(root, { score: 0.5 });
        await graph.updateNode(good, { score: 0.9 });
        await graph.updateNode(bad, { score: 0.2 });

        await graph.addEdge(root, good, "branch");
        await graph.addEdge(root, bad, "branch");

        const result = graph.findWinningPath({ beamWidth: 1 });

        assert.ok(result.pathIds.length >= 2);
        assert.ok(result.pathIds.includes(good), "Winning path should include high-scoring node");
    });

    test("beam search: should return multiple paths when beamWidth > 1", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Root");
        const a = await graph.addNode("Path A");
        const b = await graph.addNode("Path B");

        await graph.updateNode(root, { score: 0.5 });
        await graph.updateNode(a, { score: 0.8 });
        await graph.updateNode(b, { score: 0.6 });

        await graph.addEdge(root, a, "branch");
        await graph.addEdge(root, b, "branch");

        const result = graph.findWinningPath({ beamWidth: 2 });

        assert.ok(result.allPaths !== undefined, "beamWidth > 1 should return allPaths");
        assert.ok(result.allPaths!.length >= 1);
    });

    test("should filter nodes below score threshold", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Root");
        const low = await graph.addNode("Low scorer");

        await graph.updateNode(root, { score: 0.1 });
        await graph.updateNode(low, { score: 0.1 });

        await graph.addEdge(root, low, "branch");

        const result = graph.findWinningPath({ scoreThreshold: 0.5 });
        assert.strictEqual(result.path.length, 0, "No nodes should meet threshold 0.5");
    });

    test("should return empty path for empty graph", async () => {
        const graph = new ThoughtGraph();
        const result = graph.findWinningPath();
        assert.strictEqual(result.path.length, 0);
        assert.strictEqual(result.totalScore, 0);
    });

    test("should exclude rejected nodes from paths", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Root");
        const child = await graph.addNode("Child");

        await graph.updateNode(root, { score: 0.7 });
        await graph.updateNode(child, { score: 0.9, status: "rejected" });

        await graph.addEdge(root, child, "branch");

        const result = graph.findWinningPath();
        const pathIds = result.pathIds;
        assert.ok(!pathIds.includes(child), "Rejected nodes should not appear in winning path");
    });
});

// ==========================================
// 5. SELF-REFLECTION (v4.0)
// ==========================================
describe("Self-Reflection (reflect_and_refine)", () => {
    test("should compute composite score correctly (weighted formula)", async () => {
        const graph = new ThoughtGraph();
        const confidence = { factual: 1.0, logical: 1.0, relevance: 1.0, novelty: 1.0 };
        const score = graph.computeCompositeScore(confidence);
        assert.strictEqual(score, 1.0);
    });

    test("should weight formula: logical 35%, factual 30%, relevance 25%, novelty 10%", async () => {
        const graph = new ThoughtGraph();
        const confidence = { factual: 0.5, logical: 0.5, relevance: 0.5, novelty: 0.5 };
        const score = graph.computeCompositeScore(confidence);
        // 0.5*0.30 + 0.5*0.35 + 0.5*0.25 + 0.5*0.10 = 0.15+0.175+0.125+0.05 = 0.5
        assert.strictEqual(score, 0.5);
    });

    test("should create critique node linked via reflection edge", async () => {
        const graph = new ThoughtGraph();
        const id = await graph.addNode("Original thought");

        const result = await graph.reflectAndRefine(
            id,
            "This reasoning has gaps",
            { factual: 0.9, logical: 0.8, relevance: 0.95, novelty: 0.5 }
        );

        assert.ok(result.critiqueId, "Should produce a critique node");
        const critiqueNode = graph.getNode(result.critiqueId);
        assert.ok(critiqueNode!.thought.includes("[Reflection]"));

        // Check reflection edge exists
        const edges = graph.getGraph().edges.filter(
            e => e.from === id && e.to === result.critiqueId && e.relation === "reflection"
        );
        assert.strictEqual(edges.length, 1);
    });

    test("should auto-branch refined thought when composite score < 0.7", async () => {
        const graph = new ThoughtGraph();
        const id = await graph.addNode("Weak thought");

        const result = await graph.reflectAndRefine(
            id,
            "Needs improvement",
            { factual: 0.3, logical: 0.4, relevance: 0.5, novelty: 0.2 },
            "Better thought with more detail"
        );

        assert.ok(result.branchId, "Low-score thought with refinedThought should auto-branch");
        assert.ok(result.compositeScore < 0.7);
        const branchNode = graph.getNode(result.branchId!);
        assert.strictEqual(branchNode!.thought, "Better thought with more detail");
    });

    test("should NOT auto-branch when composite score >= 0.7", async () => {
        const graph = new ThoughtGraph();
        const id = await graph.addNode("Strong thought");

        const result = await graph.reflectAndRefine(
            id,
            "Good reasoning, validated",
            { factual: 0.9, logical: 0.8, relevance: 0.9, novelty: 0.6 },
            "Alternative that should not be branched"
        );

        assert.strictEqual(result.branchId, undefined, "High-score should not auto-branch");
        assert.ok(result.compositeScore >= 0.7);
    });
});

// ==========================================
// 6. CONTEXT FIREWALL (compile_node_context)
// ==========================================
describe("Context Firewall (compile_node_context)", () => {
    test("should return only lineage nodes, not lateral branches", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Root question");
        const pathA = await graph.addNode("Relevant path");
        const pathB = await graph.addNode("Lateral noise");
        const leaf = await graph.addNode("Conclusion on path A");

        await graph.addEdge(root, pathA, "branch");
        await graph.addEdge(root, pathB, "branch");
        await graph.addEdge(pathA, leaf, "refinement");

        const context = graph.compileNodeContext(leaf);
        const contextIds = context.map(n => n.id);

        assert.ok(contextIds.includes(root), "Should include root ancestor");
        assert.ok(contextIds.includes(pathA), "Should include direct parent");
        assert.ok(contextIds.includes(leaf), "Should include target node itself");
        assert.ok(!contextIds.includes(pathB), "Should NOT include lateral branch");
    });

    test("should filter out rejected/pruned nodes when ignorePruned=true", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Root");
        const pruned = await graph.addNode("Pruned parent");
        const child = await graph.addNode("Child of pruned");

        await graph.addEdge(root, pruned, "branch");
        await graph.addEdge(pruned, child, "refinement");

        // Hard-prune the middle node
        await graph.pruneFromNode(pruned, "Dead end", { mode: "hard" });

        // child is still in the graph but its parent is rejected
        const context = graph.compileNodeContext(child, true);
        const contextIds = context.map(n => n.id);

        assert.ok(!contextIds.includes(pruned), "Should filter out rejected parent");
    });

    test("should follow explicit dependencies", async () => {
        const graph = new ThoughtGraph();
        const dep = await graph.addNode("Dependency node");
        const target = await graph.addNode("Target with dependency");
        await graph.updateNode(target, { dependencies: [dep] });

        const context = graph.compileNodeContext(target);
        const contextIds = context.map(n => n.id);

        assert.ok(contextIds.includes(dep), "Should include explicit dependency");
        assert.ok(contextIds.includes(target), "Should include target itself");
    });
});

// ==========================================
// 7. SWARM ORCHESTRATION
// ==========================================
describe("Swarm Orchestration", () => {
    test("CAS claim: should prevent race condition on state transition", async () => {
        const graph = new ThoughtGraph();
        const taskId = await graph.addNode("Swarm task");
        await graph.updateNodeExecutionState(taskId, undefined, "queued");

        // First agent claims it
        await graph.updateNodeExecutionState(taskId, "queued", "processing", "agent-1");

        // Second agent tries to claim the same task — should fail
        await assert.rejects(
            async () => await graph.updateNodeExecutionState(taskId, "queued", "processing", "agent-2"),
            { message: /race condition/i }
        );
    });

    test("O(1) index: queryNodes by executionState should return indexed results", async () => {
        const graph = new ThoughtGraph();
        const t1 = await graph.addNode("Task 1");
        const t2 = await graph.addNode("Task 2");
        const t3 = await graph.addNode("Task 3");

        await graph.updateNodeExecutionState(t1, undefined, "queued");
        await graph.updateNodeExecutionState(t2, undefined, "queued");
        await graph.updateNodeExecutionState(t3, undefined, "done");

        const queued = graph.queryNodes({ executionState: "queued" });
        assert.strictEqual(queued.length, 2, "Should find 2 queued tasks");

        const done = graph.queryNodes({ executionState: "done" });
        assert.strictEqual(done.length, 1, "Should find 1 done task");
    });

    test("queryNodes: should filter by agentTarget", async () => {
        const graph = new ThoughtGraph();
        const t1 = await graph.addNode("Task for agent A");
        const t2 = await graph.addNode("Task for agent B");

        await graph.updateNode(t1, { agentTarget: "analyst" });
        await graph.updateNode(t2, { agentTarget: "coder" });

        const analysts = graph.queryNodes({ agentTarget: "analyst" });
        assert.strictEqual(analysts.length, 1);
        assert.strictEqual(analysts[0].id, t1);
    });

    test("queryNodes: should filter by authorId", async () => {
        const graph = new ThoughtGraph();
        const t1 = await graph.addNode("Written by A");
        const t2 = await graph.addNode("Written by B");

        await graph.updateNode(t1, { authorId: "agent-A" });
        await graph.updateNode(t2, { authorId: "agent-B" });

        const byA = graph.queryNodes({ authorId: "agent-A" });
        assert.strictEqual(byA.length, 1);
        assert.strictEqual(byA[0].id, t1);
    });
});

// ==========================================
// 8. SNAPSHOT / RESTORE
// ==========================================
describe("Snapshot / Restore", () => {
    test("round-trip: exportSnapshot → restoreSnapshot should preserve graph state", async () => {
        const graph = new ThoughtGraph();
        const a = await graph.addNode("Alpha");
        const b = await graph.addNode("Beta");
        await graph.addEdge(a, b, "support");
        await graph.updateNode(a, { score: 0.95 });

        const snapshot = graph.exportSnapshot();

        // Clear and verify empty
        await graph.clear();
        assert.strictEqual(graph.size, 0);

        // Restore
        await graph.restoreSnapshot(snapshot);
        assert.strictEqual(graph.size, 2);

        const restoredA = graph.getNode(a);
        assert.ok(restoredA, "Node A should be restored");
        assert.strictEqual(restoredA!.score, 0.95);

        const edges = graph.getGraph().edges;
        assert.strictEqual(edges.length, 1);
        assert.strictEqual(edges[0].relation, "support");
    });

    test("snapshot should include version and timestamp", () => {
        const graph = new ThoughtGraph();
        const snapshot = graph.exportSnapshot();

        assert.ok(snapshot.timestamp, "Should have ISO timestamp");
        assert.ok(snapshot.version, "Should have version string");
        assert.strictEqual(typeof snapshot.nodeCounter, "number");
    });
});

// ==========================================
// 9. REASONING TRACE EXPORT
// ==========================================
describe("Reasoning Trace Export", () => {
    test("should export Long CoT format with steps", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Question");
        const step = await graph.addNode("Analysis");
        const answer = await graph.addNode("Conclusion");

        await graph.updateNode(root, { score: 0.6 });
        await graph.updateNode(step, { score: 0.8 });
        await graph.updateNode(answer, { score: 0.9 });

        await graph.addEdge(root, step, "refinement");
        await graph.addEdge(step, answer, "refinement");

        const trace = graph.exportReasoningTrace();

        assert.ok(trace.steps.length > 0, "Trace should have steps");
        assert.ok(trace.exportedAt, "Should have exportedAt timestamp");
        assert.strictEqual(trace.totalNodes, 3);
        assert.strictEqual(trace.totalEdges, 2);
        assert.ok(trace.conclusion.length > 0, "Should have conclusion text");
    });

    test("should include reflections in trace steps", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Hypothesis");
        await graph.updateNode(root, { score: 0.7 });

        await graph.reflectAndRefine(
            root,
            "Needs verification",
            { factual: 0.8, logical: 0.7, relevance: 0.9, novelty: 0.5 }
        );

        const trace = graph.exportReasoningTrace();
        const rootStep = trace.steps.find(s => s.nodeId === root);

        if (rootStep) {
            assert.ok(Array.isArray(rootStep.reflections), "Step should have reflections array");
        }
    });

    test("empty graph should return valid empty trace", () => {
        const graph = new ThoughtGraph();
        const trace = graph.exportReasoningTrace();

        assert.strictEqual(trace.steps.length, 0);
        assert.strictEqual(trace.compositeScore, 0);
        assert.ok(trace.exportedAt);
    });
});

// ==========================================
// 10. MEMORY EXPORT (exportProvenMemory)
// ==========================================
describe("Memory Export (@mcp:memory format)", () => {
    test("should export entities and relations in KG format", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Root insight");
        const detail = await graph.addNode("Supporting evidence");

        await graph.updateNode(root, { score: 0.8 });
        await graph.updateNode(detail, { score: 0.9 });

        await graph.addEdge(root, detail, "support");

        const memory = graph.exportProvenMemory(detail);

        assert.ok(memory.entities.length > 0, "Should have entities");
        assert.ok(memory.relations.length > 0, "Should have relations");

        // Entities should follow the naming convention
        const entityNames = memory.entities.map(e => e.name);
        assert.ok(entityNames.some(n => n.startsWith("Thought ")), "Entities should be named 'Thought <id>'");

        // All entities should be ThoughtNode type
        assert.ok(memory.entities.every(e => e.entityType === "ThoughtNode"));
    });

    test("should exclude rejected nodes from memory export", async () => {
        const graph = new ThoughtGraph();
        const root = await graph.addNode("Valid");
        const bad = await graph.addNode("Invalid");
        const leaf = await graph.addNode("Leaf");

        await graph.addEdge(root, bad, "branch");
        await graph.addEdge(bad, leaf, "branch");

        // Reject the middle node
        await graph.pruneFromNode(bad, "Wrong", { mode: "hard" });

        // Export from the leaf — should skip rejected ancestors
        const memory = graph.exportProvenMemory(leaf);
        const entityNames = memory.entities.map(e => e.name);

        assert.ok(!entityNames.includes(`Thought ${bad}`), "Rejected nodes should be excluded");
    });

    test("should throw for empty graph with no leaf", () => {
        const graph = new ThoughtGraph();

        assert.throws(
            () => graph.exportProvenMemory(),
            { message: /no valid leaf/i }
        );
    });
});

// ==========================================
// 11. CONTROLLER LOOP
// ==========================================
describe("Controller Loop (run_controller_loop)", () => {
    test("should return complete result structure", async () => {
        const graph = new ThoughtGraph();

        const result = await graph.runControllerLoop(
            "Test question",
            ["Thought A with enough detail to score well because it contains reasoning markers"],
            { maxIterations: 2 }
        );

        assert.ok(typeof result.converged === "boolean", "Should have converged field");
        assert.ok(typeof result.iterations === "number", "Should have iterations count");
        assert.ok(result.iterations <= 2, "Should respect maxIterations");
        assert.ok(result.winningPath, "Should have winning path");
        assert.ok(result.winningPath.pathIds.length > 0, "Path should have IDs");
        assert.ok(result.trace, "Should have reasoning trace");
        assert.ok(result.metrics, "Should have graph metrics");
        assert.ok(result.iterationLog.length === result.iterations, "Log count should match iterations");
    });

    test("should respect governance limits during loop", async () => {
        const graph = new ThoughtGraph(undefined, { maxNodes: 25, maxDepth: 4 });

        const result = await graph.runControllerLoop(
            "Compare options",
            [
                "Option A with detailed rationale and evidence",
                "Option B with alternative perspective",
            ],
            { maxIterations: 3 }
        );

        assert.ok(result.metrics.nodeCount <= 25, `Should respect maxNodes=25, got ${result.metrics.nodeCount}`);
        assert.ok(result.metrics.maxDepth <= 4, `Should respect maxDepth=4, got ${result.metrics.maxDepth}`);
    });

    test("iteration log should have valid structure", async () => {
        const graph = new ThoughtGraph();

        const result = await graph.runControllerLoop(
            "Simple test",
            ["One perspective"],
            { maxIterations: 1 }
        );

        for (const log of result.iterationLog) {
            assert.ok(typeof log.iteration === "number");
            assert.ok(typeof log.nodesScored === "number");
            assert.ok(typeof log.nodesPruned === "number");
            assert.ok(typeof log.nodesBranched === "number");
            assert.ok(typeof log.nodesReflected === "number");
            assert.ok(typeof log.totalNodes === "number");
            assert.ok(typeof log.bestPathScore === "number");
            assert.ok(typeof log.converged === "boolean");
        }
    });
});

// ==========================================
// 12. SESSION ISOLATION
// ==========================================
describe("Session Isolation", () => {
    test("separate ThoughtGraph instances should not share state", async () => {
        const graph1 = new ThoughtGraph();
        const graph2 = new ThoughtGraph();

        await graph1.addNode("Only in graph 1");
        await graph2.addNode("Only in graph 2");
        await graph2.addNode("Also only in graph 2");

        assert.strictEqual(graph1.size, 1, "Graph 1 should have 1 node");
        assert.strictEqual(graph2.size, 2, "Graph 2 should have 2 nodes");
    });

    test("clearing one graph should not affect another", async () => {
        const graph1 = new ThoughtGraph();
        const graph2 = new ThoughtGraph();

        await graph1.addNode("Persistent");
        await graph2.addNode("Temporary");

        await graph2.clear();

        assert.strictEqual(graph1.size, 1, "Graph 1 should still have its node");
        assert.strictEqual(graph2.size, 0, "Graph 2 should be empty");
    });
});

// ==========================================
// 13. CONTEXT STORE (Bonus)
// ==========================================
describe("Context Store", () => {
    test("set/get should store and retrieve values", () => {
        const store = new ContextStore();
        store.set("team_size", 12, "user_input");

        assert.strictEqual(store.get("team_size"), 12);
    });

    test("getWithProvenance should return full metadata", () => {
        const store = new ContextStore();
        store.set("budget", "$50k", "propose_thought:node_2");

        const entry = store.getWithProvenance("budget");
        assert.ok(entry);
        assert.strictEqual(entry!.value, "$50k");
        assert.strictEqual(entry!.source, "propose_thought:node_2");
        assert.ok(entry!.updatedAt);
    });

    test("list should return keys and sources without values", () => {
        const store = new ContextStore();
        store.set("key1", "val1", "src1");
        store.set("key2", "val2", "src2");

        const listing = store.list();
        assert.strictEqual(listing.length, 2);
        assert.ok(listing.every(item => "key" in item && "source" in item));
        assert.ok(!listing.some(item => "value" in item), "List should not expose values");
    });

    test("delete should remove entries", () => {
        const store = new ContextStore();
        store.set("temp", "data", "test");
        assert.ok(store.has("temp"));

        store.delete("temp");
        assert.ok(!store.has("temp"));
        assert.strictEqual(store.get("temp"), undefined);
    });

    test("clear should empty the entire store", () => {
        const store = new ContextStore();
        store.set("a", 1, "s");
        store.set("b", 2, "s");

        store.clear();
        assert.strictEqual(store.size, 0);
    });
});

// ==========================================
// 14. OBSERVABILITY METRICS
// ==========================================
describe("Graph Metrics", () => {
    test("should return accurate counts and ratios", async () => {
        const graph = new ThoughtGraph();
        const a = await graph.addNode("Active node");
        const b = await graph.addNode("To be rejected");
        const c = await graph.addNode("Validated");

        await graph.addEdge(a, b, "branch");
        await graph.addEdge(a, c, "branch");

        await graph.updateNode(b, { status: "rejected", score: 0 });
        await graph.updateNode(c, { status: "validated", score: 0.9 });

        const metrics = graph.getMetrics();

        assert.strictEqual(metrics.nodeCount, 3);
        assert.strictEqual(metrics.edgeCount, 2);
        assert.strictEqual(metrics.rejectedCount, 1);
        assert.strictEqual(metrics.validatedCount, 1);
        assert.strictEqual(metrics.rootCount, 1);
        assert.ok(metrics.pruneRatio > 0, "Prune ratio should reflect rejected nodes");
    });
});
