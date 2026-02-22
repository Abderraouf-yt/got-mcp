#!/usr/bin/env node
/**
 * Thought Graph MCP Server
 * Main entry point.
 * 
 * @module index
 * @description Bootstraps the HTTP Server (for SSE/dashboard) and the Stdio Server (for LLM host).
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServerInstance } from "./server/mcp.js";
import { startHttpServer } from "./server/http.js";

const HTTP_PORT = parseInt(process.env.THOUGHT_GRAPH_HTTP_PORT || '3001', 10);

async function main() {
    // 1. Start HTTP Server for Visualizer connections
    startHttpServer();

    // 2. Start Stdio Server for Agent (Gemini/Claude)
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
