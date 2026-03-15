import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThoughtGraph, getGraphInstance } from "../../graph/index.js";
import type { ConfidenceVector, ThoughtNode } from "../../types.js";
import { logger } from "../logger.js";
import { generateHeuristicPerspectives } from "./perspectives.js";

/**
 * High-signal security keys for recursive traversal.
 */
const HIGH_SIGNAL_KEYS = new Set([
    "Effect", "Principal", "Action", "Resource", "Condition",
    "PublicAccessBlockConfiguration", "BlockPublicAcls", "IgnorePublicAcls", 
    "BlockPublicPolicy", "RestrictPublicBuckets",
    "accessConfigurations", "ipConfigurations", "networkSecurityGroup", "networkSecurityGroups",
    "access", "protocol", "destinationPortRange"
]);

/**
 * Recursive JSON traversal for fact extraction.
 * Fulfills FR-004 and FR-005.
 */
function extractFacts(obj: any, path: string = "$", results: { path: string, key: string, value: any }[] = []) {
    if (!obj || typeof obj !== "object") return results;

    for (const key in obj) {
        const currentPath = `${path}.${key}`;
        const value = obj[key];

        if (HIGH_SIGNAL_KEYS.has(key)) {
            results.push({ path: currentPath, key, value });
        }

        if (typeof value === "object") {
            extractFacts(value, currentPath, results);
        }
    }
    return results;
}

/**
 * Provider detection heuristics.
 * Fulfills FR-003.
 */
function detectProvider(jsonStr: string): "AWS" | "Azure" | "Unknown" {
    if (jsonStr.includes("arn:aws") || jsonStr.includes("iam") || jsonStr.includes("AccountPublicAccessBlock")) return "AWS";
    if (jsonStr.includes("/subscriptions/") || jsonStr.includes("resourceGroup") || jsonStr.includes("Microsoft.Network")) return "Azure";
    return "Unknown";
}

export function registerOrchestrationTools(server: McpServer, defaultGraph: ThoughtGraph, notifyUpdate: (sessionId?: string) => void) {
    server.registerTool(
        "reflect_and_refine",
        {
            description: "Self-reflection loop: auto-critique a thought, assess confidence on 4 axes (factual, logical, relevance, novelty), and optionally branch a refined version. Implements DeepSeek-R1 self-verification pattern.",
            inputSchema: z.object({
                nodeId: z.string().min(1).describe("Node to reflect on"),
                critique: z.string().min(1).max(5000).describe("Your critique of this thought"),
                confidence: z.object({
                    factual: z.number().min(0).max(1).describe("Grounded in verifiable facts (0-1)"),
                    logical: z.number().min(0).max(1).describe("Reasoning chain is valid (0-1)"),
                    relevance: z.number().min(0).max(1).describe("Addresses the problem directly (0-1)"),
                    novelty: z.number().min(0).max(1).describe("Adds new information vs restating (0-1)"),
                }).describe("Multi-dimensional confidence assessment"),
                refinedThought: z.string().max(5000).optional()
                    .describe("If critique reveals a flaw, provide the improved version to auto-branch"),
                authorId: z.string().optional().describe("Which sub-agent explicitly evaluated this thought"),
                agentTarget: z.string().optional().describe("Re-route to another specialized agent persona"),
                executionState: z.enum(["queued", "processing", "done"]).optional().describe("Update swarm fulfillment state"),
                dependencies: z.array(z.string()).optional().describe("Update explicit node dependencies"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { destructiveHint: true },
            outputSchema: z.object({
                nodeId: z.string(),
                critiqueId: z.string(),
                branchId: z.string().nullable(),
                compositeScore: z.number(),
                confidence: z.object({}).passthrough()
            })
        },
        async ({ nodeId, critique, confidence, refinedThought, authorId, agentTarget, executionState, dependencies, sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const result = await graph.reflectAndRefine(nodeId, critique, confidence, refinedThought);

                if (authorId || agentTarget || executionState || dependencies) {
                    await graph.updateNode(nodeId, {
                        authorId, agentTarget, executionState, dependencies
                    });
                    if (result.branchId) {
                        await graph.updateNode(result.branchId, {
                            authorId, agentTarget, executionState: "queued", dependencies
                        });
                    }
                }

                notifyUpdate(sessionId);
                const parts = [
                    `Reflection on ${nodeId}: composite score ${result.compositeScore}`,
                    `Critique node: ${result.critiqueId}`,
                ];
                if (result.branchId) {
                    parts.push(`Refined branch: ${result.branchId} (auto-branched because score < 0.7)`);
                }

                return {
                    content: [{ type: "text" as const, text: parts.join("\n") }],
                    structuredContent: {
                        nodeId,
                        critiqueId: result.critiqueId,
                        branchId: result.branchId ?? null,
                        compositeScore: result.compositeScore,
                        confidence,
                    },
                };
            } catch (err) {
                logger.error(`Error in reflect_and_refine: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "run_controller_loop",
        {
            description: "Autonomous GoT Controller Loop: Seeds a graph with a prompt + initial thoughts, then iteratively evaluates, branches, reflects, prunes, and converges until a winning path emerges or the iteration budget is exhausted. Returns the winning conclusion, full reasoning trace, and per-iteration metrics.",
            inputSchema: z.object({
                prompt: z.string().min(1).max(5000).describe("The reasoning question or problem statement"),
                thoughts: z.array(z.string().min(1).max(5000)).optional().describe("Initial thought branches to explore (1-10)"),
                autoSeed: z.boolean().optional().default(false).describe("If true and 'thoughts' is empty, automatically generate initial perspectives"),
                maxIterations: z.number().int().min(1).max(20).default(5).describe("Maximum reasoning cycles (default: 5)"),
                convergenceThreshold: z.number().min(0).max(1).default(0.85).describe("Stop when best path average score exceeds this (default: 0.85)"),
                autoPruneBelow: z.number().min(0).max(1).default(0.3).describe("Auto soft-prune branches scoring below this (default: 0.3)"),
                beamWidth: z.number().int().min(1).max(10).default(2).describe("Number of top paths to track during convergence (default: 2)"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { destructiveHint: true },
            outputSchema: z.object({}).passthrough()
        },
        async ({ prompt, thoughts, autoSeed, maxIterations, convergenceThreshold, autoPruneBelow, beamWidth, sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                
                let initialThoughts = thoughts || [];
                if (initialThoughts.length === 0 && autoSeed) {
                    const perspectives = generateHeuristicPerspectives(prompt, 3);
                    initialThoughts = perspectives.map(p => p.thought);
                    logger.info(`Auto-seeding graph with ${initialThoughts.length} perspectives`);
                }

                const result = await graph.runControllerLoop(prompt, initialThoughts, {
                    maxIterations,
                    convergenceThreshold,
                    autoPruneBelow,
                    beamWidth,
                });

                notifyUpdate(sessionId);

                const summary = [
                    `Controller Loop ${result.converged ? "CONVERGED" : "EXHAUSTED"} after ${result.iterations} iterations.`,
                    `Winning path: ${result.winningPath.pathIds.join(" → ")} (score: ${result.winningPath.totalScore})`,
                    `Conclusion: "${result.winningPath.conclusion.substring(0, 200)}"`,
                    `Graph: ${result.metrics.nodeCount} nodes, ${result.metrics.edgeCount} edges`,
                    `Prune ratio: ${Math.round(result.metrics.pruneRatio * 100)}%`,
                ].join("\n");

                return {
                    content: [{ type: "text" as const, text: summary }],
                    structuredContent: result as unknown as Record<string, unknown>,
                };
            } catch (err) {
                logger.error(`Error in run_controller_loop: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "compile_node_context",
        {
            description: "SOTA Context Firewall: Compiles the exact reasoning context for a specific node, filtering out all lateral branches. Protects swarm agents against context bottlenecks.",
            inputSchema: z.object({
                nodeId: z.string().min(1).describe("The target node that requires restricted context extraction"),
                ignorePruned: z.boolean().default(true).describe("If true, stop traversing paths that were rejected/soft-pruned (0 score) to prevent context token leaks"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { readOnlyHint: true },
            outputSchema: z.object({}).passthrough()
        },
        async ({ nodeId, ignorePruned, sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const trace = graph.compileNodeContext(nodeId, ignorePruned ?? true);
                return {
                    content: [{ type: "text" as const, text: JSON.stringify(trace, null, 2) }],
                    structuredContent: { contextNodes: trace, count: trace.length },
                };
            } catch (err) {
                logger.error(`Error in compile_node_context: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "query_nodes",
        {
            description: "Query and filter nodes by swarm orchestration fields (e.g., finding all queued tasks for a specific agent). This is the primary task discovery mechanism for swarm agents.",
            inputSchema: z.object({
                executionState: z.enum(["queued", "processing", "done"]).optional().describe("Filter by execution state"),
                agentTarget: z.string().optional().describe("Filter by targeted agent persona"),
                status: z.enum(["active", "validated", "rejected", "branching"]).optional().describe("Filter by logical status"),
                authorId: z.string().optional().describe("Filter by the authoring agent"),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
            }),
            annotations: { readOnlyHint: true },
            outputSchema: z.object({}).passthrough()
        },
        async ({ executionState, agentTarget, status, authorId, sessionId }) => {
            try {
                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const results = graph.queryNodes({ executionState, agentTarget, status, authorId });
                return {
                    content: [{ type: "text" as const, text: `Found ${results.length} nodes matching the query.` }],
                    structuredContent: { nodes: results, count: results.length },
                };
            } catch (err) {
                logger.error(`Error in query_nodes: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );

    server.registerTool(
        "ingest_evidence",
        {
            description: "Ingest raw infrastructure configuration data (AWS/Azure JSON) into the Thought Graph as verifiable Evidence Nodes.",
            inputSchema: z.object({
                rawJson: z.string().min(1).describe("The stringified JSON export from a cloud provider CLI or API."),
                sessionId: z.string().optional().describe("Session ID for isolated reasoning paths"),
                provider: z.enum(["AWS", "Azure"]).optional().describe("Explicit cloud provider override"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false }
        },
        async ({ rawJson, sessionId, provider }) => {
            try {
                // T005: Input validation
                let parsed: any;
                try {
                    parsed = JSON.parse(rawJson);
                } catch (e) {
                    return { content: [{ type: "text" as const, text: "Error: Invalid JSON input. Please provide a valid stringified JSON structure." }], isError: true };
                }

                const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
                const detectedProvider = provider || detectProvider(rawJson);
                
                logger.info(`Ingesting evidence. Provider: ${detectedProvider}, Session: ${sessionId || "default"}`);

                // T004: Fact extraction
                const facts = extractFacts(parsed);
                const createdIds: string[] = [];

                for (const fact of facts) {
                    const valueStr = typeof fact.value === "string" ? fact.value : JSON.stringify(fact.value);
                    const thought = `[${detectedProvider} Evidence] ${fact.key}: ${valueStr}`;
                    
                    const nodeId = await graph.addNode(thought);
                    await graph.updateNode(nodeId, {
                        metadata: {
                            entityType: "CloudEvidence",
                            provider: detectedProvider,
                            sourcePath: fact.path,
                            attribute: fact.key,
                            lens: "Compliance"
                        }
                    });
                    createdIds.push(nodeId);
                }

                // T016: Auto-linking (User Story 3)
                // Link each new evidence node to an existing "Compliance" or "Security" perspective if present
                const existingNodes = graph.getGraph().nodes;
                const targetNodes = existingNodes.filter(n => 
                    n.metadata?.entityType === "Perspective" && 
                    (n.metadata?.lens === "Compliance" || n.metadata?.lens === "Security")
                );

                for (const evidenceId of createdIds) {
                    for (const target of targetNodes) {
                        await graph.addEdge(evidenceId, target.id, "supports");
                    }
                }

                notifyUpdate(sessionId);

                return {
                    content: [{ type: "text" as const, text: `Successfully ingested ${createdIds.length} evidence nodes from ${detectedProvider}.` }],
                    structuredContent: { count: createdIds.length, ids: createdIds, provider: detectedProvider }
                };

            } catch (err) {
                logger.error(`Error in ingest_evidence: ${err}`);
                return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
            }
        }
    );
}
