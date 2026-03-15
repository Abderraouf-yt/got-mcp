# Feature Specification: Evidence Ingestion Tool

**Feature Branch**: `003-ingest-evidence`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: User description: "Implement `ingest_evidence` to parse and feed AWS/Azure JSON exports into the reasoning graph."

## Overview
The `ingest_evidence` tool provides the "Front Door" for data-driven compliance auditing. It allows auditors to ingest raw infrastructure configuration data (AWS/Azure JSON exports) directly into the Thought Graph. This eliminates the need for manual copy-pasting and ensures that the reasoning engine operates on verifiable, "ground truth" evidence for SOC 2 Gap Analysis.

## User Scenarios & Testing

### User Story 1 - Ingesting AWS Security Evidence (Priority: P1)

As a compliance auditor, I want to provide a raw AWS IAM or S3 JSON export to the system, so that the reasoning engine can automatically identify configuration gaps without manual data entry.

**Why this priority**: Core value for the SOC 2 service. Automating evidence ingestion is the primary differentiator for a "Continuous Compliance" engine.

**Independent Test**: Can be tested by providing a standard AWS `get-account-public-access-block` JSON string and verifying that a corresponding "CloudEvidence" node is created in the graph.

**Acceptance Scenarios**:

1. **Given** a valid AWS JSON export string, **When** `ingest_evidence` is called, **Then** the system creates ThoughtNodes for each identified resource.
2. **Given** a specific `sessionId`, **When** evidence is ingested, **Then** all created nodes are correctly associated with that session.

---

### User Story 2 - Multi-Cloud Ingestion (Azure Support) (Priority: P2)

As a multi-cloud security engineer, I want the system to recognize and parse Azure Resource Manager (ARM) JSON exports, so that I can maintain a unified compliance posture across providers.

**Why this priority**: Enterprise clients typically use multiple cloud providers. SOC 2 coverage is incomplete without Azure/GCP support.

**Independent Test**: Provide an Azure "Network Security Group" JSON export and verify that the system identifies the provider as "Azure" and extracts relevant security rules.

**Acceptance Scenarios**:

1. **Given** an Azure JSON export, **When** ingested, **Then** the nodes are tagged with the "Azure" provider lens.

---

### User Story 3 - Automatic Evidence Linking (Priority: P3)

As a specialized reasoning agent, I want the ingested CloudEvidence nodes to be automatically linked to relevant compliance "lenses" (e.g., linking a "Bucket Policy" to the "Security" lens), so that the reasoning loop can start immediately.

**Why this priority**: Minimizes the "Time to Insight" for the user.

**Independent Test**: Verify that an ingested S3 policy node has a "supports" relationship to an existing "Security" perspective node.

**Acceptance Scenarios**:

1. **Given** an existing "Security" perspective in the graph, **When** evidence about encryption is ingested, **Then** the system creates a "supports" or "refines" edge between them.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a tool named `ingest_evidence`.
- **FR-002**: System MUST accept a `rawJson` string and an optional `provider` identifier (AWS/Azure).
- **FR-003**: System MUST automatically detect the cloud provider if not explicitly provided.
- **FR-004**: System MUST extract high-signal attributes (e.g., `Effect: Allow`, `PublicAccessBlock: True`) and include them in node observations.
- **FR-005**: System MUST truncate extremely large JSON payloads to focus on security-relevant keys to preserve context tokens.
- **FR-006**: System MUST map ingested evidence to the "Audit Traceability" principle (Constitution IX).
- **FR-007**: System MUST validate input strings and fail gracefully with a descriptive error message if `rawJson` is not a valid JSON structure.

### Key Entities

- **CloudEvidence**: A ThoughtNode with a specialized `entityType` ("CloudEvidence") containing raw configuration facts.
- **Evidence Edge**: A relationship linking CloudEvidence nodes to analytical Perspective Nodes.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 95% of standard cloud exports (AWS IAM `get-policy`, S3 `get-public-access-block`, Azure `NetworkSecurityGroups/list`) are successfully parsed into individual `CloudEvidence` nodes.
- **SC-002**: Ingestion of evidence (up to 50KB JSON) completes in under 2 seconds.
- **SC-003**: 100% of created evidence nodes contain a "GoT-Session" observation for traceability.
- **SC-004**: Users report a 70% reduction in manual data entry time for audit preparations.
