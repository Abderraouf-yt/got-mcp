# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
