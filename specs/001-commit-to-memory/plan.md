# Implementation Plan: Commit to Memory Tool

**Branch**: `001-commit-to-memory` | **Date**: 2026-03-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-commit-to-memory/spec.md`

## Summary
Implement the `commit_to_memory` tool to persist validated GoT reasoning paths directly to the `@mcp:memory` Knowledge Graph server. The tool is designed for **Universal MCP Compatibility**, adhering to Gemini CLI, Claude Desktop, and OpenCode standards. It features backwards path traversal, 2026-era semantic metadata mapping, and strict idempotency via Semantic Identity deduplication.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js v20+
**Primary Dependencies**: `@modelcontextprotocol/sdk` ^1.26, `zod` ^3.22, `proper-lockfile` ^4.1.4
**Storage**: JSON file persistence with atomic sync; Bridge to `@mcp:memory` server
**Testing**: Node.js native test runner (`npx tsx --test tests/`)
**Target Platform**: Universal MCP Hosts (Gemini CLI, Antigravity, Claude Desktop, OpenCode)
**Response Protocol**: Dual-Mode (Text content + `structuredContent` JSON)
**Annotations**: `readOnlyHint: false`, `idempotentHint: true`, `destructiveHint: false`
**Performance Goals**: Commitment < 5s for 10 nodes (SC-002)
**Constraints**: Bulk commitment via `create_entities`/`create_relations` (FR-008); DryRun mode (FR-007)
**Scale/Scope**: Focuses on persisting the validated reasoning path (winning path) to long-term memory.

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| GoT Paper Compliance | PASS | Implements the bridge for 'synergistic outcomes' into long-term fact storage. |
| AI-First Design | PASS | Transparent dryRun summary + JSON payload ensures agentic auditability. |
| Memory Bridge (Persistence) | PASS | This feature fulfills Roadmap Priority 2: Native KG Persistence. |
| Audit Traceability (SOC 2) | PASS | Maps metadata lens to entityType, ensuring reasoning is rooted in verifiable data. |
| Agentic Critique | N/A | Internal bridge tool; critique performed during reasoning phase. |
| Intent Decomposition | N/A | Performed by `generate_perspectives` tool. |
| Resilience & Security | PASS | Zod-validated tool signatures and Semantic Identity deduplication mitigate risks. |

## Project Structure

### Documentation (this feature)

```text
specs/001-commit-to-memory/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── graph/
│   └── ThoughtGraph.ts   # UPDATE: Add path traversal helpers
└── server/
    └── tools/
        └── io.ts         # NEW: Register commit_to_memory tool
```

**Structure Decision**: Single project. Logic will be integrated into the existing `io.ts` tool module, leveraging established patterns for data export.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Cross-server Tool Calls | Integration | Direct logic required to bridge Reasoning (GoT) to Memory (KG). |
| Semantic Identity Check | Quality | Prevents KG bloat and duplicate fact creation in long-term storage. |
