import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ThoughtGraph } from "./src/graph/ThoughtGraph.js";
import { ContextStore } from "./src/context/ContextStore.js";
import { registerAllTools } from "./src/server/tools/index.js";

async function runStressTest() {
    console.log("--- STARTING GoT-MCP 20-TOOL STRESS TEST ---");
    
    const handlers = new Map<string, Function>();
    const mockServer = {
        registerTool: (name: string, schema: any, handler: any) => {
            handlers.set(name, handler);
        }
    };
    
    const graph = new ThoughtGraph();
    const contextStore = new ContextStore();
    const notifyUpdate = () => {};
    
    // @ts-ignore
    registerAllTools(mockServer, graph, contextStore, notifyUpdate);
    
    const getTool = (name: string) => {
        const handler = handlers.get(name);
        if (!handler) throw new Error(`Tool ${name} not found`);
        return handler;
    };

    const SID = "stress_test_001";

    try {
        // 1. CONTEXT TOOLS
        console.log("[1/20] Testing context_set...");
        await getTool("context_set")({ key: "traffic_pattern", value: "90% reads, 10% writes", source: "system_spec", sessionId: SID });
        
        console.log("[2/20] Testing context_get...");
        await getTool("context_get")({ key: "traffic_pattern", sessionId: SID });
        
        console.log("[3/20] Testing context_list...");
        await getTool("context_list")({ sessionId: SID });

        // 2. ORCHESTRATION & SEEDING
        console.log("[4/20] Testing generate_perspectives...");
        const persRes = await getTool("generate_perspectives")({ query: "Caching strategy for e-commerce API", count: 3, sessionId: SID });
        const perspectives = persRes.structuredContent.perspectives;

        console.log("[5/20] Testing ingest_evidence...");
        await getTool("ingest_evidence")({ rawJson: JSON.stringify({ "Cache-Control": "max-age=3600", "Redis": "Available" }), sessionId: SID });

        // 3. CORE PRIMITIVES
        console.log("[6/20] Testing propose_thought (Root)...");
        const rootRes = await getTool("propose_thought")({ thought: "We need a caching strategy. Options: Redis, Memcached, CDN.", sessionId: SID });
        const rootId = rootRes.structuredContent.nodeId;

        console.log("[7/20] Testing propose_thought (Branch 1)...");
        const b1Res = await getTool("propose_thought")({ thought: "Redis: Has persistence and complex data types.", parentId: rootId, relation: "branch", sessionId: SID });
        const b1Id = b1Res.structuredContent.nodeId;

        console.log("[8/20] Testing propose_thought (Branch 2)...");
        const b2Res = await getTool("propose_thought")({ thought: "CDN (CloudFront): Best for static assets, not dynamic API JSON.", parentId: rootId, relation: "branch", sessionId: SID });
        const b2Id = b2Res.structuredContent.nodeId;

        console.log("[9/20] Testing evaluate_thought...");
        await getTool("evaluate_thought")({ nodeId: b1Id, score: 0.9, confidence: { factual: 1, logical: 0.9, relevance: 0.9, novelty: 0.5 }, sessionId: SID });

        console.log("[10/20] Testing reflect_and_refine...");
        const refRes = await getTool("reflect_and_refine")({ nodeId: b2Id, critique: "CDN can cache API responses if URL params are deterministic.", confidence: { factual: 0.8, logical: 0.8, relevance: 0.9, novelty: 0.8 }, refinedThought: "Use CloudFront with query string forwarding for dynamic API caching.", sessionId: SID });
        const refinedId = refRes.structuredContent.branchId || b2Id; // Fallback if no branch was created

        console.log("[11/20] Testing propose_thought (Contradiction)...");
        const contRes = await getTool("propose_thought")({ thought: "Redis persistence is slow and blocking, might cause latency spikes.", parentId: b1Id, relation: "contradiction", sessionId: SID });
        
        // 4. GOT ADVANCED
        console.log("[12/20] Testing aggregate_thoughts...");
        const aggRes = await getTool("aggregate_thoughts")({ nodeIds: [b1Id, refinedId], synthesis: "Hybrid: CDN for edge, Redis for origin data.", sessionId: SID });
        const aggId = aggRes.structuredContent.newNodeId;

        console.log("[13/20] Testing prune_branch...");
        await getTool("prune_branch")({ nodeId: contRes.structuredContent.nodeId, reason: "We will use Redis purely as an LRU cache, disabling disk persistence.", mode: "hard", sessionId: SID });

        console.log("[14/20] Testing find_winning_path...");
        await getTool("find_winning_path")({ beamWidth: 2, sessionId: SID });

        console.log("[15/20] Testing get_graph_metrics...");
        await getTool("get_graph_metrics")({ sessionId: SID });

        console.log("[16/20] Testing query_nodes...");
        await getTool("query_nodes")({ status: "active", sessionId: SID });

        console.log("[17/20] Testing compile_node_context...");
        await getTool("compile_node_context")({ nodeId: aggId, sessionId: SID });

        // 5. I/O & EXPORT
        console.log("[18/20] Testing export_reasoning_trace...");
        await getTool("export_reasoning_trace")({ sessionId: SID });

        console.log("[19/20] Testing commit_to_memory...");
        await getTool("commit_to_memory")({ nodeId: aggId, dryRun: true, sessionId: SID });

        console.log("[20/20] Testing export_snapshot & restore_snapshot...");
        const snapRes = await getTool("export_snapshot")({ sessionId: SID });
        await getTool("restore_snapshot")({ snapshot: snapRes.structuredContent, sessionId: SID });

        // Cleanup
        await getTool("reset_graph")({ sessionId: SID });
        
        console.log("\n✅ ALL 20 TOOLS EXECUTED SUCCESSFULLY.");

    } catch (error) {
        console.error("\n❌ STRESS TEST FAILED:", error);
    }
}

runStressTest();
