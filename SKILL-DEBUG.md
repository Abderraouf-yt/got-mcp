---
name: got-mcp-debug
description: >
  Debug playbook for GoT MCP (Graph of Thoughts MCP Server). Covers common setup
  failures, runtime crashes, known issues from commits and GitHub, path traversal
  alerts, dependency vulnerabilities, and step-by-step debugging workflow. Use
  when anything is broken, tests fail, or the server won't start.
  Triggers on: "error", "broken", "failing", "not working", "fix", "debug",
  "ECONNREFUSED", "port busy", "path traversal", "npm audit", "CodeQL".
---

# GoT MCP — Debug Playbook

> **Repository**: <https://github.com/Abderraouf-yt/got-mcp>
> **Tech Stack**: Node 18+ · TypeScript · Express · MCP SDK · proper-lockfile · zod · pdfmake

---

## Quick Debug Checklist

Run these in order before deep-diving:

```bash
# 1. Check Node version
node --version          # need >= 18

# 2. Clean install
rm -rf node_modules && npm install

# 3. Build
npm run build           # compiles src/ → dist/

# 4. Run tests
npm test                # expects 100/100 pass

# 5. Check for dependency vulnerabilities
npm audit               # should be 0

# 6. Verify TypeScript strict mode
npx tsc --noEmit        # should exit 0

# 7. Check the persistent state file isn't corrupted
cat thought-graph-state.json | head -c 200
```

---

## Enable Debug Logging

The server uses a custom `Logger` class with 4 levels: `DEBUG | INFO | WARN | ERROR`.

```bash
# Method 1: Set LOG_LEVEL env var (at startup, before the logger is imported)
LOG_LEVEL=debug npm start

# Method 2: For development with watch mode
npm run dev             # tsc --watch; then start server separately

# Method 3: Run tests with verbose logging
LOG_LEVEL=debug npx tsx --test tests/*.test.ts
```

> **Note:** All log output goes to **stderr** (not stdout), because the MCP Stdio transport uses stdout for JSON-RPC messages. Never redirect stderr away in production.

### Log Output Format

```
[2026-06-29T00:11:50.430Z] [INFO] Refined Ingestion. Provider: AWS, Session: default
[2026-06-29T00:11:50.904Z] [ERROR] Failed to save graph: Disk Full (Simulated)
[2026-06-29T00:11:50.330Z] [DEBUG] Graph persisted atomically in 6.32ms
```

### How to set LOG_LEVEL in code

The `Logger` class is in `src/server/logger.ts`. To change the level programmatically:

```typescript
import { logger, LogLevel } from "./server/logger.js";
logger.setLevel(LogLevel.DEBUG);
```

Currently, there is **no automatic `LOG_LEVEL` env var reader** in the logger constructor. To enable it across the board, add this near the top of `src/index.ts`:

```typescript
import { logger, LogLevel } from "./server/logger.js";
const envLevel = process.env.LOG_LEVEL?.toUpperCase();
if (envLevel && envLevel in LogLevel) {
    logger.setLevel(LogLevel[envLevel as keyof typeof LogLevel]);
}
```

---

## Common Errors & Fixes

### Error 1: `Error: listen EADDRINUSE :::3001`

**Layer:** Runtime / HTTP Bridge
**Cause:** The default HTTP bridge port (3001) is already occupied.
**Diagnosis:**
```bash
# Check what's on port 3001
netstat -ano | findstr :3001
# or PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess
```
**Fix:** The server auto-discovers an available port — look for this line in stderr:
```
🚀 Bridge on http://localhost:53640 (port 0 was busy)
```
Or set a custom port via env var:
```bash
THOUGHT_GRAPH_HTTP_PORT=4000 npm start
```
**Prevention:** Use `.env` file (see `.env.example`) to pin a port that's known free.

---

### Error 2: `npm audit` reports 7+ vulnerabilities (high severity)

**Layer:** Build / Dependencies
**Cause:** Transitive dependencies need updating — especially `fast-uri`, `hono` (via MCP SDK), `qs` (via express), and `ip-address` (via express-rate-limit).
**Diagnosis:**
```bash
npm audit
```
**Fix:**
```bash
npm audit fix
```
Then rebuild and retest:
```bash
npm run build && npm test
```
**Reference:** Fixed in commit `e72ddc3` (11 packages updated, 0 vulns remaining).

---

### Error 3: CodeQL alert — `Uncontrolled data used in path expression`

**Layer:** Security / Static Analysis
**Cause:** `sessionId` from MCP tool parameters / HTTP query is used directly to construct a file path without sanitization. The attack chain:
```
MCP Tool call { sessionId: "../../etc/passwd" }
  → getGraphInstance("../../etc/passwd")
    → "thought-graph-state-../../etc/passwd.json"
    → fs.writeFile / fs.rename / lockfile.lock on arbitrary path
```
**Affected files:** `src/graph/ThoughtGraph.ts` (5 locations), `src/graph/Persistence.ts` (7 locations)
**Diagnosis:**
```bash
# Run CodeQL locally (unofficial)
npx @github/codeql-cli-binaries database create --language=typescript /tmp/codeql-db
npx @github/codeql-cli-binaries database analyze /tmp/codeql-db --format=sarif-latest --output=/tmp/results.sarif
```
**Fix (3 defense layers):**
1. `sanitizeSessionId()` — rejects `..`, `/`, `\`, null bytes; strips to `[a-zA-Z0-9._-]`
2. `containPath()` — resolves full path and verifies it stays within `stateDir`
3. `validatePath()` in `Persistence.ts` — null-byte + traversal check on every FS op
**Reference:** Fixed in commit `26351d8` (12 CodeQL alerts resolved).

---

### Error 4: `Failed to save graph: Disk Full (Simulated)` in tests

**Layer:** Persistence / Tests
**Cause:** This is a **simulated error** in `tests/persistence-resilience.test.ts` (test T011). It's not a real error — the test deliberately mocks a disk-full scenario to verify FR-007 (graceful failure handling).
**Diagnosis:** Check if it's from a test run:
```bash
# Look for "[Simulated]" suffix
npm test 2>&1 | Select-String "Disk Full" -Context 1,1
```
**Fix:** No action needed — it's expected behavior. The logger line confirms the server keeps running despite the failure.
**Prevention:** None needed.

---

### Error 5: `Fatal error in main()` — server crashes on startup

**Layer:** Runtime / Startup
**Cause:** Several possibilities:
- Import resolution failure (wrong module extension)
- Port conflict (see Error 1)
- Missing `dist/` directory (build not run)
**Diagnosis:**
```bash
# Rebuild from scratch
npm run build

# Run directly with tsx for no-build startup
npx tsx src/index.ts
```
**Fix:**
```bash
npm run build && npm start
```
**Common cause:** TypeScript module resolution with `NodeNext` requires `.js` extensions in imports (e.g., `import ... from "./foo.js"`, not `"./foo"`). If you add a new file, make sure all import paths use the `.js` extension.
**Prevention:** Always run `npm run build` after adding new files.

---

### Error 6: Tests fail with `timeout` or `ERR_UV_TIMEOUT`

**Layer:** Tests / Event Loop
**Cause:** `ThoughtGraph.close()` was not called after creating a persistence-backed instance. The `fs.watchFile` poller (500ms interval) keeps the event loop alive.
**Diagnosis:**
```bash
# Run a single test file to isolate
npx tsx --test tests/thought-graph.test.ts
```
**Fix:**
```typescript
// Always close persistence-backed graphs in tests
const graph = new ThoughtGraph("/tmp/test.json");
// ... test logic ...
await graph.close();  // drains save queue + unwatches file
```
**Reference:** This is documented in `src/graph/AGENTS.md` under "Cleanup (CRITICAL)".

---

### Error 7: `proper-lockfile` lock acquisition timeout

**Layer:** Persistence / Multi-process
**Cause:** Multiple processes (Stdio server + HTTP bridge) are trying to lock the same persistence file simultaneously, or a previous lock was not released.
**Diagnosis:**
```bash
ls -la thought-graph-state.json.lock  # stale lock file?
```
**Fix:**
```bash
# Remove stale lock files
Remove-Item -Force *.lock 2>$null

# Or increase retry settings in ThoughtGraph.ts:
# lockfile.lock(path, { retries: { retries: 50, factor: 1.5, minTimeout: 10, maxTimeout: 1000, randomize: true } })
```
**Prevention:** The lock retry settings are already generous (50 retries with exponential backoff + jitter). Stale locks should only occur after a hard crash.

---

### Error 8: `TypeError: Cannot read properties of undefined (reading 'map')` in Graph exports

**Layer:** Runtime / Graph State
**Cause:** The graph's `snapshot.exportSnapshot()` was called on an empty or partially-initialized graph, or a node/edge was `undefined` in the state.
**Diagnosis:**
```typescript
const graph = getGraphInstance("test");
console.log("Nodes:", graph.nodes);  // Map
console.log("Edges:", graph.edges);  // Array
```
**Fix:** Ensure the graph is initialized before exporting:
```typescript
const graph = getGraphInstance("test");
// Add at least one node
graph.addNode("test thought", { thought: "test" });
graph.exportSnapshot();  // safe now
```
**Prevention:** Use the E2E test pattern (`propose_thought → evaluate_thought → find_winning_path`) as a minimal usage template.

---

### Error 9: `E2E test` fails with WebSocket / SSE connection timeout

**Layer:** Integration / HTTP Bridge
**Cause:** The HTTP bridge port changed (auto-discovery), but the test hard-codes a specific port.
**Diagnosis:** Look at the server startup line for the actual port:
```
🚀 Bridge on http://localhost:53640 (port 0 was busy)
```
**Fix:** The E2E test (`tests/e2e_mcp_flow.test.ts`) connects via Stdio transport, not HTTP — so this error should be rare. If it occurs, ensure the test reads the port from the environment or server output.
**Prevention:** The E2E test uses Stdio transport which doesn't depend on ports.

---

### Error 10: `security/snyk` check fails on PR (status: FAILURE)

**Layer:** CI / Security Scanning
**Cause:** The Snyk GitHub App finds real or false-positive vulnerabilities in dependencies.
**Diagnosis:**
```bash
npm audit                        # compare with Snyk report
npm ls fast-uri hono qs ip-address  # check vulnerable deps
```
**Fix:**
```bash
npm audit fix                    # resolves most npm advisories
```
**Note:** If Snyk persists with false positives after `npm audit fix`, the Snyk webhook can be removed from the repo:
```bash
gh api repos/Abderraouf-yt/got-mcp/hooks --jq '.[] | select(.config.url | contains("snyk")) | .id'
gh api repos/Abderraouf-yt/got-mcp/hooks/<id> -X DELETE
```
**Reference:** Snyk was removed from this repo (webhook id 597466129) after `npm audit fix` cleared all 7 vulns.

---

## Known Gotchas

### 1. `fs.watchFile` keeps the event loop alive

```typescript
fs.watchFile(this.persistencePath, { interval: 500 }, ...)
```

This creates a **persistent timer** that prevents Node.js from exiting. Every `ThoughtGraph` instance with persistence **MUST** be closed:

```typescript
await graph.close();  // calls fs.unwatchFile() + drains save queue
```

Failing to close causes tests to hang indefinitely.

### 2. All log output goes to stderr

The MCP Stdio transport uses **stdout** for JSON-RPC messages. The logger deliberately writes to **stderr** to avoid corrupting the protocol stream. If you pipe stdout to a file, you'll miss all logs. Always redirect stderr too:

```bash
npm start 2>&1 | tee server.log
```

### 3. `.js` extensions required in imports

TypeScript's `NodeNext` module resolution requires explicit `.js` extensions in import paths, even when importing `.ts` files during development:

```typescript
// Correct
import { Persistence } from "./Persistence.js";
import { logger } from "../server/logger.js";

// WRONG — will fail at runtime
import { Persistence } from "./Persistence";
import { logger } from "../server/logger";
```

### 4. Session ID is used in file paths

The `sessionId` parameter from MCP tools flows directly into a filename:

```typescript
const filename = `thought-graph-state-${sessionId}.json`;
```

If you pass `sessionId: "../../etc"`, the resulting path traverses outside the state directory. This is now protected by `sanitizeSessionId()` and `containPath()`, but custom integrations that call `getGraphInstance()` should be aware of this.

### 5. Atomic write pattern ≠ instant visibility

Persistence uses a `temp file → rename` pattern for atomicity. However, `fs.watchFile` polls at 500ms intervals. There is a **~500ms delay** before another process sees the updated file. If you need immediate consistency, use the in-memory graph directly rather than the file-based persistence mechanism.

### 6. `npm audit fix` can update MCP SDK

The MCP SDK (`@modelcontextprotocol/sdk`) is a direct dependency and its transitive deps (`hono`, `fast-uri`) can be updated by `npm audit fix`. This is intentional — the SDK is stable and patch updates are safe. Always rebuild and test after:

```bash
npm audit fix && npm run build && npm test
```

### 7. `--use-gl=swiftshader` for Electron/GPU crashes on Intel Iris Xe

If running the visualizer in Electron on Windows with Intel Iris Xe graphics (Dell Latitude 5430, driver v32.0.101.7080), Chromium's GPU pipeline crashes with STATUS_BREAKPOINT. The fix is to force software rendering:

```bash
# Pass these flags to any Electron app
--no-sandbox --use-gl=swiftshader
```

---

## Debug Workflow

### Step-by-step diagnostic process

```
1. REPRODUCE
   └─ Can you trigger it reliably? → minimal input, exact steps
   
2. VERBOSE LOGS
   └─ Set LOG_LEVEL=debug → look for [ERROR] or [WARN] lines
   
3. ISOLATE THE LAYER
   ├─ Build/Compile? → npx tsc --noEmit, check .js extensions
   ├─ Dependencies?   → npm audit, check node_modules/.package-lock.json
   ├─ Runtime?        → npx tsx src/index.ts (no build needed)
   ├─ Persistence?    → check thought-graph-state.json, stale .lock files
   └─ CI/Security?    → CodeQL alerts, Snyk report, npm audit
   
4. TEST ISOLATION
   └─ npx tsx --test tests/<specific-test>.test.ts
   
5. CHECK RESOURCES
   ├─ Commit history:   git log --oneline --grep="^fix"
   ├─ CHANGELOG:        less CHANGELOG.md
   ├─ Known issues:     https://github.com/Abderraouf-yt/got-mcp/issues
   └─ This playbook:    SKILL-DEBUG.md
```

### Type-specific workflows

#### Build error
```bash
npm run build          # tsc compile
npx tsc --noEmit       # type-check only (faster)
# Look for: Missing .js extension, type mismatch, missing export
```

#### Test failure
```bash
npm test                            # all tests
npx tsx --test tests/<name>.test.ts # single file
# Look for: TIMEOUT → graph.close() not called
# Look for: AssertionError → state mutation, wrong schema
```

#### Runtime crash
```bash
npx tsx src/index.ts                # run without build
LOG_LEVEL=debug npx tsx src/index.ts
# Look for: EADDRINUSE, lockfile timeout, undefined.map
```

#### CodeQL / Security alert
```bash
npm audit                           # dependency vulns
# Check: src/graph/ThoughtGraph.ts — sessionId sanitization
# Check: src/graph/Persistence.ts — filePath validation
```

---

## Open Bug Reports

There are **no open issues** tagged with `bug` on GitHub. All bug-fix commits are listed below with the relevant issue or fix number:

| Commit | Fix Description | Area |
|--------|----------------|------|
| `26351d8` | Path traversal sanitization (12 CodeQL alerts) | Security |
| `e72ddc3` | Resolved 7 npm audit vulnerabilities | Dependencies |
| `0329d9a` | Fixed ingest_evidence/context_get annotation bugs | Orchestration |
| `db13267` | Skip reflection nodes in conclusion synthesis | Scoring |
| `580021f` | Calibrated scoring engine (B-02) | Scoring |
| `3b1330d` | Count soft-pruned nodes in pruneRatio (B-02a) | Metrics |
| `8bfbded` | Compute composite score from confidence when score omitted | Scoring |
| `bda5fdf` | Correct atomic merge memory leak in reset_graph | Core |
| `238ab51` | Auto-discover available port when 3001 is busy | HTTP |
| `b735c36` | Use ./dist prefix for npx compatibility | Build |
| `9ef3598` | Preserve dirty flag on save failure | Persistence |

---

## Debug Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Error Coverage (0-25)** | 22 | 10 common errors documented with fixes. Missing: rare edge cases in zod validation |
| **Issue Mining Depth (0-25)** | 18 | 0 open bugs on GitHub. All fixes extracted from commit history. No closed bug issues to mine |
| **Gotcha Documentation (0-25)** | 22 | 7 gotchas covering event loop, stderr, imports, session ID, atomic writes, audit, GPU |
| **Debug Workflow Clarity (0-25)** | 23 | Clear step-by-step process + per-type workflows |

**Debug Score: 85/100**

### JSON Summary

```json
{
  "agent": "repo-debug",
  "debug_score": 85,
  "sub_scores": {
    "error_coverage": 22,
    "issue_mining_depth": 18,
    "gotcha_documentation": 22,
    "debug_workflow_clarity": 23
  },
  "total_open_bugs": 0,
  "common_errors": [
    "EADDRINUSE port 3001",
    "npm audit vulnerabilities (fast-uri, hono, qs, ip-address)",
    "CodeQL path traversal (sessionId → filePath)",
    "Disk Full simulated error (test artifact)",
    "Fatal error on startup (missing build / .js extension)",
    "Test timeout (graph.close() not called)",
    "proper-lockfile lock timeout",
    "undefined.map on empty graph export",
    "E2E test connection timeout",
    "Snyk check failure (dependency advisories)"
  ],
  "has_verbose_logging": true,
  "platform_issues": [
    "Windows: Electron GPU crash needs --use-gl=swiftshader",
    "All platforms: stderr-only logging (MCP Stdio constraint)"
  ],
  "key_finding": "No open bug issues on GitHub. Primary failure modes are dependency vulnerabilities (npm audit), path traversal (CodeQL), port conflicts, and test teardown (graph.close())."
}
```
