import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThoughtGraph, getGraphInstance } from "../../graph/index.js";
import { logger } from "../logger.js";
import { GapReport, GapItem, ThoughtNode } from "../../types.js";
import Handlebars from "handlebars";
import { marked } from "marked";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PdfPrinter = require("pdfmake/js/printer").default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// pdfmake font configuration
const fonts = {
    Roboto: {
        normal: path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
        bold: path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
        italics: path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
        bolditalics: path.join(process.cwd(), "node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf")
    },
    RoyalSerif: {
        normal: "C:\\Users\\toumi\\Pictures\\Fonts\\Royal-Serif.otf",
        bold: "C:\\Users\\toumi\\Pictures\\Fonts\\Royal-Serif.otf",
        italics: "C:\\Users\\toumi\\Pictures\\Fonts\\Royal-Serif.otf",
        bolditalics: "C:\\Users\\toumi\\Pictures\\Fonts\\Royal-Serif.otf",
    },
    Morgan: {
        normal: "C:\\Users\\toumi\\Pictures\\Fonts\\Morgan44-Regular.ttf",
        bold: "C:\\Users\\toumi\\Pictures\\Fonts\\Morgan44-Regular.ttf",
        italics: "C:\\Users\\toumi\\Pictures\\Fonts\\Morgan44-Regular.ttf",
        bolditalics: "C:\\Users\\toumi\\Pictures\\Fonts\\Morgan44-Regular.ttf",
    }
};

/**
 * Register reporter tools for Gap Analysis.
 */
export function registerReporterTools(server: McpServer, defaultGraph: ThoughtGraph) {
    server.registerTool(
        "generate_gap_report",
        {
            description: "Transform winning reasoning paths into professional, client-ready SOC 2 Gap Analysis reports (PDF or Markdown).",
            inputSchema: z.object({
                sessionId: z.string().optional().describe("Session ID to report on"),
                format: z.enum(["markdown", "pdf"]).default("markdown").describe("Output format"),
                template: z.enum(["internal", "executive"]).default("internal").describe("Report template style"),
                title: z.string().optional().describe("Custom report title"),
            }),
            annotations: { readOnlyHint: true },
            outputSchema: z.any() // Structured GapReport
        },
        async (args) => {
            return await generateGapReportHandler(args, defaultGraph);
        }
    );
}

/**
 * Internal handler for gap report generation (exported for testing).
 */
export async function generateGapReportHandler(
    { sessionId, format, template, title }: { sessionId?: string; format: "markdown" | "pdf"; template: "internal" | "executive"; title?: string },
    defaultGraph: ThoughtGraph
) {
    try {
        const graph = sessionId ? getGraphInstance(sessionId) : defaultGraph;
        const state = graph.getGraph();

        if (state.nodes.length === 0) {
            return {
                content: [{ type: "text" as const, text: "No nodes found in graph. Cannot generate report." }],
                isError: true
            };
        }

        // 1. Extract Winning Path
        const winning = graph.findWinningPath({ beamWidth: 1 });
        
        // 2. Identify Gaps (Rejected nodes or low-score nodes in winning path)
        const gaps: GapItem[] = [];
        const rejectedNodes = state.nodes.filter(n => n.status === "rejected");

        for (const node of rejectedNodes) {
            const remediation = findRemediation(node, state);
            const evidenceNodes = findEvidence(node, state);
            const evidence = evidenceNodes.map(e => ({
                path: (e.metadata?.sourcePath as string) || "unknown",
                attribute: (e.metadata?.attribute as string) || "n/a",
                value: e.metadata?.value
            }));

            gaps.push({
                id: node.id,
                title: extractTitle(node.thought),
                description: node.thought,
                remediation: remediation,
                category: (node.metadata?.lens as string) || "General Security",
                severity: (node.metadata?.severity as "low" | "medium" | "high" | "critical") || "medium",
                evidence: evidence.length > 0 ? evidence : undefined
            });
        }

        // 3. Build Report Object
        const report: GapReport = {
            sessionId: sessionId || "default",
            title: title || (template === "executive" ? "Executive SOC 2 Readiness Assessment" : "Internal SOC 2 Gap Analysis"),
            executiveSummary: generateExecutiveSummary(winning, gaps),
            readinessScore: calculateReadinessScore(winning, gaps, state.nodes.length),
            gaps: gaps,
            winningPathIds: winning.pathIds,
            generatedAt: new Date().toISOString(),
            metadata: {
                totalNodes: state.nodes.length,
                totalGaps: gaps.length,
                methodology: "This report was generated using Graph of Thoughts (GoT) reasoning, analyzing multiple compliance perspectives and verifying findings against ingested technical evidence."
            }
        };

        // 4. Render based on format
        if (format === "markdown") {
            const md = await renderMarkdown(report, template);
            return {
                content: [{ type: "text" as const, text: md }],
                structuredContent: report as unknown as Record<string, unknown>
            };
        } else {
            const pdfBuffer = await renderPdf(report, template);
            return {
                content: [
                    { type: "text" as const, text: `PDF Report generated (${pdfBuffer.length} bytes). Use the provided data to save the file.` },
                ],
                structuredContent: {
                    ...report,
                    pdfBase64: pdfBuffer.toString("base64")
                } as unknown as Record<string, unknown>
            };
        }

    } catch (err) {
        logger.error(`Error in generate_gap_report: ${err}`);
        return { content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
}

function extractTitle(thought: string): string {
    const lines = thought.split("\n");
    const firstLine = lines[0].replace(/^[#*-]\s*/, "").trim();
    return firstLine.length > 60 ? firstLine.substring(0, 57) + "..." : firstLine;
}

function findRemediation(rejectedNode: ThoughtNode, state: any): string {
    if (rejectedNode.metadata?.remediation) return rejectedNode.metadata.remediation as string;
    
    const edgeTo = state.edges.find((e: any) => e.to === rejectedNode.id);
    if (edgeTo) {
        const parentId = edgeTo.from;
        const siblings = state.edges
            .filter((e: any) => e.from === parentId && e.to !== rejectedNode.id)
            .map((e: any) => state.nodes.find((n: any) => n.id === e.to))
            .filter(Boolean);
            
        const bestSibling = siblings.sort((a: any, b: any) => (b.score || 0) - (a.score || 0))[0];
        if (bestSibling) {
            return `Implement: ${extractTitle(bestSibling.thought)}`;
        }
    }

    return "Further analysis required to determine specific remediation.";
}

function findEvidence(node: ThoughtNode, state: any, visited: Set<string> = new Set()): ThoughtNode[] {
    if (visited.has(node.id)) return [];
    visited.add(node.id);

    const evidenceNodes: ThoughtNode[] = [];
    
    // 1. Direct evidence linked to this node
    const incomingEdges = state.edges.filter((e: any) => e.to === node.id);
    
    for (const edge of incomingEdges) {
        const sourceNode = state.nodes.find((n: any) => n.id === edge.from);
        if (!sourceNode) continue;

        if (sourceNode.metadata?.entityType === "CloudEvidence") {
            evidenceNodes.push(sourceNode);
        } else if (edge.relation === "support" || edge.relation === "supports" || edge.relation === "refinement" || edge.relation === "refines") {
            // 2. Recursive search up the chain for supporting evidence
            evidenceNodes.push(...findEvidence(sourceNode, state, visited));
        }
    }
        
    // Deduplicate by ID
    return Array.from(new Map(evidenceNodes.map(n => [n.id, n])).values());
}

function generateExecutiveSummary(winning: any, gaps: GapItem[]): string {
    const totalGaps = gaps.length;
    const criticalGaps = gaps.filter(g => g.severity === "critical" || g.severity === "high").length;
    
    if (totalGaps === 0) {
        return "The assessment found no significant gaps. The current infrastructure demonstrates strong alignment with SOC 2 requirements analyzed.";
    }
    
    return `The assessment identified ${totalGaps} total gaps, with ${criticalGaps} categorized as High or Critical severity. While a valid compliance path was identified (total score: ${Math.round(winning.totalScore * 100)}%), immediate remediation of the identified high-severity findings is recommended to achieve audit readiness.`;
}

function calculateReadinessScore(winning: any, gaps: GapItem[], totalNodes: number): number {
    if (totalNodes === 0) return 0;
    const baseScore = winning.totalScore / (winning.pathIds.length || 1);
    const gapPenalty = (gaps.length * 0.05);
    const score = Math.max(0, Math.min(1, baseScore - gapPenalty));
    return Math.round(score * 100);
}

async function renderMarkdown(report: GapReport, template: string): Promise<string> {
    const filename = template === "executive" ? "gap-report-executive.md.hbs" : "gap-report.md.hbs";
    const templatePath = path.join(process.cwd(), "src/server/templates", filename);
    const source = fs.readFileSync(templatePath, "utf-8");
    const hbsTemplate = Handlebars.compile(source);
    return hbsTemplate(report);
}

async function renderPdf(report: GapReport, template: string): Promise<Buffer> {
    const mockUrlResolver = {
        resolve: (url: string) => {
            logger.debug(`PdfPrinter: resolve URL ${url}`);
        },
        resolved: async () => {
            return true;
        }
    };
    
    // In pdfmake 0.3.x, if we use local paths in fontDescriptors, 
    // it tries to resolve them via urlResolver.
    // To avoid this, we can pass font descriptors that are already "resolved" 
    // or just bypass the resolver if possible.
    const printer = new PdfPrinter(fonts, null, mockUrlResolver);
    
    const docDefinition: any = {
        background: function(currentPage: number, pageSize: any) {
            return {
                canvas: [
                    {
                        type: 'rect',
                        x: 0, y: 0, w: pageSize.width, h: 5,
                        color: '#0F172A' // findiacs Navy
                    }
                ]
            };
        },
        footer: function(currentPage: number, pageCount: number) {
            return {
                columns: [
                    { text: "Powered by findiacs | Professional Compliance Intelligence", style: "footerText", alignment: "left", margin: [40, 0] },
                    { text: `Page ${currentPage} of ${pageCount}`, style: "footerText", alignment: "right", margin: [40, 0] }
                ]
            };
        },
        content: [
            { 
                columns: [
                    { text: report.title, style: "header", width: '*' },
                    { text: "findiacs", style: "brandLogo", width: 'auto' }
                ]
            },
            { text: `Generated on: ${new Date(report.generatedAt).toLocaleString()}`, style: "subheader" },
            { 
                canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#334155' }]
            },
            { text: `Readiness Score: ${report.readinessScore}%`, style: "score", margin: [0, 15, 0, 20] },
            
            { text: "1. Executive Summary", style: "sectionHeader" },
            { text: report.executiveSummary, style: "bodyText" },
            
            { text: "2. Remediation Matrix", style: "sectionHeader" },
            {
                table: {
                    headerRows: 1,
                    widths: ["auto", "*", "*", "auto"],
                    body: [
                        [
                            { text: "Category", style: "tableHeader" },
                            { text: "Gap", style: "tableHeader" },
                            { text: "Remediation", style: "tableHeader" },
                            { text: "Severity", style: "tableHeader" }
                        ],
                        ...report.gaps.map(g => [
                            { text: g.category, style: "tableCell" },
                            { text: g.title, style: "tableCell" },
                            { text: g.remediation, style: "tableCell" },
                            { text: g.severity.toUpperCase(), color: getSeverityColor(g.severity), bold: true, fontSize: 9 }
                        ])
                    ]
                },
                layout: 'lightHorizontalLines'
            },
            
            { text: "3. Detailed Findings", style: "sectionHeader" },
            ...report.gaps.flatMap(g => [
                { text: g.title, style: "findingTitle", margin: [0, 10, 0, 5] },
                { text: `Category: ${g.category} | Severity: ${g.severity.toUpperCase()}`, style: "findingMeta" },
                { text: "Description", style: "findingLabel" },
                { text: g.description, style: "bodyText" },
                { text: "Remediation Recommendation", style: "findingLabel" },
                { text: g.remediation, color: "#0369A1", italics: true, style: "bodyText" },
                { text: "Evidence Lineage", style: "findingLabel" },
                { 
                    ul: g.evidence?.map(e => ({ text: `${e.path}: ${e.attribute} = ${JSON.stringify(e.value)}`, style: "evidenceText" })) || ["No direct evidence linked"]
                }
            ]),
            
            { text: "4. Methodology", style: "sectionHeader" },
            { text: report.metadata.methodology, italics: true, fontSize: 10, color: "#475569" }
        ],
        styles: {
            header: { font: "RoyalSerif", fontSize: 24, bold: true, color: "#0F172A" },
            brandLogo: { font: "RoyalSerif", fontSize: 18, bold: true, color: "#0369A1", margin: [0, 5] },
            subheader: { fontSize: 10, italics: true, color: "#64748B", margin: [0, 5, 0, 10] },
            score: { font: "RoyalSerif", fontSize: 20, bold: true, color: report.readinessScore > 70 ? "#15803d" : "#b45309" },
            sectionHeader: { font: "RoyalSerif", fontSize: 16, bold: true, margin: [0, 20, 0, 10], color: "#0F172A" },
            tableHeader: { bold: true, fontSize: 10, color: "#F8FAFC", fillStatus: true, fillColor: "#1E293B" },
            tableCell: { fontSize: 9, margin: [0, 3] },
            findingTitle: { font: "RoyalSerif", fontSize: 14, bold: true, color: "#1E293B" },
            findingMeta: { fontSize: 9, italics: true, color: "#64748B", margin: [0, 0, 0, 5] },
            findingLabel: { bold: true, fontSize: 10, margin: [0, 8, 0, 2], color: "#334155" },
            bodyText: { font: "Morgan", fontSize: 10, lineHeight: 1.4 },
            evidenceText: { font: "Roboto", fontSize: 8, color: "#475569" },
            footerText: { fontSize: 8, color: "#94A3B8", margin: [0, 10] }
        },
        defaultStyle: {
            font: "Morgan",
            fontSize: 10,
            lineHeight: 1.2
        }
    };

    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
    
    return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        pdfDoc.on("data", (chunk: any) => chunks.push(chunk));
        pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
        pdfDoc.on("error", (err: any) => reject(err));
        pdfDoc.end();
    });
}

function getSeverityColor(severity: string): string {
    switch (severity) {
        case "critical": return "#c0392b";
        case "high": return "#e74c3c";
        case "medium": return "#f39c12";
        case "low": return "#27ae60";
        default: return "#7f8c8d";
    }
}
