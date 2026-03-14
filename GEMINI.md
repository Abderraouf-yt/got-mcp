# GEMINI.md — Thought Graph v4.3.0 (Source of Truth)

## 🚀 Overview
**Thought Graph** is a 2026-era MCP server implementing the **Graph of Thoughts (GoT)** reasoning pattern (Besta et al., 2023). It enables non-linear, recursive reasoning for AI agents through a DAG structure with branching, aggregation, pruning, and convergence.

**Version:** 4.3.0 | **License:** MIT | **Transport:** Stdio + HTTP Bridge

## 🛠 Tech Stack
| Component | Technology |
|-----------|-----------|
| **Server** | TypeScript, Node.js v20+, `@modelcontextprotocol/sdk` ^1.26, Express, Zod 4.3.6 |
| **Visualizer** | React 19, Vite 7, `@xyflow/react`, Dagre, SWR, Lucide Icons |
| **State** | In-memory DAG with JSON file persistence + `fs.watchFile` cross-process sync |
| **Transport** | Stdio (IDE agents) + HTTP Bridge :3001 (visualizer) |

## 🏗 Architecture & Codebase Map

```
src/
├── index.ts                  # Bootstrap: Stdio MCP + Express HTTP bridge
├── server/
│   ├── mcp.ts                # Tool & resource registration (19 tools, 2 resources)
│   └── http.ts               # Express REST API + CORS for visualizer
├── graph/
│   ├── ThoughtGraph.ts       # Core DAG engine (GoT primitives)
│   └── index.ts              # Singleton export via getGraphInstance()
├── types.ts                  # ThoughtNode, ThoughtEdge, ThoughtRelation, GraphState
└── resources/                # MCP resource: thought-graph://current

visualizer/                   # React 19 + Vite dashboard (:5173)
├── src/App.tsx               # Dagre layout, SWR polling, ReactFlow canvas
├── src/components/           # ThoughtNode custom node component
└── src/App.css               # Cyber-industrial dark theme

tests/                        # Unit tests (Node.js native test runner)
docs/assets/                  # Demo screenshots, state JSON, recordings
```

> **⚠️ Stale references:** The old `tools/handlers.ts` and `tools/definitions.ts` files no longer exist. All tool logic is centralized in `src/server/mcp.ts` using inline Zod schemas.

## 🧠 MCP Tools (20 total)

### Core Tools (v1.0)
| Tool | Description | Annotations |
|------|-------------|-------------|
| `propose_thought` | Propose a reasoning node with optional parent edge | `destructiveHint: true` |
| `evaluate_thought` | Score/critique a node (0.0–1.0). Omit score → autonomous audit | `destructiveHint: true` |
| `get_thought_graph` | Retrieve entire graph state as JSON | `readOnlyHint: true` |
| `reset_graph` | Clear all nodes and edges | `destructiveHint: true` |
| `generate_perspectives` | **NEW v4.3.0**: Auto-generate analytical seed nodes from a query | `readOnlyHint: true` |

### GoT Primitives (v3.0)
| Tool | Description | Annotations |
|------|-------------|-------------|
| `aggregate_thoughts` | Merge 2+ nodes → synthesized conclusion with `aggregation` edges | `destructiveHint: true` |
| `prune_branch` | Recursively reject a node + ALL descendants (score=0) | `destructiveHint: true` |
| `find_winning_path` | Greedy DFS/Beam Search: k-best paths from root to leaf | `readOnlyHint: true` |
| `get_graph_metrics` | Retrieve live metrics: node count, max depth, prune ratio, etc. | `readOnlyHint: true` |

### Self-Reflection & Context Store (v4.0)
| Tool | Description | Annotations |
|------|-------------|-------------|
| `reflect_and_refine` | Self-reflection: 4-axis confidence + auto-critique + branch | `destructiveHint: true` |
| `context_set` | Write key-value to shared context store with provenance | `destructiveHint: true` |
| `context_get` | Read value + source from shared context store | `readOnlyHint: true` |
| `context_list` | List all context store entries and their sources | `readOnlyHint: true` |

### Orchestration & Export (v3.0/v4.0)
| Tool | Description | Annotations |
|------|-------------|-------------|
| `export_snapshot` | Full graph serialization for deterministic replay/recovery | `readOnlyHint: true` |
| `restore_snapshot` | Replace graph state from previously exported JSON snapshot | `destructiveHint: true` |
| `export_reasoning_trace` | Export winning path as Long CoT trace (DeepSeek-R1/o3 format) | `readOnlyHint: true` |
| `export_proven_memory` | Export the validated reasoning path for `@mcp:memory` Knowledge Graph format | `readOnlyHint: true` |
| `run_controller_loop` | Autonomous GoT loop. Supports `autoSeed: true` for zero-prompt branching | `destructiveHint: true` |
| `compile_node_context` | SOTA Context Firewall: Compiles reasoning context filtering lateral branches | `readOnlyHint: true` |
| `query_nodes` | Query and filter nodes by swarm orchestration fields (e.g., queued agent tasks) | `readOnlyHint: true` |

### MCP Resources
| URI | Description |
|-----|-------------|
| `thought-graph://current` | Real-time graph state (JSON) |

### Relation Types
`refinement` · `contradiction` · `support` · `branch` · `aggregation` · `reflection`

### Node Statuses
`active` · `validated` · `rejected` · `branching`

## 🚦 Workflows

### Build & Run
```bash
npm install && npm run build    # Compile TypeScript
npm run start                   # Stdio + HTTP Bridge (:3001)
npm run dev                     # Watch mode
```

### Visualizer
```bash
cd visualizer && npm install
npm run dev                     # Vite dev server (:5173)
```

### Testing
```bash
npm run build                   # Must compile first
npx tsx --test tests/           # Run unit tests
```
> **Coverage:** 56 tests across 15 suites (100% passing). Tests cover Governance, Aggregation, Pruning, Beam Search, Reflection, Context Firewall, Swarm Orchestration, Snapshots, Memory Export, Controller Loop, Session Isolation, Context Store, and Graph Metrics.

## 📜 Conventions & Standards

### MCP Builder Compliance
- ✅ **Zod schemas** on all tool inputs with `.describe()` annotations
- ✅ **structuredContent** returned alongside text in every tool response
- ✅ **Actionable error messages** with specific node IDs and suggestions
- ✅ **Custom error classes** (ThoughtGraphError, NotFoundError, PersistenceError)
- ✅ **Singleton state** via `getGraphInstance()` (Stdio + HTTP share same graph)
- ✅ **Tool annotations** (`readOnlyHint` / `destructiveHint`) — fully implemented on all 19 tools
- ⬜ **outputSchema** — not yet implemented per tool

### Coding Standards
- ES6+, async/await, strict TypeScript (`strict: true`)
- `camelCase` variables, `PascalCase` classes/components, `kebab-case` CSS/folders
- Zod for all external input validation
- Cross-process file sync via `fs.watchFile` + atomic temp-file writes

### Git Strategy
- Branches: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Commits: Conventional Commits (`type(scope): description`)
- Default branch: `main`

### UI/UX
- Dark mode default (cyber-industrial aesthetic)
- Dagre hierarchical DAG layout
- SWR polling (2s interval) for live sync
- Vercel React Best Practices applied

## 🔬 GoT Paper Compliance (Besta et al., 2023)

| Primitive | Status | Tool |
|-----------|--------|------|
| **Generate** | ✅ v1.0 | `propose_thought` |
| **Evaluate** | ✅ v1.0 | `evaluate_thought` |
| **Backtrack** | ✅ v1.0 | `evaluate_thought(status: rejected)` |
| **Aggregate** | ✅ v3.0 | `aggregate_thoughts` |
| **Prune** | ✅ v3.0 | `prune_branch` |
| **Converge** | ✅ v3.0 | `find_winning_path` |
| **Volume Control** | ✅ v3.0 | Engine governance limits |
| **Replay** | ✅ v3.0 | `export_snapshot` / `restore_snapshot` |
| **Self-Reflect** | ✅ v4.0 | `reflect_and_refine` — 4-axis confidence |
| **Context Store** | ✅ v4.0 | `context_set` / `context_get` / `context_list` |
| **Reasoning Trace** | ✅ v4.0 | `export_reasoning_trace` — Long CoT export |
| **Controller Loop** | ✅ v4.0 | `run_controller_loop` — autonomous orchestrator |

## 📁 Config & Environment
- **MCP Config:** `~/.gemini/antigravity/mcp_config.json` or `~/.gemini/settings.json`
- **Command:** `node <path>/thought-graph/dist/index.js`
- **Env:** `THOUGHT_GRAPH_HTTP_PORT` (default: 3001)
- **State file:** `thought-graph-state.json` (CWD of the server process)
