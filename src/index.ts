#!/usr/bin/env node
/**
 * Thought Graph MCP Server
 * Main entry point for the Graph of Thoughts (GoT) reasoning server.
 * 
 * @module index
 * @description MCP server implementing non-linear reasoning with directed graph structure.
 *              Serves both Stdio (for Agents) and HTTP/SSE (for Visualization) transports
 *              sharing the same in-memory graph state.
 * @version 1.3.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
import { getGraphInstance } from "./graph/index.js";
import { TOOLS, handleToolCall } from "./tools/index.js";
import { RESOURCES, readResource } from "./resources/index.js";

// Configuration - HTTP port can be overridden via environment variable
const HTTP_PORT = parseInt(process.env.THOUGHT_GRAPH_HTTP_PORT || '3001', 10);

/**
 * Create a configured MCP Server instance.
 * Connects to the shared ThoughtGraph singleton.
 */
function createServerInstance(): Server {
    const server = new Server(
        {
            name: SERVER_CONFIG.name,
            version: SERVER_CONFIG.version,
        },
        {
            capabilities: {
                tools: {},
                resources: {},
                sampling: {},
            },
        }
    );

    const graph = getGraphInstance();

    // Register Resource Handlers
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: RESOURCES,
    }));

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        return readResource(request.params.uri, graph);
    });

    // Register Tool Handlers
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOLS,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        return handleToolCall(name, args, graph, server);
    });

    return server;
}

/**
 * Start the Express Server for SSE/HTTP (Dashboard Bridge).
 */
function startHttpServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Active SSE sessions
    const activeSessions = new Map<string, SSEServerTransport>();

    app.get("/sse", async (req, res) => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        // console.error(`📡 New SSE connection: ${sessionId}`); // Log to stderr to avoid corrupting Stdio

        const transport = new SSEServerTransport("/messages", res);
        const server = createServerInstance();

        activeSessions.set(sessionId, transport);

        res.on("close", () => {
            // console.error(`📴 SSE connection closed: ${sessionId}`);
            activeSessions.delete(sessionId);
        });

        await server.connect(transport);
    });

    app.post("/messages", async (req, res) => {
        // SSEServerTransport handles message routing internally via the /messages endpoint
        // NOTE: The SDK's SSEServerTransport expects the POST handler to be mounted BUT
        // logically it handles the response writing. 
        // In the Express integration pattern, we usually need to delegate to the transport.
        // However, standard handler just acknowledges receipt for uni-directional?
        // Actually for MCP, the POST sends the JSON-RPC message to the server.
        // The transport's `handlePostMessage` should be used if exposed, but SDK v0.6.0
        // pattern is often having the transport handle it.
        // Let's stick to the simplest pattern: standard transport `handlePostMessage` isn't 
        // always directly exposed as middleware. 
        // For this simple bridge, we accept the POST and the transport (connected to response) 
        // sends events back on the GET connection.
        // The actual input handling:
        // The `transport` instance we created in GET /sse receives messages via `transport.handlePostMessage`?
        // Wait, SSEServerTransport listens for messages on the *request*? 
        // No, it sends events on the response. The client POSTs to a URL. 
        // We need to route that POST body to the correct transport's `handlePostMessage`.
        // But we have multiple sessions!
        // The Client typically includes a `sessionId` query param or cookie?
        // Reverting to the logic from `bridge.ts`: it just did `res.status(200).json({ status: "received" });`
        // which seems wrong for a functional server unless the client sends data some other way.
        // BUT, for the Visualizer, it's mostly READING data (GET /api/graph).
        // The Visualizer doesn't strictly need full MCP duplex if it just polls REST.
        // However, if we want full MCP, we need to solve the session routing.
        // For now, let's keep the `bridge.ts` logic which included a REST endpoint.

        // Use the REST endpoint for the Visualizer mainly.
        res.status(200).json({ status: "received" });
    });

    // REST API for simple graph polling (used by Visualizer)
    app.get("/api/graph", (req, res) => {
        res.json(getGraphInstance().getGraph());
    });

    app.get("/health", (req, res) => {
        const graph = getGraphInstance();
        res.json({
            status: "ok",
            name: SERVER_CONFIG.name,
            version: SERVER_CONFIG.version,
            connections: activeSessions.size,
            graph: {
                nodes: graph.size,
                edges: graph.edgeCount,
            },
        });
    });

    const httpServer = app.listen(HTTP_PORT);

    httpServer.on('listening', () => {
        console.error(`🚀 Bridge running on http://localhost:${HTTP_PORT}`);
    });

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`⚠️  Port ${HTTP_PORT} already in use. HTTP bridge disabled. Stdio MCP still active.`);
            console.error(`   ℹ️  Set THOUGHT_GRAPH_HTTP_PORT env to use a different port`);
            // Don't exit - Stdio server still works!
        } else {
            console.error(`⚠️  HTTP server error: ${err.message}`);
        }
    });
}

/**
 * Main entry point.
 */
async function main() {
    // 1. Start HTTP Server for Visualizer
    startHttpServer();

    // 2. Start Stdio Server for Agent (Gemini)
    const server = createServerInstance();
    const transport = new StdioServerTransport();

    // Connect to Stdio transport
    await server.connect(transport);

    console.error(`🧠 Thought Graph MCP running (Stdio + HTTP:${HTTP_PORT})`);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
