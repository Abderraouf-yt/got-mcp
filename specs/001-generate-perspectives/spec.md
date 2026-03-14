# Feature Specification: Generate Perspectives Tool

**Feature Branch**: `001-generate-perspectives`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: User description: "Implement `generate_perspectives` tool to automatically turn vague user prompts into 3-5 high-entropy perspectives to seed the GoT reasoning graph."

## Overview
The `generate_perspectives` tool bridges the gap between high-level user intent and the multi-dimensional reasoning required by the Graph of Thoughts (GoT) engine. It analyzes a user's initial query and decomposes it into distinct, complementary "perspectives" or "reasoning axes." These perspectives serve as the initial branches (seeds) for autonomous reasoning loops, ensuring that the GoT engine explores the problem space from multiple valuable angles rather than following a single linear path.

**Definition of High-Entropy Perspectives**: For the purposes of this tool, "high-entropy" means generated strings MUST have minimal semantic overlap (divergent domains) and represent independent variables of the problem space.

**Quantifying Vague Prompts**: A "vague prompt" is defined as any query that lacks specific analytical constraints or is less than 10 words in length (e.g., "help me with my project").

## User Scenarios & Testing

### User Story 1 - Seeding a New Reasoning Graph (Priority: P1)

As an AI agent or a non-technical user, I want to provide a broad problem statement and have the system automatically identify the best ways to start thinking about it, so that the resulting Graph of Thoughts covers all critical aspects.

**Why this priority**: This is the core functionality that enables the "Graph" in Graph of Thoughts to be meaningful from the start without requiring the user to be an expert in prompt engineering.

**Independent Test**: Can be tested by providing a vague query (e.g., "Help me pick a laptop") and verifying that 3-5 distinct, relevant perspectives are returned (e.g., "Performance", "Portability", "Budget").

**Acceptance Scenarios**:

1. **Given** a broad user query, **When** `generate_perspectives` is called, **Then** it returns an array of 3 to 5 strings representing unique reasoning angles.
2. **Given** a specialized technical query, **When** `generate_perspectives` is called, **Then** it identifies domain-specific perspectives (e.g., for "AWS Security", it might suggest "IAM", "Encryption", "Audit Logs").

---

### User Story 2 - Integration with Autonomous Controller (Priority: P2)

As an autonomous reasoning system, I want to use `generate_perspectives` as a pre-processor for the `run_controller_loop`, so that I can seed the graph with high-quality branches automatically.

**Why this priority**: Enhances the autonomy of the `run_controller_loop` tool by removing the requirement for the caller to provide initial thoughts manually.

**Independent Test**: Can be tested by verifying that the output of `generate_perspectives` can be directly mapped to the `thoughts` input of the `run_controller_loop`.

**Acceptance Scenarios**:

1. **Given** a query and an active session, **When** perspectives are generated, **Then** they are automatically added as `branch` nodes from the root query node in the graph.
2. **Given** the tool is used as a pre-processor, **When** it returns the `perspectives` array, **Then** these strings MUST be passed directly to the `run_controller_loop` `thoughts` parameter.

---

### User Story 3 - Customizing Perspective Volume (Priority: P3)

As a power user, I want to specify how many perspectives I want (between 3 and 5), so that I can control the initial breadth of the reasoning graph.

**Why this priority**: Provides flexibility for different complexity levels of problems.

**Independent Test**: Test with `count=3` and `count=5` and verify the exact number of perspectives returned.

**Acceptance Scenarios**:

1. **Given** a count of 4, **When** perspectives are generated, **Then** exactly 4 strings are returned.

---

### Edge Cases

- **Ambiguity Threshold (P0 Error)**: If the Host Agent determines the query intent confidence is < 70% or cannot identify at least 3 distinct axes, it MUST return an `AmbiguityError` asking the user for specific clarifications rather than hallucinating perspectives.
- **Host Agent Failure**: If the LLM returns fewer than the requested `count`, the system MUST attempt one retry with an "increased diversity" instruction before returning the partial set with a warning.
- **Character Limits**: Each perspective string MUST NOT exceed 100 characters to ensure readability in the Visualizer.
- **Empty or Whitespace Query**: The tool should return a descriptive error indicating that a query is required.
- **Highly Specific Query**: If a query is already very narrow, the tool MUST generate "sub-perspectives" (granular details) or complementary analytical angles (e.g., "Edge cases," "Validation").

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a tool named `generate_perspectives`.
- **FR-002**: System MUST accept a `query` string as input.
- **FR-003**: System MUST accept an optional `count` parameter (integer, default 3, range 3-5).
- **FR-004**: System MUST return an array of strings representing distinct perspectives.
- **FR-005**: Generated perspectives MUST be "high-entropy" (minimal semantic overlap across diverse domains).
- **FR-006**: System MUST automatically seed the graph if a `sessionId` is provided (Default behavior).
- **FR-007**: System MUST use the Host Agent (LLM) to perform the analysis and generation.
- **FR-008**: System MUST map tool outputs directly to `run_controller_loop` schema for seamless chaining.

### Key Entities

- **Perspective**: A single reasoning axis represented as a short string (max 100 chars).
- **Seed Set**: The collection of 3-5 perspectives used to initialize a GoT session.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of valid queries return between 3 and 5 perspectives.
- **SC-002**: Perspective generation completes in under 3 seconds (excluding host LLM latency).
- **SC-003**: 90% of generated perspective sets are judged by the Host Agent as having "high entropy" (verified by a 'diversity check' prompt).
- **SC-004**: Task success rate for "Upskilling" (vague prompt -> 5 valid branches) MUST exceed 85%.

