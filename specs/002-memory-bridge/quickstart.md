# Quickstart: Memory Bridge

## Overview
Learn how to persist your reasoning conclusions to long-term memory.

## Usage

1. **Reason**: Perform a Graph of Thoughts reasoning session.
2. **Converge**: Identify the winning node or path.
3. **Commit**: Call the `commit_to_memory` tool.

```json
{
  "sessionId": "compliance_audit_001",
  "nodeId": "node_15"
}
```

## Verification
Query the `@mcp:memory` server to see the persisted entities:

```json
{
  "query": "MFA gap"
}
```
