# Got-MCP Tool Cheatsheet

Quick-reference card for all 16 tools. Sorted by usage frequency.

## ⚡ Power Tool (Start Here)

| Tool | Description | Key Params |
| ---- | ----------- | ---------- |
| `run_controller_loop` | **All-in-one reasoning engine** — auto evaluate/branch/reflect/prune/converge | `prompt` (str), `thoughts` (str[]), `maxIterations` (5), `convergenceThreshold` (0.85), `autoPruneBelow` (0.3), `beamWidth` (2) |

## 🧠 Core (Build the Graph)

| Tool | Description | Key Params |
| ---- | ----------- | ---------- |
| `propose_thought` | Add a reasoning node | `thought` (str), `parentId`? (str), `relation`? (refinement\|contradiction\|support\|branch) |
| `evaluate_thought` | Score a node (0.0–1.0) | `nodeId` (str), `score`? (num), `status`? (enum), `critique`? (str), `confidence`? ({factual,logical,relevance,novelty}) |
| `reset_graph` | Clear everything | — |
| `get_thought_graph` | Read full state | — |

## 🔬 GoT Primitives (Refine the Graph)

| Tool | Description | Key Params |
| ---- | ----------- | ---------- |
| `aggregate_thoughts` | Merge 2+ nodes → synthesis | `nodeIds` (str[]), `synthesis` (str), `weights`? (num[]) |
| `prune_branch` | Kill a branch (hard/soft) | `nodeId` (str), `reason`? (str), `mode`? (hard\|soft), `decayFactor`? (0.5) |
| `find_winning_path` | Best path root→leaf | `beamWidth`? (1), `scoreThreshold`? (0), `maxPathLength`? (50) |
| `reflect_and_refine` | Self-critique + optional branch | `nodeId` (str), `critique` (str), `confidence` ({f,l,r,n}), `refinedThought`? (str) |

## 📦 Context Store (Share Facts)

| Tool | Description | Key Params |
| ---- | ----------- | ---------- |
| `context_set` | Store key-value | `key` (str), `value` (any), `source` (str) |
| `context_get` | Read key + provenance | `key` (str) |
| `context_list` | List all keys | — |

## 📊 Observability

| Tool | Description | Key Params |
| ---- | ----------- | ---------- |
| `get_graph_metrics` | Node count, depth, prune ratio | — |

## 💾 Replay & Export

| Tool | Description | Key Params |
| ---- | ----------- | ---------- |
| `export_snapshot` | Save full graph state | — |
| `restore_snapshot` | Load saved state | `snapshot` ({nodes, edges, nodeCounter}) |
| `export_reasoning_trace` | Winning path as Long CoT trace | — |

---

## Scoring Guide

| Score | Meaning | Action |
| ----- | ------- | ------ |
| 0.0–0.3 | Weak / disproven | Prune |
| 0.3–0.5 | Needs more evidence | Investigate further |
| 0.5–0.7 | Moderate support | Reflect and refine |
| 0.7–0.85 | Strong | Validate |
| 0.85–1.0 | Excellent | Convergence candidate |

## Relation Cheatsheet

| Want to... | Use relation |
| ---------- | ------------ |
| Improve a thought | `refinement` |
| Explore a new angle | `branch` |
| Add evidence for | `support` |
| Challenge or oppose | `contradiction` |

## Confidence Weights

When using multi-dimensional `confidence`:

- **Logical** (35%): Is the reasoning chain valid?
- **Factual** (30%): Grounded in verifiable facts?
- **Relevance** (25%): Addresses the problem directly?
- **Novelty** (10%): Adds new information?

## Default Limits

| Limit | Value | When Hit |
| ----- | ----- | -------- |
| Max nodes | 200 | Prune or aggregate |
| Max children/node | 5 | Aggregate children first |
| Max depth | 15 | Aggregate deep chains |
| Max thought length | 5000 chars | Shorten content |
| Max aggregation inputs | 10 | Split into smaller merges |
| Max prune cascade | 50 | Prune sub-branches first |
