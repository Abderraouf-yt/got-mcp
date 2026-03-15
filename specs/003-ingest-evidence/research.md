# Research: Evidence Ingestion Heuristics

## Decision: Schema-Agnostic Recursive Traversal
The `ingest_evidence` tool will use a recursive JSON traversal algorithm that scans for "High-Signal Security Keys" regardless of their nesting depth.

## Rationale
- **Adaptability**: Cloud provider JSON schemas (AWS CLI outputs vs SDK responses) vary significantly. A heuristic scan is more resilient than rigid schema mapping.
- **Token Economy**: By extracting only relevant security keys (e.g., `Effect`, `PublicAccessBlock`), we prevent the Thought Graph from being flooded with irrelevant metadata.
- **Audit Lineage**: Every extracted evidence node will store its original JSON path as an observation, fulfilling **Constitution Principle IX (Audit Traceability)**.

## High-Signal Attributes (MVP)

### AWS IAM
- `Effect`: Deny/Allow
- `Principal`: The actor being granted/denied access
- `Action`: The operation (e.g., `s3:GetObject`)
- `Resource`: The ARN target
- `Condition`: Contextual constraints

### AWS S3 (Public Access Block)
- `BlockPublicAcls`
- `IgnorePublicAcls`
- `BlockPublicPolicy`
- `RestrictPublicBuckets`

## Provider Detection Heuristics
- **AWS**: Presence of `arn:aws`, `iam`, or `AccountPublicAccessBlock`.
- **Azure**: Presence of `/subscriptions/`, `resourceGroup`, or `Microsoft.Network`.

## Alternatives Considered
- **Direct Schema Mapping (Zod)**: Rejected because there are thousands of cloud API responses; maintaining schemas for all of them is unsustainable.
- **LLM-Based Parsing**: Rejected for the initial ingestion phase to save costs and reduce latency. Heuristics handle the "ground truth" extraction, while the LLM handles the "reasoning" in the next phase.
