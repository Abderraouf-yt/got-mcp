# Data Model: Perspective Generation

## Entities

### Perspective
A single reasoning axis extracted from a user query.
- **Label**: string (max 100 chars)
- **Rationale**: string (internal context for the LLM)

### SeedSet
The collection of perspectives generated for a specific query.
- **query**: string (the original user intent)
- **perspectives**: Perspective[] (3-5 items)
- **confidence**: number (0.0 - 1.0)

## Relationships
- **Query** (Root Node) --[branches_into]--> **Perspective** (Child Node)

## State Transitions
1. **Initial**: User provides a vague string.
2. **Analysis**: Host Agent performs sampling to identify axes.
3. **Validation**: System checks confidence against `AmbiguityThreshold` (0.7).
4. **Seeding**: If valid, root and branch nodes are created in the active graph session.
