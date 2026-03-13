# Thought-Graph MCP — AI Capabilities Guide

This document is designed to help AI agents understand exactly what the **Thought-Graph MCP server** can and cannot do. Use this guide to optimize how you leverage its Graph of Thoughts (GoT) capabilities.

## 🧠 Core Concept
Thought-Graph is a **state management engine for non-linear reasoning**. It does not "think" on its own; rather, it stores, organizes, and calculates the relationships, scores, and paths of the thoughts **you** generate. It allows you to break out of linear "Chain of Thought" reasoning and instead branch, backtrack, merge, and converge on the best solution.

---

## ✅ What Thought-Graph CAN Do

### 1. Build a Directed Acyclic Graph (DAG) of Reasoning
- **Propose Thoughts:** You can add discrete steps of reasoning (nodes) using `propose_thought`.
- **Relate Thoughts:** You can link thoughts together based on their logical relationship (`refinement`, `support`, `contradiction`, `branch`, `aggregation`, `reflection`).
- **Dependencies:** You can define explicit dependencies beyond normal parent/child edges.

### 2. Evaluate and Score Paths
- **Confidence Scoring:** You can explicitly score thoughts (0.0 to 1.0) using `evaluate_thought`.
- **Self-Reflection:** You can use `reflect_and_refine` to provide a multi-dimensional confidence assessment (factual, logical, relevance, novelty) and auto-branch a corrected version.
- **Node Statuses:** You can label nodes as `active`, `validated`, `rejected`, or `branching`.

### 3. Prune and Merge
- **Pruning:** You can cut off dead ends using `prune_branch`. This can be a "hard" prune (sets score to 0 and rejects) or a "soft" prune (decays the score by a specific factor). It cascades through all descendants.
- **Aggregation:** You can merge multiple parallel branches into a single synthesized conclusion using `aggregate_thoughts`, which computes a weighted synthesis score.

### 4. Traverse and Converge 
- **Find Winning Paths:** Using `find_winning_path`, you can trigger a greedy DFS or beam search to extract the mathematically best path(s) from root to leaf, gating by score thresholds.
- **Context Firewalling:** You can use `compile_node_context` to get the *exact* reasoning trace that led to a specific node, automatically stripping out all lateral branches, rejected nodes, and "noise". This saves tokens and keeps your context window focused.

### 5. Swarm & Orchestration
- **Task Handoffs:** You can assign nodes to specific agents (`agentTarget`) and track their lifecycle (`executionState`: queued, processing, done).
- **Task Discovery:** You can use `query_nodes` to find tasks explicitly queued for your specific agent persona.
- **State variables:** You can read and write to a shared context store (`context_set`, `context_get`, `context_list`) to share domain constraints or intermediate results across the graph.
- **Atomic Concurrency:** The engine uses atomic IPC locks. Multiple agents can mutate the graph simultaneously without data corruption.

### 6. Export and Recovery
- **Snapshotting:** You can export the entire graph state (`export_snapshot`) and restore it later (`restore_snapshot`).
- **Reasoning Traces:** You can export the winning path in a Long CoT format (`export_reasoning_trace`).

---

## ❌ What Thought-Graph CANNOT Do

### 1. No Execution or Side Effects
- **It cannot run code.** It manages the logic graph, but it cannot execute bash commands, scripts, or interact with external APIs.
- **It cannot read or modify files** on the user's system (aside from its own `thought-graph-state.json`). You must use your standard file tools for that.
- **It cannot browse the web** or look up external facts.

### 2. No Semantic Understanding
- **It is blind to meaning.** Thought-Graph uses math (graph traversal, weighted averaging, tree pruning) to find the best path based entirely on the **scores and links you provide**. If you give a bad idea a score of `1.0`, the graph will mathematically treat it as the winning path.
- **You are the brain.** The MCP is just the memory structure. You must actively evaluate and critique the nodes.

### 3. Engine Limitations (Governance)
- **Acyclicity:** It strictly forbids cycles. You cannot create an edge that loops back to an ancestor.
- **Node Caps:** By default, it imposes a max node limit per session (e.g., 200 nodes), a depth limit (e.g., 15 levels), and branching limits to prevent runaway loops.
- **Thought Length:** Individual thoughts are horizontally bounded (default 5,000 chars). It is meant for atomic reasoning steps, not storing entire codebases in a single node. Use the shared context for broader variables.

---

## 🚀 Best Practices for AI Agents
1. **Branch freely, evaluate ruthlessly:** When faced with a complex decision, use `propose_thought` (relation: `branch`) to explore 2-4 options. Immediately use `evaluate_thought` to kill the bad ones.
2. **Always relate to a parent:** Unless starting a brand new topic, always provide a `parentId` to maintain the topological structure.
3. **Use the Firewall:** When your context gets too long, call `compile_node_context(nodeId)` to get the clean, linear history of the current path without the distraction of abandoned branches.
4. **Coordinate Swarms:** If you are a specific persona (e.g., "Critic"), periodically call `query_nodes({ agentTarget: "Critic", executionState: "queued" })` to claim work.
