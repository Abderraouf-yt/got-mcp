import test from "node:test";
import assert from "node:assert";
import { ThoughtGraph } from "../src/graph/index.js";
import { registerOrchestrationTools } from "../src/server/tools/orchestration.js";

test("Azure Evidence Ingestion", async (t) => {
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

    await t.test("should extract Azure NSG facts", async () => {
        const rawJson = JSON.stringify({
            "id": "/subscriptions/123/resourceGroups/my-rg/providers/Microsoft.Network/networkSecurityGroups/my-nsg",
            "properties": {
                "securityRules": [
                    {
                        "name": "AllowSSH",
                        "properties": {
                            "access": "Allow",
                            "protocol": "Tcp",
                            "destinationPortRange": "22"
                        }
                    }
                ]
            }
        });

        const result = await capturedHandler({ rawJson });
        assert.strictEqual(result.structuredContent.provider, "Azure");
        
        const nodes = graph.getGraph().nodes;
        const nsgNode = nodes.find(n => n.thought.includes("access"));
        assert.ok(nsgNode, "Should have identified Azure network context");
    });
});
