import test from "node:test";
import assert from "node:assert";
import { ThoughtGraph } from "../src/graph/index.js";
import { registerOrchestrationTools } from "../src/server/tools/orchestration.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

test("AWS Evidence Ingestion MVP", async (t) => {
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

    await t.test("should extract AWS IAM policy facts", async () => {
        const rawJson = JSON.stringify({
            "PolicyVersion": "2012-10-17",
            "Document": {
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": "s3:GetObject",
                        "Resource": "arn:aws:s3:::my-bucket/*"
                    }
                ]
            }
        });

        const result = await capturedHandler({ rawJson });
        assert.strictEqual(result.structuredContent.provider, "AWS");
        assert.strictEqual(result.structuredContent.count >= 3, true); // Effect, Action, Resource
        
        const nodes = graph.getGraph().nodes;
        const effectNode = nodes.find(n => n.thought.includes("Effect: Allow"));
        assert.ok(effectNode, "Should have extracted Effect");
        assert.strictEqual(effectNode.metadata.entityType, "CloudEvidence");
    });

    await t.test("should handle malformed JSON", async () => {
        const result = await capturedHandler({ rawJson: "{ invalid json }" });
        assert.strictEqual(result.isError, true);
        assert.ok(result.content[0].text.includes("Invalid JSON"));
    });
});
