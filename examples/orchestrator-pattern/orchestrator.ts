import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Got-MCP Orchestrator Pattern
 * 
 * This example demonstrates how to build domain-specific wrapper applications natively 
 * without modifying the core server code. It loads a domain-specific persona,
 * injects context, runs the controller loop, and exports the reasoning trace for RLHF.
 */
async function runOrchestratorPipeline() {
    console.log("🚀 Starting Architect Orchestrator Pipeline...\n");

    // 1. Load the Persona constraints (The "Config Files")
    const personaPath = path.join(__dirname, "personas", "code_auditor.json");
    const personaRaw = await fs.readFile(personaPath, "utf-8");
    const persona = JSON.parse(personaRaw);

    console.log(`[Persona Loaded] Niche: ${persona.niche}`);

    // 2. Wrap the core Got-MCP server (The Wrapper Layer)
    const transport = new StdioClientTransport({
        command: "node",
        args: [path.resolve(__dirname, "../../dist/index.js")],
    });

    const client = new Client(
        { name: "orchestrator-wrapper", version: "1.0.0" },
        { capabilities: {} }
    );

    await client.connect(transport);
    console.log("[Engine Connected] Core thought-graph server attached.");

    try {
        // 3. Inject Client Data Context
        console.log("\n[Step 1] Injecting Client Data Context...");
        await client.callTool({
            name: "context_set",
            arguments: {
                key: "target_data_room",
                value: {
                    codebase_languages: ["PHP", "JavaScript"],
                    database: "MySQL 5.6",
                    active_vulns: 12,
                    monolith: true
                },
                source: "client_onboarding_form"
            }
        });

        // 4. Run the Controller Loop using Persona Parameters
        console.log("[Step 2] Executing Domain-Specific Reasoning Engine...");
        const result = await client.callTool({
            name: "run_controller_loop",
            arguments: {
                prompt: `${persona.base_prompt} \n\nClient Context: 10 year old PHP Monolith with MySQL 5.6.`,
                thoughts: persona.rlhf_initial_thoughts,
                maxIterations: persona.engine_tuning.maxIterations,
                beamWidth: persona.engine_tuning.beamWidth,
                convergenceThreshold: persona.engine_tuning.convergenceThreshold,
                autoPruneBelow: persona.engine_tuning.autoPruneBelow
            }
        });

        console.log("\n=== 📄 DELIVERABLE: FINAL REPORT ===");
        const loopData = result.content[0] as any;
        // Handle SDK return signature properly checking if it has text
        if (loopData.type === "text") {
            console.log(loopData.text.split("```json")[0].trim());
        }

        // 5. RLHF Trace Export (The Feedback Loop)
        console.log("\n[Step 3] Exporting Reasoning Trace for RLHF Vector Data...");
        const trace = await client.callTool({
            name: "export_reasoning_trace",
            arguments: {}
        });

        // In production, you would embed `trace` and store in a Vector DB so the Engine gets smarter.
        console.log("[Pipeline Complete] Reasoning learned from this session. Trace captured successfully.\n");

    } catch (error) {
        console.error("Pipeline failed:", error);
    } finally {
        // Cleanup
        transport.close();
    }
}

runOrchestratorPipeline();
