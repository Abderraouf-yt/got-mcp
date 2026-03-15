# Research: Memory Bridge Integration

## Decision: Direct Tool Delegation
The `commit_to_memory` tool will act as an orchestrator. It will call `export_proven_memory` to get the validated subgraph, then use the `@mcp:memory` server's tools to persist the data.

## Rationale
- **Decoupling**: Thought Graph remains focused on reasoning, while `@mcp:memory` handles long-term Knowledge Graph persistence.
- **Standards Compliance**: By using `export_proven_memory`, we ensure the data shape matches the standard MCP Memory schema.
- **Auditability**: The bridge allows for a clear "Reasoning -> Commitment" lifecycle that is essential for SOC 2 evidence.

## Payload Mapping
| Thought Graph Entity | @mcp:memory Entity |
|----------------------|--------------------|
| Node Thought (text)  | Entity Observation |
| Node ID              | Entity Name (slug) |
| Relation Type        | Relation Type      |

## Tool Dependencies
- `create_entities`: Batch creates the reasoning nodes as permanent entities.
- `create_relations`: Batch creates the refinement/branch/support links between them.

## Alternatives Considered
- **Direct JSON Persistence**: Rejected because it doesn't allow cross-session semantic search provided by the memory server.
- **Embedded Database**: Rejected as overengineering; MCP standard servers should compose with each other.
