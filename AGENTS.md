# AGENTS.md — Agentic Coding Standards for Thought Graph

This file provides authoritative guidelines for AI agents operating in this repository.  
**Last verified:** 2026-03-16 against actual `src/` tree.

---

## 1. Build, Lint, and Test Commands

### Core Commands
```bash
npm run build      # Compile TypeScript → dist/
npm run dev        # Watch mode: recompile on file changes
npm run start      # Run the compiled MCP server
npm run test       # Run ALL tests using tsx
```

### Running a Single Test File
```bash
npx tsx --test tests/ThoughtGraph.test.ts
```

### Running a Single Test by Name
```bash
npx tsx --test tests/ThoughtGraph.test.ts -g "should add nodes"
```

### Running Tests with Verbose Output
```bash
npx tsx --test tests/ThoughtGraph.comprehensive.test.ts --reporter=spec
```

---

## 2. Code Style Guidelines

### TypeScript Configuration
- Target: `ESNext`
- Module: `NodeNext` (ESM)
- `strict: true` is enabled
- Use explicit return types for public methods

### Imports & Exports
- Use ESM syntax: `import { X } from "./module.js"` (note `.js` extension — required for NodeNext)
- Use `export class` / `export interface` for public APIs
- Group imports: external → internal → types
- Use `import type { Type }` for type-only imports

```typescript
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { logger } from "./server/logger.js";
import type { ThoughtNode, ThoughtEdge } from "./types.js";
```

### Naming Conventions
- **Classes**: PascalCase (`ThoughtGraph`, `ThoughtGraphError`)
- **Interfaces**: PascalCase (`ThoughtNode`, `GraphState`)
- **Types**: PascalCase (`ThoughtStatus`, `ThoughtRelation`)
- **Constants**: SCREAMING_SNAKE_CASE with `as const`
- **Private fields**: camelCase with optional `_` prefix
- **Files**: kebab-case (`thought-graph.ts`, `context-store.ts`)

### MCP Tool Handler Pattern (Non-Negotiable)

Every tool MUST follow this pattern — no exceptions:

```typescript
server.registerTool(
  'tool_name',
  {
    title: 'Human Readable Title',
    description: 'What this tool does.',
    inputSchema: z.object({
      param: z.string().optional().describe('What this param does'),
      sessionId: z.string().optional().describe('Session ID for isolated reasoning paths')
    }),
    outputSchema: z.object({ result: z.any() })
  },
  async ({ param, sessionId }, ctx): Promise<CallToolResult> => {
    try {
      const result = doWork(param);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: { result }  // must match outputSchema
      };
    } catch (error) {
      // NEVER throw — always return isError
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `tool_name failed: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
);
```

### Error Handling
- Create custom error classes extending `Error` for domain errors
- Include descriptive messages with context
- Always use `instanceof` checks or error message matching in tests
- Wrap async operations in try/catch/finally
- **MCP handlers**: never throw — always return `{ isError: true, content: [...] }`

```typescript
export class ThoughtGraphError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ThoughtGraphError";
    }
}

export class ThoughtGraphNotFoundError extends ThoughtGraphError {
    constructor(nodeId: string) {
        super(`Node '${nodeId}' not found in the graph`);
        this.name = "ThoughtGraphNotFoundError";
    }
}
```

### JSDoc Comments
- Document all public MCP tools with comprehensive JSDoc
- Include `@param`, `@returns`, `@throws` for methods
- Add module-level `@description` for files

```typescript
/**
 * Add a new thought node to the graph.
 * @param thought - The reasoning content
 * @param id - Optional custom ID (auto-generated if not provided)
 * @returns The ID of the created node
 * @throws {ThoughtGraphError} if node cap is reached
 */
async addNode(thought: string, id?: string): Promise<string>
```

### Governance & Validation
- All input validation uses **Zod** with `.describe()` annotations on every field
- Governance limits enforced at engine level (`ThoughtGraph.ts`), not tool layer
- DAG integrity: cycle detection mandatory before adding edges
- Session isolation via `sessionId` scoping on every tool

---

## 3. Architecture Principles

### Layer Responsibilities

| Layer | File(s) | Responsibility |
|-------|---------|----------------|
| **Entry point** | `src/index.ts` | Bootstrap Stdio MCP + Express HTTP bridge |
| **Core engine** | `src/graph/ThoughtGraph.ts` | ALL graph state changes — DAG logic, scoring, pruning |
| **Context store** | `src/context/ContextStore.ts` | Session-scoped key-value store with provenance |
| **Tool registration** | `src/server/mcp.ts` | Registers all tools with the MCP server — no business logic |
| **Tool implementations** | `src/server/tools/*.ts` | Actual tool handler logic, split by domain |
| **HTTP bridge** | `src/server/http.ts` | Express REST API + CORS for the visualizer |
| **Logger** | `src/server/logger.ts` | Structured logging — stderr ONLY, never stdout |
| **Types** | `src/types.ts` | Shared interfaces: ThoughtNode, ThoughtEdge, GraphState |

### Core vs. Transport Rule
- **`ThoughtGraph.ts`**: Core graph logic — ALL state changes MUST pass through here
- **`mcp.ts`**: Registration layer only — wires tools to the MCP server, no logic
- **`tools/*.ts`**: Handler logic — calls `ThoughtGraph.ts`, formats `CallToolResult`
- **Express bridge / Stdio**: Protocol-agnostic transport — NO core logic ever

### Persistence
- Cross-process sync uses atomic temp-file writes (write to temp → rename)
- File watch via `fs.watchFile` at 500ms interval for cross-process responsiveness
- State file: `thought-graph-state.json` written to **CWD of the server process**

### Logging Rule
- `src/server/logger.ts` routes ALL logs to **stderr**
- **Never use `console.log`** — it pollutes the Stdio MCP protocol
- Use the `Logger` utility exclusively for any diagnostic output

### Security
- Never hardcode credentials in any file
- Validate all user inputs through Zod schemas with `.describe()` annotations
- Atomic temp writes for safe cross-process state synchronization

---

## 4. Testing Conventions

### Test Framework
- Node.js built-in `node:test`
- `node:assert/strict` for assertions

### Test Structure
```typescript
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ThoughtGraph } from "../src/graph/ThoughtGraph.js";

describe("Feature Name", () => {
    test("should do something specific", async () => {
        const graph = new ThoughtGraph();
        const id = await graph.addNode("Test thought");
        assert.strictEqual(graph.size, 1);
    });
});
```

### Error Assertion
```typescript
await assert.rejects(
    async () => await graph.addEdge(id3, id1, "refinement"),
    { message: /cycle/i }
);
```

### Test File Placement
- All tests in `tests/` directory at project root
- Never delete existing tests — only add new ones
- New tool tests: `tests/[tool-category].test.ts`

---

## 5. Directory Structure (Verified 2026-03-16)

```
src/
├── index.ts                        # Bootstrap: Stdio MCP server + Express HTTP bridge
├── types.ts                        # Shared interfaces: ThoughtNode, ThoughtEdge, GraphState
│
├── graph/
│   ├── ThoughtGraph.ts             # ← CORE ENGINE: DAG, scoring, pruning, aggregation
│   └── index.ts                    # Singleton export: getGraphInstance()
│
├── context/
│   ├── ContextStore.ts             # Session-scoped key-value store with provenance tracking
│   └── index.ts                    # Context module exports
│
└── server/
    ├── mcp.ts                      # ← TOOL REGISTRATION: wires tools to McpServer (no logic)
    ├── http.ts                     # Express REST API + CORS for React visualizer
    ├── logger.ts                   # Structured logger → stderr only (never stdout)
    ├── logo.ts                     # ASCII logo / branding output
    │
    └── tools/                      # ← TOOL IMPLEMENTATIONS (split by domain)
        ├── index.ts                # Barrel export for all tool registrations
        ├── core.ts                 # Core tools: propose, evaluate, reset, get_thought_graph
        ├── got.ts                  # GoT primitives: aggregate, prune, find_winning_path
        ├── context.ts              # Context store tools: context_set/get/list
        ├── io.ts                   # I/O tools: export_snapshot, restore_snapshot,
        │                           #   export_reasoning_trace, export_proven_memory,
        │                           #   commit_to_memory, ingest_evidence
        ├── orchestration.ts        # Orchestration: run_controller_loop, compile_node_context,
        │                           #   query_nodes, reflect_and_refine, get_graph_metrics
        └── perspectives.ts         # generate_perspectives tool

tests/
├── ThoughtGraph.test.ts
└── ThoughtGraph.comprehensive.test.ts
```

> ⚠️ **`tools/handlers.ts` and `tools/definitions.ts` no longer exist.**  
> All tool logic is split across `src/server/tools/*.ts` by domain category.  
> Registration happens in `src/server/mcp.ts` which calls `src/server/tools/index.ts`.

---

## 6. Tool Domain Map (22 tools — confirmed 2026-03-15)

| File | Tools |
|------|-------|
| `tools/core.ts` | `propose_thought` · `evaluate_thought` · `reset_graph` · `get_thought_graph` |
| `tools/got.ts` | `aggregate_thoughts` · `prune_branch` · `find_winning_path` |
| `tools/context.ts` | `context_set` · `context_get` · `context_list` |
| `tools/io.ts` | `export_snapshot` · `restore_snapshot` · `export_reasoning_trace` · `export_proven_memory` · `commit_to_memory` · `ingest_evidence` |
| `tools/orchestration.ts` | `run_controller_loop` · `compile_node_context` · `query_nodes` · `reflect_and_refine` · `get_graph_metrics` |
| `tools/perspectives.ts` | `generate_perspectives` |

---

## 7. Key Patterns

### Version Management (Single Source of Truth)
```typescript
// src/index.ts — always dynamic, never hardcoded
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const server = new McpServer(
  { name: 'got-mcp', version },
  { capabilities: { logging: {} } }
);
```

### Async Lock for Concurrent Operations
```typescript
private operationLock: Promise<void> = Promise.resolve();

async withLock<T>(operation: () => T | Promise<T>): Promise<T> {
    let release: () => void;
    const acquire = new Promise<void>(resolve => { release = resolve; });
    const previous = this.operationLock;
    this.operationLock = acquire;
    await previous;
    try {
        return await operation();
    } finally {
        release!();
    }
}
```

### Weighted Aggregation Formula
```
weightedScore = Σ(node_score × weight) / Σ(weights)
confidence = 1 - stddev(source_scores)
```

### Confidence Vector Weights
| Axis | Weight | Meaning |
|------|--------|---------|
| `factual` | 30% | Grounded in verifiable facts |
| `logical` | 35% | Reasoning chain is valid |
| `relevance` | 25% | Addresses the problem directly |
| `novelty` | 10% | Adds new information |

---

## 8. References

- GoT Paper: https://arxiv.org/abs/2308.09687 (Besta et al., 2023)
- MCP Spec: https://modelcontextprotocol.io
- Node.js >= 20.0.0 required
- Package: `@abderraouf-yt/got-mcp` (npm)
- Full SDD workflow: `SPECKIT_SOP_2026_ENHANCED.md`
- Agent constitution + bug registry: `GEMINI.md`
