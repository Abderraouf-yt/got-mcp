# Project Constitution: Thought Graph MCP

## 📜 Governing Principles

These principles are immutable and guide all development phases of the Thought Graph reasoning engine.

1. **AI-First Design**: Tools must be optimized for LLM consumption, providing clear descriptions, granular status updates, and minimal token overhead.
2. **Transparent Reasoning**: Every unit of thought must be linkable, scoreable, and critiqueable. No "black box" internal reasoning.
3. **Spec-Driven Evolution**: No code changes happen without a corresponding update to the `.spec` documentation.
4. **Resilience & Security**: The server must run in a secure sandbox, validating all inputs and handling resource subscriptions gracefully.
5. **Human-in-the-loop**: The design must allow humans to intervene, override scores, and manually prune graph branches.

## 🛠 Quality Standards

- **TypeScript Strict Mode**: Always enabled.
- **Documentation as Code**: README and .spec files are as important as the source.
- **Recursive Integrity**: The system must be able to reason about its own reasoning logic.
