# 1050 - TASK-360 Admin UI cross-cutting remediation family

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-360, TASK-360-01, TASK-360-02, TASK-360-03, TASK-360-04, TASK-360-05, TASK-360-06, TASK-360-07

## Key Changes

### Planning / QA

- Added the cross-cutting remediation family for shared Admin UI defects from
  the summary audit report.
- Captured shared contracts for current-user permission snapshots, confirm
  dialogs, export dialog behavior, no-op control gates, drawer accessibility
  gates, server-side query/pagination conventions, and final evidence closure.
- Linked the shared work to TASK-355 through TASK-359 so area tasks can adopt
  common patterns instead of one-off fixes.
- Split the family into physical execution leaf files:
  `TASK-360-01` through `TASK-360-07`, each with pseudocode, data flow, error
  handling, security contract, tests, docs plan, and acceptance criteria.
- Refined drift found by agent/Claude review: added shared
  `downloadAdminExport` helper ownership, explicit `xlsx` no-op prevention,
  canonical rate-limit bucket names, stable locator requirements, and final QA
  evidence ownership for Settings cleanup.
- Follow-up drift pass changed shared export helper examples to JSON export or
  async-job responses unless router `Response` passthrough is implemented, and
  expanded drawer accessibility coverage to Audit and Access Logs detail
  drawers.

## Validation

- Planning entry only; implementation validation is owned by TASK-360.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`.
