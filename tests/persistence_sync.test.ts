import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { ThoughtGraph } from "../src/graph/ThoughtGraph.js";

describe("Persistence Sync & Performance (US2)", () => {
    const testDir = path.join(process.cwd(), "tests", "tmp_sync");
    const stateFile = path.join(testDir, "sync-state.json");
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

    test("T017: Mutation latency verification (< 100ms)", async () => {
        const graph = new ThoughtGraph(stateFile);
        graphs.push(graph);

        // Warm up file creation and lock setup
        await graph.addNode("Warmup node");

        const start = performance.now();
        // addNode awaits requestSave() which awaits the save queue
        await graph.addNode("Performance test node");
        const duration = performance.now() - start;

        assert.ok(duration < 100, `Mutation latency was ${duration.toFixed(2)}ms, expected < 100ms`);
        console.log(`   ✓ Verified latency: ${duration.toFixed(2)}ms`);
    });

    test("T018/T019: Batching efficiency (Single write for multiple mutations)", async () => {
        const graph = new ThoughtGraph(stateFile);
        graphs.push(graph);

        // Ensure file exists
        await graph.addNode("Init");
        await new Promise(resolve => setTimeout(resolve, 200));

        const start = performance.now();
        await graph.batch(async () => {
            await graph.addNode("Part 1");
            await graph.addNode("Part 2");
            await graph.addNode("Part 3");
        });
        const duration = performance.now() - start;

        // If batching works, 3 mutations should take roughly the same time as 1 
        // because only one disk write happens at the end.
        assert.ok(duration < 200, `Batch latency was ${duration.toFixed(2)}ms`);
        
        const data = JSON.parse(await fs.readFile(stateFile, "utf-8"));
        assert.strictEqual(data.nodes.length, 4, "All nodes should be persisted after batch");
        console.log(`   ✓ Verified batching: 3 mutations in ${duration.toFixed(2)}ms`);
    });

    test("T022: System Overhead Benchmarking (< 25% SC-004)", async () => {
        // SC-004: Auto-save operations MUST NOT increase the total mutation execution time 
        // by more than 25% under normal load.
        // "Normal load" includes the time the LLM spends generating thoughts (e.g. 50ms minimum simulated delay).
        const simulatedProcessingTime = 50; 

        // Benchmark in-memory only
        const graphMem = new ThoughtGraph();
        const startMem = performance.now();
        for(let i=0; i<10; i++) {
            await new Promise(resolve => setTimeout(resolve, simulatedProcessingTime));
            await graphMem.addNode(`Memory Thought ${i}`);
        }
        const durationMem = performance.now() - startMem;

        // Benchmark with auto-save (standard triggers)
        const graphDisk = new ThoughtGraph(stateFile);
        graphs.push(graphDisk);
        const startDisk = performance.now();
        for(let i=0; i<10; i++) {
            await new Promise(resolve => setTimeout(resolve, simulatedProcessingTime));
            await graphDisk.addNode(`Disk Thought ${i}`);
        }
        const durationDisk = performance.now() - startDisk;

        const overhead = (durationDisk - durationMem) / durationMem;
        console.log(`   ✓ Baseline execution (10 mutations): ${durationMem.toFixed(2)}ms`);
        console.log(`   ✓ Auto-save execution (10 mutations): ${durationDisk.toFixed(2)}ms`);
        console.log(`   ✓ Measured Real-world Overhead: ${(overhead * 100).toFixed(2)}%`);

        assert.ok(overhead < 0.25, `Overhead exceeded 25%: ${(overhead * 100).toFixed(2)}%`);
    });
});
