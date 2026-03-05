---
name: got-mcp-skill
description: "Expert guide for the Graph of Thoughts (GoT) MCP server — a non-linear, DAG-based reasoning engine for AI agents. Use this skill when users need structured reasoning, multi-path analysis, decision evaluation, brainstorming, debugging, research synthesis, hypothesis testing, pros/cons analysis, or any task requiring deeper thinking than linear chain-of-thought. Triggers on: 'reason', 'analyze', 'evaluate', 'compare', 'decide', 'brainstorm', 'investigate', 'synthesize', 'think through', 'weigh options', 'pros and cons', 'root cause', 'hypothesis', 'graph of thoughts', 'got-mcp', 'thought graph', 'deep thinking', 'structured reasoning', 'multi-perspective', 'reasoning trace'."
version: "1.0.0"
---

# Graph of Thoughts (GoT) MCP — Expert Skill

This skill provides comprehensive guidance for using the `got-mcp` server — a non-linear reasoning engine that lets AI agents **think in graphs, not chains**.

Instead of linear Chain-of-Thought (A → B → C), GoT enables **branching, merging, pruning, and converging** across multiple reasoning paths simultaneously — like how expert humans actually think.

## Quick Start (30 seconds)

**Simplest possible usage** — one tool call that does everything:

```js
run_controller_loop(
  prompt: "Should we use PostgreSQL or MongoDB for this project?",
  thoughts: [
    "PostgreSQL excels at relational data with ACID compliance",
    "MongoDB offers flexible schemas and horizontal scaling",
    "Consider the team's existing expertise and maintenance costs"
  ]
)
```

That's it. The controller loop will automatically evaluate, branch, reflect, prune, and converge to a winner.

**For manual control**, build step by step:

```js
1. propose_thought("Main question or problem statement")
2. propose_thought("First perspective", parentId: "node_1", relation: "branch")
3. propose_thought("Second perspective", parentId: "node_1", relation: "branch")
4. evaluate_thought(nodeId: "node_2", score: 0.8)
5. evaluate_thought(nodeId: "node_3", score: 0.6)
6. find_winning_path()
```

## Critical Rules (Read First!)

1. **Always `reset_graph` before new problems** — old reasoning pollutes new analysis
2. **Check `get_graph_metrics` regularly** — monitor node count, prune ratio, depth
3. **`run_controller_loop` is the power tool** — use it for any problem with 2+ perspectives
4. **Score range is 0.0–1.0** — not percentages, not 1–10
5. **Node cap is 200** — prune aggressively or aggregate to stay under limits
6. **Depth cap is 15** — aggregate deep chains instead of extending them
7. **Use `context_set`/`context_get`** — share facts between reasoning steps to avoid redundancy
8. **Export traces for accountability** — `export_reasoning_trace` produces RL-compatible audit trails

## When to Use GoT vs Sequential Thinking

| Scenario | Use GoT (`got-mcp`) | Use Sequential (`sequential-thinking`) |
| -------- | ------------------- | -------------------------------------- |
| Simple step-by-step task | ❌ | ✅ |
| Complex decision with trade-offs | ✅ | ❌ |
| Comparing 2+ options | ✅ | ❌ |
| Debugging with multiple hypotheses | ✅ | ❌ |
| Multi-stakeholder analysis | ✅ | ❌ |
| Linear problem decomposition | ❌ | ✅ |
| Research synthesis from many sources | ✅ | ❌ |
| Quick calculation or lookup | ❌ | ✅ |
| Brainstorming/ideation | ✅ | ❌ |
| Code review with many concerns | ✅ | ❌ |
| Architecture evaluation | ✅ | ❌ |
| Risk assessment | ✅ | ❌ |

**Rule of thumb**: If there are **multiple valid perspectives** or **trade-offs to weigh**, use GoT. If it's **one path forward**, use sequential thinking.

## Workflow Decision Tree

```text
User wants to...
│
├─► Make a decision between options
│   └─► run_controller_loop with each option as a thought
│
├─► Analyze something deeply
│   ├─► Quick (< 2 min) → run_controller_loop (maxIterations: 3)
│   └─► Thorough (5+ min) → Manual workflow:
│       reset_graph → propose_thought (root) → branch perspectives
│       → evaluate_thought each → reflect_and_refine top picks
│       → aggregate_thoughts winners → find_winning_path
│
├─► Debug a problem
│   └─► reset_graph → propose_thought("Bug description")
│       → branch 3-5 hypotheses → evaluate each
│       → prune_branch unlikely causes → find_winning_path
│
├─► Brainstorm ideas
│   └─► reset_graph → propose_thought("Creative challenge")
│       → branch many ideas → evaluate_thought each
│       → aggregate_thoughts best clusters → find_winning_path
│
├─► Compare technologies/approaches
│   └─► run_controller_loop with each technology as a thought
│
├─► Synthesize research from multiple sources
│   └─► reset_graph → propose_thought per source finding
│       → aggregate_thoughts related findings
│       → reflect_and_refine synthesis → find_winning_path
│
├─► Assess risks
│   └─► reset_graph → propose_thought("Risk scenario")
│       → branch risk categories → evaluate likelihood × impact
│       → prune_branch low risks → aggregate_thoughts by priority
│
├─► Review and save reasoning
│   ├─► See current state → get_thought_graph
│   ├─► Check health → get_graph_metrics
│   ├─► Save for later → export_snapshot
│   ├─► Resume saved session → restore_snapshot
│   └─► Get audit trail → export_reasoning_trace
│
└─► Store intermediate facts
    ├─► Save a fact → context_set(key, value, source)
    ├─► Recall a fact → context_get(key)
    └─► See all facts → context_list
```

## Tool Reference

> **[!NOTE]** Tool Annotations
> Most tools in got-mcp carry SDK annotations (`readOnlyHint: true` or `destructiveHint: true`). You don't pass these as arguments, but your host client uses them to know which tools mutate graph state vs which just read it.

### Core Tools

#### `propose_thought`

Create a new reasoning node in the graph.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `thought` | string | ✅ | The reasoning content (max 5000 chars) |
| `parentId` | string | ❌ | Parent node ID to build on |
| `relation` | enum | ❌ | `refinement` (default), `contradiction`, `support`, `branch` |

**Returns**: `{ nodeId, thought, relation, parentId }`

**When to use**: Starting a new line of reasoning, branching from an existing thought, or adding supporting/contradicting evidence.

```js
# Root thought (no parent)
propose_thought(thought: "We need to choose a database for the new project")

# Branch from root
propose_thought(thought: "SQL databases offer strong consistency", parentId: "node_1", relation: "branch")

# Contradict a thought
propose_thought(thought: "But NoSQL scales better horizontally", parentId: "node_2", relation: "contradiction")

# Support a thought
propose_thought(thought: "ACID compliance is critical for financial data", parentId: "node_2", relation: "support")
```

---

#### `evaluate_thought`

Score and assess a thought node. Omit `score` to trigger autonomous LLM audit.

> **[!WARNING]** Autonomous Audit Limitation
> Autonomous audit relies on MCP Sampling (`CreateMessage`) support from the host client. If your host (e.g., Claude Desktop, Cursor) does not support sampling, this will fail. Providing a `confidence` object without a `score` circumvents this constraint by automatically calculating a composite score locally.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `nodeId` | string | ✅ | Node to evaluate |
| `score` | number | ❌ | 0.0–1.0 (omit for auto-audit) |
| `status` | enum | ❌ | `active`, `validated`, `rejected`, `branching` |
| `critique` | string | ❌ | Reasoning for the evaluation (max 2000 chars) |
| `confidence` | object | ❌ | `{ factual, logical, relevance, novelty }` — each 0.0–1.0 |

**Confidence scoring** (v4.0): When `confidence` is provided, composite score is auto-computed:

- `logical`: 35% weight
- `factual`: 30% weight
- `relevance`: 25% weight
- `novelty`: 10% weight

```js
# Simple scoring
evaluate_thought(nodeId: "node_2", score: 0.85, status: "validated")

# Multi-dimensional confidence
evaluate_thought(
  nodeId: "node_3",
  confidence: { factual: 0.9, logical: 0.8, relevance: 0.95, novelty: 0.3 },
  critique: "Strong factual basis but doesn't add new insight"
)

# Trigger autonomous audit (omit score)
evaluate_thought(nodeId: "node_4")
```

---

#### `get_thought_graph`

Retrieve the complete graph state. No parameters.

**Returns**: `{ nodes: [...], edges: [...], meta: { nodeCount, edgeCount, lastModified } }`

**When to use**: Inspecting the full reasoning state, debugging graph structure, or displaying to the user.

---

#### `reset_graph`

Clear all nodes, edges, and counters. No parameters.

> ⚠️ **Destructive** — clears everything. Use `export_snapshot` first if you need to save state.

**When to use**: Before starting a new reasoning problem. Old thoughts contaminate new analysis.

---

### GoT Primitives

#### `aggregate_thoughts`

Merge 2+ thought nodes into a weighted synthesis.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `nodeIds` | string[] | ✅ | Array of node IDs to merge (min 2) |
| `synthesis` | string | ✅ | The merged conclusion |
| `weights` | number[] | ❌ | Per-node weights (defaults to each node's score) |

**Formula**: `Σ(score × weight) / Σ(weights)` — aggregation confidence = `1 - stddev(scores)`

**Returns**: `{ newNodeId, aggregatedFrom, weightedScore, confidence, formula }`

```js
aggregate_thoughts(
  nodeIds: ["node_2", "node_3", "node_5"],
  synthesis: "PostgreSQL is the best choice: strong consistency outweighs MongoDB's scaling advantages for our use case",
  weights: [0.9, 0.6, 0.8]
)
```

**When to use**: Combining multiple insights into a single conclusion. The weighted formula ensures higher-scored thoughts contribute more.

---

#### `prune_branch`

Recursively reject a node and ALL its descendants.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `nodeId` | string | ✅ | Root of branch to prune |
| `reason` | string | ❌ | Why this branch is being pruned |
| `mode` | enum | ❌ | `hard` (score=0, rejected) or `soft` (score decayed) |
| `decayFactor` | number | ❌ | Score multiplier for soft prune (default: 0.5) |
| `trigger` | enum | ❌ | `manual` or `auto` |

```js
# Hard prune — nuke the branch
prune_branch(nodeId: "node_4", reason: "Hypothesis disproven by new evidence", mode: "hard")

# Soft prune — reduce confidence but keep alive
prune_branch(nodeId: "node_6", reason: "Weak supporting evidence", mode: "soft", decayFactor: 0.3)
```

**When to use**: Eliminating dead-end reasoning paths. Hard prune for clearly wrong branches. Soft prune for "probably not, but maybe."

---

#### `find_winning_path`

Trace the best-scoring path(s) from root to leaf.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `beamWidth` | number | ❌ | Top paths to track: 1=greedy (default), >1=beam search |
| `scoreThreshold` | number | ❌ | Minimum node score to include (default: 0) |
| `maxPathLength` | number | ❌ | Maximum path depth (default: 50) |

**Returns**: `{ pathIds, totalScore, pathLength, path, allPaths }`

```js
# Get the single best path
find_winning_path()

# Get top 3 paths, ignoring low-confidence nodes
find_winning_path(beamWidth: 3, scoreThreshold: 0.4)
```

**When to use**: After evaluating and pruning, this tells you the "winner." Use `beamWidth > 1` to see runner-up alternatives.

---

### Self-Reflection

#### `reflect_and_refine`

Auto-critique a thought and optionally branch an improved version.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `nodeId` | string | ✅ | Node to reflect on |
| `critique` | string | ✅ | Your critique (max 5000 chars) |
| `confidence` | object | ✅ | `{ factual, logical, relevance, novelty }` — each 0.0–1.0 |
| `refinedThought` | string | ❌ | Improved version to auto-branch (max 5000 chars) |

**Behavior**: Creates a `[Reflection]` critique node. If `refinedThought` is provided AND composite score < 0.7, auto-branches a refined version.

```js
reflect_and_refine(
  nodeId: "node_3",
  critique: "This argument assumes unlimited budget, which is unrealistic",
  confidence: { factual: 0.5, logical: 0.7, relevance: 0.9, novelty: 0.4 },
  refinedThought: "Considering budget constraints, a phased migration to PostgreSQL would be more pragmatic"
)
```

**When to use**: Quality-checking your best reasoning. The DeepSeek-R1 self-verification pattern — think, critique, refine.

---

### Context Store (CA-MCP Pattern)

Share intermediate facts between reasoning steps without re-deriving them.

#### `context_set`

Store a key-value pair with source provenance.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `key` | string | ✅ | Context key (max 200 chars) |
| `value` | any | ✅ | JSON-serializable value |
| `source` | string | ✅ | Provenance (max 200 chars) |

```js
context_set(key: "team_size", value: 12, source: "user_input")
context_set(key: "budget_constraint", value: "$50k/year", source: "propose_thought:node_2")
```

#### `context_get`

Retrieve a value with its provenance.

```js
context_get(key: "team_size")
# Returns: { value: 12, source: "user_input", updatedAt: "..." }
```

#### `context_list`

List all stored context keys (no values — lightweight).

**When to use**: Before proposing new thoughts, check context for facts already established. Reduces redundant LLM calls.

---

### Observability

#### `get_graph_metrics`

Live health metrics for the reasoning graph.

**Returns**:

```json
{
  "metrics": {
    "nodeCount": 15,
    "edgeCount": 18,
    "maxDepth": 6,
    "avgScore": 0.62,
    "pruneRatio": 0.2,
    "activeCount": 8,
    "validatedCount": 4,
    "rejectedCount": 3,
    "rootCount": 1
  },
  "limits": {
    "maxNodes": 200,
    "maxBranchFactor": 5,
    "maxDepth": 15
  }
}
```

**When to use**: After every major round of evaluation/pruning. Watch `pruneRatio` (healthy: 10-30%) and `nodeCount` approaching limits.

---

### Replay & Export

#### `export_snapshot`

Full graph serialization for save/restore.

**Returns**: `{ nodes, edges, nodeCounter, timestamp, version, stateVersion }`

**When to use**: Before `reset_graph` if you might need to resume. Also useful for sharing reasoning state.

#### `restore_snapshot`

Replace entire graph state from a snapshot.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `snapshot` | object | ✅ | Previously exported snapshot `{ nodes, edges, nodeCounter }` |

> ⚠️ **Destructive** — replaces ALL current state.

#### `export_reasoning_trace`

Export the winning path as a structured reasoning trace (Long CoT format).

**Returns**: `{ question, steps[], conclusion, compositeScore, totalNodes, totalEdges }`

Each step includes: `{ step, nodeId, thought, score, confidence, status, reflections, alternatives }`

**When to use**: Creating an audit trail, generating reports, or feeding traces into RL training pipelines.

---

### Controller Loop (Power Tool)

#### `run_controller_loop`

**The all-in-one reasoning engine.** Seeds a graph with your prompt + initial thoughts, then autonomously cycles through: Evaluate → Branch → Reflect → Prune → Converge.

| Parameter | Type | Required | Default | Description |
| --------- | ---- | -------- | ------- | ----------- |
| `prompt` | string | ✅ | — | The problem statement (max 5000 chars) |
| `thoughts` | string[] | ✅ | — | Initial perspectives to explore (1–10) |
| `maxIterations` | number | ❌ | 5 | Reasoning cycles before stopping |
| `convergenceThreshold` | number | ❌ | 0.85 | Stop when best path avg score exceeds this |
| `autoPruneBelow` | number | ❌ | 0.3 | Auto soft-prune branches scoring below this |
| `beamWidth` | number | ❌ | 2 | Top paths to track during convergence |

**Returns**: `{ converged, iterations, winningPath, trace, metrics, iterationLog }`

```js
# Quick decision (fast)
run_controller_loop(
  prompt: "Which frontend framework should we use?",
  thoughts: ["React has the largest ecosystem", "Vue is easier to learn", "Svelte has best performance"],
  maxIterations: 3,
  convergenceThreshold: 0.8
)

# Deep analysis (thorough)
run_controller_loop(
  prompt: "What's the optimal microservices architecture for our e-commerce platform?",
  thoughts: [
    "Event-driven architecture with Kafka for inter-service communication",
    "REST-based synchronous communication with API gateway",
    "gRPC for internal services, REST for external API",
    "Hybrid: events for async workflows, gRPC for real-time queries"
  ],
  maxIterations: 10,
  convergenceThreshold: 0.9,
  autoPruneBelow: 0.4,
  beamWidth: 3
)
```

**When to use**: This is the **default choice** for any reasoning task with multiple perspectives. Only use manual tools when you need fine-grained control over individual nodes.

---

## Workflow Patterns

### Pattern 1: Quick Decision (1 tool call)

Best for: technology choices, prioritization, simple comparisons.

```js
run_controller_loop(
  prompt: "Your decision question here",
  thoughts: ["Option A rationale", "Option B rationale", "Option C rationale"],
  maxIterations: 3
)
```

### Pattern 2: Deep Research Synthesis

Best for: combining findings from multiple sources into a coherent conclusion.

```js
1. reset_graph()
2. propose_thought("Research question: What are the best practices for API rate limiting?")
3. propose_thought("Token bucket algorithm provides smooth rate limiting", parentId: "node_1", relation: "branch")
4. propose_thought("Sliding window offers better burst handling", parentId: "node_1", relation: "branch")
5. propose_thought("Fixed window is simplest to implement", parentId: "node_1", relation: "branch")
6. context_set(key: "requirement", value: "Must handle 10k req/s", source: "user_input")
7. evaluate_thought(nodeId: "node_2", score: 0.85, critique: "Industry standard, well-tested")
8. evaluate_thought(nodeId: "node_3", score: 0.75, critique: "Good for bursty traffic")
9. evaluate_thought(nodeId: "node_4", score: 0.4, critique: "Too simple for production scale")
10. prune_branch(nodeId: "node_4", reason: "Doesn't meet 10k req/s requirement")
11. aggregate_thoughts(
      nodeIds: ["node_2", "node_3"],
      synthesis: "Use token bucket as primary limiter with sliding window for burst detection"
    )
12. find_winning_path()
```

### Pattern 3: Debugging Root Cause Analysis

Best for: investigating bugs, failures, or unexpected behavior.

```js
1. reset_graph()
2. propose_thought("Bug: API returns 500 errors intermittently under load")
3. propose_thought("Hypothesis: Database connection pool exhaustion", parentId: "node_1", relation: "branch")
4. propose_thought("Hypothesis: Memory leak in request handler", parentId: "node_1", relation: "branch")
5. propose_thought("Hypothesis: Race condition in cache invalidation", parentId: "node_1", relation: "branch")
6. propose_thought("Hypothesis: Upstream service timeout cascade", parentId: "node_1", relation: "branch")
7. # After investigation, evaluate each hypothesis
8. evaluate_thought(nodeId: "node_2", score: 0.9, critique: "Connection pool logs show saturation")
9. evaluate_thought(nodeId: "node_3", score: 0.2, critique: "Memory usage is stable")
10. evaluate_thought(nodeId: "node_4", score: 0.3, critique: "No evidence of stale cache")
11. evaluate_thought(nodeId: "node_5", score: 0.6, critique: "Some timeout spikes observed")
12. prune_branch(nodeId: "node_3", reason: "Disproven by memory metrics")
13. prune_branch(nodeId: "node_4", reason: "No cache inconsistencies found")
14. reflect_and_refine(
      nodeId: "node_2",
      critique: "Strong evidence but need to verify pool size configuration",
      confidence: { factual: 0.9, logical: 0.85, relevance: 0.95, novelty: 0.5 }
    )
15. find_winning_path()
16. export_reasoning_trace()  # Save the investigation trail
```

### Pattern 4: Pros/Cons Analysis

Best for: evaluating a single option from multiple angles.

```js
1. reset_graph()
2. propose_thought("Should we migrate to Kubernetes?")
3. propose_thought("PRO: Auto-scaling reduces infrastructure costs", parentId: "node_1", relation: "support")
4. propose_thought("PRO: Container orchestration simplifies deployments", parentId: "node_1", relation: "support")
5. propose_thought("CON: Steep learning curve for the team", parentId: "node_1", relation: "contradiction")
6. propose_thought("CON: Operational complexity increases", parentId: "node_1", relation: "contradiction")
7. evaluate_thought(nodeId: "node_2", score: 0.8)
8. evaluate_thought(nodeId: "node_3", score: 0.7)
9. evaluate_thought(nodeId: "node_4", score: 0.6)
10. evaluate_thought(nodeId: "node_5", score: 0.75)
11. aggregate_thoughts(
      nodeIds: ["node_2", "node_3", "node_4", "node_5"],
      synthesis: "Kubernetes migration recommended with 6-month training plan to mitigate learning curve risk"
    )
```

### Pattern 5: Multi-Stakeholder Analysis

Best for: considering different viewpoints (engineering, product, business).

```js
run_controller_loop(
  prompt: "Should we rewrite the legacy billing system?",
  thoughts: [
    "Engineering: Technical debt costs 30% of sprint velocity",
    "Product: Rewrite delays Q3 feature roadmap by 2 months",
    "Business: Current system limits pricing model flexibility",
    "Finance: Rewrite estimated at $200k, ROI positive in 18 months",
    "Customer Success: Billing errors cause 15% of support tickets"
  ],
  maxIterations: 5,
  convergenceThreshold: 0.85
)
```

### Pattern 6: Hypothesis Testing

Best for: scientific or data-driven analysis.

```js
1. reset_graph()
2. context_set(key: "observation", value: "Conversion rate dropped 20% after redesign", source: "analytics")
3. propose_thought("Investigate: Why did conversion rate drop 20% after redesign?")
4. propose_thought("H1: New checkout flow has more steps", parentId: "node_1", relation: "branch")
5. propose_thought("H2: Mobile responsiveness regression", parentId: "node_1", relation: "branch")
6. propose_thought("H3: A/B test was not properly randomized", parentId: "node_1", relation: "branch")
7. # Test each hypothesis against data
8. evaluate_thought(nodeId: "node_2", confidence: { factual: 0.7, logical: 0.9, relevance: 0.95, novelty: 0.3 })
9. evaluate_thought(nodeId: "node_3", confidence: { factual: 0.4, logical: 0.6, relevance: 0.8, novelty: 0.2 })
10. evaluate_thought(nodeId: "node_4", confidence: { factual: 0.8, logical: 0.85, relevance: 0.9, novelty: 0.6 })
11. prune_branch(nodeId: "node_3", reason: "Mobile metrics show no regression", mode: "hard")
12. reflect_and_refine(
      nodeId: "node_4",
      critique: "Test randomization confirmed biased — some cohorts overrepresented",
      confidence: { factual: 0.9, logical: 0.9, relevance: 0.95, novelty: 0.7 },
      refinedThought: "A/B test had selection bias: power users overrepresented in control group"
    )
13. find_winning_path()
```

---

## GoT Theory Primer (Plain English)

### What is Graph of Thoughts?

Traditional AI reasoning is **linear**: think step 1, then step 2, then step 3. This is called Chain-of-Thought (CoT).

**Graph of Thoughts** (Besta et al., 2023) lets AI reason like a **network**:

- **Branch**: Explore multiple ideas in parallel
- **Evaluate**: Score each idea on quality
- **Aggregate**: Merge the best parts of different ideas
- **Prune**: Remove dead-end thinking
- **Converge**: Find the best overall reasoning path

Think of it like a brainstorming whiteboard where you can draw connections between ideas, cross out bad ones, and circle the winners.

### Why does it matter?

| Reasoning Method | Paths | Quality | Cost |
| ---------------- | ----- | ------- | ---- |
| Chain-of-Thought (CoT) | 1 linear path | Medium | Low |
| Tree-of-Thought (ToT) | Multiple paths (no merging) | Higher | High |
| **Graph-of-Thoughts (GoT)** | Multiple paths + merging | **Highest** | Medium |

GoT produces better results than ToT at **lower cost** because it can merge insights rather than evaluating every path independently.

---

## Governance & Limits

| Limit | Default | Description |
| ----- | ------- | ----------- |
| `maxNodes` | 200 | Maximum nodes in the graph |
| `maxBranchFactor` | 5 | Maximum children per node |
| `maxDepth` | 15 | Maximum chain depth |
| `maxThoughtLength` | 5000 | Characters per thought |
| `maxAggregationInputs` | 10 | Max nodes in one aggregation |
| `maxPruneCascade` | 50 | Max nodes in one prune operation |

**When you hit limits**: Prune dead branches, aggregate related thoughts, or reset and restart with a more focused scope.

---

## Error Recovery

| Error | Cause | Solution |
| ----- | ----- | -------- |
| `Node cap reached (200)` | Too many thoughts | `prune_branch` dead branches or `reset_graph` |
| `Node 'X' not found` | Invalid node ID | `get_thought_graph` to see valid IDs |
| `Branch cap reached` | >5 children on one node | `aggregate_thoughts` some children first |
| `Depth cap exceeded` | Chain too deep (>15) | `aggregate_thoughts` to flatten |
| `Would create a cycle` | DAG violation | Choose a different parent node |
| `Aggregation requires 2+` | Not enough nodes | Ensure at least 2 valid node IDs |
| `Prune cascade exceeds limit` | Pruning 50+ nodes | Prune smaller sub-branches first |
| `Autonomous audit failed` | Host doesn't support sampling | Provide score manually instead of omitting |

---

## State Persistence

The thought graph is automatically persisted to disk (`thought-graph-state.json`) in the server's working directory on every mutation. It's safe to restart the server; state will automatically reload exactly where you left off.

---

## Visualizer & HTTP Bridge

Got-MCP runs a dual Stdio + HTTP bridge. The Stdio connection serves the MCP protocol to your agent host, while the HTTP server (default port `3001`, auto-assigns if busy) serves the visualizer dashboard.

### Dashboard UI

The React dashboard visualizes the graph in real-time:

```bash
cd visualizer && npm install && npm run dev
# Opens at http://localhost:5173
```

The visualizer shows:

- Hierarchical DAG layout of all thoughts
- Color-coded node statuses (active/validated/rejected)
- Live updates via SWR polling (2-second interval)
- Node scores and relationship types

### HTTP API Endpoints

The HTTP bridge (`localhost:3001` by default) provides these endpoints:

- `GET /api/graph` - Full graph state (JSON)
- `GET /health` - Server metrics and node/edge counts
- `GET /sse` - Server-Sent Events endpoint for real-time visualizer updates

---

## MCP Resources

Got-MCP provides two resources that give you a live view of the server's internal state. **When to use resources vs tools:** Use resources when you only need to *read* the current state (e.g., for context or answering user questions about the graph) without executing a tool call. Use tools when you need to *mutate* state or perform specific actions.

| URI | Description | Use Case |
| --- | ----------- | -------- |
| `@abderraouf-yt/got-mcp://current` | Real-time graph state (JSON) | Read the entire graph DAG, including all nodes, edges, and scores, exactly as `get_thought_graph` would return it. |
| `@abderraouf-yt/got-mcp://context` | Shared context store (JSON) | Audit the shared CA-MCP key-value store to see what facts have been established across reasoning steps. |

---

## Relation Types Quick Reference

| Relation | Use When |
| -------- | -------- |
| `refinement` | Improving an existing thought (default) |
| `branch` | Exploring a new direction from a parent |
| `support` | Adding evidence for a thought |
| `contradiction` | Challenging or opposing a thought |
| `aggregation` | Auto-created by `aggregate_thoughts` |
| `reflection` | Auto-created by `reflect_and_refine` |

## Node Statuses Quick Reference

| Status | Meaning |
| ------ | ------- |
| `active` | Being explored — default for new nodes |
| `validated` | Confirmed as strong reasoning |
| `rejected` | Eliminated — pruned or disproven |
| `branching` | Being expanded into sub-branches |
