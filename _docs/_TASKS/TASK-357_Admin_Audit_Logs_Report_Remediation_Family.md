# TASK-357: Admin Audit Logs Report Remediation Family
# FileName: TASK-357_Admin_Audit_Logs_Report_Remediation_Family.md

**Priority:** High
**Category:** Admin UI + Audit Logs + Compliance Export + Pagination + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-360-03 shared export dialog contract, TASK-360-04 no-op control gate, TASK-360-06 server-side query/pagination conventions, changelog 1034 and `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md` audit evidence
**Status:** Done (2026-06-01)

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
| Type/severity are local-only filters | Migrate category/severity semantics to the server, or explicitly keep the UI local-only with truthful count copy. Preferred fix is strict server query using existing Audit UI vocabulary. |
| `Copy JSON` does not copy | Clipboard API action with success/error feedback and test coverage. |
| `Export entry`, `Share Log`, `Report` are UI-only | Implement supported actions or disable/hide with explicit unavailable state. |
| Export dialog closes without file | Export flow calls backend or deterministic client download and reports success/failure. |
| Pagination/table count is placeholder | Real count/cursor state replaces hard-coded `2,459 logs` and inert `Next`. |

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

Physical execution leaves:

- `TASK-357-01_Server_Side_Audit_Query_Contract.md`
- `TASK-357-02_Audit_Entry_Actions_Truthfulness.md`
- `TASK-357-03_Audit_Export_Contract.md`
- `TASK-357-04_Pagination_and_Count_Truthfulness.md`

### TASK-357-01: Server-Side Audit Query Contract

**Status:** Done (2026-06-01)

Implementation shape:

- Extend or normalize the audit list query to include:
  - `query`
  - `category` (`authentication|content|system`; UI label may stay "Event type")
  - `severity` (`info|warning|error`)
  - `dateFrom`
  - `dateTo`
  - `limit`
  - `cursor`
- Decommission the current fetch-all/top-200 UI filtering pattern; no visible
  count, chip, or export scope may be based on an unlabelled 200-row sample.
- Reject unknown query params.
- Clamp `limit`.
- Normalize date range to UTC instants.
- Return pagination metadata rather than hard-coded UI totals.

Pseudocode:

```ts
type AuditLogQuery = {
  query?: string;
  category?: "authentication" | "content" | "system";
  severity?: "info" | "warning" | "error";
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  cursor?: string;
};

function normalizeAuditLogQuery(input: unknown): AuditLogQuery {
  const parsed = auditLogQuerySchema.parse(input); // strict/reject unknown
  return {
    query: parsed.query?.trim() || undefined,
    category: parsed.category || undefined,
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
5. Server derives or stores category/severity from current audit action,
   targetType, metadata, or an explicit normalized contract; do not silently
   pretend nonexistent DB columns exist.
6. Table renders truthful count/page copy from response metadata only.

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

Completion notes:

- Audit list query now uses strict server params `limit`, `q`, `category`,
  `severity`, `from`, `to`, and `cursor`.
- The route maps validation/convention failures to `audit_query_invalid` and
  invalid cursors to `audit_cursor_invalid`.
- Audit category/severity classification is a shared DB-free helper; server SQL
  predicates mirror it for `targetType=session`, singular/plural session
  actions, case-insensitive content targets, authentication precedence over
  content, and explicit metadata severity.
- Invalid category/severity values map through admin query convention errors as
  a service-level fallback to the strict route schema.
- The service applies filters before keyset pagination, orders by
  `createdAt DESC, id DESC`, fetches `limit + 1`, and returns `nextCursor`
  without losing database timestamp precision at same-millisecond boundaries.
- `AuditList` no longer filters an unlabelled top-200 sample locally; date
  presets, search, category, and severity all trigger server requests.
- Count copy is derived through the shared truthful count helper from response
  rows/cursor availability. Actual Previous/Next cursor controls remain
  explicitly owned by `TASK-357-04`.
- API refresh failures keep the previous rows visible with an error banner.
- The date range no-op gate was removed; remaining disabled audit controls stay
  assigned to `TASK-357-02`, `TASK-357-03`, or `TASK-357-04`.
- Playwright CLI verified restricted `audit:read` access and real query params
  for date preset, category, severity, and search.

### TASK-357-02: Audit Entry Actions Truthfulness

**Status:** Done (2026-06-01)

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
async function copyAuditEntryJson(entry: AuditLog) {
  const payload = JSON.stringify(buildPublicAuditEntryPayload(entry), null, 2);
  await navigator.clipboard.writeText(payload);
  toast.success("Audit entry copied.");
}

function buildPublicAuditEntryPayload(entry: AuditLog) {
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
- Redaction helper removes auth headers, reset tokens, CSRF tokens, and session
  ids in addition to tokens/cookies/password-like keys.
- Disabled actions are not focusable as active commands.
- Drawer and row menu use the same action implementation.

Completion notes:

- `Copy JSON` is active in both the row menu and details drawer.
- Both surfaces call the same shared copy implementation and write a redacted
  public payload to the Clipboard API with success/error toast feedback.
- The copied payload includes stable `createdAt`, display timestamp, visible row
  context, and redacted metadata.
- The drawer JSON textarea renders the same redacted payload helper.
- `Export entry`, `Share Log`, and `Report` remain disabled with explicit
  unavailable reasons; page-level export is owned by `TASK-357-03`.
- The Audit no-op gate now treats Copy JSON as implemented and keeps unsupported
  actions plus cursor navigation in the expected disabled set.

### TASK-357-03: Audit Export Contract

**Status:** Done (2026-06-01)

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
  return downloadAdminExport("/audit/export", request, {
    filenamePrefix: "audit-logs",
    withCsrf: true,
  });
}
```

Admin API path:

- Route registration must expose `POST /admin/api/audit/export`.
- The shared `downloadAdminExport` helper from `TASK-360-03` accepts admin
  API-relative paths like `/audit/export` and resolves them to
  `/admin/api/audit/export`; acceptance evidence must name the concrete
  registered route.
- The current `apiRequest` helper parses JSON only; this task must add or reuse
  a blob-capable `downloadAdminExport`/fetch helper instead of passing an
  unsupported `responseType` option to `apiRequest`.

Data flow:

1. User opens export dialog from `/admin/audit`.
2. Dialog receives active filter state from `AuditList`.
3. Dialog validates selected columns and format.
4. Client posts to `/admin/api/audit/export`.
5. Server re-validates filters, columns, RBAC, and row limit.
6. Server returns JSON export metadata/content or async export job metadata.
   Direct blob responses require explicit `httpServer`/router `Response`
   passthrough plus content-disposition tests in this task before use.
7. UI downloads from the JSON export contract or shows job status.

Error handling:

- `audit_export_invalid_columns`: keep dialog open and mark field selection.
- `audit_export_too_large`: show row-limit/async-job guidance.
- `audit_export_forbidden`: close sensitive payload state, show access-denied
  toast, and refresh current-user permissions.
- Network failure: keep dialog open with retry.

Regression tests:

- Dialog validates at least one selected column.
- Dialog must not expose an active `xlsx` option unless a real Excel export
  route, content type, and tests are implemented; otherwise `xlsx` is removed or
  disabled as unavailable by `TASK-360-03`.
- Export submit calls route with active filters.
- Route rejects unknown fields and unauthorized users.
- CSV escaping covers commas, quotes, and newlines.

Completion notes:

- Audit Logs page export now calls `exportAuditLogs()` with current filters and
  selected columns instead of showing unavailable copy.
- `POST /admin/api/audit/export` is backed by a strict body schema and the
  domain-owned format/column allowlist.
- Server export reuses `normalizeAuditLogQuery` and `listAudit`, redacts
  payload values, applies a 200-row sync limit, and returns the shared JSON file
  contract consumed by `downloadAdminExport`.
- CSV output escapes commas, quotes, newlines, and formula prefixes.
- JSON output includes exported-at metadata, selected columns, sanitized filter
  summary, row count, max rows, and redacted rows.
- Export attempts emit `audit.export` summary events without exported payload
  contents.
- Playwright downloaded a real CSV as a restricted `audit:read` user and proved
  the payload column was redacted.

### TASK-357-04: Pagination and Count Truthfulness

**Status:** Done (2026-06-01)

- Remove hard-coded `Showing 1 to X of 2,459 logs`.
- Render:
  - exact total only if returned by backend,
  - otherwise "Showing X logs" and "More results available".
- `Next` uses `nextCursor`; disabled when absent.
- `Previous` uses cursor stack or page state; disabled on first page.
- Search/filter changes reset pagination state.

Pseudocode:

```ts
type AuditPaginationState = {
  currentCursor: string | null;
  previousCursors: string[];
  nextCursor: string | null;
  visibleCount: number;
  totalCount?: number;
};

function resolveAuditCountCopy(state: AuditPaginationState) {
  if (typeof state.totalCount === "number") {
    return `Showing ${state.visibleCount} of ${state.totalCount} logs`;
  }
  return state.nextCursor
    ? `Showing ${state.visibleCount} logs. More results available.`
    : `Showing ${state.visibleCount} logs.`;
}

function resetAuditPaginationOnFilterChange() {
  setPagination({ currentCursor: null, previousCursors: [], nextCursor: null, visibleCount: 0 });
}
```

Data flow:

1. Query/filter state change resets cursor stack.
2. List request sends `cursor=currentCursor`.
3. Response updates `nextCursor`, visible row count, and optional total.
4. `Next` pushes current cursor onto `previousCursors`.
5. `Previous` pops from `previousCursors`.

Error handling:

- Invalid/expired cursor maps to `audit_cursor_invalid`, resets to first page,
  and shows non-destructive copy.
- Failed page load preserves the current visible page and exposes retry.

Regression tests:

- First page previous disabled.
- Next click uses returned cursor.
- Filter change resets page/cursor.
- No placeholder totals remain in snapshots.

Completion notes:

- Audit pagination now tracks requested and loaded page state separately, so
  failed page loads preserve the last successful rows and cursor controls.
- `Next` sends the server-provided `nextCursor`; `Previous` uses the loaded
  cursor stack and is disabled on the first page.
- Search, date range, category, and severity changes reset cursor state to the
  first page.
- Invalid or expired cursors recover to the first page with neutral copy instead
  of a hard failure banner.
- Audit export uses the active filter query without the current cursor, keeping
  export scope aligned to the filtered audit slice rather than the visible page.
- The UI no longer exposes the old `audit-next-page` no-op marker or hard-coded
  placeholder total.
- Playwright verified first/next/previous cursor behavior with a 55-row
  restricted `audit:read` fixture.

## Security Contract

Route family: audit logs.

- Endpoint visibility: internal admin only (`/admin/api/audit*`).
- Auth model: authenticated admin session.
- RBAC: `audit:read` for list/detail/export/read actions. Any future report
  mutation must require a dedicated write/report permission.
- CSRF: required for export POST if implemented as a write-like admin action.
- Rate-limit bucket: `admin_read` for list/detail and `admin_write` for export
  generation, matching `_docs/SECURITY_SPEC.md` bucket names.
- Reject unknown validation: strict query/body schemas for list/export.
- Anti-abuse: no public write endpoint; no nonce/HMAC/captcha required.
- Data redaction: export/copy/share must remove secrets, cookies, auth headers,
  password-like keys, reset tokens, CSRF tokens, and session ids unless the
  existing audit spec explicitly allows them.
- Audit: export action should emit an audit event with format/filter summary
  but not exported payload contents.

Per-endpoint contract matrix:

| Endpoint | Visibility | Auth/RBAC | CSRF | Rate bucket | Validation | Anti-abuse |
|---|---|---|---|---|---|---|
| `GET /admin/api/audit` | internal admin | session + `audit:read` | none, read-only | `admin_read` | strict query schema, clamped limit/cursor | no public write |
| `GET /admin/api/audit/:id` if added | internal admin | session + `audit:read` | none, read-only | `admin_read` | strict id param | no public write |
| `POST /admin/api/audit/export` | internal admin | session + `audit:read` | required | `admin_write` | strict body schema, column allowlist, clamped rows | no public write, redacted output |

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest UI tests for filters, copy, export dialog, pagination.
- Bun route/service tests for audit query normalization, RBAC, export, and CSV.
- Route registration tests for every new/changed audit route.
- Centralized `mapAuditError` coverage:
  - `TASK-357-01` owns `audit_query_invalid`, `audit_cursor_invalid`,
    `audit_forbidden`, and `audit_log_not_found` if a detail route is added.
  - `TASK-357-03` owns `audit_export_invalid_columns`,
    `audit_export_too_large`, and `audit_export_forbidden`.
- Playwright:
  - date range affects request/results,
  - copy JSON shows feedback,
  - export downloads or reports success,
  - pagination is real.
- Security/redaction tests for copied/exported payload.
- Before DB-backed route/service/Playwright tests: verify `DATABASE_URL` is
  reachable after `set -a && source .env && set +a`.
- Run `bun run gates:coderso` when audit/export release gates are touched.
- Run Semgrep/Trivy/Gitleaks commands from `_docs/SECURITY_SPEC.md` when
  redaction/export/security scanner behavior changes; otherwise record the
  remaining scanner validation as CI-only.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/AUDIT_SPEC.md`
- `_docs/CMS_API.md`
- `docs/guide/screens/audit-logs.md`
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

## Family Completion Notes

- `TASK-357-01` closed server-side query/date/category/severity filtering and
  strict cursor metadata.
- `TASK-357-02` closed row/drawer copy truthfulness and kept unsupported entry
  actions disabled with explicit reasons.
- `TASK-357-03` closed filtered CSV/JSON export through
  `/admin/api/audit/export`.
- `TASK-357-04` closed real cursor pagination and count truthfulness.
- Final click evidence is recorded in
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`.
