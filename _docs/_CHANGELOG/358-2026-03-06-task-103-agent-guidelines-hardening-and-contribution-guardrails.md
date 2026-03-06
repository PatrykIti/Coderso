# 358 - TASK-103 agent guidelines hardening and contribution guardrails

- Date: 2026-03-06
- Version: Unreleased
- Tasks: TASK-103

## Key Changes

### Agent guardrails
- Hardened `AGENTS.md` with repo-specific rules for schema-first validation, explicit `normalize*` pipelines, deterministic contracts, route-level error mapping, and admin cache/invalidation behavior.
- Added product-surface guardrails for widgets, plugin/runtime extensions, assistant automation flows, and release-gate ownership so agents follow existing Nextless contracts instead of inventing ad-hoc patterns.

### Workflow and documentation
- Added explicit closure rules for syncing `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/README.md`, admin cache docs, and source-of-truth docs for plugins, widget pack coverage, assistant workflows, and release gates.
- Recorded this documentation hardening as a dedicated task so the repo keeps history for contributor-process changes the same way it does for product work.

### Parallel-worktree delivery
- Landed the `AGENTS.md` update through a dedicated git worktree flow to avoid collisions with concurrent agents working in the main repository tree.

