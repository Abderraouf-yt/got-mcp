# Functional Specification: Thought Graph

## 🎯 Overview

Thought Graph is an MCP server that implements a **Graph of Thoughts (GoT)** reasoning pattern. Unlike sequential thinking, it allows for branching, merging, and cyclic loops of logic, managed via Model Context Protocol tools and resources.

## 🚀 Core Features

1. **Dynamic Node Management**: Tools to propose, link, and score units of thought.
2. **Advanced Relations**: Support for "Refinement", "Contradiction", "Support", and "Aggregation" (Merging) relationships.
3. **Live Graph Resource**: Exposes the reasoning state as a live-updating JSON resource at `thought-graph://current`.
4. **Autonomous Self-Critique**: Integration with MCP Sampling (`createMessage`) to allow the server to request its own logical audits from the LLM.
5. **Real-time Notifications**: Notify host applications of graph updates via standard MCP notification protocols.

## 📈 Future Goals

- Persistent graph storage across sessions.
- Visual dashboard for human review.
- Automated pruning based on heuristic scores.
