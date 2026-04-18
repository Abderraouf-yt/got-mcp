import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { ThoughtGraph } from "../src/graph/ThoughtGraph.js";
import { Persistence } from "../src/graph/Persistence.js";

describe("Persistence Resilience (US1)", () => {
    const testDir = path.join(process.cwd(), "tests", "tmp_persistence");
    const stateFile = path.join(testDir, "test-state.json");

    beforeEach(async () => {
        if (!existsSync(testDir)) {
            await fs.mkdir(testDir, { recursive: true });
        }
        if (existsSync(stateFile)) {
            await fs.unlink(stateFile);
        }
    });

    afterEach(async () => {
        // Cleanup
        if (existsSync(testDir)) {
            // rmSync(testDir, { recursive: true, force: true });
        }
    });

    test("T009: Atomic write verification", async () => {
        const graph = new ThoughtGraph(stateFile);
        const nodeId = await graph.addNode("Test thought for atomic write");
        
        // Wait a bit for the async save to finish
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify file exists and contains the node
        assert.strictEqual(existsSync(stateFile), true, "State file should exist");
        const data = JSON.parse(await fs.readFile(stateFile, "utf-8"));
        assert.ok(data.nodes.some((n: any) => n.id === nodeId), "Node should be persisted");
    });

    test("T010: Crash recovery simulation", async () => {
        const graph = new ThoughtGraph(stateFile);
        const nodeId = await graph.addNode("Persistent thought");
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Simulate "crash" by creating a new instance pointing to same file
        const graph2 = new ThoughtGraph(stateFile);
        assert.strictEqual(graph2.hasNode(nodeId), true, "New instance should load persisted node");
        assert.strictEqual(graph2.getNode(nodeId)?.thought, "Persistent thought");
    });

    test("T011: Disk Full / Permissions simulation (FR-007)", async () => {
        const graph = new ThoughtGraph(stateFile);
        
        // Mock Persistence.save to throw an error
        const originalSave = Persistence.save;
        Persistence.save = async () => {
            throw new Error("Disk Full");
        };

        try {
            // This mutation should trigger save, which will fail
            const nodeId = await graph.addNode("Thought during failure");
            
            // Wait for queue
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify in-memory state is still functional (FR-007)
            assert.strictEqual(graph.hasNode(nodeId), true, "In-memory state should be functional even if save fails");
            assert.strictEqual(graph.getNode(nodeId)?.thought, "Thought during failure");
        } finally {
            Persistence.save = originalSave;
        }
    });
});
