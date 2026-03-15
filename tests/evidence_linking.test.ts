import test from "node:test";
import assert from "node:assert";
import { ThoughtGraph } from "../src/graph/index.js";
import { registerOrchestrationTools } from "../src/server/tools/orchestration.js";

test("Evidence Auto-Linking", async (t) => {
    let capturedHandler: any = null;
    const mockServer = {
        registerTool: (name: string, schema: any, handler: any) => {
            if (name === "ingest_evidence") capturedHandler = handler;
        }
    };
    const graph = new ThoughtGraph();
    const notifyUpdate = () => {};
    
    // @ts-ignore
    registerOrchestrationTools(mockServer, graph, notifyUpdate);

    await t.test("should link new evidence to existing Security perspective", async () => {
        // 1. Create a Security Perspective node manually
        const p1 = await graph.addNode("Security Perspective");
        await graph.updateNode(p1, { 
            metadata: { 
                entityType: "Perspective", 
                lens: "Security" 
            } 
        });

        const rawJson = JSON.stringify({
            "Effect": "Allow",
            "Action": "s3:GetObject"
        });

        // 2. Ingest evidence
        await capturedHandler({ rawJson });
        
        // 3. Verify edges
        const state = graph.getGraph();
        const evidenceNode = state.nodes.find(n => n.metadata?.entityType === "CloudEvidence");
        const edge = state.edges.find(e => e.from === evidenceNode.id && e.to === p1);
        
        assert.ok(edge, "Edge should exist from evidence to perspective");
        assert.strictEqual(edge.relation, "supports");
    });
});
