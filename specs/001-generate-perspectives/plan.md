# Implementation Plan: Perspective Generation (Intent-to-Graph)

**Branch**: `001-generate-perspectives` | **Date**: 2026-03-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-generate-perspectives/spec.md`

## Summary
Implement the `generate_perspectives` tool to automatically decompose vague user prompts into 3-5 high-entropy analytical perspectives. This tool will use MCP Sampling to delegate intelligence to the Host Agent, ensuring high-quality seeding for the Graph of Thoughts engine.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js v20+
**Primary Dependencies**: `@modelcontextprotocol/sdk` ^1.26, `zod` ^3.22, `express` ^4.21
**Storage**: JSON file persistence with `fs.watchFile` synchronization
**Testing**: Node.js native test runner
**Target Platform**: win32 (compatible with all Node.js environments)
**Project Type**: single (MCP server)
**Performance Goals**: Tool response < 3s (excluding host LLM latency)
**Constraints**: Perspective strings < 100 characters; count limited to 3-5 range.
**Scale/Scope**: Targeted at "Smart Seeding" for autonomous reasoning sessions.

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| GoT Paper Compliance | PASS | Implements the 'Generate' primitive via semantic decomposition. |
| AI-First Design | PASS | Uses host sampling to minimize token overhead and maximize quality. |
| Memory Bridge (Persistence) | PASS | Seeding creates graph nodes which are persisted to long-term JSON state. | 
| Audit Traceability (SOC 2) | PASS | Root node captures initial intent; branches capture analytical angles. |
| Resilience & Security | PASS | Implements Ambiguity Threshold to prevent hallucination. |

## Project Structure

### Documentation (this feature)

```text
specs/001-generate-perspectives/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Implementation tasks
```

### Source Code (repository root)

```text
src/
├── server/
│   └── tools/
│       └── perspectives.ts # NEW: Perspective generation tool logic
├── graph/
│   └── ThoughtGraph.ts   # UPDATE: Add auto-seeding helper method
```

**Structure Decision**: Single project. Logic will reside in a new tool registration file `perspectives.ts`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Sampling usage | High-entropy requirement | Heuristics (local keywords) lack true semantic intelligence. |
