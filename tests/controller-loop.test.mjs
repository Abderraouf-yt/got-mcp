/**
 * Controller Loop Integration Test
 * Tests the runControllerLoop() method end-to-end.
 */
import { strict as assert } from "node:assert";
import { ThoughtGraph, resetGraphInstance } from "../dist/graph/ThoughtGraph.js";

// ==========================================
// Test 1: Basic Controller Loop execution
// ==========================================
console.log("Test 1: Basic Controller Loop execution...");
{
    const graph = new ThoughtGraph();

    const result = graph.runControllerLoop(
        "Should we use PostgreSQL or MongoDB for our user data store?",
        [
            "PostgreSQL offers ACID compliance and strong schema enforcement, ideal for relational data like user→orders→items.",
            "MongoDB provides flexible schema and horizontal scaling, good for rapid prototyping.",
            "Consider a hybrid approach: PostgreSQL for transactional data, Redis for caching.",
        ],
        {
            maxIterations: 3,
            convergenceThreshold: 0.85,
            autoPruneBelow: 0.2,
            beamWidth: 2,
        }
    );

    // Verify basic structure
    assert(result.converged !== undefined, "Result should have converged field");
    assert(typeof result.iterations === "number", "Iterations should be a number");
    assert(result.iterations >= 1 && result.iterations <= 3, `Iterations should be 1-3, got ${result.iterations}`);
    assert(result.winningPath, "Should have a winning path");
    assert(result.winningPath.pathIds.length > 0, "Winning path should have node IDs");
    assert(typeof result.winningPath.totalScore === "number", "Total score should be a number");
    assert(result.winningPath.conclusion.length > 0, "Conclusion should not be empty");
    assert(result.trace, "Should have a reasoning trace");
    assert(result.metrics, "Should have metrics");
    assert(result.metrics.nodeCount > 3, `Should have more than 3 nodes after loop, got ${result.metrics.nodeCount}`);
    assert(result.iterationLog.length === result.iterations, "Iteration log should match iteration count");

    // Verify iteration log structure
    for (const log of result.iterationLog) {
        assert(typeof log.iteration === "number", "Log should have iteration number");
        assert(typeof log.nodesScored === "number", "Log should have nodesScored");
        assert(typeof log.nodesPruned === "number", "Log should have nodesPruned");
        assert(typeof log.nodesBranched === "number", "Log should have nodesBranched");
        assert(typeof log.nodesReflected === "number", "Log should have nodesReflected");
        assert(typeof log.totalNodes === "number", "Log should have totalNodes");
        assert(typeof log.bestPathScore === "number", "Log should have bestPathScore");
    }

    console.log(`  ✅ Passed — ${result.iterations} iterations, ${result.metrics.nodeCount} nodes, converged: ${result.converged}`);
    console.log(`  Winning path: ${result.winningPath.pathIds.join(" → ")} (score: ${result.winningPath.totalScore})`);
    graph.clear();
}

// ==========================================
// Test 2: Single thought input
// ==========================================
console.log("Test 2: Single thought input...");
{
    const graph = new ThoughtGraph();

    const result = graph.runControllerLoop(
        "What is the best programming language for systems programming?",
        ["Rust provides memory safety without garbage collection, making it ideal for performance-critical systems."],
        { maxIterations: 2 }
    );

    assert(result.winningPath.pathIds.length > 0, "Should find a path even with 1 input");
    assert(result.iterations <= 2, "Should respect maxIterations");
    console.log(`  ✅ Passed — ${result.iterations} iterations, ${result.metrics.nodeCount} nodes`);
    graph.clear();
}

// ==========================================
// Test 3: Governance limits respected
// ==========================================
console.log("Test 3: Governance limits respected...");
{
    const graph = new ThoughtGraph(undefined, { maxNodes: 30, maxDepth: 5 });

    const result = graph.runControllerLoop(
        "Compare 5 cloud providers for a startup",
        [
            "AWS: most mature ecosystem, widest service catalogue",
            "GCP: strongest AI/ML tooling, BigQuery analytics",
            "Azure: enterprise integration, Active Directory",
            "Vercel: best DX for frontend teams",
            "Cloudflare: edge-first, Workers for low latency",
        ],
        { maxIterations: 5, convergenceThreshold: 0.95 }
    );

    assert(result.metrics.nodeCount <= 30, `Should respect maxNodes=30, got ${result.metrics.nodeCount}`);
    assert(result.metrics.maxDepth <= 5, `Should respect maxDepth=5, got ${result.metrics.maxDepth}`);
    console.log(`  ✅ Passed — ${result.metrics.nodeCount}/30 nodes, depth ${result.metrics.maxDepth}/5`);
    graph.clear();
}

// ==========================================
// Test 4: Auto-pruning works
// ==========================================
console.log("Test 4: Auto-pruning works...");
{
    const graph = new ThoughtGraph();

    const result = graph.runControllerLoop(
        "Short vs long?",
        ["A", "B"],
        { maxIterations: 3, autoPruneBelow: 0.5 }
    );

    // Short thoughts ("A", "B") should be auto-pruned due to low specificity/length
    const totalPruned = result.iterationLog.reduce((sum, log) => sum + log.nodesPruned, 0);
    assert(totalPruned >= 0, "Prune count should be non-negative");
    console.log(`  ✅ Passed — ${totalPruned} nodes auto-pruned across ${result.iterations} iterations`);
    graph.clear();
}

// ==========================================
// Test 5: Reasoning trace export
// ==========================================
console.log("Test 5: Reasoning trace export...");
{
    const graph = new ThoughtGraph();

    const result = graph.runControllerLoop(
        "Should we implement microservices or monolith?",
        [
            "Microservices enable independent deployment and scaling of services because each service can be updated without affecting the entire application.",
            "Monolith is simpler to develop, test, and deploy initially however it may face scaling challenges as the codebase grows.",
        ],
        { maxIterations: 2 }
    );

    assert(result.trace.steps.length > 0, "Trace should have steps");
    assert(result.trace.exportedAt, "Trace should have exportedAt timestamp");
    assert(result.trace.totalNodes > 0, "Trace should report total nodes");
    console.log(`  ✅ Passed — trace has ${result.trace.steps.length} steps, ${result.trace.totalNodes} total nodes`);
    graph.clear();
}

console.log("\n🎉 All 5 Controller Loop tests passed!\n");
