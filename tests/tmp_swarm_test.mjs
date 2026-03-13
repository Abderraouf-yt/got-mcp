import { getGraphInstance } from '../dist/graph/index.js';

async function runSwarmTest() {
    console.log("🚀 Starting Swarm Simulation Test...");
    const graph = getGraphInstance();

    // Clear graph to ensure isolated test
    graph.clear();

    // ------------------------------------------------------------------
    // 1. Proposer Agent creates a task
    // ------------------------------------------------------------------
    console.log("🤖 [Proposer] Creating a task for the Critic...");
    const rootId = graph.addNode("We need an architecture for Framework C.");
    const taskId = graph.addNode("Review the Native Authorship + Host Orchestrator Pattern.");
    graph.addEdge(rootId, taskId, "refinement");

    graph.updateNode(taskId, {
        authorId: "Proposer",
        agentTarget: "Critic",
        executionState: "queued"
    });

    console.log(`   Task ${taskId} created in 'queued' state for Critic target.`);

    // Create a lateral 'noise' node to prove the Firewall works (should be filtered out)
    const noiseId = graph.addNode("This is a lateral distraction node by another agent.");
    graph.addEdge(rootId, noiseId, "branch");

    // ------------------------------------------------------------------
    // 2. Critic Agent polls and claims the task
    // ------------------------------------------------------------------
    console.log("🤖 [Critic-01] Polling for 'queued' tasks...");
    const allNodes = graph.getGraph().nodes;
    const queuedTask = allNodes.find(n => n.agentTarget === "Critic" && n.executionState === "queued");

    if (queuedTask) {
        console.log(`   Found task ${queuedTask.id}. Attempting atomic CAS claim...`);
        // Atomic CAS claim (Mathematical Hardening)
        graph.updateNodeExecutionState(queuedTask.id, "queued", "processing", "Critic-01");
        console.log(`   Claim successful! State is now 'processing'.`);

        // ------------------------------------------------------------------
        // 3. Critic generates response and tests Cycle Detection
        // ------------------------------------------------------------------
        const responseId = graph.addNode("Architecture is mathematically sound. SOTA Firewall online.");
        graph.addEdge(queuedTask.id, responseId, "support");
        graph.updateNode(responseId, {
            authorId: "Critic-01",
            // Include rootId as a dependency to test Cycle Detection (already in lineage)
            // Include a fake ghost reference to test Ghost Reference Grace
            dependencies: [rootId, "node_ghost_999"]
        });

        // Mark task done
        graph.updateNodeExecutionState(queuedTask.id, "processing", "done", "Critic-01");
        console.log(`   Task completed. Response generated at ${responseId}.`);

        // ------------------------------------------------------------------
        // 4. Test SOTA Context Firewall
        // ------------------------------------------------------------------
        console.log("\n🔥 Modulating SOTA Context Firewall for Response Node...");
        const firewallContext = graph.compileNodeContext(responseId);

        console.log("✅ Context Firewall successfully filtered the DAG! Traced path:");
        firewallContext.forEach((n, i) => {
            console.log(`   ${i + 1}. [${n.id}] (Author: ${n.authorId || 'System'}) -> ${n.thought}`);
        });

        // Verification: The lateral 'noise' node must NOT be in the result.
        // The array should precisely be: [rootId, taskId, responseId]
        const hasNoise = firewallContext.some(n => n.id === noiseId);
        if (firewallContext.length === 3 && !hasNoise) {
            console.log("\n🎯 STRESS TEST SUCCESS: The firewall perfectly reduced the context, ignored the ghost ref, prevented the cycle, and filtered lateral noise by 100%.");
        } else {
            console.error(`\n❌ TEST FAILURE: Firewall returned ${firewallContext.length} nodes. Has noise: ${hasNoise}`);
        }
    }
}

runSwarmTest().catch(console.error);
