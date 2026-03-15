import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContextStore, getContextInstance } from "../../context/ContextStore.js";
import { logger } from "../logger.js";

export function registerContextTools(server: McpServer, defaultContextStore: ContextStore) {
    server.registerTool(
        "context_set",
        {
            description: "Write a key-value pair to the shared context store. Tracks source provenance for trust scoring. Use this to share intermediate results between reasoning steps.",
            inputSchema: z.object({
                key: z.string().min(1).max(200).describe("Context key (e.g. 'user_requirements', 'domain_constraints')"),
                value: z.any().describe("Any JSON-serializable value"),
                source: z.string().min(1).max(200).describe("Source of this context (e.g. 'propose_thought:node_3', 'user_input')"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { destructiveHint: true },
            outputSchema: z.object({
                key: z.string(),
                source: z.string(),
                totalEntries: z.number()
            })
        },
        async ({ key, value, source, sessionId }) => {
            try {
                const contextStore = sessionId ? getContextInstance(sessionId) : defaultContextStore;
                
                // Smart type detection: attempt to parse stringified JSON to preserve arrays/objects
                let finalValue = value;
                if (typeof value === 'string') {
                    const trimmed = value.trim();
                    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
                        try {
                            finalValue = JSON.parse(trimmed);
                        } catch (e) {
                            // If parsing fails, treat as a normal string
                        }
                    }
                }

                contextStore.set(key, finalValue, source);
                return {
                    content: [{ type: "text" as const, text: `Context set for ${sessionId || 'default'}: ${key} (source: ${source})` }],
                    structuredContent: { key, source, totalEntries: contextStore.size },
                };
            } catch (err) {
                logger.error(`Error in context_set: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "context_get",
        {
            description: "Read a value from the shared context store. Returns value + source provenance. Check context before generating redundant thoughts.",
            inputSchema: z.object({
                key: z.string().min(1).describe("Context key to retrieve"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { destructiveHint: true },
            outputSchema: z.object({}).passthrough()
        },
        async ({ key, sessionId }) => {
            const contextStore = sessionId ? getContextInstance(sessionId) : defaultContextStore;
            const entry = contextStore.getWithProvenance(key);
            if (!entry) {
                return { content: [{ type: "text" as const, text: `Context key '${key}' not found in session '${sessionId || 'default'}'` }], isError: true };
            }
            return {
                content: [{ type: "text" as const, text: JSON.stringify(entry, null, 2) }],
                structuredContent: { key, ...entry },
            };
        }
    );

    server.registerTool(
        "context_list",
        {
            description: "List all keys in the shared context store with their sources. Use to see what knowledge is already available before generating new thoughts.",
            inputSchema: z.object({
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { readOnlyHint: true },
            outputSchema: z.object({}).passthrough()
        },
        async ({ sessionId }) => {
            const contextStore = sessionId ? getContextInstance(sessionId) : defaultContextStore;
            const entries = contextStore.list();
            return {
                content: [{ type: "text" as const, text: entries.length > 0 ? JSON.stringify(entries, null, 2) : `Context store for '${sessionId || 'default'}' is empty` }],
                structuredContent: { entries, count: entries.length },
            };
        }
    );
}
