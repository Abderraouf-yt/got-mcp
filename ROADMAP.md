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

To elevate `got-mcp` to a $10k+ enterprise value, we are focusing on four massive architectural upgrades (v5.0 Vision) and the launch of our specialized compliance vertical.

### 🏆 The "Persistent Auditor" (SOC 2 Gap Analysis Service)
| Phase | Task | Value |
| :--- | :--- | :--- |
| **Phase 1: Memory Link** | Implement **Native Knowledge Graph Persistence**. Use `export_proven_memory` to bridge GoT results into `@mcp:memory` for cross-session remediation tracking. | **Intelligence**: Enables "Cross-Session Reasoning." The auditor now has a memory. |
| **Phase 2: Evidence Tool** | Create a specialized `ingest_evidence` tool that can feed AWS/Azure JSON exports into the graph. | **Efficiency**: Stops you from having to copy-paste data into the chat. |
| **Phase 3: Gap Reporter** | Build a tool that transforms a "Winning Path" from the graph into a polished **SOC 2 Gap Analysis Report** (Markdown/PDF). | **Revenue**: This is the actual "product" we are selling as a service. |

### Priority 1: Smart Seeding — Intent-to-Graph (In Progress)
* **Why**: Non-technical users struggle to "branch" their thoughts. They need an "Invisible Brain" to expand vague prompts.
* **What**: Implement `generate_perspectives` tool. Uses **Delegation to Host Agent** + **Auto-Seeding** to automatically turn "Help me choose a laptop" into a 3-branch analysis.
* **Impact**: Dramatically lowers the barrier to entry for GoT reasoning by "upskilling" vague prompts into multi-dimensional analysis.

### Priority 2: The Memory Bridge — Native Knowledge Graph Persistence
* **Why**: Currently, reasoning graphs are ephemeral and die when the session resets.
* **What**: Implement `commit_to_memory` to bridge `export_proven_memory` results directly to the `@mcp:memory` server via `create_entities` and `create_relations`.
* **Impact**: Enables **Cross-Session Reasoning**. An agent can run a GoT loop today, and another agent can query the verified conclusions next month.

### Priority 3: Agentic Evaluation — Upgrading the Brain
* **Why**: Current auto-scoring relies on basic heuristics (`estimateSpecificity`).
* **What**: Integrate **Manara Red Pill** (System #4) logic into the `evaluate_thought` tool for deep architectural critique and System 2 reasoning feedback.
* **Impact**: Significantly increases the logical accuracy and self-correction ability of the autonomous `run_controller_loop`.

### Priority 4: Swarm Multi-Agent Orchestration
* **Why**: Single-agent reasoning bottlenecks true non-linear problem solving.
* **What**: Introduce a `contribute_thought(agentId, thought)` mechanism. Permit multiple specialized agents (e.g., a "Red Team" attacker and a "Blue Team" defender) to operate on the same DAG simultaneously.
* **Impact**: Achieve true R1/o3 level architectural reasoning capabilities where agents debate and branch off each other's conclusions in real-time.
