# Quickstart: Evidence Ingestion

## Overview
Ingest AWS/Azure infrastructure exports into your reasoning session.

## Usage

### 1. Extract Evidence
Run an AWS CLI command and save the output:
```bash
aws s3api get-public-access-block --bucket my-audit-bucket > evidence.json
```

### 2. Call Ingest Tool
Pass the stringified JSON to the `ingest_evidence` tool:

```json
{
  "sessionId": "audit_session_001",
  "rawJson": "{\"PublicAccessBlockConfiguration\": {\"BlockPublicAcls\": true, ...}}"
}
```

## Verification
Call `get_thought_graph` to see the new `CloudEvidence` nodes:

```json
{
  "sessionId": "audit_session_001"
}
```

**Look for**: Nodes where `entityType === "CloudEvidence"`.
