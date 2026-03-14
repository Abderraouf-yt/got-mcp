import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ThoughtGraph, getGraphInstance } from "../../graph/index.js";
import { ContextStore } from "../../context/index.js";
import { registerCoreTools } from "./core.js";
import { registerGotTools } from "./got.js";
import { registerOrchestrationTools } from "./orchestration.js";
import { registerIoTools } from "./io.js";
import { registerContextTools } from "./context.js";
import { registerPerspectivesTools } from "./perspectives.js";

export function registerAllTools(
    server: McpServer, 
    graph: ThoughtGraph, 
    contextStore: ContextStore,
    notifyUpdate: (sessionId?: string) => void
) {
    registerCoreTools(server, graph, notifyUpdate);
    registerGotTools(server, graph, notifyUpdate);
    registerOrchestrationTools(server, graph, notifyUpdate);
    registerIoTools(server, graph, notifyUpdate);
    registerContextTools(server, contextStore);
    registerPerspectivesTools(server, graph, notifyUpdate);
}

export * from "./core.js";
export * from "./got.js";
export * from "./orchestration.js";
export * from "./io.js";
export * from "./context.js";
export * from "./perspectives.js";
