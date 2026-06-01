# TASK-357-01: Server-Side Audit Query Contract
# FileName: TASK-357-01_Server_Side_Audit_Query_Contract.md

**Priority:** High
**Category:** Admin API + Audit Logs + Query + Pagination
**Estimated Effort:** Large
**Dependencies:** TASK-357, TASK-360-06
**Status:** To Do

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
