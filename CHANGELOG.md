# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.1] - 2026-03-09

### Security
- **Branch Protection**: Enforced strict `main` branch protections via GitHub API, requiring CodeQL analysis, build-and-test workflow passes, signed commits, and pull request reviews.

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
