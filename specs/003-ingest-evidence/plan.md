# Implementation Plan: Evidence Ingestion Tool

**Branch**: `003-ingest-evidence` | **Date**: 2026-03-14 | **Spec**: [specs/003-ingest-evidence/spec.md]
**Input**: Feature specification from `/specs/003-ingest-evidence/spec.md`

## Summary
Implement the `ingest_evidence` tool using a heuristic-based JSON parser. The tool will recursively traverse cloud infrastructure exports (AWS/Azure) to identify high-signal security attributes (e.g., `Effect: Allow`, `PublicAccessBlock: true`) and commit them as `CloudEvidence` nodes to the Thought Graph.

## Technical Context

**Language/Version**: TypeScript 5.9
**Primary Dependencies**: @modelcontextprotocol/sdk, zod, proper-lockfile
**Storage**: N/A (Delegated to ThoughtGraph persistence)
**Testing**: Node.js native test runner
**Target Platform**: Universal MCP Hosts
**Project Type**: single (MCP server extension)
**Performance Goals**: < 2s for 50KB JSON ingestion
**Constraints**: Zero external API dependencies; strictly local parsing.
**Scale/Scope**: MVP focuses on AWS IAM policies and S3 public access configurations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| GoT Paper Compliance | PASS | Seeds the graph with evidence-based nodes for superior reasoning. |
| AI-First Design | PASS | Extracts high-signal keys to minimize host token usage. |
| Memory Bridge (Persistence) | PASS | Facilitates the creation of permanent KG entries from raw facts. | 
| Audit Traceability (SOC 2) | PASS | Direct implementation of Principle IX; stores source paths. |
| Agentic Critique | N/A | Handled during the reasoning loop, not at ingestion. |
| Intent Decomposition | N/A | Ingests raw data; doesn't decompose intent. |
| Resilience & Security | PASS | Atomic sync and Zod validation on input strings. |

## Project Structure

### Documentation (this feature)

```text
specs/003-ingest-evidence/
├── plan.md              # This file
├── research.md          # Heuristic logic & Taxonomy
├── data-model.md        # Node/Edge structure
├── quickstart.md        # CLI integration examples
└── tasks.md             # Implementation roadmap
```

### Source Code (repository root)

```text
src/
├── server/
│   └── tools/
│       └── orchestration.ts  # Update: Register ingest_evidence tool
```

**Structure Decision**: Single project. Logic will be added to the orchestration module to keep the toolset cohesive.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | | |
