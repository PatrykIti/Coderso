# 995 - TASK-343 report classification correction

Date: 2026-05-29
Version: Unreleased
Tasks: TASK-343

## Key Changes

- Reconciled all `38` reports from `_docs/PLAYWRIGHT/28-05-2026/` against the
  `TASK-343` breakdown.
- Promoted the under-scoped `17`-family plan to `30` physical remediation
  families: `28` widget-local leaves plus `2` shared-owner leaves.
- Added execution-ready task files for the newly promoted widget and shared
  families, including owner files, pseudocode, security contracts, tests, docs,
  and acceptance criteria.
- Corrected stale classifications, including moving `product-table` out of the
  second-wave bucket and routing `product-compare` plus repeated color-state
  drift to shared owners.

## Validation

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
