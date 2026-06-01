# 1047 - TASK-357 Admin Audit Logs remediation family

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-357, TASK-357-01, TASK-357-02, TASK-357-03, TASK-357-04

## Key Changes

### Planning / QA

- Added the report-driven remediation family for the Admin Audit Logs audit.
- Captured execution-ready scope for server-side date/type/severity/query
  filtering, real pagination, copy/export/share/report action truthfulness,
  redacted JSON copy, and a real export contract.
- Recorded the security contract for internal audit log reads/exports,
  `audit:read`, CSRF on export, strict query/body validation, redaction, and
  export audit events.
- Split the family into physical execution leaf files:
  `TASK-357-01` through `TASK-357-04`, each with pseudocode, data flow, error
  handling, security contract, tests, docs plan, and acceptance criteria.
- Refined drift found by agent/Claude review: replaced unsupported blob
  `apiRequest` usage with shared export helper ownership, changed audit query
  semantics to category/severity/cursor, removed the 200-row local-filter
  ambiguity, aligned rate buckets, and required explicit `xlsx` unavailable
  handling.
- Follow-up drift pass aligned pseudocode with the real `AuditLog` UI type and
  made direct blob downloads conditional on explicit router `Response`
  passthrough plus content-disposition tests.

## Validation

- Planning entry only; implementation validation is owned by TASK-357.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`.
