# TASK-357: Admin Audit Logs Report Remediation Family
# FileName: TASK-357_Admin_Audit_Logs_Report_Remediation_Family.md

**Priority:** High
**Category:** Admin UI + Audit Logs + Compliance Export + Pagination + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-360-03 shared export dialog contract, changelog 1034 and `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md` audit evidence
**Status:** To Do

---

## Overview

Turn `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md` into an
execution-ready remediation family for `/admin/audit`.

The report proves that audit log read access works for a restricted user with
`audit:read`, and that search/type/severity client filtering is functional.
The defects are compliance-facing: date range is inert, row actions are
UI-only, export does not export, and the table count/pagination creates a false
view of log volume.

## Source Evidence

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `core/admin/ui/audit/AuditList.tsx`
- `core/admin/ui/audit/AuditFilters.tsx`
- `core/admin/ui/audit/AuditTable.tsx`
- `core/admin/ui/audit/AuditDetailsDrawer.tsx`
- `core/admin/ui/shared/ExportDialog.tsx`
- audit log API routes and service modules under `core/server`, `core/services`,
  or the current owner found during implementation.

## Remediation Scope

| Finding | Required outcome |
|---|---|
| Date range does not affect results | Date range is sent to the server or clearly labeled as local-only; preferred fix is server-side query. |
| `Copy JSON` does not copy | Clipboard API action with success/error feedback and test coverage. |
| `Export entry`, `Share Log`, `Report` are UI-only | Implement supported actions or disable/hide with explicit unavailable state. |
| Export dialog closes without file | Export flow calls backend or deterministic client download and reports success/failure. |
| Pagination/table count is placeholder | Real count/cursor/page state replaces hard-coded `2,459 logs` and inert `Next`. |

## Refinement Checklist

11. **Export field allowlist:** define an explicit export column allowlist and
    reject unknown fields server-side; never trust field names sent from the UI.
12. **Large export behavior:** decide sync download vs async job before coding.
    If sync, clamp export rows and communicate truncation; if async, add job
    status UI and tests.
13. **Retention awareness:** date range and pagination copy must not imply logs
    exist beyond retention windows. If retention policy is available, surface it
    in empty states/export copy.
14. **Redaction parity:** copied JSON, single-entry export, bulk export, and
    details drawer must use the same redaction helper for sensitive payload
    keys.
15. **Local-vs-server filters:** the UI must not mix server and local filters
    silently. All visible filter chips/counts must reflect server query state.

## Sub-Tasks

### TASK-357-01: Server-Side Audit Query Contract

**Status:** To Do

Implementation shape:

- Extend or normalize the audit list query to include:
  - `query`
  - `eventType`
  - `severity`
  - `dateFrom`
  - `dateTo`
  - `limit`
  - `cursor` or `page`
- Reject unknown query params.
- Clamp `limit`.
- Normalize date range to UTC instants.
- Return pagination metadata rather than hard-coded UI totals.

Pseudocode:

```ts
type AuditLogQuery = {
  query?: string;
  eventType?: string;
  severity?: "debug" | "info" | "warn" | "error";
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  cursor?: string;
};

function normalizeAuditLogQuery(input: unknown): AuditLogQuery {
  const parsed = auditLogQuerySchema.parse(input); // strict/reject unknown
  return {
    query: parsed.query?.trim() || undefined,
    eventType: parsed.eventType || undefined,
    severity: parsed.severity || undefined,
    dateFrom: normalizeIsoDateBoundary(parsed.dateFrom, "start"),
    dateTo: normalizeIsoDateBoundary(parsed.dateTo, "end"),
    limit: clamp(parsed.limit ?? 50, 1, 200),
    cursor: parsed.cursor || undefined,
  };
}
```

Data flow:

1. `AuditFilters` emits normalized filter state.
2. `AuditList` builds a strict query object.
3. Audit client sends query params.
4. Server validates and returns `{ items, nextCursor, totalApprox? }`.
5. Table renders truthful count/page copy from response metadata only.

Error handling:

- Invalid date ranges show inline validation and do not submit.
- Server validation errors map to stable `audit_query_invalid`.
- Network/API errors preserve the previous visible results with a retry banner
  when possible.

Regression tests:

- Date range changes produce different query params.
- Unknown params are rejected at the route/service boundary.
- Pagination uses returned cursor and does not show fake totals.
- Restricted user with `audit:read` can read; user without `audit:read` gets
  access denied.

### TASK-357-02: Audit Entry Actions Truthfulness

**Status:** To Do

Actions:

- `Copy JSON`
  - Copy the current entry JSON payload to clipboard.
  - Show success/error toast.
  - Fallback error when clipboard is unavailable.
- `Export entry`
  - Either generate a JSON file for one entry or disable with tooltip.
- `Share Log`
  - Either implement a safe internal link/deep-link copy or disable.
- `Report`
  - Either open a supported issue/report workflow or disable.

Preferred implementation:

```ts
async function copyAuditEntryJson(entry: AuditLogEntry) {
  const payload = JSON.stringify(buildPublicAuditEntryPayload(entry), null, 2);
  await navigator.clipboard.writeText(payload);
  toast.success("Audit entry copied.");
}

function buildPublicAuditEntryPayload(entry: AuditLogEntry) {
  return {
    id: entry.id,
    event: entry.event,
    actor: entry.actor,
    resource: entry.resource,
    severity: entry.severity,
    createdAt: entry.createdAt,
    payload: redactAuditPayload(entry.payload),
  };
}
```

Regression tests:

- Clipboard success and failure.
- Redaction helper removes tokens/cookies/password-like keys.
- Disabled actions are not focusable as active commands.
- Drawer and row menu use the same action implementation.

### TASK-357-03: Audit Export Contract

**Status:** To Do

Implementation shape:

- Replace `ExportDialog` close-only submit with `onExport(payload)`.
- Audit export payload includes:
  - active filters,
  - selected columns,
  - format (`csv` and/or `json`),
  - max row limit or async export job id if large.
- The export endpoint must reuse the same RBAC/filter normalization as list.
- Download filename should include date and filter scope.

Pseudocode:

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

Regression tests:

- Dialog validates at least one selected column.
- Export submit calls route with active filters.
- Route rejects unknown fields and unauthorized users.
- CSV escaping covers commas, quotes, and newlines.

### TASK-357-04: Pagination and Count Truthfulness

**Status:** To Do

- Remove hard-coded `Showing 1 to X of 2,459 logs`.
- Render:
  - exact total only if returned by backend,
  - otherwise "Showing X logs" and "More results available".
- `Next` uses `nextCursor`; disabled when absent.
- `Previous` uses cursor stack or page state; disabled on first page.
- Search/filter changes reset pagination state.

Regression tests:

- First page previous disabled.
- Next click uses returned cursor.
- Filter change resets page/cursor.
- No placeholder totals remain in snapshots.

## Security Contract

Route family: audit logs.

- Endpoint visibility: internal admin only (`/admin/api/audit*`).
- Auth model: authenticated admin session.
- RBAC: `audit:read` for list/detail/export/read actions. Any future report
  mutation must require a dedicated write/report permission.
- CSRF: required for export POST if implemented as a write-like admin action.
- Rate-limit bucket: admin read for list/detail, admin write or export bucket
  for export generation.
- Reject unknown validation: strict query/body schemas for list/export.
- Anti-abuse: no public write endpoint; no nonce/HMAC/captcha required.
- Data redaction: export/copy/share must remove secrets, cookies, auth headers,
  password-like keys, reset tokens, CSRF tokens, and session ids unless the
  existing audit spec explicitly allows them.
- Audit: export action should emit an audit event with format/filter summary
  but not exported payload contents.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest UI tests for filters, copy, export dialog, pagination.
- Bun route/service tests for audit query normalization, RBAC, export, and CSV.
- Playwright:
  - date range affects request/results,
  - copy JSON shows feedback,
  - export downloads or reports success,
  - pagination is real.
- Security/redaction tests for copied/exported payload.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/AUDIT_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1047-2026-06-01-task-357-admin-audit-logs-remediation-family.md`

## Acceptance Criteria

- Date range and pagination are truthful and server-backed or clearly disabled.
- No active audit action is a silent no-op.
- Export produces a file or is visibly unavailable.
- Copy JSON works with redaction and feedback.
- Report findings are updated with evidence and tests.
- No export/copy/share path can include raw cookies, auth headers, reset tokens,
  CSRF tokens, or password-like fields in tests.
