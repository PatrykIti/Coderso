# TASK-358: Admin Access Logs Report Remediation Family
# FileName: TASK-358_Admin_Access_Logs_Report_Remediation_Family.md

**Priority:** High
**Category:** Admin UI + Access Logs + Security Sessions + Export + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-359-05 settings security session contract, TASK-360-02 shared confirm pattern, TASK-360-03 shared export dialog contract, TASK-360-04 no-op control gate, TASK-360-06 server-side query and pagination conventions, changelog 1089 and `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md` audit evidence
**Status:** Done (2026-06-01)

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
| Pagination is static | Replace with real cursor state. |
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

Physical execution leaves:

- `TASK-358-01_Access_Logs_Query_Filters_and_Pagination.md`
- `TASK-358-02_Session_Detail_and_Revoke_Access_Contract.md`
- `TASK-358-03_Access_Logs_Export.md`
- `TASK-358-04_Advanced_Filters_and_User_Filter_Truthfulness.md`

### TASK-358-01: Access Logs Query, Filters, and Pagination

**Status:** Done (2026-06-01)

Implementation shape:

- Normalize list query params:
  - search `query` internally while preserving current wire param `q`,
  - status,
  - date range preset,
  - custom `dateFrom` / `dateTo` internally while preserving current wire
    params `from` / `to`,
  - user filter,
  - limit,
  - cursor.
- Replace hard-coded page buttons with backend metadata.
- Search results should display why a row matched when the visible row cells do
  not contain the searched email/user.

Pseudocode:

```ts
type AccessLogQuery = {
  query?: string;
  status?: "success" | "failed";
  userId?: string;
  method?: string;
  ip?: string;
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

function toAccessLogWireQuery(query: AccessLogQuery) {
  return {
    q: query.query,
    status: query.status,
    userId: query.userId,
    method: query.method,
    ip: query.ip,
    from: query.dateFrom,
    to: query.dateTo,
    limit: query.limit,
    cursor: query.cursor,
  };
}
```

Data flow:

1. `TASK-358-01` owns the backend list query, date/status/search/user filters,
   cursor metadata, and search match explanation.
2. `TASK-358-04` owns the sliders/advanced drawer and adds method/IP/user UI
   affordances on top of the query contract.
3. Filters update a single query state.
4. Query state reloads list through access logs client.
5. Response metadata drives page buttons.
6. Drawer uses the selected row object from current results.
7. Search match context is rendered from backend highlight/matched field if
   available, otherwise from deterministic local explanation.

Regression tests:

- Custom range validates `from <= to`.
- Sliders/advanced filters button opens drawer or is absent.
- User filter uses dynamic actor/user data or is relabeled.
- Role filtering is not part of the server query unless the implementation adds
  explicit current-role join or historical role snapshot semantics with tests.
- Pagination uses backend `nextCursor` and no static `1/2/3`.

Completion notes:

- Access log query normalization moved into the access service contract and now
  covers `limit`, `q`/`query`, `status`, `userId`, `method`, `ip`, `from`, `to`,
  and `cursor`.
- `GET /admin/api/access-logs` validates strict query params, maps malformed
  cursors to `access_log_cursor_invalid`, and returns `{ items, nextCursor }`.
- The service uses keyset pagination ordered by `createdAt DESC, id DESC` and
  returns an opaque `nextCursor` from `limit + 1` fetching.
- `/admin/access-logs` now uses real custom date inputs, exact `User ID`
  filtering, cursor-backed Next/Previous controls, and match labels for hidden
  query matches such as email.
- Custom range validation preserves the previous rows and blocks refetch until
  the range is complete and ordered.
- `access-custom-range` and `access-next-page` are no longer no-op controls.
  `access-advanced-filters` was closed later by `TASK-358-04`.
- Playwright verified restricted `audit:read` access, custom range params,
  Next/Previous cursor behavior, and email match labels.

### TASK-358-02: Session Detail and Revoke Access Contract

**Status:** Done (2026-06-01)

Implementation decision:

- Preferred full-scope path is required: access log rows that include or can
  resolve an active session id must support `View full session` and
  `Revoke access`.
- The current `access_logs` rows do not include `sessionId`. Before enabling real
  view/revoke, add a deterministic session relation such as nullable
  `session_id` on `access_logs`, update `logAccess` for future rows, and ship
  full migration artifacts (SQL, `meta/*_snapshot.json`, `_journal.json`). Old
  rows without a session relation must render unavailable states.
- Rows without a resolvable active session must render both actions disabled
  with deterministic unavailable copy. Do not leave this as a product decision
  for implementers.
- Revoke must require a high-risk write permission and must never fall back to
  `audit:read`. The current v1 sessions routes use `settings:write`; if the
  implementation introduces a narrower `sessions:write`/`security:write`
  permission, it must update RBAC defaults, route tests, `_docs/RBAC_SPEC.md`,
  and `_docs/CMS_API.md` in the same task.

Preferred revoke implementation:

```ts
type RevokeAccessRequest = {
  accessLogId: string;
  reason: "admin_manual_revoke";
};

async function revokeAccessFromLog(input: RevokeAccessRequest) {
  return apiRequest<{ ok: boolean; revokedSessionId?: string }>(
    `/access-logs/${input.accessLogId}/revoke`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: input.reason }),
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
  must be backed by the existing sessions client and current settings session
  RBAC. Users with only `audit:read` may see access log details but must see
  full session/revoke as unavailable unless they also have the required settings
  session permission.

Error handling:

- Missing session relation returns a domain error like
  `access_log_session_not_found`.
- Historical rows without `sessionId` render unavailable copy and must not call
  the revoke route.
- Already revoked sessions return idempotent success or clear conflict copy.
- Current session revoke must require extra confirmation or be blocked.

Regression tests:

- Revoke confirm cancel does not call API.
- Confirm calls API once and refreshes row/session state.
- Current session/self-lockout guard.
- Backend RBAC/CSRF validation.

Completion notes:

- Added nullable `access_logs.session_id` plus full Drizzle migration artifacts
  and logging updates so future post-auth access rows resolve deterministically
  to sessions.
- Access log rows now expose truthful session states and permission-gated
  capabilities; audit-only users do not receive raw session ids, user ids,
  session timing, or current-session booleans.
- `View full session` is backed by Settings Security Sessions and carries
  `sessionId` plus gated `userId` for another user's active linked session.
- `Revoke access` posts one CSRF-protected `settings:write` request, resolves
  the target session server-side, blocks self-lockout, handles expired/missing
  sessions with mapped errors, and treats already-revoked sessions idempotently.
- The access-log drawer uses the shared typed confirm dialog and refreshes the
  open row to `Session already revoked` after success.
- Playwright verified restricted `audit:read` disabled states and cross-user
  settings-write view/revoke with screenshot evidence
  `.tmp/task-358-02-session-revoke.png`.

### TASK-358-03: Access Logs Export

**Status:** Done (2026-06-01)

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

- Route registration must expose `POST /admin/api/access-logs/export`.
- The shared `downloadAdminExport` helper from `TASK-360-03` accepts admin
  API-relative `/access-logs/export` and resolves it to
  `/admin/api/access-logs/export`; acceptance evidence must name the concrete
  registered route.
- If the shared dialog still exposes `xlsx`, remove/disable it as unavailable
  unless a real Excel content type, backend export, and tests are implemented.

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

Completion notes:

- Added real `POST /admin/api/access-logs/export` with `audit:read`, CSRF,
  strict body validation, column allowlist, CSV/JSON file response semantics,
  row cap, redaction, export audit event metadata, and route error mapping.
- Wired the Access Logs `Export` action to the shared admin export dialog with
  active filters and selected allowlisted fields.
- Playwright verified CSV and JSON submits from the UI with marker/user/status
  filters, no cursor in export payloads, redacted secret-bearing `path` and
  `userAgent`, and evidence files
  `.tmp/task-358-03-access-export.png`,
  `.tmp/task-358-03-access-export.csv`, and
  `.tmp/task-358-03-access-export.json`.

### TASK-358-04: Advanced Filters and User Filter Truthfulness

**Status:** Done (2026-06-01)

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
  userId?: string;
  method?: string;
  ip?: string;
};

function resolveAccessFilterLabel(filter: AccessAdvancedFilters) {
  if (filter.userId) return "User";
  return "Advanced filters";
}

function buildAccessLogQueryFromFilters(
  base: AccessLogQuery,
  advanced: AccessAdvancedFilters
): AccessLogQuery {
  return normalizeAccessLogQuery({
    ...base,
    userId: advanced.userId,
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

Completion notes:

- The sliders button now opens a real `Advanced access filters` sheet with
  draft `HTTP method` and `IP contains` controls.
- Method filters are normalized to uppercase and validated against supported
  methods; IP filters accept only IPv4/IPv6 substring characters before they
  are added to the server query.
- Active filter chips now make the exact scope visible for search, exact
  `User ID`, status, non-default date ranges, method, and IP contains.
- Role filtering remains intentionally absent because access log rows do not
  store historical role snapshots. No user/role summary endpoint was added, so
  restricted `audit:read` users do not receive extra directory PII.
- Playwright verified applying method/IP filters, chips, method-chip clearing,
  and zero `/admin/api/users` or `/admin/api/roles` lookup requests. Evidence
  screenshot: `.tmp/task-358-04-advanced-filters.png`.

## Security Contract

Route family: access logs and session revoke.

- Endpoint visibility: internal admin only (`/admin/api/access-logs*` and the
  required revoke route `POST /admin/api/access-logs/:id/revoke`).
- Auth model: authenticated admin session.
- RBAC:
  - `audit:read` for list/detail/export.
  - Revoke uses the current v1 `settings:write` session-management contract
    unless the implementation deliberately migrates to `sessions:write`,
    `security:write`, or another high-risk permission with RBAC defaults, route
    tests, `_docs/RBAC_SPEC.md`, and `_docs/CMS_API.md` updated in the same
    task. It must not fall back to `audit:read`.
- CSRF: required for export POST and revoke POST.
- Rate-limit bucket: `admin_read` for list/detail and `admin_write` for export
  and revoke. If a narrower security-sensitive bucket is introduced later, it
  must first be added to `_docs/SECURITY_SPEC.md`, runtime bucket selection,
  route tests, and release gates.
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
| `GET /admin/api/access-logs` | internal admin | session + `audit:read` | none, read-only | `admin_read` | strict query schema, clamped limit/cursor | no public write |
| `GET /admin/api/access-logs/:id` if added | internal admin | session + `audit:read` | none, read-only | `admin_read` | strict id param | no public write |
| `POST /admin/api/access-logs/export` | internal admin | session + `audit:read` | required | `admin_write` | strict body schema, column allowlist | no public write, redacted output |
| `POST /admin/api/access-logs/:id/revoke` | internal admin | session + current `settings:write` or fully migrated high-risk session/security write permission | required | `admin_write` | strict id/body schema, self-lockout guard | no public write, audit event |

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
- DB-backed tests for new `session_id` relation must use uniquely scoped
  fixtures and only clean up rows they create.
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
