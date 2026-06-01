# TASK-358: Admin Access Logs Report Remediation Family
# FileName: TASK-358_Admin_Access_Logs_Report_Remediation_Family.md

**Priority:** High
**Category:** Admin UI + Access Logs + Security Sessions + Export + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-357 shared audit/access export-query decisions, TASK-360-03 shared export dialog contract, changelog 1034 and `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md` audit evidence
**Status:** To Do

---

## Overview

Turn `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md` into an
execution-ready remediation family for `/admin/access-logs`.

The report proves that list loading, search, status/date filters, details, and
restricted `audit:read` access work. The gaps are security-facing no-ops and
misleading filters: `View full session`, `Revoke access`, custom range, sliders
advanced filter, static pagination, and close-only export.

## Source Evidence

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `core/admin/ui/security/AccessLogsPage.tsx`
- `core/admin/ui/security/AccessLogsTable.tsx`
- `core/admin/ui/security/AccessLogDetailsDrawer.tsx`
- `core/admin/ui/shared/ExportDialog.tsx`
- access log API/client/service owners discovered during implementation.

## Remediation Scope

| Finding | Required outcome |
|---|---|
| `View full session` has no handler | Link to a real session detail surface or render disabled/unavailable. |
| `Revoke access` has no handler | Implement real revoke with confirm/audit or remove/disable. |
| User filter is hard-coded roles | Use dynamic users/actors or relabel as role/query filter. |
| `Custom range` has no picker | Add date picker with validation or remove option. |
| Sliders button has no handler | Connect advanced filters drawer or remove/disable. |
| Pagination is static | Replace with real cursor/page state. |
| Export dialog does not export | Hook into shared export contract or hide final submit. |
| Search result match is unexplained | Show matched actor/email/resource context or adjust searchable fields/copy. |

## Refinement Checklist

16. **Revoke matrix:** before implementing revoke, classify every row state:
    current session, already revoked, no session id, expired session, other
    user's active session, and blocked/failed access attempt. Each state needs
    deterministic UI copy and tests.
17. **Actor privacy:** dynamic user/actor filters must not leak extra user PII
    to an `audit:read` user beyond the access log contract. Add a privacy test
    for restricted users.
18. **Search explanation:** when query matches hidden fields, show a matched
    field hint or adjust row columns so the user understands why the row is
    present.
19. **Custom range URL state:** custom date ranges should survive refresh/back
    navigation through query params, or the task must explicitly reject URL
    persistence and explain why.
20. **Export/revoke separation:** export can be available to `audit:read`, but
    revoke must require a stronger permission; tests must prove this split.

## Sub-Tasks

### TASK-358-01: Access Logs Query, Filters, and Pagination

**Status:** To Do

Implementation shape:

- Normalize list query params:
  - search `query`,
  - status,
  - date range preset,
  - custom `dateFrom` / `dateTo`,
  - user/actor filter,
  - limit,
  - cursor/page.
- Replace hard-coded page buttons with backend metadata.
- Search results should display why a row matched when the visible row cells do
  not contain the searched email/user.

Pseudocode:

```ts
type AccessLogQuery = {
  query?: string;
  status?: "allowed" | "blocked" | "failed";
  actorId?: string;
  actorRole?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  cursor?: string;
};

function resolveAccessLogDateRange(range: DateRangeSelection) {
  if (range.kind === "custom") {
    if (!range.from || !range.to || range.from > range.to) {
      throw new AccessLogFilterError("access_log_invalid_date_range");
    }
    return { dateFrom: startOfDayIso(range.from), dateTo: endOfDayIso(range.to) };
  }
  return presetToDateRange(range.kind);
}
```

Data flow:

1. Filters update a single query state.
2. Query state reloads list through access logs client.
3. Response metadata drives page buttons.
4. Drawer uses the selected row object from current results.
5. Search match context is rendered from backend highlight/matched field if
   available, otherwise from deterministic local explanation.

Regression tests:

- Custom range validates `from <= to`.
- Sliders/advanced filters button opens drawer or is absent.
- User filter uses dynamic actor/user data or is relabeled.
- Pagination uses backend `nextCursor` and no static `1/2/3`.

### TASK-358-02: Session Detail and Revoke Access Contract

**Status:** To Do

Implementation decision:

- Preferred full-scope path is required: access log rows that include or can
  resolve an active session id must support `View full session` and
  `Revoke access`.
- Rows without a resolvable active session must render both actions disabled
  with deterministic unavailable copy. Do not leave this as a product decision
  for implementers.
- Revoke must require a newly defined or existing explicit high-risk permission
  before implementation. If neither `sessions:write` nor `security:write`
  exists, define a dedicated `sessions:write`/equivalent permission in the
  task implementation; never fall back to `audit:read`.

Preferred revoke implementation:

```ts
type RevokeAccessRequest = {
  accessLogId: string;
  sessionId?: string;
  actorId?: string;
  reason: "admin_manual_revoke";
};

async function revokeAccessFromLog(input: RevokeAccessRequest) {
  return apiRequest<{ ok: boolean; revokedSessionId?: string }>(
    `/access-logs/${input.accessLogId}/revoke`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { withCsrf: true }
  );
}
```

Route/client contract:

- Browser client path: `/access-logs/:id/revoke` through `apiRequest`.
- Server route: `POST /admin/api/access-logs/:id/revoke`.
- Session detail navigation:
  `/admin/settings/security/sessions?sessionId=<id>` or a shared session drawer
  must be backed by the existing sessions client.

Error handling:

- Missing session relation returns a domain error like
  `access_log_session_not_found`.
- Already revoked sessions return idempotent success or clear conflict copy.
- Current session revoke must require extra confirmation or be blocked.

Regression tests:

- Revoke confirm cancel does not call API.
- Confirm calls API once and refreshes row/session state.
- Current session/self-lockout guard.
- Backend RBAC/CSRF validation.

### TASK-358-03: Access Logs Export

**Status:** To Do

- Reuse the `ExportDialog` contract from TASK-357 if landed first.
- Export payload must include active filters and selected fields.
- CSV/JSON output must redact secrets and request auth headers.
- Download success/error feedback required.

Pseudocode:

```ts
type AccessLogExportRequest = {
  format: "csv" | "json";
  columns: AccessLogExportColumn[];
  filters: AccessLogQuery;
};

async function exportAccessLogs(request: AccessLogExportRequest) {
  return downloadAdminExport("/access-logs/export", request, {
    filenamePrefix: "access-logs",
    withCsrf: true,
  });
}
```

Admin API path:

- Browser client path is `/access-logs/export` through `apiRequest`.
- Server route registration must expose it under
  `POST /admin/api/access-logs/export`.

Error handling:

- `access_log_export_invalid_columns`: keep dialog open and mark field
  selection.
- `access_log_export_too_large`: show row-limit/async guidance.
- `access_log_export_forbidden`: refresh permission snapshot and show
  access-denied copy.
- Network failure: keep dialog open and allow retry.

Regression tests:

- Export uses current status/date/search filters.
- Empty column selection is blocked.
- Unauthorized user cannot export.
- CSV output escapes user agent commas/newlines/quotes.

### TASK-358-04: Advanced Filters and User Filter Truthfulness

**Status:** To Do

- The sliders icon must either open a real advanced filter panel or disappear.
- The "User" filter must not contain static role labels unless the UI is
  explicitly renamed to "Role".
- If dynamic user list is added:
  - use cached/read-through safe user summaries,
  - avoid exposing email to users without the required permission,
  - show selected actor identity in active filter chips.

Pseudocode:

```ts
type AccessAdvancedFilters = {
  actorId?: string;
  actorRole?: string;
  method?: string;
  ip?: string;
};

function resolveAccessFilterLabel(filter: AccessAdvancedFilters) {
  if (filter.actorId) return "User";
  if (filter.actorRole) return "Role";
  return "Advanced filters";
}

function buildAccessLogQueryFromFilters(
  base: AccessLogQuery,
  advanced: AccessAdvancedFilters
): AccessLogQuery {
  return normalizeAccessLogQuery({
    ...base,
    actorId: advanced.actorId,
    actorRole: advanced.actorRole,
    method: advanced.method,
    ip: advanced.ip,
  });
}
```

Data flow:

1. Sliders button opens advanced filters drawer.
2. Drawer owns draft filter state.
3. Apply validates and normalizes into URL/query state.
4. List reloads from server and active chips reflect exact query semantics.

Error handling:

- Invalid IP/method values block apply and show field errors.
- Actor lookup failure leaves the text query usable and marks actor filter
  unavailable.
- Restricted users receive redacted actor summaries and no extra email list if
  not permitted.

Regression tests:

- Sliders button has a handler or is not rendered.
- Filter labels match actual query semantics.
- Restricted `audit:read` user does not receive extra user PII beyond what the
  access logs contract already allows.

## Security Contract

Route family: access logs and session revoke.

- Endpoint visibility: internal admin only (`/admin/api/access-logs*`,
  optional session revoke route).
- Auth model: authenticated admin session.
- RBAC:
  - `audit:read` for list/detail/export.
  - Revoke requires `sessions:write`, `security:write`, or a newly defined
    equivalent high-risk permission. It must not fall back to `audit:read`.
- CSRF: required for export POST and revoke POST.
- Rate-limit bucket: admin read for list/detail, admin write/security-sensitive
  bucket for revoke.
- Reject unknown validation: strict query/body schemas.
- Anti-abuse: no public write endpoint; no nonce/HMAC/captcha required.
- Redaction: exports and details must not include cookies, authorization
  headers, CSRF tokens, reset tokens, or raw secrets.
- Audit: revoke access and export actions emit audit events with summary only.
- Self-lockout: revoking the current session must require explicit extra
  confirmation or be blocked.

Per-endpoint contract matrix:

| Endpoint | Visibility | Auth/RBAC | CSRF | Rate bucket | Validation | Anti-abuse |
|---|---|---|---|---|---|---|
| `GET /admin/api/access-logs` | internal admin | session + `audit:read` | none, read-only | admin read | strict query schema, clamped limit/cursor | no public write |
| `GET /admin/api/access-logs/:id` if added | internal admin | session + `audit:read` | none, read-only | admin read | strict id param | no public write |
| `POST /admin/api/access-logs/export` | internal admin | session + `audit:read` | required | export/admin write bucket | strict body schema, column allowlist | no public write, redacted output |
| `POST /admin/api/access-logs/:id/revoke` | internal admin | session + high-risk session/security write permission | required | security-sensitive/admin write | strict id/body schema, self-lockout guard | no public write, audit event |

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI tests for filters, custom date range, details drawer, disabled or
  real actions, export, pagination.
- Bun route/service tests for access log query validation, export, revoke,
  RBAC, CSRF, and audit event.
- Route registration tests for every new/changed access-log route.
- Centralized `mapAccessLogError` coverage for `access_log_query_invalid`,
  `access_log_cursor_invalid`, `access_log_not_found`,
  `access_log_session_not_found`, `access_log_revoke_forbidden`,
  `access_log_export_invalid_columns`, and `access_log_export_too_large`.
- Playwright:
  - restricted `audit:read` can read but cannot revoke,
  - custom range affects request,
  - export downloads or is disabled,
  - revoke requires confirm when enabled,
  - pagination changes data.
- Before DB-backed route/service/Playwright tests: verify `DATABASE_URL` is
  reachable after `set -a && source .env && set +a`.
- Run `bun run gates:coderso` when audit/session/security release gates are
  touched.
- Run Semgrep/Trivy/Gitleaks commands from `_docs/SECURITY_SPEC.md` when
  redaction/session revoke/security scanner behavior changes; otherwise record
  the remaining scanner validation as CI-only.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_UI_AUDIT.md`
- `_docs/AUDIT_SPEC.md`
- `_docs/AUTH_SPEC.md` / `_docs/RBAC_SPEC.md` if revoke permission changes.
- `_docs/CMS_API.md`
- `docs/guide/screens/access-logs.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if dynamic actor/user
  summaries introduce a cached admin resource.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1048-2026-06-01-task-358-admin-access-logs-remediation-family.md`

## Acceptance Criteria

- No destructive-looking access log control is a silent no-op.
- Filters and pagination are truthful and backed by state/API.
- Export works or is visibly unavailable.
- Restricted users with only `audit:read` cannot revoke sessions/access.
- Report findings are updated with implementation evidence and tests.
- Every access-log row action has an explicit enabled, disabled, or unavailable
  state for each revoke matrix case.
