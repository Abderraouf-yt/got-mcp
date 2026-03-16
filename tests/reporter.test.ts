import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ThoughtGraph } from "../src/graph/ThoughtGraph.js";
import { generateGapReportHandler } from "../src/server/tools/reporter.js";
import { GapReport } from "../src/types.js";

describe("Gap Reporter Tool", () => {
    let graph: ThoughtGraph;

    beforeEach(() => {
        graph = new ThoughtGraph();
    });

    test("should generate a report with gaps and evidence", async () => {
        // Setup a mock graph
        const rootId = await graph.addNode("Audit Root: Check IAM Policies");
        
        const complId = await graph.addNode("IAM-001: MFA is enabled for all users");
        graph.updateNode(complId, { status: "validated", score: 1.0 });
        await graph.addEdge(rootId, complId, "support");

        const gapId = await graph.addNode("IAM-002: Root account has active access keys");
        graph.updateNode(gapId, { 
            status: "rejected", 
            score: 0,
            metadata: { 
                lens: "Identity Management",
                severity: "critical",
                remediation: "Delete all root access keys and use IAM roles instead."
            }
        });
        await graph.addEdge(rootId, gapId, "contradiction");

        const evidenceId = await graph.addNode("Evidence: Root Access Key JSON");
        graph.updateNode(evidenceId, {
            metadata: {
                entityType: "CloudEvidence",
                sourcePath: "aws:iam:root-keys",
                attribute: "AccessKeyId",
                value: "AKIA..."
            }
        });
        await graph.addEdge(evidenceId, gapId, "support");

        // Run the reporter
        const result = await generateGapReportHandler(
            { format: "markdown", template: "internal" },
            graph
        );

        assert.strictEqual(result.isError, undefined);
        const report = result.structuredContent as unknown as GapReport;

        // Assertions
        assert.strictEqual(report.gaps.length, 1);
        assert.strictEqual(report.gaps[0].id, gapId);
        assert.strictEqual(report.gaps[0].severity, "critical");
        assert.strictEqual(report.gaps[0].category, "Identity Management");
        assert.ok(report.gaps[0].evidence && report.gaps[0].evidence.length > 0);
        assert.strictEqual(report.gaps[0].evidence![0].path, "aws:iam:root-keys");

        // Verify markdown content
        const md = result.content[0].text;
        assert.ok(md.includes("SOC 2 Gap Analysis Report"));
        assert.ok(md.includes("Remediation Matrix"));
        assert.ok(md.includes("IAM-002"));
        assert.ok(md.includes("Delete all root access keys"));
    });

    test("should handle empty graph gracefully", async () => {
        const emptyGraph = new ThoughtGraph();
        const result = await generateGapReportHandler(
            { format: "markdown", template: "internal" },
            emptyGraph
        );

        assert.strictEqual(result.isError, true);
        assert.ok(result.content[0].text.includes("No nodes found"));
    });

    test("should generate PDF format (base64 buffer)", async () => {
        const rootId = await graph.addNode("Audit Root");
        const complId = await graph.addNode("Compliance Node");
        graph.updateNode(complId, { status: "validated", score: 1.0 });
        await graph.addEdge(rootId, complId, "support");

        const result = await generateGapReportHandler(
            { format: "pdf", template: "executive" },
            graph
        );

        assert.strictEqual(result.isError, undefined);
        const structured = result.structuredContent as any;
        assert.ok(structured.pdfBase64);
        assert.ok(structured.pdfBase64.length > 100);
    });
});
