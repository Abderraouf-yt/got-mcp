import { ThoughtGraph } from './src/graph/ThoughtGraph.js';
import { ContextStore } from './src/context/ContextStore.js';
import { registerAllTools } from './src/server/tools/index.js';

async function runAudit() {
    const handlers = new Map();
    const mockServer = { registerTool: (name, schema, handler) => handlers.set(name, handler) };
    const graph = new ThoughtGraph();
    const contextStore = new ContextStore();
    registerAllTools(mockServer, graph, contextStore, () => {});
    const getTool = (n) => handlers.get(n);

    console.log('--- LIVE AUDIT STRESS TEST ---');
    
    // TEST B-01: get_thought_graph on empty graph
    console.log('[B-01 CHECK] Calling get_thought_graph on empty graph...');
    const emptyRes = await getTool('get_thought_graph')({ sessionId: 'empty_test' });
    console.log('  Result:', JSON.stringify(emptyRes.structuredContent).substring(0, 50) + '...');

    // TEST B-03: Context Type Coercion
    console.log('[B-03 CHECK] Testing context types...');
    await getTool('context_set')({ key: 'num', value: 100, source: 'test', sessionId: 'type_test' });
    const getRes = await getTool('context_get')({ key: 'num', sessionId: 'type_test' });
    console.log(`  Expected number, got: ${typeof getRes.structuredContent.value} (${getRes.structuredContent.value})`);

    // TEST B-04: Snapshot Payload
    console.log('[B-04 CHECK] Testing export_snapshot payload...');
    await graph.addNode('Test Node');
    const snapRes = await getTool('export_snapshot')({ sessionId: 'default' });
    const hasData = snapRes.structuredContent && snapRes.structuredContent.nodes ? 'YES' : 'NO';
    console.log(`  Does snapshot contain nodes? ${hasData}`);

    console.log('\n--- 20-TOOL SEQUENCE START ---');
    // Rapidly fire remaining tools
    await getTool('generate_perspectives')({ query: 'AWS SOC 2', count: 2 });
    await getTool('ingest_evidence')({ rawJson: '{\"iam\":\"policy\"}', provider: 'AWS' });
    const root = await graph.addNode('Root');
    await getTool('evaluate_thought')({ nodeId: root, score: 0.5, confidence: {factual:1, logical:1, relevance:1, novelty:1} });
    await getTool('reflect_and_refine')({ nodeId: root, critique: 'too vague', confidence: {factual:1, logical:1, relevance:1, novelty:1} });
    const n2 = await graph.addNode('Child');
    await graph.addEdge(root, n2, 'branch');
    await getTool('aggregate_thoughts')({ nodeIds: [root, n2], synthesis: 'merged' });
    await getTool('find_winning_path')({});
    await getTool('get_graph_metrics')({});
    await getTool('query_nodes')({ status: 'active' });
    await getTool('compile_node_context')({ nodeId: n2 });
    await getTool('export_reasoning_trace')({});
    await getTool('commit_to_memory')({ dryRun: true });
    
    console.log('✅ Stress test completed.');
}
runAudit();
