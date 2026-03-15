import test from 'node:test';
import assert from 'node:assert';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ThoughtGraph } from '../src/graph/index.js';
import { registerIoTools } from '../src/server/tools/io.js';

test('Memory Bridge Tool (commit_to_memory)', async (t) => {
    let capturedHandler = null;
    const mockServer = {
        registerTool: (name, schema, handler) => {
            if (name === 'commit_to_memory') capturedHandler = handler;
        }
    };
    
    const graph = new ThoughtGraph();
    const notifyUpdate = () => {};
    // @ts-ignore
    registerIoTools(mockServer, graph, notifyUpdate);

    const n1 = await graph.addNode('MFA is not enabled on AWS root account');
    await graph.updateNode(n1, { metadata: { lens: 'Security' } });
    const n2 = await graph.addNode('Remediation: Enable MFA via IAM dashboard');
    await graph.addEdge(n1, n2, 'refinement');

    await t.test('should generate dryRun payload with taxonomy mapping', async () => {
        const result = await capturedHandler({ nodeId: n2, dryRun: true });
        const data = result.structuredContent;

        assert.strictEqual(data.totalNodes, 2);
        // Note: entities[0] is Root because of orderedNodes.reverse() which makes it root-to-leaf
        assert.strictEqual(data.entities[0].entityType, 'Directive'); 
        assert.strictEqual(data.entities[0].name.includes('MFA_is_not_enabled'), true);
        assert.strictEqual(data.relations[0].relationType, 'refines');
    });

    await t.test('should maintain idempotency in naming', async () => {
        const result1 = await capturedHandler({ nodeId: n2, dryRun: true });
        const result2 = await capturedHandler({ nodeId: n2, dryRun: true });
        
        assert.strictEqual(result1.structuredContent.entities[0].name, result2.structuredContent.entities[0].name);
    });
});
