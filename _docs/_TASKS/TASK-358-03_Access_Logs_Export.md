# TASK-358-03: Access Logs Export
# FileName: TASK-358-03_Access_Logs_Export.md

**Priority:** High
**Category:** Admin API + Access Logs + Export + Security
**Estimated Effort:** Large
**Dependencies:** TASK-358-01, TASK-360-03
**Status:** To Do

---

## Overview

Replace Access Logs export close-only behavior with a real CSV/JSON export that
uses active filters, selected fields, strict server validation, redaction, and
download success/error feedback.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `core/admin/ui/shared/ExportDialog.tsx`
- `core/admin/ui/security/AccessLogsPage.tsx`
- Access log export route/service owners discovered during implementation

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/shared/ExportDialog.tsx` | Reuse shared export submit/loading/error contract from `TASK-360-03`. |
| Access logs admin client | Add `exportAccessLogs` with CSRF and JSON export or async-job handling. Direct blobs require the explicit router passthrough contract below. |
| Access log route/service modules | Register `POST /admin/api/access-logs/export`, enforce RBAC/CSRF, validate body, and generate redacted output. |
| Access log export domain module | Own column allowlist, filter normalization, row limit, CSV escaping, and redaction. |
| Tests | Cover active filters, empty columns, unauthorized user, CSV escaping, and redaction. |

## Implementation Pseudocode

```ts
type AccessLogExportRequest = {
  format: "csv" | "json";
  columns: AccessLogExportColumn[];
  // From TASK-358-01: status?: "success" | "failed", userId?: string,
  // method?, ip?: string, dateFrom?, dateTo?, limit, and cursor.
  filters: AccessLogQuery;
};

async function exportAccessLogs(request: AccessLogExportRequest) {
  return downloadAdminExport("/access-logs/export", request, {
    filenamePrefix: "access-logs",
    withCsrf: true,
  });
}
```

Data flow:

- Export dialog receives the current Access Logs query state.
- User selects format and allowlisted columns.
- Client passes API-relative `/access-logs/export` to the shared helper, which
  resolves and posts to `POST /admin/api/access-logs/export`.
- Server re-validates query filters, columns, RBAC, CSRF, and row limits.
- Server returns redacted JSON export metadata/content or async export job
  metadata.
- Direct CSV/JSON blob responses require explicit `httpServer`/router
  `Response` passthrough plus content-disposition tests before use.
- UI downloads from the JSON export contract or displays job status with
  retry-capable error state.
- If `ExportDialog` still contains `xlsx`, remove/disable that option as
  unavailable unless a real Excel export contract is implemented and tested.

Error handling:

- `access_log_export_invalid_columns`: keep dialog open and mark selection.
- `access_log_export_too_large`: show row-limit or async guidance.
- `access_log_export_forbidden`: refresh permission snapshot and show access
  denied copy.
- Network failure keeps dialog open and allows retry.

## Security Contract

- Endpoint visibility: internal admin,
  `POST /admin/api/access-logs/export`.
- Auth model: authenticated admin session.
- RBAC: `audit:read` for export.
- CSRF: required.
- Rate-limit bucket: `admin_write`.
- Reject unknown validation: strict body schema, selected column allowlist,
  normalized query filters, clamped rows.
- Anti-abuse: internal session route; no nonce, HMAC, or captcha.
- Redaction: output excludes cookies, authorization headers, CSRF tokens, reset
  tokens, raw secrets, session tokens, and session ids unless the documented
  access log export contract explicitly allows a redacted identifier.
- Audit: export emits summary event with format/filter scope, never payload.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI tests: current status/date/search filters included, empty column
  selection blocked, retry/error state, and success download call.
- Bun route/service tests: route registration, `audit:read`, CSRF, unknown
  body rejection, invalid columns, row limit, redaction, and CSV escaping for
  commas/newlines/quotes in user agent.
- Redaction tests include cookies, authorization headers, CSRF tokens, reset
  tokens, session tokens, session ids, and raw secret-like keys.
- Vitest UI tests prove `xlsx` is not an enabled no-op when only CSV/JSON are
  implemented.
- Centralized `mapAccessLogError` coverage for export-specific errors.
- Playwright export fixture verifies real file/job outcome.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `_docs/CMS_API.md`
- `_docs/AUDIT_SPEC.md`
- `docs/guide/screens/access-logs.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Access Logs export submit produces a real download/job result.
- Export uses current filters and selected allowlisted fields.
- Output is redacted and safe for CSV/JSON.
