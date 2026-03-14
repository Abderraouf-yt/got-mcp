# Tasks: Generate Perspectives Tool

**Input**: Design documents from `/specs/release/v4.3.0/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create perspectives tool file in src/server/tools/perspectives.ts
- [X] T002 Export perspectives tool module in src/server/tools/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [X] T003 Define Perspective interfaces and Zod schemas in src/types.ts
- [X] T004 Implement Lens Taxonomy mapping (Heuristics) in src/server/tools/perspectives.ts
- [X] T005 Setup basic logging for perspectives in src/server/logger.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Basic Perspective Generation (Priority: P1) 🎯 MVP

**Goal**: Automatically generate a single analytical perspective from a short string query.

**Independent Test**: Call `generate_perspectives` with "laptop" and receive at least one relevant perspective (e.g., "Performance").

### Tests for User Story 1

- [X] T006 [P] [US1] Create unit test for heuristic categorization in tests/perspectives.test.ts

### Implementation for User Story 1

- [X] T007 [US1] Implement keyword-to-lens matching logic in src/server/tools/perspectives.ts
- [X] T008 [US1] Register `generate_perspectives` tool in src/server/tools/perspectives.ts
- [X] T009 [US1] Add structuredContent response format for single perspective

**Checkpoint**: User Story 1 should be fully functional independently.

---

## Phase 4: User Story 2 - Multi-Perspective Support (Priority: P2)

**Goal**: Support expanding a query into 3-5 distinct dimensions using the `count` parameter.

**Independent Test**: Call `generate_perspectives` with `count: 3` and verify 3 unique perspective objects are returned.

### Tests for User Story 2

- [X] T010 [P] [US2] Add test cases for perspective limit enforcement in tests/perspectives.test.ts

### Implementation for User Story 2

- [X] T011 [US2] Implement perspective expansion logic using fallback lenses in src/server/tools/perspectives.ts
- [X] T012 [US2] Add Zod validation for `count` parameter (min 1, max 5) in src/server/tools/perspectives.ts
- [X] T013 [US2] Update tool response to return an array of Perspective objects

**Checkpoint**: User Story 2 enables multi-dimensional analysis.

---

## Phase 5: User Story 3 - Graph Seeding Integration (Priority: P3)

**Goal**: Allow perspectives to be used as initial thought nodes for the GoT reasoning loop.

**Independent Test**: Run `run_controller_loop` with `autoBranch: true` and verify graph starts with generated perspectives.

### Tests for User Story 3

- [X] T014 [P] [US3] Create integration test for automated graph seeding in tests/integration_perspectives.test.ts

### Implementation for User Story 3

- [X] T015 [US3] Update `run_controller_loop` tool to accept `autoSeed` flag in src/server/tools/orchestration.ts
- [X] T016 [US3] Implement logic to convert perspectives to ThoughtNodes in src/server/tools/perspectives.ts
- [X] T017 [US3] Integrate perspective generator with `ThoughtGraph` engine in src/graph/ThoughtGraph.ts

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T018 [P] Documentation updates in ROADMAP.md and GEMINI.md
- [X] T019 Final build verification with `npm run build`
- [X] T020 Run full regression suite with `npm test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 & 2** are sequential.
- **Phase 3 (MVP)** blocks Phase 4 and 5.
- **Phase 4 & 5** can proceed in parallel once Phase 3 is validated.

### Parallel Opportunities

- T006, T010, T014 (Tests) can be written in parallel.
- T018 (Docs) can be done during implementation.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3.
3. Validate with manual MCP tool call.

### Incremental Delivery

1. Foundation ready.
2. User Story 1 -> Basic branching.
3. User Story 2 -> Richer branching.
4. User Story 3 -> Fully autonomous GoT start.
