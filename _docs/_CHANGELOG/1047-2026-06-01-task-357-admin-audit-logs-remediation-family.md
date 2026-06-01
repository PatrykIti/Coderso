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

### TASK-357-01 Server-Side Audit Query Contract

- `/admin/api/audit` now accepts strict `limit`, `q`, `category`, `severity`,
  `from`, `to`, and `cursor` query params and rejects unknown params before
  service work.
- Audit query normalization now owns clamped limits, trimmed search text, UTC
  date boundaries, reversed-range rejection, and cursor validation.
- Invalid query payloads map to `audit_query_invalid`; malformed cursors map to
  `audit_cursor_invalid`.
- Added shared DB-free audit classification for category/severity derivation and
  mirrored those rules in SQL predicates, including `targetType=session`,
  singular/plural session actions, case-insensitive content targets, and
  `metadata.severity` precedence. Authentication classification takes
  precedence over content classification in both the UI and SQL filters.
- Service-level category/severity validation now raises admin query convention
  errors, so non-route callers still map invalid values to `audit_query_invalid`
  instead of leaking a generic failure path.
- Audit list queries now apply search/category/severity/date/cursor filters
  before limit, order by `createdAt DESC, id DESC`, fetch `limit + 1`, and
  return `nextCursor`. Cursor payloads preserve database timestamp precision for
  same-millisecond page boundaries.
- `/admin/audit` now sends filter state to the server instead of filtering an
  unlabelled top-200 sample locally. Date range presets are active; custom
  ranges stay out of scope until real `from`/`to` inputs are added.
- Audit table count copy is derived through the shared truthful count helper
  from response rows and cursor availability; interactive page controls remain
  owned by `TASK-357-04`.
- The date range no-op gate was removed while copy/export/share/report and
  cursor navigation remain assigned to later leaves.

## Validation

- `bun test tests/unit/audit/auditService.test.ts tests/integration/routes/audit.test.ts`
- `bun run test:vitest -- tests/vitest/admin/auditClient.test.ts tests/vitest/validation/adminLogQuerySchemas.test.ts tests/vitest/ui/audit-list-wave.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`
- `set -a && source .env && set +a && bun .tmp/task-357-01-playwright-runner.ts`
  (restricted `audit:read` user; screenshot:
  `.tmp/task-357-01-audit-query.png`)
- Claude final blocker review: no blockers after the category precedence,
  service error mapping, shared count helper, and initial-load error-state fixes.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`.
