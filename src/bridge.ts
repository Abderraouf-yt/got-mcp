/**
 * Thought Graph SSE Bridge
 * HTTP bridge for browser-based dashboard connectivity.
 * Exposes the thought-graph MCP server over Server-Sent Events.
 * 
 * @module bridge
 * @description SSE/HTTP transport layer for web-based visualization
 * @version 1.3.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";

import { SERVER_CONFIG } from "./types.js";
import { ThoughtGraph } from "./graph/index.js";
import { TOOLS, handleToolCall } from "./tools/index.js";
import { RESOURCES, readResource } from "./resources/index.js";

/**
 * Bridge Configuration
 */
const BRIDGE_CONFIG = {
    port: 3001,
    name: "thought-graph-bridge",
    version: SERVER_CONFIG.version,
} as const;

/**
 * Shared graph instance for all SSE connections.
 * Unlike the main server (which uses singleton), the bridge maintains
 * its own graph that persists across all web clients.
 */
const sharedGraph = new ThoughtGraph();

/**
 * Active SSE transport sessions.
 */
const activeSessions: Map<string, SSEServerTransport> = new Map();

/**
 * Create and configure an MCP server instance for SSE transport.
 * Each SSE connection gets its own server but shares the graph.
 */
function createMCPServer(): Server {
    const server = new Server(
        {
            name: BRIDGE_CONFIG.name,
            version: BRIDGE_CONFIG.version,
        },
        {
            capabilities: {
                tools: {},
                resources: {},
            },
        }
    );

    // Register Resource Handlers
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: RESOURCES,
    }));

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        return readResource(request.params.uri, sharedGraph);
    });

    // Register Tool Handlers
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOLS,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        return handleToolCall(name, args, sharedGraph, server);
    });

    return server;
}

/**
 * Express HTTP Server Setup
 */
const app = express();
app.use(cors());
app.use(express.json());

/**
 * SSE endpoint for MCP communication.
 * Each connection creates a new MCP server instance.
 */
app.get("/sse", async (req, res) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log(`📡 New SSE connection: ${sessionId}`);

    const transport = new SSEServerTransport("/messages", res);
    const server = createMCPServer();

    activeSessions.set(sessionId, transport);

    res.on("close", () => {
        console.log(`📴 SSE connection closed: ${sessionId}`);
        activeSessions.delete(sessionId);
    });

    await server.connect(transport);
});

/**
 * Message endpoint for client -> server communication.
 * SSEServerTransport handles message routing internally.
 */
app.post("/messages", async (req, res) => {
    res.status(200).json({ status: "received" });
});

/**
 * REST API endpoint for direct graph access.
 * Alternative to MCP for simple read operations.
 */
app.get("/api/graph", (req, res) => {
    res.json(sharedGraph.getGraph());
});

/**
 * Health check endpoint.
 */
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        name: BRIDGE_CONFIG.name,
        version: BRIDGE_CONFIG.version,
        connections: activeSessions.size,
        graph: {
            nodes: sharedGraph.size,
            edges: sharedGraph.edgeCount,
        },
    });
});

/**
 * Start the HTTP server.
 */
app.listen(BRIDGE_CONFIG.port, () => {
    console.log(`🚀 ${BRIDGE_CONFIG.name} v${BRIDGE_CONFIG.version}`);
    console.log(`   Port:     http://localhost:${BRIDGE_CONFIG.port}`);
    console.log(`   SSE:      http://localhost:${BRIDGE_CONFIG.port}/sse`);
    console.log(`   REST API: http://localhost:${BRIDGE_CONFIG.port}/api/graph`);
    console.log(`   Health:   http://localhost:${BRIDGE_CONFIG.port}/health`);
});
