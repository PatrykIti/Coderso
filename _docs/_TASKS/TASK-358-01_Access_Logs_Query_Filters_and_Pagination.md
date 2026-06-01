# TASK-358-01: Access Logs Query, Filters, and Pagination
# FileName: TASK-358-01_Access_Logs_Query_Filters_and_Pagination.md

**Priority:** High
**Category:** Admin API + Access Logs + Query + Pagination
**Estimated Effort:** Large
**Dependencies:** TASK-358, TASK-360-06
**Status:** Done (2026-06-01)

---

## Overview

Normalize `/admin/access-logs` search, status, date, actor/user, limit, and
cursor state into a strict server-side query contract with truthful pagination
and match explanation.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `core/admin/ui/security/AccessLogsPage.tsx`
- `core/admin/ui/security/AccessLogsTable.tsx`
- Access log API/client/service owners discovered during implementation

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Access log query domain/service module | Own strict schema, date preset/custom range normalization, clamped limit, and cursor validation. |
| Access log route module | Enforce `audit:read`, reject unknown params, return pagination metadata and optional match context. |
| Access logs admin client | Send normalized query params and surface mapped validation/cursor errors. |
| `core/admin/ui/security/AccessLogsPage.tsx` | Use one query state for search/status/date/actor/advanced filters and reset cursor on change. |
| `core/admin/ui/security/AccessLogsTable.tsx` | Render backend-driven pagination and match context. |
| Tests | Cover custom range, dynamic query params, pagination, and no static buttons. |

## Implementation Pseudocode

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

- Filters update one query state, optionally mirrored into URL params if the
  route already follows that pattern.
- The client/router wire contract keeps the existing `q`, `from`, and `to`
  query params. `query`, `dateFrom`, and `dateTo` are internal normalized names
  only unless the implementation deliberately migrates routes, clients, docs,
  and compatibility aliases in the same task.
- The implementation preserves the current backend status vocabulary
  `success|failed` unless it deliberately extends the schema, docs, and tests
  to distinguish blocked/allowed states.
- Do not add `actorRole` as a server query field unless the task also defines
  current-role join vs historical role snapshot semantics and tests the privacy
  impact. Current access logs do not store role snapshots.
- Query state reloads the list through the access logs client.
- Response metadata drives page buttons and count copy.
- Details drawer receives the selected row from current results.
- Search match context renders backend highlight/matched field if available, or
  deterministic local explanation when query matches non-visible fields.
- Advanced method/IP drawer controls are owned by `TASK-358-04`; this leaf only
  owns the server query fields and cursor contract they submit into.

Error handling:

- Custom range blocks apply when `from > to`.
- Unknown query params map to `access_log_query_invalid`.
- Invalid cursor resets to first page with non-destructive copy.
- Failed page load preserves visible rows with retry.

## Security Contract

- Endpoint visibility: internal admin, `GET /admin/api/access-logs`.
- Auth model: authenticated admin session.
- RBAC: `audit:read` required.
- CSRF: none; read-only.
- Rate-limit bucket: `admin_read`.
- Reject unknown validation: strict query schema, clamped limit, validated
  date range and cursor.
- Anti-abuse: internal session route; no nonce, HMAC, or captcha.
- Privacy/redaction: user/actor filter and match context must not leak extra
  PII beyond the access log contract.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Bun domain/route tests for schema, custom date range, unknown param rejection,
  RBAC, cursor validation, and route registration.
- Vitest UI tests: custom range validation, query param propagation,
  backend-driven Next/Previous, search match explanation, and no static `1/2/3`
  pagination. Sliders/advanced-filter trigger behavior is covered by
  `TASK-358-04`.
- Playwright restricted `audit:read` fixture verifies list/read access and
  truthful pagination.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ACCESS_LOGS.md`
- `_docs/CMS_API.md`
- `_docs/AUDIT_SPEC.md`
- `docs/guide/screens/access-logs.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Custom range, status, search, user, limit, and cursor affect server
  query.
- Pagination is backend-driven.
- Search results explain hidden-field matches or avoid hidden-field confusion.

## Completion Notes

- Access log query normalization is now service-owned and covers `limit`,
  `q`/`query`, `status`, `userId`, `method`, `ip`, `from`, `to`, and `cursor`.
- `GET /admin/api/access-logs` accepts strict `cursor`, `method`, and `ip`
  query params, maps malformed cursors to `access_log_cursor_invalid`, and
  returns `{ items, nextCursor }`.
- `listAccessLogs` uses keyset pagination ordered by `createdAt DESC, id DESC`,
  fetches `limit + 1`, and returns an opaque `nextCursor`.
- Access Logs UI now uses `limit=50`, real custom range `from`/`to` inputs,
  exact `User ID` filtering, and loaded-vs-requested cursor page state for
  Next/Previous.
- Custom range validation blocks reversed or incomplete ranges without
  refetching and preserves the last successful rows.
- Search match labels such as `Matched user email` explain hidden-field
  matches without adding new raw PII values.
- The old `access-custom-range` and `access-next-page` no-op markers are gone;
  advanced filters remain explicitly owned by `TASK-358-04`.
- Playwright verified restricted `audit:read` access, custom range request
  params, Next with cursor, Previous without cursor, and email match labels.
