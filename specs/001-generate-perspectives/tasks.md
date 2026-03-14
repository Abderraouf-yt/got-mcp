# Tasks: Perspective Generation (Intent-to-Graph)

**Input**: Design documents from `/specs/001-generate-perspectives/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and environment verification

- [ ] T001 Verify project dependencies (`@modelcontextprotocol/sdk`, `zod`) in `package.json`
- [ ] T002 Update `src/types.ts` with `Perspective` and `SeedSet` interfaces per `data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure needed for all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Implement `AmbiguityError` custom error class in `src/graph/ThoughtGraph.ts`
- [ ] T004 Setup `AmbiguityThreshold` constant (0.7) in `src/types.ts`

---

## Phase 3: User Story 1 - Seeding a New Reasoning Graph (Priority: P1) 🎯 MVP

**Goal**: Automatically decompose vague prompts into 3-5 high-entropy perspectives using Host LLM sampling.

**Independent Test**: Call `generate_perspectives` with a short query and verify it returns valid perspectives and seeds the graph if `sessionId` is provided.

### Implementation for User Story 1

- [ ] T005 [US1] Define the Host Sampling prompt template in `src/server/tools/perspectives.ts`
- [ ] T006 [US1] Implement `sampling/createMessage` logic to delegate decomposition to Host Agent in `src/server/tools/perspectives.ts`
- [ ] T007 [US1] Implement intent confidence validation against `AmbiguityThreshold` in `src/server/tools/perspectives.ts`
- [ ] T008 [US1] Implement graph seeding logic (Root Node + Branch Nodes) in `src/server/tools/perspectives.ts`
- [ ] T009 [US1] Refactor tool registration to include `intentConfidence` and `seedingStatus` in outputSchema in `src/server/tools/perspectives.ts`
- [ ] T010 [P] [US1] Add unit tests for Sampling logic (mocking SDK request) in `tests/perspectives.test.ts`

**Checkpoint**: User Story 1 (MVP) is functional and testable.

---

## Phase 4: User Story 2 - Integration with Autonomous Controller (Priority: P2)

**Goal**: Seamlessly chain `generate_perspectives` with the `run_controller_loop`.

**Independent Test**: Call `run_controller_loop` with `autoSeed: true` and verify it uses the new delegation logic instead of heuristics.

### Implementation for User Story 2

- [ ] T011 [US2] Update `run_controller_loop` to invoke `generate_perspectives` delegation logic when `autoSeed` is enabled in `src/server/tools/orchestration.ts`
- [ ] T012 [US2] Ensure `run_controller_loop` handles `AmbiguityError` by reporting it back to the user in `src/server/tools/orchestration.ts`
- [ ] T013 [P] [US2] Add integration test for Controller + Perspectives flow in `tests/ThoughtGraph.comprehensive.test.ts`
- [ ] T014 [US2] **Memory Bridge Readiness**: Update `runControllerLoop` to store perspective "lens" metadata in seeded nodes.

**Checkpoint**: Auto-seeding works within the autonomous reasoning loop with metadata preserved.

---

## Phase 5: User Story 3 - Customizing Perspective Volume (Priority: P3)

**Goal**: Allow users to specify the number of perspectives (3-5).

**Independent Test**: Call `generate_perspectives` with `count=5` and verify exactly 5 perspectives are returned.

### Implementation for User Story 3

- [ ] T015 [US3] Add `count` parameter (z.number().min(3).max(5)) to `generate_perspectives` input schema in `src/server/tools/perspectives.ts`
- [ ] T016 [US3] Update Sampling prompt to inject the dynamic `count` variable in `src/server/tools/perspectives.ts`

**Checkpoint**: Users can control the breadth of the reasoning graph.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and release preparation

- [ ] T017 Update `GEMINI.md` tool documentation with `generate_perspectives` and updated `run_controller_loop` behavior
- [ ] T018 Refactor legacy heuristic logic in `perspectives.ts` into a clean fallback mechanism
- [ ] T019 **Memory Bridge Readiness**: Enhance `exportProvenMemory` in `src/graph/ThoughtGraph.ts` to use `metadata.lens` as `entityType`.
- [ ] T020 Final code cleanup and verification against `requirements-quality.md` checklist
