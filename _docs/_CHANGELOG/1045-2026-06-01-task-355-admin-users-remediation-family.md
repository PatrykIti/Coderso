# 1045 - TASK-355 Admin Users remediation family

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-355, TASK-355-01, TASK-355-02, TASK-355-03, TASK-355-04, TASK-355-05

## Key Changes

### Planning / QA

- Added the report-driven remediation family for the Admin Users audit.
- Captured execution-ready scope for permission-aware UI gating, reset-password
  truthfulness, login-capable invite flow, destructive confirms, filter
  affordance cleanup, notification switch truthfulness, and mobile sheet
  accessibility.
- Recorded the security contract for internal admin users/roles routes,
  password reset handling, CSRF, RBAC, rate limiting, strict validation, audit
  events, and secret handling.
- Split the family into physical execution leaf files:
  `TASK-355-01` through `TASK-355-05`, each with pseudocode, data flow, error
  handling, security contract, tests, docs plan, and acceptance criteria.
- Refined drift found by agent/Claude review: aligned bootstrap rate buckets
  with `_docs/SECURITY_SPEC.md`, kept invite/reset on the existing
  reset-confirm auth route, fixed role editor ownership paths, and clarified
  destructive/notification/mobile leaf ownership.

## Validation

- Planning entry only; implementation validation is owned by TASK-355.
- Source evidence: `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`.
