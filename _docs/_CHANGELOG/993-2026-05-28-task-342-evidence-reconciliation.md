# 993 - TASK-342 evidence reconciliation

Date: 2026-05-28
Version: Unreleased
Tasks: TASK-342-01

## Key Changes

- Reconciled the contradiction between the older `TASK-336-19` final smoke and
  the 2026-05-27 current-state rerun.
- Classified the seven outliers into:
  - four real current-tree metadata regressions in admin editor ownership
  - three fixture-data drifts caused by a zero-product local commerce catalog
- Updated the TASK-342 family docs so implementation started from an explicit
  owner matrix instead of a mixed regression/fixture theory.

## Validation

- Direct comparison of:
  - `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-full-rerun-2026-05-26-final5.{md,json}`
  - `.tmp/widget-contract-smoke-2026-05-27-clean.{md,json}`
  - `_docs/PLAYWRIGHT/27-05-2026/README.md`
- Live local evidence:
  - `/admin/api/commerce/products` returning `0`
  - published public fixture pages for the three commerce routes
