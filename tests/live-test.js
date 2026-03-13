import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateFile = path.join(__dirname, '..', 'thought-graph-state.json');

// Ensure an empty graph starts
const initialState = {
    nodes: [],
    edges: [],
    meta: { nodeCount: 0, edgeCount: 0, lastModified: new Date().toISOString() }
};
fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));

const nodesToInject = [
    { text: "Starting real-time SSE stream verification.", status: "active", id: "n1" },
    { text: "Server-Sent Events connection established.", status: "validated", id: "n2", parent: "n1" },
    { text: "Wait, what if SSE drops?", status: "branching", id: "n3", parent: "n2" },
    { text: "EventSource automatically reconnects natively in the browser.", status: "validated", id: "n4", parent: "n3" },
    { text: "SSE is officially faster and lighter than SWR polling.", status: "validated", id: "n5" }
];

let currentIndex = 0;

console.log("Waiting 10 seconds for browser subagent to load the page...");

setTimeout(() => {
    console.log("Starting live data injection...");

    const graph = { nodes: [], edges: [], meta: { nodeCount: 0, edgeCount: 0 } };

    const interval = setInterval(() => {
        if (currentIndex >= nodesToInject.length) {
            clearInterval(interval);
            console.log("Injection complete.");
            return;
        }

        const item = nodesToInject[currentIndex];

        graph.nodes.push({
            id: item.id,
            thought: item.text,
            status: item.status,
            score: 0.95,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        if (item.parent) {
            graph.edges.push({
                from: item.parent,
                to: item.id,
                relation: "refinement",
                createdAt: new Date().toISOString()
            });
        }

        // Also add aggregation edge for n5
        if (item.id === "n5") {
            graph.edges.push({ from: "n2", to: "n5", relation: "aggregation", createdAt: new Date().toISOString() });
            graph.edges.push({ from: "n4", to: "n5", relation: "aggregation", createdAt: new Date().toISOString() });
        }

        graph.meta.nodeCount = graph.nodes.length;
        graph.meta.edgeCount = graph.edges.length;
        graph.meta.lastModified = new Date().toISOString();

        // Atomic write to avoid partial reads by Express Watcher
        const tempFile = stateFile + ".tmp";
        fs.writeFileSync(tempFile, JSON.stringify(graph, null, 2));
        fs.renameSync(tempFile, stateFile);

        console.log(`Injected node ${item.id}`);
        currentIndex++;
    }, 2000); // Deploy a thought every 2 seconds
}, 10000);
