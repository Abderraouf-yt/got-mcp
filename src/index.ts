#!/usr/bin/env node
/**
 * GoT MCP Server — Graph of Thoughts
 * Main entry point.
 * 
 * @module index
 * @description Bootstraps the HTTP Server (for visualizer) and the Stdio Server (for LLM host).
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServerInstance } from "./server/mcp.js";
import { startHttpServer } from "./server/http.js";

async function main() {
    // 1. Start HTTP Server for Visualizer connections (auto-finds available port)
    await startHttpServer();

    // 2. Start Stdio Server for Agent (Gemini/Claude)
    const server = createServerInstance();
    const transport = new StdioServerTransport();

    await server.connect(transport);

    console.error(`🧠 GoT MCP running (Stdio + HTTP bridge active)`);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
