# Quickstart: Commit to Memory

## Scenario 1: Dry Run Preview
Verify the export structure before permanent commitment.
**Call**:
```bash
gemini tool call commit_to_memory --dryRun true
```
**Expected Outcome**: A `dryRunData` object containing a human-readable summary and the full JSON payload destined for `@mcp:memory`.

## Scenario 2: Semantic Commitment
Commit a winning path with deduplication active.
**Call**:
```bash
gemini tool call commit_to_memory --deduplicate true
```
**Expected Outcome**: 
1. Nodes with existing content in KG are updated with new observations.
2. New nodes are created as entities.
3. Relations are linked between entities.

## Scenario 3: Verify Persistence
**Step 1**: Run GoT reasoning and `commit_to_memory`.
**Step 2**: Query memory directly:
```bash
gemini tool call memory__search_nodes --query "Your reasoning intent"
```
**Expected Outcome**: The committed entities appear in the memory server results with the correct `entityType`.
