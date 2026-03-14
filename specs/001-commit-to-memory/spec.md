# Feature Specification: Commit to Memory Tool

**Feature Branch**: `001-commit-to-memory`
**Created**: 2026-03-14
**Status**: Draft
**Input**: User description: "Implement `commit_to_memory` tool to persist validated GoT reasoning paths directly to the `@mcp:memory` Knowledge Graph server, including semantic metadata (lenses) and deduplication logic."

## Overview
The `commit_to_memory` tool implements the "Memory Bridge" (Roadmap Priority 2). It transforms ephemeral Graph of Thoughts (GoT) reasoning into permanent Knowledge Graph (KG) entities and relations. By integrating with the `@mcp:memory` server, it enables cross-session reasoning, where an agent can query verified conclusions from past sessions. This tool also ensures that semantic metadata (such as the "lens" from the `generate_perspectives` tool) is preserved as entity types, making the long-term memory semantically rich and SOC 2 audit-ready.

## User Scenarios & Testing

### User Story 1 - Persisting a Winning Reasoning Path (Priority: P1)

As an AI agent or a human user, I want to commit the final, validated reasoning path of a complex session to long-term memory, so that I can reference these conclusions in future sessions without re-running the logic.

**Why this priority**: Core value of the "Memory Bridge." Without this, all GoT reasoning is lost once the session ends.

**Independent Test**: Can be tested by running a reasoning session, calling `commit_to_memory`, and then using the `memory` server's `search_nodes` tool to verify the entities exist.

**Acceptance Scenarios**:

1. **Given** a converged GoT reasoning path with a winning leaf node, **When** `commit_to_memory` is called, **Then** all nodes in that path are exported as entities to the `@mcp:memory` server.
2. **Given** parent-child relations in the path, **When** committed, **Then** matching relations are created in the `@mcp:memory` server.

---

### User Story 2 - Semantic Enrichment via Lenses (Priority: P2)

As a compliance auditor or specialized agent, I want the committed memory to include the "lens" (e.g., Security, ROI) used during reasoning, so that the Knowledge Graph is organized by domain rather than generic nodes.

**Why this priority**: Crucial for SOC 2 audit traceability and semantic search.

**Independent Test**: Verify that nodes with `metadata.lens = "Security"` are created in the memory server with `entityType: "Security Perspective"`.

**Acceptance Scenarios**:

1. **Given** nodes containing "lens" metadata, **When** committed, **Then** the `entityType` in `@mcp:memory` reflects that lens.

---

### User Story 3 - Deduplication of Knowledge (Priority: P3)

As a long-running reasoning system, I want to avoid creating duplicate entities if the same conclusion is reached multiple times, so that the Knowledge Graph remains clean and efficient.

**Why this priority**: Prevents KG bloat and ensures "Fact" consistency.

**Independent Test**: Call `commit_to_memory` twice on the same path and verify that the number of entities in `@mcp:memory` does not double.

**Acceptance Scenarios**:

1. **Given** an entity already exists in `@mcp:memory` with the same name/content, **When** `commit_to_memory` is called, **Then** the tool updates observations rather than creating a new entity.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a tool named `commit_to_memory`.
- **FR-002**: System MUST include MCP Annotations: `readOnlyHint: false`, `idempotentHint: true`, and `destructiveHint: false`.
- **FR-003**: System MUST return a Dual-Mode Response:
  - **`content`**: Human-readable text summary of the commitment.
  - **`structuredContent`**: Machine-readable JSON including `entitiesCreated` count and `knowledgeGraphSummary`.
- **FR-004**: System MUST implement "Semantic Identity" deduplication to ensure idempotency across agent retries.
  - *Definition*: A match is defined as an exact string collision of the deterministic hash derived from the first 500 characters of the thought text (ignoring whitespace and case).
- **FR-005**: System MUST traverse the winning path backwards from the leaf to the root.
- **FR-006**: System MUST automatically call `@mcp:memory` server tools (`create_entities`, `create_relations`).
- **FR-007**: System MUST use `metadata.lens` as the `entityType` (mapped to Antigravity 2026 taxonomy where applicable).
- **FR-008**: System MUST provide a `dryRun` flag returning a preview summary and the full proposed JSON payload in `structuredContent`.
- **FR-009**: System MUST implement a **Resilience Protocol**:
  - Automatically retry failed `@mcp:memory` tool calls once after a 1-second delay.
  - Map specific memory server errors (e.g., "Connection refused") to descriptive GoT-MCP error messages.
- **FR-010**: System MUST support **Multi-Service Provenance**:
  - The GoT `sessionId` MUST be committed as a primary `observation` on every created entity.
  - This ensures that in shared SaaS/Agency environments, reasoning paths remain traceable to their original session.
- **FR-011**: System MUST handle **Scale Boundaries**:
  - If a reasoning path exceeds 50 nodes, the tool MUST commit the path in chunks of 25 nodes to prevent Host Agent request timeouts.
- **FR-012**: System MUST handle **Partial Commitment Recovery**:
  - If a multi-chunk commitment fails, the tool MUST return a list of successfully committed node IDs and the specific chunk index where the failure occurred.



### Key Entities

- **Committed Entity**: A permanent record in `@mcp:memory` representing a single thought node.
- **Reasoning Relation**: A permanent link in `@mcp:memory` representing the logical edge between two thoughts.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of nodes in a winning path are successfully created as entities in the memory server.
- **SC-002**: Commitment completes in under 5 seconds for a path of 10 nodes.
- **SC-003**: Zero "ghost relations" (relations pointing to non-existent nodes) in the committed KG.
- **SC-004**: 90% reduction in duplicate entities when re-committing identical paths.
