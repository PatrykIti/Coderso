# TASK-357-03: Audit Export Contract
# FileName: TASK-357-03_Audit_Export_Contract.md

**Priority:** High
**Category:** Admin API + Audit Logs + Export + Compliance
**Estimated Effort:** Large
**Dependencies:** TASK-357-01, TASK-360-03
**Status:** To Do

---

## Overview

Replace the Audit export dialog close-only behavior with a real export flow
that validates selected columns and active filters, enforces `audit:read`,
redacts sensitive values, and downloads CSV/JSON or returns async job metadata.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `core/admin/ui/shared/ExportDialog.tsx`
- `core/admin/ui/audit/AuditList.tsx`
- Audit route/service/export owners discovered during implementation

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/shared/ExportDialog.tsx` | Accept `onExport(payload)`, loading state, validation errors, and retry behavior. |
| Audit admin client | Add `exportAuditLogs` returning blob or async export metadata. |
| Audit route/service modules | Register `POST /admin/api/audit/export`, validate body, enforce RBAC/CSRF, and generate redacted CSV/JSON. |
| Audit export domain module | Own column allowlist, filename scope, row limit, redaction, and CSV escaping. |
| Tests | Cover UI dialog, route validation, RBAC, CSV escaping, and redaction. |

## Implementation Pseudocode

```ts
type AuditExportRequest = {
  format: "csv" | "json";
  columns: AuditExportColumn[];
  filters: AuditLogQuery;
};

async function exportAuditLogs(request: AuditExportRequest) {
  const response = await apiRequest<Blob>(
    "/audit/export",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    { withCsrf: true, responseType: "blob" }
  );
  downloadBlob(response, buildAuditExportFilename(request));
}
```

Data flow:

- User opens export dialog from `/admin/audit`.
- Dialog receives active filter state from `AuditList`.
- Dialog validates format and at least one selected allowlisted column.
- Client posts to registered route `POST /admin/api/audit/export`.
- Server re-validates filters, columns, RBAC, CSRF, and row limit.
- Server returns a redacted blob or async export job metadata.
- UI downloads blob or shows job status and success/error feedback.

Error handling:

- `audit_export_invalid_columns`: keep dialog open and mark field selection.
- `audit_export_too_large`: show row-limit or async-job guidance.
- `audit_export_forbidden`: close sensitive payload state, show access-denied
  toast, and refresh current-user permissions.
- Network failure keeps dialog open with retry.

## Security Contract

- Endpoint visibility: internal admin, `POST /admin/api/audit/export`.
- Auth model: authenticated admin session.
- RBAC: `audit:read` required.
- CSRF: required.
- Rate-limit bucket: export/admin write bucket.
- Reject unknown validation: strict body schema, column allowlist, normalized
  filter schema, clamped row limit.
- Anti-abuse: internal session route; no nonce, HMAC, or captcha.
- Redaction: exported output removes secrets, cookies, authorization headers,
  password-like keys, reset tokens, CSRF tokens, and session IDs.
- Audit: export action emits an audit event with format/filter summary, never
  exported payload contents.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI tests for at-least-one-column validation, active filters in submit
  payload, loading state, retry, and download success/error.
- Bun route/service tests for route registration, `audit:read`, CSRF, unknown
  body rejection, invalid columns, row limit, redaction, and CSV escaping.
- Centralized `mapAuditError` coverage for `audit_export_invalid_columns`,
  `audit_export_too_large`, and `audit_export_forbidden`.
- Playwright Audit export fixture verifies a real file/job outcome.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `_docs/CMS_API.md`
- `_docs/AUDIT_SPEC.md`
- `docs/guide/screens/audit-logs.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Export dialog submit no longer just closes.
- Server export validates filter/column payload and returns a real outcome.
- Exported data is redacted and CSV/JSON safe.

