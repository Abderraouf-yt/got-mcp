import test from "node:test";
import assert from "node:assert";
import { ThoughtGraph } from "../src/graph/index.js";
import { registerOrchestrationTools } from "../src/server/tools/orchestration.js";

test("Evidence Ingestion Refinement (Sanitization & Truncation)", async (t) => {
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

    await t.test("should redact sensitive keys (FR-008)", async () => {
        const rawJson = JSON.stringify({
            "Principal": "admin",
            "AccessKey": "AKIA1234567890",
            "Secret": "shhhh-secret"
        });

        await capturedHandler({ rawJson });
        const nodes = graph.getGraph().nodes;
        
        const keyNode = nodes.find(n => n.thought.includes("AccessKey"));
        const secretNode = nodes.find(n => n.thought.includes("Secret"));
        
        assert.ok(keyNode?.thought.includes("[REDACTED]"));
        assert.ok(secretNode?.thought.includes("[REDACTED]"));
        assert.strictEqual(keyNode?.metadata.sanitized, true);
    });

    await t.test("should truncate long strings (FR-005)", async () => {
        const longString = "A".repeat(600);
        const rawJson = JSON.stringify({
            "Effect": "Allow",
            "Description": longString
        });

        // We need to add Description to HIGH_SIGNAL_KEYS or just test with Resource
        // Let's use Resource since it's already in the set
        const rawJson2 = JSON.stringify({
            "Resource": longString
        });

        await capturedHandler({ rawJson: rawJson2 });
        const nodes = graph.getGraph().nodes;
        const resourceNode = nodes.find(n => n.thought.includes("Resource"));
        
        assert.ok(resourceNode?.thought.length <= 600); // 512 + prefix + suffix
        assert.ok(resourceNode?.thought.includes("[TRUNCATED]"));
    });

    await t.test("should respect depth limit (FR-005)", async () => {
        // Create 12 levels of nesting
        const deepObj = { level1: { level2: { level3: { level4: { level5: { level6: { level7: { level8: { level9: { level10: { level11: { level12: { Effect: "Allow" } } } } } } } } } } } } };
        const rawJson = JSON.stringify(deepObj);

        await capturedHandler({ rawJson });
        const nodes = graph.getGraph().nodes;
        
        // Level 11 and 12 should be unreachable
        const effectNode = nodes.find(n => n.thought.includes("Effect: Allow"));
        assert.strictEqual(effectNode, undefined);
        
        const limitNode = nodes.find(n => n.thought.includes("[DEPTH LIMIT REACHED]"));
        assert.ok(limitNode);
    });

    await t.test("should return [IngestError] on invalid JSON (FR-007)", async () => {
        const result = await capturedHandler({ rawJson: "{ bad json }" });
        assert.strictEqual(result.isError, true);
        assert.ok(result.content[0].text.startsWith("[IngestError]"));
    });
});
