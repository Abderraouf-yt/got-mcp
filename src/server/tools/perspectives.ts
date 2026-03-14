import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThoughtGraph, getGraphInstance } from "../../graph/index.js";
import { logger } from "../logger.js";
import type { Perspective } from "../../types.js";

/**
 * Lens Taxonomy for analytical branching.
 */
const LENS_TAXONOMY: Record<string, string[]> = {
    technical: ["Scalability", "Security", "Performance", "Maintainability"],
    business: ["ROI", "Time-to-Market", "Customer Value", "Competition"],
    compliance: ["Security Controls", "Privacy (GDPR)", "Data Integrity"],
    personal: ["Emotional Impact", "Long-term Growth", "Financial Stability"],
};

/**
 * Keywords to map query to domain.
 */
const DOMAIN_KEYWORDS: Record<string, string> = {
    "aws": "compliance",
    "cloud": "technical",
    "budget": "business",
    "money": "business",
    "security": "compliance",
    "code": "technical",
    "software": "technical",
    "career": "personal",
    "life": "personal",
    "compliance": "compliance",
    "soc2": "compliance",
    "soc 2": "compliance",
    "audit": "compliance",
    "saas": "business",
    "pivot": "business",
    "model": "business",
    "scale": "technical",
    "concurrent": "technical",
};

/**
 * Heuristic Perspective Generator
 */
export function generateHeuristicPerspectives(query: string, count: number): Perspective[] {
    const lowerQuery = query.toLowerCase();
    let domain = "technical"; // default

    // Basic domain detection
    for (const [kw, d] of Object.entries(DOMAIN_KEYWORDS)) {
        if (lowerQuery.includes(kw)) {
            domain = d;
            break;
        }
    }

    const lenses = LENS_TAXONOMY[domain] || LENS_TAXONOMY.technical;
    const perspectives: Perspective[] = [];

    for (let i = 0; i < Math.min(count, lenses.length); i++) {
        perspectives.push({
            lens: lenses[i],
            thought: `${lenses[i]} perspective on: ${query}`,
            weight: 0.5
        });
    }

    // If we need more than taxonomy has, add generic ones
    if (perspectives.length < count) {
        perspectives.push({
            lens: "Risk",
            thought: `Potential risks and downsides of: ${query}`,
            weight: 0.4
        });
    }

    return perspectives.slice(0, count);
}

export function registerPerspectivesTools(server: McpServer, defaultGraph: ThoughtGraph, notifyUpdate: (sessionId?: string) => void) {
    // T008 [US1] Register generate_perspectives tool
    server.registerTool(
        "generate_perspectives",
        {
            description: "Automatically generate analytical perspectives from a short query to seed a Graph of Thoughts reasoning loop.",
            inputSchema: z.object({
                query: z.string().min(1).describe("The user's vague or short analytical query"),
                count: z.number().int().min(1).max(5).default(3).describe("Number of perspectives to generate (1-5)"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            outputSchema: z.object({
                perspectives: z.array(z.object({
                    lens: z.string(),
                    thought: z.string(),
                    weight: z.number()
                }))
            })
        },
        async ({ query, count, sessionId }) => {
            try {
                logger.info(`Generating ${count} perspectives for query: "${query}"`);
                
                const perspectives = generateHeuristicPerspectives(query, count);

                return {
                    content: [{ type: "text" as const, text: `Generated ${perspectives.length} perspectives for domain.` }],
                    structuredContent: { perspectives }
                };
            } catch (err) {
                logger.error(`Error in generate_perspectives: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );
}
