# TASK-357-01: Server-Side Audit Query Contract
# FileName: TASK-357-01_Server_Side_Audit_Query_Contract.md

**Priority:** High
**Category:** Admin API + Audit Logs + Query + Pagination
**Estimated Effort:** Large
**Dependencies:** TASK-357, TASK-360-06
**Status:** Done (2026-06-01)

---

## Overview

Move `/admin/audit` filters to a strict server-side query contract so date
range, search, category/type, severity, limit, and cursor state drive real
results and not local-only or placeholder UI.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `core/admin/ui/audit/AuditList.tsx`
- `core/admin/ui/audit/AuditFilters.tsx`
- `core/admin/ui/audit/AuditTable.tsx`
- Audit log API route/client/service owners discovered during implementation

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Audit query domain/service module | Own strict schema, defaults, clamped limits, UTC date normalization, and cursor validation. |
| Audit route module | Validate query params, enforce `audit:read`, and return pagination metadata. |
| Audit admin client | Send normalized query params and surface mapped validation/cursor errors. |
| `core/admin/ui/audit/AuditFilters.tsx` | Emit filter state that maps directly to server query semantics. |
| `core/admin/ui/audit/AuditList.tsx` | Load list via server query and render only response-derived count/page state. |
| Tests | Cover schema, RBAC, date ranges, cursor, and UI query propagation. |

## Implementation Pseudocode

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
  const parsed = auditLogQuerySchema.parse(input);
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

- `AuditFilters` updates a single filter/query state.
- `AuditList` builds a strict query object and passes it to the audit client.
- Server validates query params, applies RBAC, normalizes date boundaries to
  UTC instants, and returns `{ items, nextCursor, totalApprox? }`.
- Category/severity filtering must be backed by a real server contract. The
  current DB table owns `action`, `targetType`, `metadata`, and `createdAt`,
  while the UI owns `category`/`severity`; implementation must either derive
  those values deterministically or add a documented schema change with tests.
- Table count and pagination copy use response metadata only.
- Remove the current unlabelled fetch-all/top-200 local filtering behavior; no
  count, chip, pagination state, or export scope may imply full-server results
  when only a capped local sample was filtered.

Error handling:

- Invalid date ranges show inline validation and do not submit.
- Unknown query params are rejected at the route/service boundary.
- Server validation errors map to `audit_query_invalid`.
- Invalid cursors map to `audit_cursor_invalid`.
- Network/API errors preserve previous visible results with a retry banner when
  possible.

## Security Contract

- Endpoint visibility: internal admin, `GET /admin/api/audit`.
- Auth model: authenticated admin session.
- RBAC: `audit:read` required.
- CSRF: none; route is read-only.
- Rate-limit bucket: `admin_read`.
- Reject unknown validation: strict query schema, clamped limit, validated date
  range and cursor.
- Anti-abuse: internal session route; no nonce, HMAC, or captcha.
- Redaction: list payload must use existing audit redaction rules.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Bun domain/service tests for query normalization, unknown-param rejection,
  limit clamping, date boundary normalization, and invalid cursor mapping.
- Bun tests for server-backed category/severity filtering or the documented
  deterministic derivation used to preserve the UI semantics.
- Bun route tests for `audit:read`, missing permission access denied, strict
  query validation, and route registration.
- Vitest UI tests for date range query params, search/category/severity
  propagation, API error banner, and no fake totals.
- Playwright restricted `audit:read` fixture verifies read access with real
  date range query behavior.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `_docs/CMS_API.md`
- `_docs/AUDIT_SPEC.md`
- `docs/guide/screens/audit-logs.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Date range changes affect server query state.
- Unknown query params are rejected.
- Audit table count/page copy is derived only from backend metadata.
- The previous 200-row client-filter cap is removed or clearly replaced by a
  truthful server-backed response contract.

## Completion Notes

- `/admin/api/audit` now uses strict query params `limit`, `q`, `category`,
  `severity`, `from`, `to`, and `cursor`; unknown params are rejected before
  service work.
- The route maps invalid query payloads to `audit_query_invalid` and invalid
  cursors to `audit_cursor_invalid`, while keeping `audit:read` as the route
  permission guard.
- Audit query normalization owns limit clamping, trimmed search text, UTC date
  boundary normalization, date range validation, and cursor validation in the
  audit service contract.
- Audit category/severity derivation moved into a DB-free audit classification
  helper. Server SQL predicates mirror the same rules, including
  `targetType=session`, singular/plural session actions, case-insensitive
  content targets, authentication precedence over content, and explicit
  `metadata.severity` precedence.
- Service-level category/severity validation uses admin query convention errors
  so invalid values map to `audit_query_invalid` even outside the route schema.
- `listAudit` now applies search/category/severity/date/cursor filters before
  limit, orders by `createdAt DESC, id DESC`, fetches `limit + 1`, and returns
  `nextCursor`. Cursor payloads preserve database timestamp precision so
  same-millisecond rows are not skipped at page boundaries.
- `AuditList` now sends server query params for search, date preset,
  category/type, and severity instead of filtering an unlabelled top-200 sample
  locally. Failed refreshes preserve the previously visible rows with an error
  banner.
- The date range control is no longer a no-op. The custom range option remains
  out of scope until real `from`/`to` inputs are added; current presets are
  `Last 7 days`, `Last 30 days`, and `This month`.
- `AuditTable` count copy is derived through the shared truthful count helper
  from backend response metadata (`items.length` and `nextCursor`) and no longer
  invents placeholder totals; interactive cursor navigation remains owned by
  `TASK-357-04`.
- Audit list remains uncached. No `_docs/ADMIN_CACHE.md` or
  `_docs/ADMIN_CACHE_MAP.md` update is required for this leaf.
- Playwright CLI verified a restricted `audit:read` user can log in, load
  `/admin/audit`, change date/category/severity/search filters, and produce
  strict `/admin/api/audit` query params without the old fake total.
