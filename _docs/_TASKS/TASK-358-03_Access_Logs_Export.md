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
| Access logs admin client | Add `exportAccessLogs` with CSRF and blob/job handling. |
| Access log route/service modules | Register `POST /admin/api/access-logs/export`, enforce RBAC/CSRF, validate body, and generate redacted output. |
| Access log export domain module | Own column allowlist, filter normalization, row limit, CSV escaping, and redaction. |
| Tests | Cover active filters, empty columns, unauthorized user, CSV escaping, and redaction. |

## Implementation Pseudocode

```ts
type AccessLogExportRequest = {
  format: "csv" | "json";
  columns: AccessLogExportColumn[];
  filters: AccessLogQuery;
};

async function exportAccessLogs(request: AccessLogExportRequest) {
  return downloadAdminExport("/admin/api/access-logs/export", request, {
    filenamePrefix: "access-logs",
    withCsrf: true,
  });
}
```

Data flow:

- Export dialog receives the current Access Logs query state.
- User selects format and allowlisted columns.
- Client posts to `POST /admin/api/access-logs/export`.
- Server re-validates query filters, columns, RBAC, CSRF, and row limits.
- Server returns redacted CSV/JSON blob or async export job metadata.
- UI downloads blob or displays job status with retry-capable error state.

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
- Rate-limit bucket: export/admin write bucket.
- Reject unknown validation: strict body schema, selected column allowlist,
  normalized query filters, clamped rows.
- Anti-abuse: internal session route; no nonce, HMAC, or captcha.
- Redaction: output excludes cookies, authorization headers, CSRF tokens, reset
  tokens, raw secrets, and session tokens.
- Audit: export emits summary event with format/filter scope, never payload.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI tests: current status/date/search filters included, empty column
  selection blocked, retry/error state, and success download call.
- Bun route/service tests: route registration, `audit:read`, CSRF, unknown
  body rejection, invalid columns, row limit, redaction, and CSV escaping for
  commas/newlines/quotes in user agent.
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

