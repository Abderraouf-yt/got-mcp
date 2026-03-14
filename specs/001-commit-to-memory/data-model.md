# Data Model: Commit to Memory

## Entities

### MemoryEntity (KG Node)
Maps to a `ThoughtNode` in GoT.
- **name**: string (thought truncated to 50 chars + hash)
- **entityType**: string (Maps to Antigravity types: `ArchitecturePattern`, `Directive`, `Protocol`, or tool-provided lens)
- **observations**: string[] (Facts derived from the node)
  - Full thought text (MUST be first)
  - Logic score
  - Confidence vector
  - Origin session ID

### MemoryRelation (KG Edge)
Maps to a `ThoughtEdge` in GoT.
- **from**: string (Source entity name)
- **to**: string (Target entity name)
- **relationType**: string (Maps to `ThoughtRelation`)

## State Transitions

1. **Extraction**: Winning path is identified and nodes are sorted root-to-leaf.
2. **Analysis**: Each node's `metadata.lens` is checked.
3. **Deduplication**: Content hash is checked against `@mcp:memory` via `search_nodes`.
4. **Commitment**: 
   - New nodes -> `create_entities`
   - Existing nodes -> `add_observations`
   - All edges -> `create_relations`
