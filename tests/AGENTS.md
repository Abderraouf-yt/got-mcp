# AGENTS.md — Tests (`tests/`)

> **Parent:** [../AGENTS.md](../AGENTS.md)

This directory contains all unit and integration tests for the Thought Graph MCP server.

---

## Test Runner

- **Runtime:** `node:test` via `tsx` (TypeScript execution without precompilation).
- **Command:** `npx tsx --test --test-timeout=10000 tests/*.test.ts`
- **CI Safety:** Always use `--test-timeout` to catch event loop leaks.

## Rules

### Mandatory Cleanup Pattern (CRITICAL)

Any test that instantiates a `ThoughtGraph` with a persistence path **MUST** call
`await graph.close()` in an `afterEach` hook. Failure to do so leaves `fs.watchFile`
timers active and **hangs the test runner indefinitely**.

```typescript
import { describe, beforeEach, afterEach } from "node:test";
import { ThoughtGraph } from "../src/graph/ThoughtGraph.js";

describe("My Test Suite", () => {
    let graph: ThoughtGraph;

    beforeEach(() => {
        graph = new ThoughtGraph("/path/to/test-state.json");
    });

    afterEach(async () => {
        await graph.close();
    });

    // ... tests
});
```

If a test creates **multiple** graph instances, track them all in an array and close
each one in `afterEach`:

```typescript
const graphs: ThoughtGraph[] = [];
// In test: graphs.push(new ThoughtGraph(path));
// In afterEach: await Promise.all(graphs.map(g => g.close()));
```

### File Naming
- Test files: `*.test.ts` (picked up by the glob `tests/*.test.ts`).
- Test utilities: place in `tests/utils/`.
- Temporary state files: write to `tests/tmp_*/` directories (gitignored).

### Assertions
- Use `node:assert` (`assert.ok`, `assert.strictEqual`, `assert.deepStrictEqual`).
- Use `assert.rejects` for async error path testing.
- Prefer strict equality over loose equality in all comparisons.
