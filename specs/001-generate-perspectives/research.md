# Research: Perspective Generation (Intent-to-Graph)

## Decision: Host Agent Delegation via Sampling
Use the MCP `sampling/createMessage` capability to delegate the generation of high-entropy perspectives to the Host LLM. This ensures that the perspectives are semantically rich and tailored to the specific user intent.

## Rationale
- **Intelligence**: LLMs are far superior to heuristic-based keyword extraction for identifying non-obvious analytical angles.
- **Dynamic Seeding**: The tool can automatically adapt to any domain (technical, business, ethics) without manual taxonomy updates.
- **Contextual Awareness**: The Host Agent can use the full conversation context to refine the perspectives.
- **Consistency**: Leveraging the existing sampling pattern used in `evaluate_thought` maintains architectural consistency.

## Alternatives Considered

### 1. Heuristic-Based Keyword Extraction
- **Evaluation**: Fast and zero-cost, but low entropy. Often misses the "Graph" in Graph of Thoughts by providing overlapping or shallow branches.
- **Rejection**: Fails the primary goal of "Smart Seeding" for complex reasoning.

### 2. Built-in Static Taxonomies
- **Evaluation**: Reliable but rigid. Requires constant maintenance for new domains (e.g., specialized scientific fields).
- **Rejection**: Too brittle for a general-purpose reasoning engine.

## Implementation Details

### Sampling Prompt
The tool will dispatch the following prompt to the Host Agent:
```text
Analyze the following user query and identify {count} distinct, high-entropy analytical perspectives to seed a Graph of Thoughts reasoning session.
Each perspective must be:
1. Mutually exclusive (minimal semantic overlap).
2. Divergent (covering different domains like technical, ethical, or economic).
3. Concise (under 100 characters).

User Query: "{query}"

Respond with a JSON object:
{
  "perspectives": ["string", "string", ...],
  "intentConfidence": number (0.0 to 1.0)
}
```

### Ambiguity Threshold
If `intentConfidence` is less than 0.7, the tool will throw an `AmbiguityError`, providing the Host Agent's critique back to the user to prompt for clarification.
