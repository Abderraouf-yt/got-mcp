# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.3.1] - 2026-03-13

### Added
- **Native outputSchema Strict Typing**: Extensively upgraded all 19 MCP tools with precise `outputSchema` Zod annotations. The GoT engine now natively broadcasts explicit JSON schemas dictating exact node returns, bridging perfect parsing compatibility for strict-reasoning agents (DeepSeek-R1, OpenAI o3).

## [4.3.0] - 2026-03-13

### Changed
- **Documentation Sync**: Verified that 100% of the 19 tools rigorously comply with robust 2026 MCP annotation standards (`readOnlyHint`, `destructiveHint`), significantly outperforming prior claims.
- **Source of Truth Update**: Synced `GEMINI.md` to reflect the 19 tools, the 56 passing tests, and the 4.3.0 version upgrade.
- **Skill Version Match**: Updated `got-mcp-skill/SKILL.md` to version 1.2.0 tracking all 19 tools cleanly.
- **Bug Fix**: Fixed `ThoughtGraph.test.ts` where an outdated `pruneBranch` API call was causing legacy test failure, updating it to the newer `pruneFromNode` API.

### Added
- **Comprehensive Regression Suite**: Implemented `ThoughtGraph.comprehensive.test.ts` encompassing 56 granular tests across 15 suites covering Governance, Aggregation, Pruning, Beam Search, Context Firewall, Swarm Orchestration, Snapshots, Memory Export, and Graph Metrics (100% passing).

## [4.2.0] - 2026-03-10

### Added
- **Swarm Orchestration**: Added `compile_node_context` SOTA firewall to isolate reasoning paths for multi-agent delegation without ghost nodes or hallucinations.
- **O(1) Task Discovery**: Added `query_nodes` tool to instantly discover claimed/queued agent tasks via Swarm sets.
- **Knowledge Graph (KGoT)**: Added `export_proven_memory` to mathematically traverse backwards from a winning node and extract `@mcp:memory` compliant entities and relations.
- **IPC Atomic Swarm Locking**: Replaced unstable `fs.writeFileSync` with asynchronous, deep-merging `proper-lockfile` yielding 0 drops under extreme 200+ concurrency.
- **Swarm Schemas**: Extended core schemas with `authorId`, `agentTarget`, `executionState`, and `dependencies`.

## [4.0.1] - 2026-03-09

### Security
- **Branch Protection**: Enforced strict `main` branch protections via GitHub API, requiring CodeQL analysis, build-and-test workflow passes, signed commits, and pull request reviews.

## [4.1.0] - 2026-03-10

### Added
- **Real-Time Visualization**: Implemented Server-Sent Events (SSE) native hook `onGraphUpdated` in the core engine.
- **Express Streaming**: Added `/api/graph/stream` endpoint for zero-latency unidirectional graph syncing.
- **React 19 Reactive UI**: Refactored `visualizer/src/App.tsx` from SWR polling to a native `EventSource` custom hook.

## [4.0.0] - 2026-03-03

### Added
- **Self-Reflection**: `reflect_and_refine` tool — auto-critique with 4-axis confidence vectors (factual, logical, relevance, novelty) and auto-branching when score < 0.7.
- **Context Store (CA-MCP)**: `context_set`, `context_get`, `context_list` tools — shared key-value store with source provenance tracking for cross-step knowledge sharing.
- **Reasoning Trace Export**: `export_reasoning_trace` tool — exports the winning path as a structured Long CoT trace compatible with DeepSeek-R1 and o3 RL formats.
- **New Edge Relation**: `reflection` type for self-critique edges.
- **New Resource**: `@abderraouf-yt/got-mcp://context` — live context store state.

### Removed
- **CORS dependency**: Removed `cors` and `@types/cors` npm packages. Replaced with a 3-line inline localhost middleware — zero external dependencies for cross-origin handling.

### Changed
- **Tool count**: 10 → **15 tools** total.
- **Version**: Bumped `SERVER_CONFIG.version` and `package.json` to `4.0.0`.

## [3.2.1] - 2026-03-01

### Fixed
- **Security**: Replaced insecure `Math.random()` with `crypto.randomUUID()` in the HTTP bridge (Fixes CodeQL finding).
- **Stability**: Capped `visualizer` ESLint to `^9.39.1` to maintain ecosystem compatibility with React plugins.

### Changed
- **Architecture**: Algorithmically refactored all 15 MCP tools to use the modern `server.registerTool()` signature, injecting strict `readOnlyHint` and `destructiveHint` annotations to comply with 2026 `mcp-builder` standards.
- **Dependencies**: Migrated root MCP server to **Zod 4.3.6** and updated `mcp.ts` type validation syntax.

### Added
- **Evaluations**: Created `evaluations/got-mcp-eval.xml` containing 10 rigorous, read-only complex graph-traversal questions to test LLM capabilities against the GoT engine.

## [3.2.0] - 2026-03-01

### Added
- **AI Agent Skills**: Added `github-best-practices` and `repo-readiness-auditor` to `.agents/skills/`.
- **Operational Workflows**: Added `_agents/workflows/github-publish.md` for standardized cloud deployment of the repository configuration.
- **GitHub Actions**: Configured `.github/workflows/ci.yml`, `codeql.yml`, and `stale.yml` for rigorous testing and repository maintenance.
- **Dependabot**: Added `.github/dependabot.yml` for automated dependency updates.
- **Community Standards**: Added `SECURITY.md`, `CODEOWNERS`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, and issue/PR templates.
- **AI Integration**: Added `.github/copilot-instructions.md` for localized LLM behavior.

### Changed
- Elevated all foundational configuration to align with **2026 strict Security-First** DevOps standards.

## [3.0.0] - 2026-02-28

### Added
- **Graph Primitives**: Introduced `aggregate_thoughts`, `prune_branch`, and `find_winning_path` tools.
- **Replay Capabilities**: Added `export_snapshot` and `restore_snapshot`.
- **Governance Layer**: Engine-level caps for branch depth, graph volume, cycle detection, and thought-length limits to prevent infinite divergence.

### Changed
- Transitioned architecture from linear/DAG-only to an active Graph of Thoughts with weighted confidence scores and pruning.

## [1.0.0] - 2026-02-01

### Added
- Initial release of the `got-mcp` server.
- Basic tools: `propose_thought`, `evaluate_thought`, `get_thought_graph`, `reset_graph`.
- React 19 + Vite visualizer module for local real-time DAG rendering.
