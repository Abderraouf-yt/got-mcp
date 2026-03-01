# Thought Graph Code Review & Consistency Standards

## Security Standards
- Never hardcode credentials in any file.
- Validate all user inputs dynamically through Zod (already used in codebase).
- Ensure safe Cross-Process syncing with atomic temp writes.

## Documentation Expectations
- All public MCP tools must include comprehensive `.describe()` annotations.
- Graph relations and structures should stay aligned with GoT literature semantics.

## Architecture Guidelines
- DAG state changes must funnel exclusively through `ThoughtGraph.ts`.
- Treat the Express bridge and MCP Stdio interfaces strictly as protocol-agnostic transport layers without core logic.
