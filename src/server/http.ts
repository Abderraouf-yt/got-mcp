import express from "express";
import net from "net";
import crypto from "crypto";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { SERVER_CONFIG } from "../types.js";
import { getGraphInstance } from "../graph/index.js";
import { createServerInstance } from "./mcp.js";

const PREFERRED_PORT = parseInt(process.env.THOUGHT_GRAPH_HTTP_PORT || '3001', 10);
const MAX_PORT_ATTEMPTS = 20;

/**
 * Check if a port is available by briefly binding to it.
 * Uses Node.js built-in `net` module — zero external dependencies.
 */
function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
            server.close(() => resolve(true));
        });
        server.listen(port, "127.0.0.1");
    });
}

/**
 * Find the first available port starting from `startPort`.
 * Tries up to MAX_PORT_ATTEMPTS ports sequentially.
 */
async function findAvailablePort(startPort: number): Promise<number> {
    for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset++) {
        const port = startPort + offset;
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    // Fallback: let the OS assign a random port
    return 0;
}

/**
 * Start the Express Server for SSE/HTTP (Dashboard Bridge).
 * Automatically finds an available port if the preferred one is busy.
 */
export async function startHttpServer(): Promise<net.Server> {
    const port = await findAvailablePort(PREFERRED_PORT);

    const app = express();
    // Minimal localhost-only CORS (no external dependency needed)
    app.use((_req, res, next) => {
        res.header("Access-Control-Allow-Origin", "http://localhost:5173");
        res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type");
        next();
    });
    app.use(express.json());

    const activeSessions = new Map<string, SSEServerTransport>();

    app.get("/sse", async (req, res) => {
        const sessionId = `session_${crypto.randomUUID()}`;

        const transport = new SSEServerTransport("/messages", res);
        const mcpServer = createServerInstance();

        activeSessions.set(sessionId, transport);

        res.on("close", () => {
            activeSessions.delete(sessionId);
        });

        await mcpServer.connect(transport);
    });

    app.post("/messages", async (req, res) => {
        res.status(200).json({ status: "received" });
    });

    app.get("/api/graph", (req, res) => {
        const sessionId = (req.query.sessionId as string) || "default";
        res.json(getGraphInstance(sessionId).getGraph());
    });

    app.get("/api/graph/stream", (req, res) => {
        const sessionId = (req.query.sessionId as string) || "default";
        // Setup SSE headers
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        });

        const graph = getGraphInstance(sessionId);

        // Send the initial state immediately
        res.write(`data: ${JSON.stringify(graph.getGraph())}\n\n`);

        // Subscribe to real-time mutations
        const unsubscribe = graph.onUpdate(() => {
            res.write(`data: ${JSON.stringify(graph.getGraph())}\n\n`);
        });

        // Cleanup strictly on disconnect to prevent memory leaks
        req.on("close", () => {
            unsubscribe();
        });
    });

    app.get("/health", (req, res) => {
        const sessionId = (req.query.sessionId as string) || "default";
        const graph = getGraphInstance(sessionId);
        res.json({
            status: "ok",
            name: SERVER_CONFIG.name,
            version: SERVER_CONFIG.version,
            port: actualPort,
            connections: activeSessions.size,
            graph: {
                nodes: graph.size,
                edges: graph.edgeCount,
                sessionId,
            },
        });
    });

    let actualPort = port;

    return new Promise((resolve) => {
        const httpServer = app.listen(port, () => {
            const addr = httpServer.address();
            // If port was 0, OS assigned a random port — read it back
            if (addr && typeof addr === "object") {
                actualPort = addr.port;
            }

            if (actualPort !== PREFERRED_PORT) {
                console.error(`🚀 Bridge on http://localhost:${actualPort} (port ${PREFERRED_PORT} was busy)`);
            } else {
                console.error(`🚀 Bridge on http://localhost:${actualPort}`);
            }
            resolve(httpServer);
        });

        httpServer.on('error', (err: NodeJS.ErrnoException) => {
            console.error(`⚠️  HTTP bridge error: ${err.message}`);
            // Even if HTTP fails, resolve so Stdio MCP isn't blocked
            resolve(httpServer);
        });
    });
}
