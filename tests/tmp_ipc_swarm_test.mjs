import { ThoughtGraph } from '../src/graph/ThoughtGraph.js';
import cluster from 'node:cluster';
import fs from 'node:fs';

const CLUSTER_WORKERS = 4;
const MUTATIONS_PER_WORKER = 50;
const STATE_FILE = 'thought-graph-state.json';

if (cluster.isPrimary) {
    console.log(`[Primary] Starting IPC Lockfile Stress Test with ${CLUSTER_WORKERS} parallel workers`);
    console.log(`[Primary] Each worker will submit ${MUTATIONS_PER_WORKER} atomic thoughts simultaneously.`);

    // Clear out any old state STRICTLY BEFORE FORKING
    if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
    }

    for (let i = 0; i < CLUSTER_WORKERS; i++) {
        cluster.fork();
    }

    let completed = 0;
    cluster.on('exit', (worker, code) => {
        if (code !== 0) {
            console.error(`[Primary] Worker ${worker.process.pid} failed!`);
            process.exit(1);
        }
        completed++;
        if (completed === CLUSTER_WORKERS) {
            console.log(`[Primary] All workers finished sequentially. Validating data integrity...`);

            // Validate graph integrity using the Graph Engine
            const validator = new ThoughtGraph(STATE_FILE);
            const totalNodes = validator.getGraph().nodes.length;
            const expectedNodes = CLUSTER_WORKERS * MUTATIONS_PER_WORKER;

            console.log(`\n================================`);
            console.log(`EXPECTED NODES: ${expectedNodes}`);
            console.log(`ACTUAL NODES:   ${totalNodes}`);
            console.log(`================================`);

            if (totalNodes === expectedNodes) {
                console.log('✅ IPC ATOMIC LOCKING PASSED: Zero data loss, zero corruption.');
                process.exit(0);
            } else {
                console.error('❌ IPC ATOMIC LOCKING FAILED: Data corruption or race condition detected.');

                const allThoughts = new Set(validator.getGraph().nodes.map(n => n.thought));
                for (let w = 1; w <= CLUSTER_WORKERS; w++) {
                    for (let iter = 0; iter < MUTATIONS_PER_WORKER; iter++) {
                        const expectedStr = `Worker ${w} executing parallel task iteration ${iter}`;
                        if (!allThoughts.has(expectedStr)) {
                            console.error(`MISSING: ${expectedStr}`);
                        }
                    }
                }

                process.exit(1);
            }
        }
    });

} else {
    // Worker Process
    const workerId = cluster.worker?.id || 'unknown';
    console.log(`[Worker ${workerId}] Booting graph instance...`);

    // Connect to the shared file
    const graph = new ThoughtGraph(STATE_FILE);

    // Fire off all mutations as fast as the event loop allows
    (async () => {
        for (let i = 0; i < MUTATIONS_PER_WORKER; i++) {
            try {
                // We MUST await here now because mutations are async
                await graph.addNode(`Worker ${workerId} executing parallel task iteration ${i}`);
            } catch (e) {
                // Under extreme load, proper-lockfile might throw ELOCKED if retry loop exhausts
                console.error(`[Worker ${workerId}] Failed on iter ${i}:`, e.message);
            }
        }

        console.log(`[Worker ${workerId}] Finished writing.`);
        process.exit(0);
    })();
}
