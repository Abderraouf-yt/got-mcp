# Feature Spec: Generate Perspectives Tool

## Overview
A tool to bridge the gap between non-technical user prompts and complex Graph of Thoughts reasoning. It automatically analyzes a vague or short user intent and generates 3-5 distinct "perspectives" or "initial thoughts" to seed the graph.

## Goals
- Empower non-technical users to leverage GoT without knowing how to branch.
- Provide high-entropy starting points for the `run_controller_loop`.
- "Upskill" low-quality prompts into multi-dimensional analysis frameworks.

## Requirements
- Tool Name: `generate_perspectives`
- Input: `query` (string), `count` (number, default 3, max 5)
- Output: Array of Perspective objects (`{ lens: string, thought: string, weight: number }`).
- Integration: Can be used standalone or as a pre-processor for `run_controller_loop`.

## Use Cases
- User: "Help me pick a laptop" -> Perspectives: "Performance & Workload", "Budget & Value", "Portability & Battery Life".
- User: "Is my AWS setup SOC 2 compliant?" -> Perspectives: "IAM & Access Control", "Data Encryption & Privacy", "Logging & Audit Trails".
