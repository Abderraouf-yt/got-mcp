# Technical Implementation Plan: Spec-Kit + GoT

## 🏗 Architecture

- **Language**: TypeScript (NodeNext).
- **Communication**: Model Context Protocol (Stdio Transport).
- **State Management**: In-memory Map for nodes; Array for edges.
- **Protocol Features**:
  - **Resources**: Implement `ResourcesRequestSchema` for graph visibility.
  - **Notifications**: Implement `notifications/resources/updated`.
  - **Sampling**: Use `CreateMessageRequestSchema` for the `evaluate_thought` tool.

## 🛠 Strategic Phases

### Phase 1: Core Refactoring

- Optimize `ThoughtGraph` class for atomic updates.
- Refactor `propose_thought` to return more detailed metadata (including parents/children).

### Phase 2: Resource & Notifications

- Add `listResources` and `readResource` handlers.
- Emit `notifications/resources/updated` whenever the graph changes.

### Phase 3: Sampling Integration

- Implement the "Self-Audit" loop. When `evaluate_thought` is called without a score, the server triggers a Sampling request to the host to generate one.

### Phase 4: Persistence & Cloud (Multi-MCP)

- **Supabase Integration**: Persist graph snapshots to a Postgres backend using MCP `supabase-mcp-server`.
- **Visualizer Dashboard**: Build a React Flow-based frontend (validated via Context7) for 2D/3D visualization of reasoning.
- **Automated Deployment**: Deploy the dashboard to Netlify using optimized serverless workflows.
- **Mermaid Export**: Retain Mermaid.js support as a secondary export for documentation.
