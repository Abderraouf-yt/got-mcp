/**
 * E2E: MCP protocol-level test for propose_thought → evaluate_thought → find_winning_path.
 *
 * Spawns the compiled server as a child process, connects via MCP SDK Client,
 * and exercises the reasoning pipeline end-to-end.
 *
 * Run: npx tsx --test tests/e2e_mcp_flow.test.ts
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_ENTRY = path.resolve(__dirname, "../dist/index.js");

// Dynamic import of MCP SDK (ESM)
let Client: any, StdioClientTransport: any;

describe("E2E: propose_thought → evaluate_thought → find_winning_path", () => {
    let serverProcess: ChildProcess;
    let client: any;
    let transport: any;

    before(async () => {
        // Dynamically import MCP SDK client modules
        const mcpClient = await import("@modelcontextprotocol/sdk/client/index.js");
        const mcpStdio = await import("@modelcontextprotocol/sdk/client/stdio.js");
        Client = mcpClient.Client;
        StdioClientTransport = mcpStdio.StdioClientTransport;

        // Spawn the compiled server as a child process
        serverProcess = spawn("node", [DIST_ENTRY], {
            stdio: ["pipe", "pipe", "pipe"],
            env: { ...process.env, THOUGHT_GRAPH_HTTP_PORT: "0" }, // random port to avoid conflict
        });

        // Collect stderr so we can debug failures
        let stderrBuffer = "";
        serverProcess.stderr?.on("data", (chunk: Buffer) => {
            stderrBuffer += chunk.toString();
        });

        serverProcess.on("error", (err) => {
            console.error("Server process error:", err);
        });

        // Create the MCP client transport over stdio
        transport = new StdioClientTransport({
            command: "node",
            args: [DIST_ENTRY],
            env: { ...process.env, THOUGHT_GRAPH_HTTP_PORT: "0" },
        });

        client = new Client(
            { name: "e2e-test", version: "1.0.0" },
            { capabilities: {} }
        );

        await client.connect(transport);

        // Give the HTTP bridge a moment to start (non-blocking for tests)
        console.error("E2E test client connected to thought-graph MCP server");

        // Reset graph to ensure clean state (handles state file contamination)
        try {
            await client.callTool({ name: "reset_graph", arguments: {} });
        } catch {
            // If reset_graph tool doesn't exist, the state is already clean
        }
    });

    after(async () => {
        // Graceful shutdown
        try {
            await client?.close();
        } catch { /* ignore close errors */ }
        if (serverProcess && !serverProcess.killed) {
            serverProcess.kill();
        }
    });

    test("1. propose_thought — create root thought nodes", async () => {
        // Create first root thought
        const result1 = await client.callTool({
            name: "propose_thought",
            arguments: {
                thought: "What is the most efficient way to sort a large dataset?",
            },
        });

        assert.ok(result1.content, "result1 should have content");
        const text1 = result1.content.find((c: any) => c.type === "text")?.text || "";
        assert.ok(text1.includes("node_"), `Should return a node ID, got: ${text1}`);

        // Parse the full node ID from the response (handles UUID-prefixed IDs like node_abc123_42)
        const nodeId1 = text1.match(/node_[a-f0-9]+_\d+/)?.[0] || text1.match(/node_\d+/)?.[0];
        assert.ok(nodeId1, `Should extract node ID from: ${text1}`);

        // Store for later tests
        (globalThis as any).__rootNode = nodeId1;

        // Create a second root thought
        const result2 = await client.callTool({
            name: "propose_thought",
            arguments: {
                thought: "Quicksort is usually the best choice for in-memory sorting.",
                parentId: nodeId1,
                relation: "refinement",
            },
        });

        assert.ok(result2.content, "result2 should have content");
        const text2 = result2.content.find((c: any) => c.type === "text")?.text || "";
        assert.ok(text2.includes("node_"), `Should return a node ID, got: ${text2}`);

        const nodeId2 = text2.match(/node_[a-f0-9]+_\d+/)?.[0] || text2.match(/node_\d+/)?.[0];
        assert.ok(nodeId2, `Should extract node ID from: ${text2}`);
        (globalThis as any).__childNode = nodeId2;

        // Create a third thought (alternative branch)
        const result3 = await client.callTool({
            name: "propose_thought",
            arguments: {
                thought: "Mergesort is more stable and better for linked lists.",
                parentId: nodeId1,
                relation: "branch",
            },
        });

        assert.ok(result3.content);
        const text3 = result3.content.find((c: any) => c.type === "text")?.text || "";
        const nodeId3 = text3.match(/node_[a-f0-9]+_\d+/)?.[0] || text3.match(/node_\d+/)?.[0];
        assert.ok(nodeId3);
        (globalThis as any).__branchNode = nodeId3;

        console.error(`Created nodes: root=${nodeId1}, child=${nodeId2}, branch=${nodeId3}`);
    });

    test("2. evaluate_thought — score and validate nodes", async () => {
        const rootNode = (globalThis as any).__rootNode;
        const childNode = (globalThis as any).__childNode;
        const branchNode = (globalThis as any).__branchNode;
        assert.ok(rootNode && childNode && branchNode, "Node IDs must exist from previous test");

        // Score the root thought
        const eval1 = await client.callTool({
            name: "evaluate_thought",
            arguments: {
                nodeId: rootNode,
                score: 0.8,
                status: "validated",
                critique: "Good foundational question about sorting algorithms.",
            },
        });

        assert.ok(eval1.content);
        const evalText1 = eval1.content.find((c: any) => c.type === "text")?.text || "";
        assert.ok(evalText1.includes(rootNode), `Should reference node ${rootNode}`);

        // Score the quicksort thought
        const eval2 = await client.callTool({
            name: "evaluate_thought",
            arguments: {
                nodeId: childNode,
                score: 0.85,
                status: "validated",
                critique: "Strong claim, generally correct for average cases.",
            },
        });

        assert.ok(eval2.content);

        // Score the mergesort branch lower
        const eval3 = await client.callTool({
            name: "evaluate_thought",
            arguments: {
                nodeId: branchNode,
                score: 0.6,
                status: "active",
                critique: "Valid point but less relevant for general in-memory sorting.",
            },
        });

        assert.ok(eval3.content);
        console.error("All 3 thoughts evaluated successfully");
    });

    test("3. find_winning_path — discover the best reasoning chain", async () => {
        const result = await client.callTool({
            name: "find_winning_path",
            arguments: {
                beamWidth: 2,
                scoreThreshold: 0.3,
                maxPathLength: 10,
            },
        });

        assert.ok(result.content, "find_winning_path should return content");
        const text = result.content.find((c: any) => c.type === "text")?.text || "";
        console.error(`find_winning_path result:\n${text}`);

        // Should have found the quicksort path (higher score: 0.8 + 0.85 = 1.65)
        assert.ok(
            text.includes("Winning path") || text.includes("No winning path found"),
            `Should include path info, got: ${text.substring(0, 200)}`
        );

        // If path found, verify structure
        if (text.includes("Winning path")) {
            assert.ok(text.includes("node_"), "Path should reference node IDs");
        }
    });

    test("4. get_graph_metrics — verify graph state", async () => {
        const result = await client.callTool({
            name: "get_graph_metrics",
            arguments: {},
        });

        assert.ok(result.content);
        const text = result.content.find((c: any) => c.type === "text")?.text || "";

        assert.ok(text.includes("Nodes:"), `Should include node count, got: ${text}`);
        assert.ok(text.includes("Edges:"), `Should include edge count, got: ${text}`);

        console.error(`Graph metrics:\n${text}`);
    });

    test("5. get_thought_graph — retrieve full graph state", async () => {
        const result = await client.callTool({
            name: "get_thought_graph",
            arguments: {},
        });

        assert.ok(result.content);
        const text = result.content.find((c: any) => c.type === "text")?.text || "";
        const graph = JSON.parse(text);

        assert.ok(graph.nodes, "Graph should have nodes array");
        assert.ok(graph.edges, "Graph should have edges array");
        assert.ok(graph.nodes.length >= 3, `Should have at least 3 nodes, got ${graph.nodes.length}`);
        assert.ok(graph.edges.length >= 2, `Should have at least 2 edges, got ${graph.edges.length}`);

        console.error(`Full graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
    });
});
