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
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D22-00e5ff?style=flat-square" alt="Node.js" /></a>
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

### 🛡️ 2026 Hybrid Standard:
This project implements the **Hybrid 2026 Documentation & Visualization standard**:
- **Mermaid Logic (AI)**: All internal logic is documented via Mermaid diagrams for agentic readability.
- **Svelte 5 Visualizer (Human)**: A high-performance WebGL dashboard for humans (Migrating to Svelte 5 + Sigma.js).

### 🚀 Roadmap:
We are currently in the middle of a major architectural shift to a **Browser-Native 2026 Stack**. See the [**Roadmap**](ROADMAP.md) for the v5.0.0 migration details.

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
| `run_controller_loop` | Autonomous GoT reasoning engine | 🔄 Orchestration |
| `reflect_and_refine` | Self-correction loop (R1/o3 pattern) | 🔬 Reflection |
... (see GEMINI.md for full toolset)

---

## 🔒 Governance & Isolation

Engine-level guards — enforced in the graph engine, not the tool layer:

| Guard | Default | Purpose |
| :--- | :--- | :--- |
| **Session Isolation** | Mandatory | `sessionId` prevents cross-talk in multi-user apps. |
| **Atomic Sync** | < 100ms | Real-time, safe persistence with `temp + rename` atomic writes. |
| **Node cap** | 1000 | Prevents memory exhaustion and runaway loops. |

---

## 📊 Visualizer

A Svelte 5 dashboard with a **cyber-industrial UI** — hardware-accelerated graph rendering via Sigma.js (WebGL).

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
