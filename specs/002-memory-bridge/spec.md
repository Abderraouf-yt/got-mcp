# Feature Spec: Phase 1 - Memory Bridge (Persistent Auditor)

## Overview
Implement the bridge between Thought Graph's validated reasoning paths and the permanent Knowledge Graph stored in the `@mcp:memory` server. This enables "Cross-Session Reasoning" where the AI can remember past compliance gaps and track remediations.

## Goals
- Automate the transfer of validated GoT conclusions to Long-Term Memory.
- Enable subsequent reasoning sessions to reference previously discovered entities and relations.
- Support the "Persistent Auditor" value proposition for the SOC 2 Gap Analysis Service.

## Requirements
- **FR-001**: Implement `commit_to_memory` tool.
- **FR-002**: Tool must call `export_proven_memory` internally to get standard KG payload.
- **FR-003**: Tool must call `@mcp:memory` server's `create_entities` and `create_relations` tools.
- **FR-004**: Handle session-specific memory scoping (optional but recommended).
- **FR-005**: Deduplicate entities before committing to prevent memory bloat.

## Use Cases
- Auditor finds "MFA not enabled" in Session A. 
- Auditor calls `commit_to_memory`.
- Next month, Auditor starts Session B for same client.
- Auditor queries `@mcp:memory` and sees the MFA gap from last time.
