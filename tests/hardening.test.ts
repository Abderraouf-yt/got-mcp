import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ThoughtGraph } from "../src/graph/ThoughtGraph.js";
import { registerGotTools } from "../src/server/tools/got.js";

describe("got-mcp Hardening Tests", () => {
    test("Bug 1: get_thought_graph should return valid schema for empty graph", async (t) => {
        let capturedHandler: any = null;
        const mockServer = {
            registerTool: (name: string, schema: any, handler: any) => {
                if (name === "get_thought_graph") capturedHandler = handler;
            }
        };
        const graph = new ThoughtGraph();
        const notifyUpdate = () => {};
        
        // @ts-ignore
        registerGotTools(mockServer, graph, notifyUpdate);

        await t.test("should return empty arrays and zero count", async () => {
            const result = await capturedHandler({ sessionId: "empty_test" });
            const data = result.structuredContent;

            assert.strictEqual(data.nodeCount, 0);
            assert.ok(Array.isArray(data.nodes));
            assert.ok(Array.isArray(data.edges));
            assert.strictEqual(data.nodes.length, 0);
            assert.strictEqual(data.edges.length, 0);
        });
    });
});
