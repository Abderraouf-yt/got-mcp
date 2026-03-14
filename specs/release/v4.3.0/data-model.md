# Data Model: Perspective Entity

## Perspective
Represents a generated analytical lens for a given user query.

| Field | Type | Description |
|-------|------|-------------|
| lens | string | The category name (e.g., "Security", "Financial") |
| thought | string | The actual expanded reasoning seed |
| weight | number | Suggested initial score (default 0.5) |

## Relationships
- A `Query` generates multiple `Perspectives`.
- A `Perspective` becomes an initial `ThoughtNode` in the graph.
