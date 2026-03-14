# Research: Commit to Memory Tool

## Decision: Semantic Bridging to Antigravity 2026 standards
The `commit_to_memory` tool will not only persist reasoning but will explicitly align with the **Antigravity 2026 Standards** found in the `MEMORY_STORE_PATH`. It will use the established `CanonicalProject` and `Directive` entity types where applicable.

## Rationale
- **Logical Integrity**: Backwards traversal ensures that only the nodes that directly contributed to the winning conclusion are persisted, filtering out lateral branches or rejected hypotheses.
- **Semantic Richness**: By mapping `metadata.lens` to `entityType` and respecting existing types like `ArchitecturePattern` or `Protocol` from the system memory, we ensure the GoT reasoning becomes a first-class citizen of the global knowledge graph.
- **ROI**: Persistent conclusions allow future sessions to skip redundant "System 1" reasoning and jump directly to "System 2" synthesis.

## Implementation Details

### Mapping GoT to Antigravity Memory Schema
Based on `C:/Users/toumi/Desktop/Development/Consistant-MCP_Memory_2026/memory.json`:
- **entityType**:
  - If `metadata.lens` matches an existing type (e.g., "Architecture", "Security"), use the 2026 equivalent: `ArchitecturePattern`, `Directive`, `Protocol`.
  - Otherwise, use the tool-provided lens string.
- **name**: Use `thought` truncated to 50 chars + a deterministic hash of the full text to ensure uniqueness while remaining human-readable.
- **observations**: The first observation MUST be the full thought text. Subsequent observations will include the logic score and confidence vectors.

### Semantic Identity Deduplication
The tool MUST perform a search before every creation:
1. Call `memory__search_nodes` with the first 100 characters of the thought.
2. If an entity exists with identical `name` (hash-based), use `add_observations` to append the new session's context rather than duplicating.

### DryRun Protocol (Hybrid)
Following the **Optimal Agentic Response** framework:
- Return a text summary of "New Entities" vs "Updated Entities".
- Return the full `@mcp:memory` compatible JSON payload in `structuredContent` for automated verification by the calling agent.

## State Transitions

1. **Extraction**: Winning path is identified via backwards traversal (leaf-to-root) to ensure logical causality.
2. **Topological Sort**: The extracted nodes are then re-sorted root-to-leaf for the final commitment payload to ensure entity existence before relation creation in the memory server.
3. **Analysis**: Each node's `metadata.lens` is checked.
4. **Deduplication**: Content hash is checked against `@mcp:memory` via `search_nodes`.
5. **Commitment**: 
   - New nodes -> `create_entities`
   - Existing nodes -> `add_observations`
   - All edges -> `create_relations`
