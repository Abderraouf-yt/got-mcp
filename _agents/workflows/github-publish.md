---
description: How to safely sync and deploy a formally audited local repository to GitHub.
---

# GitHub Publishing & Finalization Workflow

**Trigger this workflow ONLY after a repository has been scaffolded and committed locally by a capability skill** (such as `github-best-practices` or `repo-readiness-auditor`). This workflow manages network-related remote deployments and UI recommendations, separating them from file-generation skills for security and modularity.

## Step 1: Remote Verification
Before deploying to the cloud or changing remote branch states, verify the status of the local Git repository.
1. Run `git status` to ensure the working directory is clean and all scaffolding changes have been committed.
2. If the working tree is dirty, run `git add . && git commit -m "chore: finalize repository preparations prior to remote sync"` before continuing.

## Step 2: Push To Remote (Auto-Run Recommended)
The standard workflow pushes the `main` or active local branch directly to the configured `origin` remote.
// turbo
1. Run `git push origin main` (or the respective default branch if not `main`).

## Step 3: Cloud Verification (Required)
If the project utilizes GitHub Actions, you must instruct the user to verify its instantiation on the cloud. Send the user the following message strictly after a successful push:

> "The repository has been successfully synced to GitHub. Please verify the following cloud states in your GitHub UI:"
> 1. **Check the Actions Tab**: Verify that the newly pushed workflows (like `.github/workflows/ci.yml` or `codeql.yml`) have been automatically triggered by the push and that they initialize without syntax errors.
> 2. **Review Dependabot**: Ensure the generic `.github/dependabot.yml` triggered an initial security advisory check for this repository language stack.

## Step 4: Ruleset Instantiation (Action Required By User)
> *"Since we just enforced 2026 ruleset architectures locally (e.g. `pr-code-review.md`), you must formally enable them in the GitHub cloud UI."*
> - Open `Repository Settings > Rules > Rulesets`.
> - Create a new Branch Ruleset targeting `main`.
> - Check *Require pull request before merging* (enable approvals and conversation resolution).
> - Check *Require status checks to pass* and explicitly type in the names of the CI actions that were just deployed (e.g., `Build and Test`, `CodeQL`).
> - Check *Require signed commits* and *Require merge queue*.
