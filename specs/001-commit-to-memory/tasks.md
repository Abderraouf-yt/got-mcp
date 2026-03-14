# Tasks: Commit to Memory Tool

**Input**: Design documents from `/specs/001-commit-to-memory/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Verify project environment and dependencies in package.json
- [X] T002 Review existing `io.ts` tool registry patterns in src/server/tools/io.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T003 Implement `getWinningPathNodes` traversal helper in src/graph/ThoughtGraph.ts
- [X] T004 [P] Implement deterministic entity name generator (truncate + hash) in src/server/tools/io.ts
- [X] T005 Implement Lens-to-EntityType taxonomy mapping (Antigravity 2026) in src/server/tools/io.ts

**Checkpoint**: Foundational logic for path extraction and naming is ready.

---

## Phase 3: User Story 1 - Persisting a Winning Reasoning Path (Priority: P1) 🎯 MVP

**Goal**: Automatically extract and format the winning path for commitment.

- [X] T006 [P] [US1] Create unit tests for path extraction and basic commitment payload in tests/io.test.ts
- [X] T007 [US1] Define `commit_to_memory` input schema with Zod (nodeId, dryRun) in src/server/tools/io.ts
- [X] T008 [US1] Implement `commit_to_memory` base logic for backward path traversal in src/server/tools/io.ts
- [X] T009 [US1] Implement `dryRun` mode returning structured JSON payload in src/server/tools/io.ts
- [X] T010 [US1] Register `commit_to_memory` tool in the MCP server instance in src/server/tools/io.ts

**Checkpoint**: MVP is functional; users can preview the commitment payload.

---

## Phase 4: User Story 2 - Semantic Enrichment via Lenses (Priority: P2)

**Goal**: Ensure the committed memory is semantically rich and audit-ready.

- [X] T011 [P] [US2] Update unit tests to verify lens-based `entityType` mapping in tests/io.test.ts
- [X] T012 [US2] Integrate taxonomy mapping into the commitment payload generation in src/server/tools/io.ts
- [X] T013 [US2] Add logic score and confidence vectors to entity observations in src/server/tools/io.ts

**Checkpoint**: Entities in long-term memory now reflect the analytical lenses used.

---

## Phase 5: User Story 3 - Deduplication & Resilience (Priority: P3)

**Goal**: Prevent memory bloat and ensure fact consistency across sessions.

- [X] T014 [P] [US3] Create unit tests for knowledge deduplication using mocked memory responses in tests/io.test.ts
- [X] T015 [US3] Implement search-before-create logic using `@mcp:memory` `search_nodes` in src/server/tools/io.ts
- [X] T016 [US3] Implement conditional payload branching (create_entities vs. add_observations) in src/server/tools/io.ts
- [X] T017 [US3] Finalize production-ready error handling for cross-server tool orchestration in src/server/tools/io.ts
- [X] T018 [US3] Implement 1s retry logic for failed `@mcp:memory` tool calls (FR-009)
- [X] T019 [US3] Implement path chunking (25 nodes/batch) for paths > 50 nodes (FR-011)
- [X] T020 [US3] Ensure `sessionId` is injected as a primary observation for every entity (FR-010)

**Checkpoint**: All user stories are implemented with strict deduplication logic.

---

## Phase 6: Polish & Constitution Validation

- [X] T021 [P] Verify preservation of "Agentic Critique" metadata in committed observation logs (Constitution X)
- [X] T022 [P] Update ROADMAP.md and GEMINI.md with new tool capabilities
- [X] T023 Run final build verification with `npm run build`
- [X] T024 Execute full regression test suite with `npm test`

---

## Dependencies & Execution Order

### Phase Dependencies
- Phase 1 & 2 are strictly sequential.
- Phase 3 (MVP) blocks Phase 4 and 5.
- Phase 4 and 5 can proceed in parallel once Phase 3 is validated.

### Parallel Opportunities
- T004 (Naming) can be done alongside T003.
- All Test tasks (T006, T011, T014) can be prepared in parallel with their logic counterparts.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Foundational traversal logic.
2. Implement the `dryRun` mode first to validate the JSON payload shape without side effects.
3. Validate payload against `@mcp:memory` schema.

### Incremental Delivery
1. Foundation -> Core Traversal
2. US1 -> JSON Bridge
3. US2 -> Semantic Mapping
4. US3 -> Deduplication logic
