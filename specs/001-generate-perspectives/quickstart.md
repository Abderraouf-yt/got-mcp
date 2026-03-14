# Quickstart: Testing Perspective Generation

## Scenario 1: Happy Path (Clear technical query)
**Call**:
```bash
gemini tool call generate_perspectives --query "Is my AWS setup SOC 2 compliant?" --count 3
```
**Expected Outcome**: 3 perspectives returned (e.g., "IAM & Access Control", "Data Encryption", "Logging & Audit") with `intentConfidence > 0.7`.

## Scenario 2: Ambiguous Path (Vague query)
**Call**:
```bash
gemini tool call generate_perspectives --query "help me"
```
**Expected Outcome**: `AmbiguityError` returned, or extremely low `intentConfidence`.

## Scenario 3: Auto-Seeding
**Call**:
```bash
gemini tool call generate_perspectives --query "Should I move to Japan?" --sessionId "test-session"
```
**Expected Outcome**:
1. 3-5 perspectives returned.
2. `seedingStatus: "seeded"`.
3. Check graph: `gemini tool call get_thought_graph --sessionId "test-session"`. Should show a root node and branch children for each perspective.
