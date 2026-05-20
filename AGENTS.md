# AGENTS.md — Agentic Coding Standards for Thought Graph

This file provides guidelines for AI agents operating in this repository. It supplements the existing `.github/copilot-instructions.md`.

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

### Running a Single Test
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
- Use ESM syntax: `import { X } from "./module.js"` (note `.js` extension)
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

### Error Handling
- Create custom error classes extending `Error` for domain errors
- Include descriptive messages with context
- Always use `instanceof` checks or error message matching in tests
- Wrap async operations in try/catch/finally

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
- All input validation uses **Zod** for dynamic schemas
- Governance limits enforced at engine level (`ThoughtGraph.ts`), not tool layer
- DAG integrity: cycle detection mandatory before adding edges
- Session isolation via `sessionId` scoping

---

## 3. Architecture Principles

### Core vs. Transport
- **`ThoughtGraph.ts`**: Core graph logic — ALL state changes MUST pass through here
- **Express bridge / MCP Stdio**: Protocol-agnostic transport layers only — NO core logic

### Persistence
- Cross-process sync uses `proper-lockfile` with exponential backoff
- Atomic writes: write to temp file → rename for total atomicity
- Watch file interval: 500ms for responsiveness

### Security (from copilot-instructions.md)
- Never hardcode credentials in any file
- Validate all user inputs dynamically through Zod
- Ensure safe cross-process syncing with atomic temp writes

---

## 4. Testing Conventions

### Test Framework
- Use Node.js built-in `node:test`
- Use `node:assert/strict` for assertions

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

---

## 5. Directory Structure

```
src/
├── graph/
│   ├── ThoughtGraph.ts    # Core DAG engine
│   └── index.ts
├── context/
│   └── ContextStore.ts    # Session-scoped context
├── server/
│   ├── mcp.ts            # MCP protocol handlers
│   ├── http.ts           # Express HTTP bridge
│   ├── logger.ts         # Structured logging
│   └── tools/            # MCP tool implementations
│       ├── core.ts
│       ├── got.ts
│       └── ...
├── types.ts              # Shared interfaces
└── index.ts              # Entry point
tests/
├── ThoughtGraph.test.ts
└── ThoughtGraph.comprehensive.test.ts
```

---

## 6. Key Patterns

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

### Confidence Vector Weights (2026 pattern)
- factual: 30%
- logical: 35%
- relevance: 25%
- novelty: 10%

---

## 7. References

- GoT Paper: https://arxiv.org/abs/2308.09687 (Besta et al., 2023)
- MCP Spec: https://modelcontextprotocol.io
- Node.js >= 20.0.0 required
- Package: `@abderraouf-yt/got-mcp` (npm)
