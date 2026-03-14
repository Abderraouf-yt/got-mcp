# Research: Perspective Generation Heuristics

## Decision: Rule-Based Lens Selector + Taxonomy Expansion
Use a "Lenses" framework to categorize the input query and expand it using predefined taxonomies for each domain (Technical, Business, Safety, Ethical, Legal).

## Rationale
- **Speed**: Heuristics are <10ms, avoiding LLM latency for the initial "seed" phase.
- **Standalone**: Works without external API keys (crucial for local-first MCP).
- **Structure**: Ensures that the perspectives are balanced (e.g., always includes a "Cons/Risks" perspective).

## Alternatives Considered

### 1. External LLM Call (via Sub-Agent)
- **Evaluation**: High quality, but slow and requires configuration.
- **Rejection**: We want the tool to be "instant" and "offline-capable" by default. We can add this as an optional "Power Mode" later.

### 2. Random Keyword Extraction
- **Evaluation**: Very fast, but often produces low-entropy or irrelevant branches.
- **Rejection**: Fails the goal of "upskilling" vague prompts.

## Taxonomy Mapping (Lenses)
| Domain | Lenses |
|--------|--------|
| Technical | Scalability, Security, Performance, Maintainability |
| Business | ROI, Time-to-Market, Customer Value, Competition |
| Compliance | Security Controls, Privacy (GDPR), Data Integrity |
| Personal | Emotional Impact, Long-term Growth, Financial Stability |
