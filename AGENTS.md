# AGENTS.md — Agentic Coding Standards for Thought Graph

This file provides the global guidelines and architectural standards for AI agents operating in this repository. It establishes the **DOX traversal rules** and indexes subsystem subdocuments.

---

## 🛡️ Hybrid 2026 Documentation Standard

To maintain compatibility between human developers and AI agents, all contributors MUST follow the Hybrid standard:

### 1. Mermaid Logic (AI-to-AI)
- **Every** new feature or architectural change MUST include a Mermaid diagram in the documentation.
- Do not rely on plain text to explain dependencies; use `graph TD` or `sequenceDiagram`.
- This allows other AI agents to parse your logic as a structured data object.

### 2. Svelte 5 Visualizer (Human-to-AI)
- The user-facing visualizer uses **Svelte 5 (Runes)** and **Sigma.js v3 (WebGL)**.
- Focus on performance: minimize DOM manipulations and leverage WebGL for graph rendering.

---

## 🛠️ Build, Lint, and Test Commands

### Core Commands
```bash
npm run build      # Compile TypeScript → dist/
npm run dev        # Watch mode: recompile on file changes
npm run start      # Run the compiled MCP server
npm test           # Run ALL tests using node:test
```

---

## 📂 DOX Standard & Subdocument Index

This repository adheres to the **DOX (Directory-Oriented documentation) Standard** for agent context scoping.
- **Rule 1 (Context Scoping)**: When entering a directory, an agent MUST immediately view that directory's `AGENTS.md` file (if present) before performing modifications.
- **Rule 2 (Hierarchy)**: Subdirectory `AGENTS.md` files must link back to their parent document, and parent documents must index child documents.

### Subdocument Registry

- 🧠 **Graph Engine & DAG logic**: [src/graph/AGENTS.md](file:///c:/Users/toumi/Desktop/Development/2026-PROJECTS/MCP-Projects/thought-graph/src/graph/AGENTS.md)
- 📡 **MCP Tools & HTTP Bridge**: [src/server/AGENTS.md](file:///c:/Users/toumi/Desktop/Development/2026-PROJECTS/MCP-Projects/thought-graph/src/server/AGENTS.md)
- 🧪 **Test Suite & Cleanup Standards**: [tests/AGENTS.md](file:///c:/Users/toumi/Desktop/Development/2026-PROJECTS/MCP-Projects/thought-graph/tests/AGENTS.md)
- 🎨 **Svelte 5 Dashboard**: [visualizer/AGENTS.md](file:///c:/Users/toumi/Desktop/Development/2026-PROJECTS/MCP-Projects/thought-graph/visualizer/AGENTS.md)
