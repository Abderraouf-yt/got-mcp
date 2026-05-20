<p align="center">
  <img src="docs/assets/hero-complex-graph.png" alt="GoT MCP — 13-node reasoning DAG visualized in cyber-industrial UI" width="100%" />
</p>

<h1 align="center">🧠 GOT MCP</h1>

<p align="center">
  <strong>Graph of Thoughts MCP Server — Bounded, Auditable Reasoning for AI Agents</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@abderraouf-yt/got-mcp"><img src="https://img.shields.io/npm/v/@abderraouf-yt/got-mcp?style=flat-square&color=00e5ff&label=npm" alt="npm version" /></a>
  <a href="https://github.com/Abderraouf-yt/got-mcp"><img src="https://img.shields.io/github/stars/Abderraouf-yt/got-mcp?style=flat-square&color=ff00ff&label=stars" alt="GitHub stars" /></a>
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D20-00e5ff?style=flat-square" alt="Node.js" /></a>
  <a href="#"><img src="https://img.shields.io/badge/MCP-1.26+-ff00ff?style=flat-square" alt="MCP SDK" /></a>
  <a href="#"><img src="https://img.shields.io/badge/tools-23-00ff88?style=flat-square" alt="Tools" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="License" /></a>
  <a href="https://arxiv.org/abs/2308.09687"><img src="https://img.shields.io/badge/GoT-Besta%20et%20al.%202023-ff6b6b?style=flat-square" alt="GoT Paper" /></a>
</p>

<p align="center">
  <a href="#-quick-start">⚡ Quick Start</a> •
  <a href="#-tools-20">🛠 Tools</a> •
  <a href="#-how-it-thinks">🧬 How It Thinks</a> •
  <a href="#-governance">🔒 Governance</a> •
  <a href="#-visualizer">📊 Visualizer</a>
</p>

---

## What is this?

> **Chain of Thought** reasons in a line. **Tree of Thought** can branch. **Graph of Thoughts** can branch, merge, contradict, prune dead ends, and converge on the winning path.

Thought Graph is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives AI agents **non-linear reasoning** — a directed acyclic graph where thoughts can branch into alternatives, get contradicted by evidence, and converge through weighted aggregation.

### 🛡️ 2026 Production Standards:
Version 4.4.0 introduces the **Bullet-Proof Reasoning** standard:
- **Strict Session Isolation**: Multi-tenant ready with `sessionId` scoping.
- **Audit Traceability**: Native support for ingesting and linking cloud infrastructure evidence (**CloudEvidence**).
- **Persistent Memory**: Bridges reasoning results to the permanent Knowledge Graph via `@mcp:memory`.
- **Professional Reporting**: Professional SOC 2 Gap Analysis exports in PDF and Markdown formats.

---

## ⚡ Quick Start

### Option 1: Install from npm

```bash
npm install @abderraouf-yt/got-mcp
```

### Option 2: Clone & Build

```bash
git clone https://github.com/Abderraouf-yt/got-mcp.git
cd got-mcp
npm install && npm run build
```

---

## 🛠 Tools (23)

| Tool | What it does | Category |
| :--- | :--- | :--- |
| `generate_gap_report` | **NEW v4.4.0**: Professional PDF/MD Gap Analysis | 📊 Report |
| `generate_perspectives` | Heuristic auto-seeding of reasoning branches | 🧠 Seeding |
| `ingest_evidence` | Sanitized ingestion of AWS/Azure JSON | 🛡️ Audit |
| `commit_to_memory` | Permanent storage of verified insights | 💾 Persistence |
| `run_controller_loop` | Autonomous GoT reasoning engine | 🔄 Orchestration |
| `propose_thought` | Add a node with parent + relation | 🧠 Core |
| `evaluate_thought` | Score (0.0–1.0) + multi-axis confidence | 🧠 Core |
| `aggregate_thoughts` | Merge 2+ nodes into a weighted synthesis | ⚡ GoT |
| `prune_branch` | "Kill Switch" for hallucinations | ⚡ GoT |
| `find_winning_path` | Beam search for the best reasoning path | ⚡ GoT |
| `reflect_and_refine` | Self-correction loop (R1/o3 pattern) | 🔬 Reflection |
| `compile_node_context` | Context Firewall for multi-agent swarms | 🛡️ Orchestration |
| `query_nodes` | O(1) Swarm task discovery | 🛡️ Orchestration |
| `export_snapshot` | Serialize full graph state to JSON | 📤 IO |
| `restore_snapshot` | Restore graph from an exported snapshot | 📤 IO |
| `export_reasoning_trace` | Export structured Long CoT trails | 📤 IO |
| `export_proven_memory` | Bridge to `@mcp:memory` format | 📤 IO |
| `get_thought_graph` | Retrieve the full DAG state | 🧠 Core |
| `reset_graph` | Clear all nodes and edges | 🧠 Core |
| `context_set` | Write to shared agentic memory | 💾 Context |
| `context_get` | Read from shared agentic memory | 💾 Context |
| `context_list` | List all keys in context store | 💾 Context |
| `get_graph_metrics` | Graph health & governance stats | 📊 Ops |

---

## 🔒 Governance & Isolation

Engine-level guards — enforced in the graph engine, not the tool layer:

| Guard | Default | Purpose |
| :--- | :--- | :--- |
| **Session Isolation** | Mandatory | `sessionId` prevents cross-talk in multi-user apps. |
| **Node cap** | 1000 | Prevents memory exhaustion and runaway loops. |
| **Depth cap** | 30 | Enforces logical convergence over deep chains. |
| **Atomic Sync** | 500ms | Real-time, safe persistence with `proper-lockfile`. |

---

## 📊 Visualizer

A React 19 dashboard with a **cyber-industrial UI** — real-time graph rendering via React Flow + Dagre layout.

```bash
cd visualizer && npm install && npm run dev
# Dashboard opens at http://localhost:5173
```

---

## 📜 License

MIT

---

<p align="center">
  <sub>Evolution of sequential thinking — because the best ideas don't come in a straight line.</sub>
</p>
