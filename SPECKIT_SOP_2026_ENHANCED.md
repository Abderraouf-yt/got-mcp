# 🚀 Spec-Driven Development (SDD) — got-mcp Edition
> **Executable SOP for Gemini CLI on the got-mcp MCP server project**  
> Enhanced from SPECKIT_SOP_2026.md with Context7 docs + Manara DSE optimization  
> Gaps filled: TOML format · spec file structure · got-mcp constitution · backport protocol · failure recovery · GoT pause rule

**The Golden Rule:** Never write code until the logic is bulletproof. Never write a spec until the constitution is set.

---

## 🧭 Decision Matrix

| Scenario | Action | Why |
|----------|--------|-----|
| New project or drifting principles | `/speckit.constitution` | DNA before design |
| New feature / new tool | `/speckit.specify "..."` | Define WHAT before HOW |
| Ambiguous requirements | `/speckit.clarify` | Kill blind spots before planning |
| Multi-variable logic problem | **PAUSE → GoT** `run_controller_loop` | Reason before specifying |
| Tech stack decisions | `/speckit.plan "..."` | Architecture after spec |
| Ready to build | `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement` | Always analyze before coding |
| Bug from registry | Fix directly (no spec needed) | Already specified in GEMINI.md §7 |
| Implementation failed mid-task | Recovery protocol (see §Recovery) | Never restart from scratch |

---

## 🛤️ The 7-Phase Master Workflow

### Phase 1: Foundational Governance
**Command:** `/speckit.constitution`

Establish the DNA of the got-mcp project. Run this **once** at project start or when principles drift.

**got-mcp Constitution Principles (copy these):**
```
1. MCP-First: Every tool returns CallToolResult { content: [{ type, text }] }. Never throw.
2. Zod-Everything: All inputs validated with Zod .describe() annotations.
3. Session Isolation: Every tool supports optional sessionId. Default = 'default'.
4. isError Pattern: Failures return { isError: true, content: [...] }. Never exceptions.
5. structuredContent Parity: Tools with outputSchema must return matching structuredContent.
6. Test-First for Features: No feature code before tests exist and fail (Red-Green-Refactor).
7. Version Discipline: package.json is single source of truth. McpServer reads from it dynamically.
8. Spec-Before-Code: Every feature has a spec in specs/ before any implementation.
```

**Constitution file location:** `.specify/memory/constitution.md`

---

### Phase 2: Product Definition — "The What"
**Command:** `/speckit.specify "Feature description"`

Define user stories and functional requirements. **NO TECH STACK. NO CODE.**

**Gemini CLI invocation:**
```bash
gemini /speckit.specify "Add a health_check tool that returns server version, uptime in seconds, and total tool count in a single call"
```

**What it creates:**
```
specs/
└── 001-health-check/
    └── spec.md        ← auto-generated from your description
```

**spec.md mandatory sections** (from Context7 /github/spec-kit):
```markdown
# Feature Specification: [NAME]
**Feature Branch**: `001-health-check`
**Status**: Draft

## User Scenarios & Testing
### User Story 1 — [Title] (Priority: P1)
**Independent Test**: [How to verify standalone]
**Acceptance Scenarios**:
1. Given [state], When [action], Then [outcome]

## Requirements
### Functional Requirements
- **FR-001**: System MUST [capability]

## Success Criteria
- **SC-001**: [Measurable outcome, technology-agnostic]
```

> ⚠️ **Never put tech stack in spec.md** — frameworks, languages, APIs belong in plan.md only.

---

### Phase 3: Requirement Refinement — "The Secret Sauce"
**Commands:** `/speckit.clarify` → `/speckit.checklist`

Eliminate unknown unknowns. **Run this before `/speckit.plan` every time.**

```bash
gemini /speckit.clarify "Focus on: error handling for partial failures, sessionId isolation, input validation edge cases"
gemini /speckit.checklist "Security"
```

#### 🧠 THE GoT PAUSE RULE — When to stop SDD and reason first

**If your feature involves ANY of these, PAUSE at Phase 3 and run GoT:**
- Multi-variable logic (e.g., "how should scoring work across different node types?")
- Architecture decisions with 3+ viable options
- Risk or security implications
- Performance vs simplicity tradeoffs

**GoT Pause Protocol:**
```bash
# 1. Pause SDD — do NOT run /speckit.plan yet
# 2. Run GoT to reason through the problem
got-mcp: reset_graph({ sessionId: 'feature-reasoning' })
got-mcp: run_controller_loop({
  prompt: "What is the best architecture for [feature]?",
  thoughts: [
    "Option A: [approach] — pros/cons",
    "Option B: [approach] — pros/cons",
    "Option C: [approach] — pros/cons"
  ],
  convergenceThreshold: 0.9,
  sessionId: 'feature-reasoning'
})
got-mcp: find_winning_path({ sessionId: 'feature-reasoning' })

# 3. Take the winning conclusion → paste into /speckit.plan
# 4. Resume SDD from Phase 4
```

---

### Phase 4: Technical Strategy — "The How"
**Command:** `/speckit.plan "Tech stack description"`

Translate the product spec into technical architecture. Now you talk tech.

```bash
gemini /speckit.plan "TypeScript, Node.js v20, registerTool pattern from @modelcontextprotocol/sdk ^1.26, Zod 4.3.6 validation, CallToolResult shape, isError pattern for errors, outputSchema + structuredContent parity, dynamic version from package.json via createRequire"
```

**What it creates:**
```
specs/001-health-check/
├── plan.md          ← architecture + tech decisions
├── research.md      ← technology rationale
├── data-model.md    ← entities (if applicable)
└── contracts/       ← API/interface specs
```

**plan.md mandatory fields** (from Context7):
```markdown
**Language/Version**: TypeScript, Node.js v20+
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.26, Zod 4.3.6
**Storage**: In-memory (no DB for this feature)
**Testing**: Node.js native test runner (npx tsx --test tests/)
**Project Type**: MCP server tool
**Performance Goals**: < 5ms response, no async I/O
**Constraints**: Must not break existing 22 tools
```

> ⚡ **Rapid prototyping:** If you don't need tests yet, say: *"Remove all test tasks from the plan."*

---

### Phase 5: Task Breakdown & QA
**Commands:** `/speckit.tasks` → `/speckit.analyze`

#### `/speckit.tasks`
```bash
gemini /speckit.tasks
```

**Output format** (from Context7 /github/spec-kit):
```markdown
## Phase 1: Setup
- [ ] T001 Create project structure

## Phase 2: Foundational  
- [ ] T004 [P] Setup shared infrastructure

## Phase 3: User Story 1 — Health Check (P1) 🎯 MVP
- [ ] T010 [P] [US1] Write failing test in tests/health-check.test.ts
- [ ] T011 [US1] Implement health_check handler in src/server/mcp.ts
- [ ] T012 [US1] Add Zod outputSchema for { version, uptime, toolCount }
- [ ] T013 [US1] Return structuredContent matching outputSchema
```

**Key markers:**
- `[P]` = parallelizable (different files, no deps)
- `[US1]` = User Story 1 (maps to spec.md priorities)
- Tasks always include exact file paths

#### `/speckit.analyze` — The Final QA Gate
**Run this before any code. Non-negotiable.**

```bash
gemini /speckit.analyze
```

What it checks:
- Spec ↔ Plan consistency (no contradictions)
- Plan ↔ Tasks coverage (every requirement has a task)
- Constitution compliance (no violations)
- Ambiguity markers (`[NEEDS CLARIFICATION]`) resolved

**If analyze reports CRITICAL issues** → fix spec/plan before proceeding. Never code over a critical gap.

---

### Phase 6: Code Generation
**Command:** `/speckit.implement`

```bash
gemini /speckit.implement
```

The agent reads `tasks.md` and implements phase by phase. It:
1. Validates checklists (prompts if incomplete)
2. Creates ignore files (`.gitignore`, `.dockerignore`, etc.)
3. Executes tasks in dependency order
4. Marks completed tasks `[X]` in `tasks.md`
5. Runs `npm run build && npx tsx --test tests/` after each phase

---

### Phase 7: Feedback Loop — Backporting Learnings

**When you fix a bug, discover an edge case, or refactor during implementation**, always backport into the spec. This keeps `spec.md` as the living source of truth.

#### Exact Backport Protocol

```bash
# After any implementation learning, run:
gemini "Encode the learnings and experience assumptions from this conversation back into spec.md."
```

**Which fields to update:**

| Learning Type | Update Target | Example |
|---|---|---|
| Bug discovered | `spec.md` → Edge Cases section | "Add: what happens when graph has 0 nodes" |
| Performance constraint found | `spec.md` → Non-Functional Requirements | "SC-003: Must respond in < 5ms" |
| API behavior clarified | `plan.md` → Technical Context constraints | "sessionId must be alphanumeric" |
| Task dependencies changed | `tasks.md` → Dependencies section | Update ordering and `[P]` markers |
| Assumption proven wrong | `spec.md` → Assumptions section | Mark as resolved with actual behavior |

**The power of this:** Once `spec.md` is updated, you can rebuild the entire feature in a different framework without starting over:
```bash
gemini /speckit.plan "Rebuild using Deno + Oak instead of Node.js + Express"
```

---

## 🛡️ Failure Recovery Protocol

**When `/speckit.implement` fails mid-task:**

### Step 1 — Identify the failure point
```bash
# Check which tasks completed
cat specs/001-health-check/tasks.md
# Look for [X] markers — those are done. Find the last [X] before failure.
```

### Step 2 — Resume from checkpoint
```bash
# Do NOT restart /speckit.implement from scratch
gemini /speckit.implement "Resume from task T011. T001-T010 are complete."
```

### Step 3 — If the error is logic-related (not syntax)
Pause → GoT:
```bash
got-mcp: reset_graph({ sessionId: 'failure-analysis' })
got-mcp: propose_thought({ thought: "Error: [paste error]", sessionId: 'failure-analysis' })
got-mcp: propose_thought({ thought: "Hypothesis A: root cause is...", sessionId: 'failure-analysis' })
got-mcp: propose_thought({ thought: "Hypothesis B: root cause is...", sessionId: 'failure-analysis' })
got-mcp: run_controller_loop({ prompt: "Root cause of: [error]", sessionId: 'failure-analysis' })
# Then fix and resume
```

### Step 4 — Backport the fix
Update `spec.md` or `plan.md` with the discovered constraint so it doesn't happen again.

---

## 🧠 Advanced: GoT + Manara Integration

For complex systems like the got-mcp SOC 2 reasoning engine, elevate your workflow:

### 1. Intent Routing (Manara First)
When you have a raw idea, let Manara decide which system to use:
```bash
manara: manara_route("How should we handle multi-tenant session isolation for 50 concurrent clients?")
# → Routes to GoT for deep reasoning, or to DSE for prompt optimization
```

### 2. Deep Reasoning (GoT at Phase 3)
For any feature with multi-variable logic, pause SDD and reason:
```bash
got-mcp: run_controller_loop({
  prompt: "What is the optimal architecture for [feature]?",
  thoughts: [
    "Option A: [specific approach with trade-offs]",
    "Option B: [specific approach with trade-offs]",
    "Option C: [specific approach with trade-offs]"
  ],
  autoSeed: false,              # ← always false for quality reasoning
  convergenceThreshold: 0.9,
  autoPruneBelow: 0.5,
  beamWidth: 2,
  maxIterations: 5,
  sessionId: 'feature-name-reasoning'
})
```

> ⚠️ **B-02b workaround:** The loop conclusion is currently unreliable. Use `find_winning_path` + `export_reasoning_trace` instead of the loop's conclusion field.

### 3. Synthesis → Spec
Feed the GoT winning path directly into your `/speckit.plan`:
```bash
gemini /speckit.plan "[paste GoT winning path conclusion here] — using TypeScript/Zod/MCP SDK"
```

---

## 📋 Gemini CLI TOML Command Format

Spec-Kit commands in Gemini CLI live at `.gemini/commands/` as TOML files.

**Standard format** (from Context7 /github/spec-kit):
```toml
description = "Command description"

prompt = """
Command content with {SCRIPT} and {{args}} placeholders.
"""
```

**Custom got-mcp command example:**
```toml
# .gemini/commands/speckit.got-mcp-feature.toml
description = "Specify a new got-mcp tool following MCP-First constitution"

prompt = """
You are building a new tool for the got-mcp MCP server.

## User Input
{{args}}

## Constitution Rules
- Return CallToolResult: { content: [{ type: 'text', text: string }] }
- Use registerTool() with inputSchema: z.object({...}) and outputSchema
- Return isError: true on failures — never throw
- Support optional sessionId parameter on every tool

## Steps
1. Run .specify/scripts/bash/check-prerequisites.sh --json
2. Create spec in specs/ directory
3. Follow got-mcp constitution principles
4. Use TypeScript/Zod/MCP SDK patterns only
"""
```

**Invoke it:**
```bash
gemini /speckit.got-mcp-feature "Add batch_reset tool that resets multiple sessions at once"
```

---

## ✅ Pre-Flight Checklist (Run Before Every Session)

```bash
# 1. Verify baseline
git status
npx tsx --test tests/          # must be green before starting

# 2. Verify Spec-Kit is initialized
ls .specify/                   # should exist with templates/, memory/, scripts/
ls .gemini/commands/           # should have speckit.*.toml files

# 3. If not initialized:
specify init --here --ai gemini
```

---

## 📐 SDD Flow Diagram

```
Raw Idea
    │
    ▼
/speckit.constitution    ← Set got-mcp principles (once)
    │
    ▼
/speckit.specify "..."   ← What users need (no tech)
    │
    ├─── Complex logic? ──→ GoT: run_controller_loop
    │                              ↓
    │                       find_winning_path
    │                              ↓
    │                       feed conclusion into plan ───┐
    ▼                                                    │
/speckit.clarify         ← Kill ambiguities              │
    │                                                    │
    ▼                                                    │
/speckit.plan "..." ◄────────────────────────────────────┘
    │
    ▼
/speckit.tasks           ← Granular task checklist
    │
    ▼
/speckit.analyze         ← QA gate (CRITICAL)
    │
    ├─── Issues found? ──→ Fix spec/plan → re-run analyze
    │
    ▼
/speckit.implement       ← Execute phase by phase
    │
    ├─── Failure? ──→ Resume from last [X] checkpoint
    │
    ▼
Backport learnings       ← "Encode learnings back into spec.md"
    │
    ▼
npm publish (if release)
```

---

*Enhanced from SPECKIT_SOP_2026.md | 2026-03-16*  
*Sources: Context7 /github/spec-kit (681 snippets, Trust 8.2) · Manara DSE (100% confidence) · GoT session speckit-gap-001*
