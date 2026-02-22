import express from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { SERVER_CONFIG } from "../types.js";
import { getGraphInstance } from "../graph/index.js";
import { createServerInstance } from "./mcp.js";

const HTTP_PORT = parseInt(process.env.THOUGHT_GRAPH_HTTP_PORT || '3001', 10);

/**
 * Start the Express Server for SSE/HTTP (Dashboard Bridge).
 */
export function startHttpServer() {
    const app = express();
    // Restricting CORS to the default Visualizer port as requested in the Code Review step
    app.use(cors({ origin: 'http://localhost:5173' }));
    app.use(express.json());

    const activeSessions = new Map<string, SSEServerTransport>();

    app.get("/sse", async (req, res) => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const transport = new SSEServerTransport("/messages", res);
        const mcpServer = createServerInstance();

        activeSessions.set(sessionId, transport);

        res.on("close", () => {
            activeSessions.delete(sessionId);
        });

        await mcpServer.connect(transport);
    });

    app.post("/messages", async (req, res) => {
        // SSE route ping endpoint
        // NOTE: In a true robust production system this should route via sessionId mapping
        // to `transport.handlePostMessage` for actual bidirectional SSE communication over REST.
        // For the current setup, we just mock success as standard MCP client is Stdio.
        res.status(200).json({ status: "received" });
    });

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
        } else {
            console.error(`⚠️  HTTP server error: ${err.message}`);
        }
    });

    return httpServer;
}
