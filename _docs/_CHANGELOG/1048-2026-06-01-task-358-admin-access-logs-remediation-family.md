# 1048 - TASK-358 Admin Access Logs remediation family

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-358, TASK-358-01, TASK-358-02, TASK-358-03, TASK-358-04

## Key Changes

### Planning / QA

- Added the report-driven remediation family for the Admin Access Logs audit.
- Captured execution-ready scope for real session detail/revoke behavior,
  truthful user/custom-date/advanced filters, server-side pagination, search
  match explanation, and export behavior.
- Recorded the security contract for internal access log reads/exports and
  session revoke actions, including RBAC separation between `audit:read` and
  high-risk revoke permissions.
- Split the family into physical execution leaf files:
  `TASK-358-01` through `TASK-358-04`, each with pseudocode, data flow, error
  handling, security contract, tests, docs plan, and acceptance criteria.

## Validation

- Planning entry only; implementation validation is owned by TASK-358.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`.
