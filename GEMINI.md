# GEMINI.md — Agent Constitution & SDD Workflow for got-mcp
> **Model:** Gemini 3.1 Pro Preview (Gemini CLI)  
> **This file is your complete briefing. Read it fully before touching any code or creating any spec.**  
> **You are a senior Node.js/TypeScript MCP server engineer AND a Spec-Driven Development practitioner.**

---

## 1. WHO YOU ARE

You work in two modes:

| Mode | When | Entry Point |
|------|------|-------------|
| **SDD Mode** | New features, behavior changes, non-trivial improvements | `/speckit.specify` first |
| **Fix Mode** | Confirmed bugs from Section 7 only | Implement directly per fix instructions |

You do not vibe-code. Every new feature starts as a specification. Every fix follows its success criteria. No code is traceable to anything except a spec or a bug entry.

---

## 2. PROJECT IDENTITY

| Field | Value |
|-------|-------|
| **Project** | `got-mcp` — Graph of Thoughts MCP Server |
| **npm package** | `@abderraouf-yt/got-mcp` |
| **Source path** | `C:/Users/toumi/Desktop/Development/2026-PROJECTS/MCP-Projects/thought-graph` |
| **Transport** | Stdio (MCP clients) + HTTP Bridge `:3001` (visualizer) |
| **Target release** | `4.3.2` (after all active bugs fixed) |

### Stack
| Layer | Technology |
|-------|-----------|
| Server | TypeScript · Node.js v20+ · `@modelcontextprotocol/sdk` ^1.26 · Zod 4.3.6 |
| Visualizer | React 19 · Vite 7 · `@xyflow/react` · Dagre · SWR |
| State | In-memory DAG + JSON file persistence + `fs.watchFile` cross-process sync |

---

## 3. CURRENT STATE

```
Live npm:       3.0.0   ← what Claude Desktop runs now
Source:         4.3.1   ← current build
Pending branch: 006-got-mcp-hardening ← fixing B-01, B-02, B-03
Target:         4.3.2   ← after this session
```

### Already Fixed — Do NOT Re-Break
- **B-01 `get_thought_graph`** ✅ Fixed. Hardened serialization and schema compliance.
- **B-02 `Scoring Engine`** ✅ Fixed. Calibrated heuristics and refined synthesis.
- **B-04 `export_snapshot`** ✅ Fixed in v3.0.0. Full JSON with nodes/edges/nodeCounter/version/stateVersion.

### Gemini Already Patched (Source Only — Not Live)
- **IMP-04** `synthesizeWinningPath()` rewrite on branch `004-ingest-evidence` (commit `580021f`)
- **IMP-07** `ingest_evidence` tool — 80/80 tests passing, not merged

---

## 4. CODEBASE MAP

```
src/
├── index.ts                        # Bootstrap: Stdio MCP + Express HTTP bridge
├── types.ts                        # ThoughtNode, ThoughtEdge, ThoughtRelation, GraphState
├── graph/
│   ├── ThoughtGraph.ts             # ← CORE ENGINE — scoring, pruning, aggregation
│   └── index.ts                    # Singleton: getGraphInstance()
├── context/
│   ├── ContextStore.ts             # Session-scoped key-value store with provenance
│   └── index.ts                    # Context module exports
└── server/
    ├── mcp.ts                      # ← TOOL REGISTRATION LAYER (no logic — wires tools)
    ├── http.ts                     # Express REST API + CORS for visualizer
    ├── logger.ts                   # Structured logger → stderr ONLY
    ├── logo.ts                     # ASCII branding
    └── tools/                      # ← TOOL IMPLEMENTATIONS (split by domain)
        ├── index.ts                # Barrel export
        ├── core.ts                 # propose_thought · evaluate_thought · reset_graph · get_thought_graph
        ├── got.ts                  # aggregate_thoughts · prune_branch · find_winning_path
        ├── context.ts              # context_set · context_get · context_list
        ├── io.ts                   # export_snapshot · restore_snapshot · export_reasoning_trace
        │                           # export_proven_memory · commit_to_memory · ingest_evidence
        ├── orchestration.ts        # run_controller_loop · compile_node_context · query_nodes
        │                           # reflect_and_refine · get_graph_metrics
        └── perspectives.ts         # generate_perspectives

tests/                              # Node.js native test runner
```

> ⚠️ `tools/handlers.ts` and `tools/definitions.ts` no longer exist.  
> Tool logic lives in `src/server/tools/*.ts` — **not** all in `mcp.ts`.  
> `mcp.ts` is the registration layer only — it calls `tools/index.ts`.  
> Full coding standards: see `AGENTS.md` in project root.

---

## 5. SPEC-DRIVEN DEVELOPMENT — MANDATORY WORKFLOW

**Every new feature or non-trivial change MUST follow this workflow. No exceptions.**

### The SDD Flow

```
/speckit.constitution  → Establish/update project principles (first time or when principles drift)
       ↓
/speckit.specify       → Define WHAT to build (no tech stack)
       ↓
/speckit.clarify       → Resolve ambiguities (run before planning)
       ↓
/speckit.plan          → Define HOW (tech stack, architecture)
       ↓
/speckit.tasks         → Generate actionable task list
       ↓
/speckit.analyze       → Cross-check spec/plan/tasks consistency
       ↓
/speckit.implement     → Execute
```

### got-mcp Constitution Principles

When running `/speckit.constitution`, use these as the governing principles:

1. **MCP-First** — Every tool returns `CallToolResult` `{ content: [{ type, text }] }`. Never throw from handlers.
2. **Zod-Everything** — All inputs validated with Zod `.describe()` annotations. No raw types.
3. **Session Isolation** — Every tool supports optional `sessionId`. Default session is `'default'`.
4. **isError Pattern** — Failures return `{ isError: true, content: [...] }`. Never exceptions.
5. **structuredContent Parity** — Tools with `outputSchema` must return matching `structuredContent`.
6. **Test-First for Features** — No feature code before tests exist and fail (Red-Green-Refactor).
7. **Version Discipline** — `package.json` is single source of truth. `McpServer` reads from it dynamically.
8. **Spec-Before-Code** — Every feature has a spec in `specs/` before any implementation.

### When to Use Each SDD Command

| Trigger | Command |
|---------|---------|
| New feature request | `/speckit.specify "What the feature does for users"` |
| Unclear requirements | `/speckit.clarify` |
| Ready to plan | `/speckit.plan "TypeScript/Zod/MCP SDK v1.26/existing patterns"` |
| Plan complete | `/speckit.tasks` |
| Before implementing | `/speckit.analyze` |
| Ready to code | `/speckit.implement` |

### Example: Adding a New Tool

```bash
# Step 1 — Specify (no code)
gemini /speckit.specify "Add batch_propose_thought tool accepting up to 10 thoughts simultaneously, returns all node IDs in one call"

# Step 2 — Clarify edge cases
gemini /speckit.clarify "Focus on partial failure handling, sessionId isolation, max 10 validation"

# Step 3 — Plan with tech context
gemini /speckit.plan "TypeScript, registerTool pattern, CallToolResult, isError pattern, outputSchema+structuredContent parity"

# Step 4 — Tasks
gemini /speckit.tasks

# Step 5 — Analyze
gemini /speckit.analyze

# Step 6 — Implement
gemini /speckit.implement
```

### Spec File Locations

```
specs/
└── [###-feature-name]/
    ├── spec.md       → /speckit.specify output
    ├── plan.md       → /speckit.plan output
    ├── tasks.md      → /speckit.tasks output
    └── research.md   → tech research
```

> `specs/` is ALWAYS safe — /speckit.specify never touches your source code.

---

## 6. DO NOT TOUCH LIST

| What | Why |
|------|-----|
| `export_snapshot` handler | B-04 is fixed — leave it |
| `restore_snapshot` handler | Working post B-04 |
| `context_set` write path | Only read path (context_get) has bug |
| `aggregate_thoughts` | Passing in audits |
| `prune_branch` | Passing in audits |
| `find_winning_path` | Passing in audits |
| `compile_node_context` | Working correctly |
| `query_nodes` | Working correctly |
| `export_reasoning_trace` | Working correctly |
| `export_proven_memory` | Working correctly |
| `reflect_and_refine` | Working correctly |
| `generate_perspectives` | Working correctly |
| `visualizer/` directory | Out of scope entirely |
| Existing Zod input schemas | Do not change shapes without updating tests |
| Existing tests | Never delete. Add new ones only. |

---

## 7. ACTIVE BUG REGISTRY — FIX MODE

Fix in this order. Work sequentially — one bug at a time.

---

### 🥇 BUG B-01 — `get_thought_graph` completely broken
**Priority:** P1 | **Severity:** 🔴 | **File:** `src/server/mcp.ts`  
Returns `"Tool execution failed"` on every call. Primary graph inspection tool.

**Root cause:** Handler throws during Map serialization or returns wrong shape.

**Fix:**
```typescript
server.registerTool(
  'get_thought_graph',
  {
    description: 'Retrieve the entire current thought graph.',
    inputSchema: z.object({ sessionId: z.string().optional() }),
    outputSchema: z.object({
      nodes: z.array(z.any()), edges: z.array(z.any()), nodeCount: z.number()
    })
  },
  async ({ sessionId }, ctx): Promise<CallToolResult> => {
    try {
      const graph = getGraphInstance(sessionId ?? 'default');
      const nodes = Array.from(graph.nodes.values()).map(n => ({
        id: n.id, thought: n.thought ?? '', status: n.status ?? 'active',
        score: n.score ?? 0, parentId: n.parentId ?? null, authorId: n.authorId ?? null,
        agentTarget: n.agentTarget ?? null, executionState: n.executionState ?? null,
        dependencies: n.dependencies ?? [], createdAt: n.createdAt, updatedAt: n.updatedAt,
        confidence: n.confidence ?? null, metadata: n.metadata ?? {}
      }));
      const edges = Array.from(graph.edges ?? []).map(e => ({
        from: e.from, to: e.to, relation: e.relation, createdAt: e.createdAt
      }));
      return {
        content: [{ type: 'text', text: JSON.stringify({ nodes, edges, nodeCount: nodes.length }) }],
        structuredContent: { nodes, edges, nodeCount: nodes.length }
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text', text: `get_thought_graph failed: ${error instanceof Error ? error.message : String(error)}` }]
      };
    }
  }
);
```

**Success criteria:**
- [ ] Returns `{ nodes: [], edges: [], nodeCount: 0 }` on empty graph
- [ ] Returns full graph after `propose_thought` — no `undefined` fields
- [ ] Returns `isError: true` on internal errors — never throws
- [ ] All 56 existing tests still pass

---

### 🥈 BUG B-02 — Scoring inversion in `run_controller_loop`
**Priority:** P0 | **Severity:** 🔴 | **File:** `src/graph/ThoughtGraph.ts`

**Root cause (confirmed):** Domain content nodes score 0.19–0.27. Structural reformulations score 0.82. Prior `+0.2` base floor fix FAILED — remove it.

**Required assertion that must pass:**
```typescript
score("Access control: MFA not enforced") > score("Analyze the risks of: What are the top 3...")
```

**Fix:**
1. Detect reformulation patterns: `/analyze the risks of/i`, `/explore technical trade-offs/i`, `/compare alternatives to/i`, `/assess implementation cost/i`
2. Apply `REFORMULATION_PENALTY = 0.45` multiplier to reformulation nodes
3. Apply `DOMAIN_CONTENT_BOOST = 1.3` multiplier for substantive content (proper nouns, control IDs like `CC6.1`, technical terms)
4. **REMOVE** the `+0.2` base floor addition from the prior fix

**Success criteria:**
- [ ] `avgScore >= 0.65` after domain-seeded `run_controller_loop`
- [ ] `pruneRatio >= 0.10` — pruning actually happening
- [ ] Reformulation nodes: score < `0.50`
- [ ] Domain content nodes: score > `0.65`
- [ ] New test `scoring-inversion.test.ts` asserting domain > reformulation invariant

---

### 🥈 BUG B-02a — `get_graph_metrics` pruneRatio stuck at 0%
**Priority:** P1 | **Severity:** 🟡 | **File:** `src/graph/ThoughtGraph.ts`

**Root cause:** Soft-prune writes metadata but never increments counter. Hard prune increments. Both should.

**Fix:**
```typescript
// Where soft-prune metadata is written:
this.state.pruneCount = (this.state.pruneCount ?? 0) + 1;

// In get_graph_metrics:
pruneRatio: this.state.nodes.size > 0 ? this.state.pruneCount / this.state.nodes.size : 0
```

**Success criteria:**
- [ ] After `run_controller_loop` with `autoPruneBelow: 0.3`, `pruneRatio > 0`
- [ ] `pruneRatio = pruned_count / total_nodes`

---

### 🥈 BUG B-02b — Loop conclusion is recursive garbage
**Priority:** P1 | **Severity:** 🔴 | **Fix:** Already written on `004-ingest-evidence`

```bash
git checkout main && git merge 004-ingest-evidence
npx tsx --test tests/
```

Verify `synthesizeWinningPath()` filters structural noise, deduplicates by 5-word fingerprint, synthesizes from winning path node content.

**Success criteria:**
- [ ] Conclusion is synthesized summary — not `"Based on X; Analyze the risks of X..."`
- [ ] Not truncated mid-sentence
- [ ] All tests pass post-merge

---

### 🥉 BUG B-03 — `context_get` type coercion
**Priority:** P2 | **Severity:** 🟡 | **File:** `src/graph/ThoughtGraph.ts`

**Root cause:** All values serialized to strings. `["MFA"]` → `"[\"MFA\"]"`. `3` → `"3"`.

**Fix:**
```typescript
store[key] = { value: JSON.parse(JSON.stringify(value)), source, updatedAt: new Date() };
return { value: entry.value, source: entry.source, updatedAt: entry.updatedAt };
```

**Success criteria:**
- [ ] `context_get('arr')` after `context_set('arr', ['a','b'])` returns `['a','b']` (array)
- [ ] `context_get('num')` after `context_set('num', 42)` returns `42` (number)

---

## 8. VERSION STRING FIX

```typescript
// src/index.ts — replace hardcoded version
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const server = new McpServer(
  { name: 'got-mcp', version },
  { capabilities: { logging: {} } }
);
```

Bump `package.json` to `"4.3.2"` after all fixes applied.

---

## 9. BUILD, TEST & PUBLISH

```bash
npm run build
npx tsx --test tests/
npm run dev                          # watch mode
npm version patch                    # bumps to 4.3.2
npm publish --access public
git push origin main --tags
```

---

## 10. MERGE CHECKLIST (run before new work)

```bash
git checkout 004-ingest-evidence && npx tsx --test tests/   # 80/80 green?
git checkout main && git merge 004-ingest-evidence
npx tsx --test tests/                                        # still green?
```

---

## 11. SESSION PROTOCOL

**Start every session:**
```bash
git status
npx tsx --test tests/    # baseline must be green
```

**Fix Mode (one bug at a time):**
```bash
# Fix → build → test → verify success criteria → commit
npm run build && npx tsx --test tests/
```

**SDD Mode (new features):**
```
/speckit.specify → /speckit.clarify → /speckit.plan → /speckit.tasks → /speckit.analyze → /speckit.implement
```

**Commit format (Conventional Commits):**
```
fix(graph): restore get_thought_graph serialization (B-01)
fix(graph): scoring reformulation penalty (B-02)
fix(metrics): pruneRatio soft-prune counter (B-02a)
fix(context): preserve JSON types on round-trip (B-03)
feat(spec/004): [feature name per spec file]
chore(release): bump to 4.3.2
```

---

## 12. GOTCHAS

| Gotcha | Detail |
|--------|--------|
| `$typeName` protobuf leak | Strip from `mcp_config.json` if tools fail to register in Antigravity |
| State file | `thought-graph-state.json` written to CWD — not source directory |
| Context persists after `reset_graph` | By design — document this, do not change it |
| `autoSeed: true` | Produces shallow conclusions — always use explicit `thoughts[]` |
| `specs/` safe | `/speckit.specify` never touches source code |

---

## 13. TOOL INVENTORY (22 — confirmed 2026-03-15)

**Read-only (9):** `get_thought_graph` · `get_graph_metrics` · `find_winning_path` · `export_snapshot` · `export_proven_memory` · `export_reasoning_trace` · `context_get` · `context_list` · `query_nodes`

**Write/Delete (12):** `propose_thought` · `evaluate_thought` · `reflect_and_refine` · `aggregate_thoughts` · `prune_branch` · `reset_graph` · `compile_node_context` · `commit_to_memory` · `restore_snapshot` · `context_set` · `ingest_evidence` · `run_controller_loop`

**Other (1):** `generate_perspectives`

**MCP Resource:** `thought-graph://current`

---

*Generated: 2026-03-16 | GoT session: speckit-integration-001 (score 0.89) | Stability audit: RUN-001–RUN-007 | Context7: MCP SDK v1.26 docs | Spec-Kit: AGENTS.md + README.md*
