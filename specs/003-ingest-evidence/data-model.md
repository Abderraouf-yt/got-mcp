# Data Model: Evidence Ingestion

## Entities

### Evidence Node
Represents a raw configuration fact extracted from cloud infrastructure.
- **entityType**: "CloudEvidence"
- **observations**: 
  - `Raw Value`: The extracted JSON value.
  - `Source Path`: The JSON path from the original export.
  - `Provider`: AWS or Azure.
  - `Attribute`: The high-signal key (e.g., "Effect").

### Evidence Edge
A relationship that links Evidence Nodes to compliance perspectives.
- **relationType**: "supports" | "refines" | "contradicts"
- **from**: Evidence Node ID
- **to**: Perspective Node ID (e.g., "Security Perspective")

## State Transitions
1. **Raw String**: Input to `ingest_evidence`.
2. **Parsed JSON**: Intermediate memory representation.
3. **Extracted Facts**: Key-value pairs identified by heuristics.
4. **Graph Nodes**: Facts committed to the Thought Graph via `addNode`.
