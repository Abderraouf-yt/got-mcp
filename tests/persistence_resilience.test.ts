import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { ThoughtGraph } from "../src/graph/ThoughtGraph.js";
import { Persistence } from "../src/graph/Persistence.js";

describe("Persistence Resilience (US1)", () => {
    const testDir = path.join(process.cwd(), "tests", "tmp_resilience");
    const stateFile = path.join(testDir, "resilience-state.json");
    const graphs: ThoughtGraph[] = [];

    beforeEach(async () => {
        if (!existsSync(testDir)) {
            await fs.mkdir(testDir, { recursive: true });
        }
        if (existsSync(stateFile)) {
            await fs.unlink(stateFile);
        }
    });

    afterEach(async () => {
        // Release all fs.watchFile timers to prevent event loop hang
        await Promise.all(graphs.map(g => g.close()));
        graphs.length = 0;
    });

    test("T012: Zero data loss on unexpected termination (Recovery)", async () => {
        const graph = new ThoughtGraph(stateFile);
        graphs.push(graph);
        const thoughtContent = "Durable thought";
        const id = await graph.addNode(thoughtContent);
        
        // Wait for asynchronous write queue
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify file exists
        assert.ok(existsSync(stateFile), "State file should have been created");

        // Simulate crash/restart by creating new instance pointing to same file
        const restoredGraph = new ThoughtGraph(stateFile);
        graphs.push(restoredGraph);
        
        // Give a moment for the new instance to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        assert.ok(restoredGraph.hasNode(id), "Restored graph should contain the node");
        assert.strictEqual(restoredGraph.getNode(id)?.thought, thoughtContent);
    });

    test("T011: Graceful failure on Disk Full / Permissions (FR-007)", async () => {
        const graph = new ThoughtGraph(stateFile);
        graphs.push(graph);
        // Mock Persistence.save to simulate failure
        const originalSave = Persistence.save;
        Persistence.save = async () => {
            throw new Error("Disk Full (Simulated)");
        };

        try {
            const id = await graph.addNode("Thought during disk full");
            
            // Wait for queue
            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify in-memory state is functional despite disk failure
            assert.ok(graph.hasNode(id), "In-memory state must remain functional (FR-007)");
            assert.strictEqual(graph.getNode(id)?.thought, "Thought during disk full");
            
            // Check that it didn't throw an unhandled exception
            console.log("   ✓ Verified in-memory functionality during disk failure.");
        } finally {
            // Restore original save
            Persistence.save = originalSave;
        }
    });

    test("FR-002: Atomic write verification", async () => {
        const graph = new ThoughtGraph(stateFile);
        graphs.push(graph);
        await graph.addNode("Node 1");
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const content = await fs.readFile(stateFile, "utf-8");
        // Verify it's valid JSON (not partial)
        assert.doesNotThrow(() => JSON.parse(content), "Persisted file must be valid JSON");
    });
});
