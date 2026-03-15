# Tasks: Evidence Ingestion Tool

**Input**: Design documents from `/specs/003-ingest-evidence/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Verify project structure and TypeScript 5.9 configuration in package.json
- [X] T002 [P] Review existing orchestration tool patterns in src/server/tools/orchestration.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [X] T003 Define CloudEvidence and Edge types in src/types.ts
- [X] T004 Implement recursive JSON traversal utility with payload truncation (>50KB) in src/server/tools/orchestration.ts
- [X] T005 [P] Implement input validation and malformed JSON detection logic
- [X] T006 [P] Implement cloud provider detection heuristics (AWS/Azure) in src/server/tools/orchestration.ts
- [X] T006 Configure logging for evidence ingestion in src/server/logger.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Ingesting AWS Security Evidence (Priority: P1) 🎯 MVP

**Goal**: Automatically parse AWS IAM/S3 exports into Evidence Nodes.

**Independent Test**: Provide an AWS S3 Public Access Block JSON string and verify a "CloudEvidence" node is created.

### Implementation for User Story 1

- [X] T007 [P] [US1] Create unit tests for AWS IAM/S3 parsing heuristics in tests/evidence_aws.test.ts
- [X] T008 [US1] Implement AWS-specific security key mapping (Effect, Action, Resource, PublicAccessBlock) in src/server/tools/orchestration.ts
- [X] T009 [US1] Register `ingest_evidence` tool with Zod schema (rawJson, sessionId, provider) in src/server/tools/orchestration.ts
- [X] T010 [US1] Implement core ingestion logic: parse string -> extract facts -> inject source path observations (Principle IX) -> addNode

**Checkpoint**: User Story 1 (AWS MVP) should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Multi-Cloud Ingestion (Azure Support) (Priority: P2)

**Goal**: Support recognized Azure Resource Manager (ARM) JSON exports.

**Independent Test**: Provide an Azure NSG export and verify nodes are tagged with "Azure" provider lens.

### Implementation for User Story 2

- [X] T011 [P] [US2] Create unit tests for Azure ARM parsing in tests/evidence_azure.test.ts
- [X] T012 [US2] Implement Azure-specific security key mapping (Microsoft.Network, resourceGroup) in src/server/tools/orchestration.ts
- [X] T013 [US2] Update provider detection logic to prioritize explicit provider flag over heuristics

**Checkpoint**: At this point, both AWS and Azure ingestion should work independently.

---

## Phase 5: User Story 3 - Automatic Evidence Linking (Priority: P3)

**Goal**: Link Evidence Nodes to analytical compliance perspectives automatically.

**Independent Test**: Ingest a security fact and verify a "supports" edge is created to an existing "Security" node.

### Implementation for User Story 3

- [X] T014 [P] [US3] Create integration test for automated evidence-to-lens linking in tests/evidence_linking.test.ts
- [X] T015 [US3] Implement keyword-to-lens mapping for Evidence Nodes (e.g., "MFA" -> "Security") in src/server/tools/orchestration.ts
- [X] T016 [US3] Update ingestion logic to scan for existing perspective nodes and create linking edges via `addEdge`

**Checkpoint**: Evidence nodes are now automatically integrated into the reasoning graph.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T017 [P] Update ROADMAP.md and GEMINI.md with evidence ingestion capabilities
- [X] T018 Perform latency benchmarking to verify SC-002 (< 2s for 50KB JSON)
- [X] T019 Final build verification with `npm run build`
- [X] T020 Execute full regression suite with `npm test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all US phases.
- **US1 (Phase 3)**: MVP. Blocks US2 and US3 for logic stability.
- **US2 & US3 (Phase 4 & 5)**: Can proceed in parallel once US1 is validated.
- **Polish (Phase 6)**: Final gate.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Implement AWS-specific heuristics (T008).
3. Validate with S3 policy exports.

### Incremental Delivery

1. **Foundation**: Recursive traversal logic.
2. **MVP**: AWS Security Fact Extraction.
3. **Expansion**: Azure Support.
4. **Integration**: Auto-linking to Reasoning Lenses.
