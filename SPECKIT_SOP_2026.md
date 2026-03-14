# 🚀 Spec-Driven Development (SDD) 2026: The Monetization Fast-Track

This Standard Operating Procedure (SOP) defines the exact framework for using Speckit commands. Following this flow separates you from the 99% of developers who get trapped in AI "hallucination loops" by rushing straight to code.

**The Golden Rule:** Never write code until the logic is bulletproof. 

---

## 🧭 The Decision Matrix: When to use what?

| Scenario | Immediate Action | Why? |
| :--- | :--- | :--- |
| **New Idea (Greenfield)** | `/speckit.constitution` | Set the non-negotiable rules *before* designing the product. |
| **Adding Feature to Existing App** | `/speckit.specify` | Define the new feature's "What" without breaking existing code. |
| **Complex Logic/Ambiguous Request** | `/speckit.clarify` | Force the AI to ask *you* questions to uncover blind spots. |
| **Before Writing Code** | `/speckit.analyze` | The final QA gate. Ensures Spec, Plan, and Tasks align. |

---

## 🛤️ The 7-Phase Master Workflow

### Phase 1: Foundational Governance
*   **Command:** `/speckit.constitution`
*   **Goal:** Establish the DNA of the project (e.g., "Strict TypeScript", "SOC 2 Compliant").
*   **Monetization Tip:** A strong constitution ensures your final product meets enterprise standards, allowing you to charge B2B prices instead of B2C.

### Phase 2: Product Definition (The "What")
*   **Command:** `/speckit.specify`
*   **Goal:** Define User Stories and Functional Requirements. **NO TECH STACK TALK HERE.**
*   **Action:** Describe the exact user journey.

### Phase 3: Requirement Refinement (The "Secret Sauce")
*   **Command:** `/speckit.clarify` (followed by `/speckit.checklist`)
*   **Goal:** Eliminate "Unknown Unknowns."
*   **Action:** Let the AI cross-examine your spec. Ask for a specific checklist (e.g., `/speckit.checklist Security`) to ensure the design is sound.

### Phase 4: Technical Strategy (The "How")
*   **Command:** `/speckit.plan`
*   **Goal:** Translate the product spec into technical architecture.
*   **Action:** Define the tech stack, databases, and APIs.
*   **Rapid Prototyping Tip:** If you want to move fast and don't need tests yet, explicitly say: *"Remove all references to tests from the plan."*

### Phase 5: Task Breakdown & QA
*   **Commands:** `/speckit.tasks` ➔ `/speckit.analyze`
*   **Goal:** Create a granular, dependency-ordered checklist and verify it.
*   **Action:** The AI builds `tasks.md`. Run `analyze` to catch any contradictions between the spec and the tasks *before* coding begins.

### Phase 6: Code Generation
*   **Command:** `/speckit.implement`
*   **Goal:** The automated execution.
*   **Action:** The agent reads `tasks.md` and writes the code, phase by phase.

### Phase 7: The Feedback Loop
*   **Action:** When you iterate on the code with the AI to fix a bug or tweak a design, **always backport the learnings**.
*   **Command/Prompt:** *"Encode the learnings and experience assumptions from this conversation back into the spec.md."*
*   **Monetization Tip:** By keeping `spec.md` as the ultimate source of truth, you can take that exact same file later and tell the AI: *"Rebuild this entire app using a different framework (e.g., React Native for mobile)"* without starting over.

---

## 🧠 Advanced: Thought Graph & Manara Integration

To truly elevate your workflow for complex systems (like the SOC 2 Engine):

1.  **Intent-to-Graph (Manara)**: Use `manara_route` to let the AI decide which reasoning framework best suits your initial raw idea.
2.  **Deep Reasoning (GoT MCP)**: If a feature requires multi-variable logic (e.g., "How do we handle multi-tenant data partitioning?"), **pause the Speckit flow at Phase 3**. Use `run_controller_loop` in the Thought Graph to reason through the problem.
3.  **Synthesis**: Once the graph converges on a "Winning Path," feed that validated conclusion directly into `/speckit.plan`.