# TASK-358-01: Access Logs Query, Filters, and Pagination
# FileName: TASK-358-01_Access_Logs_Query_Filters_and_Pagination.md

**Priority:** High
**Category:** Admin API + Access Logs + Query + Pagination
**Estimated Effort:** Large
**Dependencies:** TASK-358, TASK-360-06
**Status:** To Do

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

- Filters update one query state, optionally mirrored into URL params if the
  route already follows that pattern.
- Query state reloads the list through the access logs client.
- Response metadata drives page buttons and count copy.
- Details drawer receives the selected row from current results.
- Search match context renders backend highlight/matched field if available, or
  deterministic local explanation when query matches non-visible fields.

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
- Rate-limit bucket: admin read.
- Reject unknown validation: strict query schema, clamped limit, validated
  date range and cursor.
- Anti-abuse: internal session route; no nonce, HMAC, or captcha.
- Privacy/redaction: actor/user filter and match context must not leak extra
  PII beyond the access log contract.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Bun domain/route tests for schema, custom date range, unknown param rejection,
  RBAC, cursor validation, and route registration.
- Vitest UI tests: custom range validation, query param propagation,
  backend-driven Next/Previous, search match explanation, and no static `1/2/3`
  pagination.
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

- Custom range, status, search, actor, limit, and cursor affect server query.
- Pagination is backend-driven.
- Search results explain hidden-field matches or avoid hidden-field confusion.

