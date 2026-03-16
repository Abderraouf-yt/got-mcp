import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRequire } from "module";
import { SERVER_CONFIG, RESOURCE_URIS } from "../types.js";
import { getGraphInstance } from "../graph/index.js";
import { getContextInstance } from "../context/index.js";
import { registerAllTools } from "./tools/index.js";
import { logger } from "./logger.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json");
const version = pkg.version;

/**
 * Creates and configures the MCP Server instance with modern tool/resource registration.
 * Tools are now modularized in categorized modules within ./tools/
 */
export function createServerInstance(): McpServer {
    const server = new McpServer({
        name: SERVER_CONFIG.name,
        version: version,
    });

    const graph = getGraphInstance();
    const contextStore = getContextInstance();

    // 1. Register Resources
    server.resource(
        "Current Thought Graph",
        RESOURCE_URIS.currentGraph,
        async (uri: URL) => {
            const sessionId = uri.searchParams.get("sessionId") || "default";
            const sessionGraph = getGraphInstance(sessionId);
            return {
                contents: [{
                    uri: uri.href,
                    text: JSON.stringify(sessionGraph.getGraph(), null, 2),
                    mimeType: "application/json"
                }]
            };
        }
    );

    // v4.0: Shared Context Store resource (CA-MCP pattern)
    server.resource(
        "Shared Context Store",
        RESOURCE_URIS.contextStore,
        async (uri: URL) => ({
            contents: [{
                uri: uri.href,
                text: JSON.stringify(contextStore.getAll(), null, 2),
                mimeType: "application/json"
            }]
        })
    );

    // Helper to notify clients of updates
    const notifyUpdate = (sessionId: string = "default") => {
        logger.debug(`Notifying update for session: ${sessionId}`);
        // @ts-ignore - The MCP SDK expects a stricter Notification type intersection
        server.server.notification({ 
            method: "notifications/resources/updated", 
            params: { 
                uri: `${RESOURCE_URIS.currentGraph}?sessionId=${sessionId}` 
            } 
        });
    };

    // 2. Register Categorized Tools (Modularized)
    registerAllTools(server, graph, contextStore, notifyUpdate);

    return server;
}
