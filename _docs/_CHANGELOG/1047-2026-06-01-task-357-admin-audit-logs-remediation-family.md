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

### TASK-357-02 Audit Entry Actions Truthfulness

- Added a pure audit redaction helper shared by server audit metadata
  sanitizing, details-drawer payload rendering, and copied entry JSON.
- Redaction now removes password/token/secret/API key/cookie/authorization,
  CSRF, reset-token, and session-id fields recursively and redacts token-like
  strings in nested payload values.
- Audit UI rows now carry stable `createdAt` so copied JSON includes a
  machine-readable timestamp instead of relying only on localized display copy.
- Row-menu and details-drawer `Copy JSON` controls now use the same Clipboard
  action, copy redacted public JSON, and report success/error through admin
  toasts.
- The details drawer renders the redacted payload, matching copied JSON
  behavior for secret-safe inspection.
- `Export entry`, `Share Log`, and `Report` remain disabled with stable
  unavailable reasons; page-level export is implemented in `TASK-357-03`.
- The Audit no-op gate no longer expects `Copy JSON` to be disabled and still
  verifies unsupported Audit actions plus cursor navigation.

### TASK-357-03 Audit Export Contract

- `/admin/audit` now wires the shared export dialog to `exportAuditLogs()`
  instead of unavailable copy, sending selected columns and active filters to
  the server.
- Added `POST /admin/api/audit/export` through the internal `POST
  /audit/export` route, protected by `audit:read` plus the global admin POST
  CSRF and `admin_write` rate-limit pipeline.
- Added an audit export contract module that owns CSV/JSON formats, the column
  allowlist, strict body schema, 200-row synchronous export cap, scoped
  filenames, and machine-readable `audit_export_*` errors.
- Export serialization reuses the audit list query normalization and redaction
  helper, supports redacted CSV/JSON output, and escapes CSV commas, quotes,
  newlines, and formula prefixes.
- Every export writes an `audit.export` summary event with format, columns,
  sanitized filter summary, row count, and request id only.
- Playwright verified a restricted `audit:read` user could filter Audit Logs,
  include the `Payload` column, download a real CSV, and keep password, CSRF,
  and API-key fixture values out of the file.

### TASK-357-04 Pagination and Count Truthfulness

- Audit Logs now tracks requested and loaded cursor page state separately, so
  failed next-page requests preserve the last successful rows and controls.
- `Next` sends the server-provided `nextCursor`; `Previous` uses the loaded
  cursor stack and is disabled on the first page.
- Search, date range, category, and severity changes reset pagination to the
  first page.
- Invalid or expired cursors recover to the first page with neutral copy instead
  of a hard failure banner.
- Audit export keeps using the active filter query without the current cursor,
  so exported evidence follows the filtered slice rather than only the visible
  page.
- Removed the old `audit-next-page` no-op marker and kept count copy derived
  from response metadata instead of placeholder totals.
- Playwright verified first/next/previous navigation with a 55-row restricted
  `audit:read` fixture.

## Validation

- `bun test tests/unit/audit/auditService.test.ts tests/integration/routes/audit.test.ts`
- `bun test tests/unit/audit/auditExport.test.ts tests/integration/routes/audit.test.ts`
- `bun run test:vitest -- tests/vitest/admin/auditClient.test.ts tests/vitest/validation/adminLogQuerySchemas.test.ts tests/vitest/ui/audit-list-wave.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/auditClient.test.ts tests/vitest/admin/adminExportClient.test.ts tests/vitest/ui/audit-list-wave.test.tsx tests/vitest/ui/audit-list.test.tsx tests/vitest/ui/shared-dialog-contracts.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/audit-entry-actions.test.ts tests/vitest/ui/audit-table-wave.test.tsx tests/vitest/ui/audit-details.test.tsx tests/vitest/ui/audit-list-wave.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/audit-list-wave.test.tsx tests/vitest/ui/audit-table-wave.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx tests/vitest/admin/auditClient.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`
- `set -a && source .env && set +a && bun .tmp/task-357-01-playwright-runner.ts`
  (restricted `audit:read` user; screenshot:
  `.tmp/task-357-01-audit-query.png`)
- `set -a && source .env && set +a && bun .tmp/task-357-02-playwright-runner.ts`
  (restricted `audit:read` user; row and drawer `Copy JSON`, redacted drawer
  payload, disabled unsupported entry actions; screenshot:
  `.tmp/task-357-02-copy-json.png`)
- `set -a && source .env && set +a && bun .tmp/task-357-03-playwright-runner.ts`
  (restricted `audit:read` user; filtered page-level export, payload column,
  real CSV download, redacted password/CSRF/API-key values; screenshot:
  `.tmp/task-357-03-audit-export.png`; CSV proof:
  `.tmp/task-357-03-export.csv`)
- `set -a && source .env && set +a && bun .tmp/task-357-04-playwright-runner.ts`
  (restricted `audit:read` user; 55-row fixture, first page, next page with
  cursor, previous page without cursor; screenshot:
  `.tmp/task-357-04-audit-pagination.png`)
- Claude final blocker review: no blockers after the category precedence,
  service error mapping, shared count helper, and initial-load error-state fixes.
- Claude final blocker review for `TASK-357-02`: no blockers after shared
  redacted copy behavior, drawer payload redaction, `createdAt` clipboard
  payloads, and truthful disabled entry actions.
- Claude read-only plan review for `TASK-357-03`: reuse 1047, reuse
  `downloadAdminExport`, keep route JSON file contract instead of raw
  `Response`, enforce server column allowlist, redaction, CSV formula guard, and
  explicit export error mapping.
- Claude and subagent read-only review for `TASK-357-04`: keep export filters
  cursor-free, remove the no-op marker, preserve loaded page state on failed
  pagination requests, and recover invalid cursors to the first page.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`.
