/**
 * Resource Handlers
 * MCP Resource handlers for the Thought Graph server.
 * 
 * @module resources/handlers
 */

import type { ThoughtGraph } from "../graph/ThoughtGraph.js";
import { RESOURCE_URIS } from "../types.js";

/**
 * Resource metadata for ListResources response.
 */
export const RESOURCES = [
    {
        uri: RESOURCE_URIS.currentGraph,
        name: "Current Thought Graph",
        mimeType: "application/json",
        description: "A live JSON representation of the current reasoning state.",
    },
];

/**
 * Handle ReadResource request.
 */
export function readResource(
    uri: string,
    graph: ThoughtGraph
): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
    if (uri === RESOURCE_URIS.currentGraph) {
        return {
            contents: [
                {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify(graph.getGraph(), null, 2),
                },
            ],
        };
    }

    throw new Error(`Resource not found: ${uri}`);
}
