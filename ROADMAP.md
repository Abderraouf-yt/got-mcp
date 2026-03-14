# 🗺️ Thought Graph (got-mcp) Roadmap

This document outlines the strategic priorities and upcoming features for the **Graph of Thoughts** engine. 

Our goal is to push beyond linear Chain-of-Thought and provide enterprise-grade "Logical Assurance" infrastructure for autonomous AI agents.

---

## ✅ Completed
### v4.3.0
- **100% Strict Annotation Compliance**: Validated that all 19 tools are registered perfectly with the 2026 `@modelcontextprotocol/sdk` utilizing `readOnlyHint` and `destructiveHint`.
- **Comprehensive Regression Suite**: Implemented exhaustive test coverage (56 granular tests, 100% passing) spanning Governance, Beam Search, Context Firewalls, Graph Metrics, Memory Exports, and Controllers.

### v4.2.0
- **Swarm Intelligence Upgrades**: Introduced the `compile_node_context`, `query_nodes`, and `export_proven_memory` primitives.
- **IPC Swarm Locking**: Replaced unstable synchronous locks with `proper-lockfile` yielding 0 data drops at high concurrency.

### v4.1.0
- **Real-Time SSE Visualization**: Replaced HTTP polling with native Server-Sent Events (`EventSource`). The DAG engine now broadcasts mutations instantly to the React UI via the `/api/graph/stream` bridge, resulting in sub-millisecond visual updates.

### v4.0.0
- **Mathematical Primitives**: Proper DAG implementation with `refinement`, `contradiction`, `support`, and `branch` edges.
- **Synthesizer Tools**: `aggregate_thoughts` and `prune_branch` for handling logic dead ends and converging thoughts.
- **Autonomous Orchestration**: The `run_controller_loop` power-tool.
- **CA-MCP**: Shared Context Store (`context_set`, `context_get`).

---

## 🚀 The 2026 Horizons (Current Priorities)

To elevate `got-mcp` to a $10k+ enterprise value, we are focusing on three massive architectural upgrades.

### Priority 1: Framework A - Perspective Generation (Intent-to-Graph)
* **Why**: Non-technical users struggle to "branch" their thoughts. They need an "Invisible Brain" to expand vague prompts.
* **What**: Implement `generate_perspectives` to automatically turn "Help me choose a laptop" into a 3-branch analysis (Performance, Budget, Mobility).
* **Impact**: Dramatically lowers the barrier to entry for GoT reasoning.

### Priority 2: Framework B - Native Knowledge Graph Persistence
* **Why**: Currently, reasoning graphs are ephemeral and die when the session resets.
* **What**: Integrate the `got-mcp` engine with the `@mcp:memory` server. Validated, high-scoring nodes will be extracted as entities/relations and committed to Long-Term Memory.
* **Impact**: Enables **Cross-Session Reasoning**. An agent can run a GoT loop today, and another agent can query the verified conclusions next month.

### Priority 3: Framework C - Swarm Multi-Agent Orchestration
* **Why**: Single-agent reasoning bottlenecks true non-linear problem solving.
* **What**: Introduce a `contribute_thought(agentId, thought)` mechanism. Permit multiple specialized agents (e.g., a "Red Team" attacker and a "Blue Team" defender) to operate on the *same* DAG simultaneously.
* **Impact**: Achieve true R1/o3 level architectural reasoning capabilities where agents debate and branch off each other's conclusions in real-time.
