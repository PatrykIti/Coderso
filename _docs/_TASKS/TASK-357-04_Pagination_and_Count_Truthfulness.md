# TASK-357-04: Pagination and Count Truthfulness
# FileName: TASK-357-04_Pagination_and_Count_Truthfulness.md

**Priority:** High
**Category:** Admin UI + Audit Logs + Pagination Truthfulness
**Estimated Effort:** Medium
**Dependencies:** TASK-357-01, TASK-360-06
**Status:** Done (2026-06-01)

---

## Overview

Remove placeholder Audit totals and inert pagination. Count copy and Previous/
Next state must be driven only by backend metadata.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `core/admin/ui/audit/AuditList.tsx`
- `core/admin/ui/audit/AuditTable.tsx`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/audit/AuditList.tsx` | Own cursor stack/page state and reset on filter changes. |
| `core/admin/ui/audit/AuditTable.tsx` | Render truthful count copy and disable buttons from response metadata. |
| Audit admin client/types | Expose `nextCursor`, optional exact/approx total, and visible item count. |
| Tests | Cover first/next/previous pages, filter reset, invalid cursor, and no placeholder totals. |

## Implementation Pseudocode

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
```

Data flow:

- Query/filter state changes reset `currentCursor`, `previousCursors`, and
  `nextCursor`.
- List request sends `cursor=currentCursor`.
- Response updates `nextCursor`, visible row count, and optional total.
- Next pushes current cursor onto `previousCursors` and loads returned cursor.
- Previous pops from `previousCursors`.

Error handling:

- Invalid/expired cursor maps to `audit_cursor_invalid`, resets to first page,
  and shows non-destructive copy.
- Failed page load preserves current visible page and exposes retry.
- If backend does not return exact total, UI must not invent one.

## Security Contract

- Endpoint visibility: internal admin `GET /admin/api/audit`.
- Auth model: authenticated admin session.
- RBAC: `audit:read` required.
- CSRF: none; read-only.
- Rate-limit bucket: `admin_read`.
- Reject unknown validation: strict query schema and cursor validation from
  `TASK-357-01`.
- Anti-abuse: internal session route; no nonce, HMAC, or captcha.
- Redaction: unchanged audit list redaction.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI: first page Previous disabled.
- Vitest UI: Next uses returned cursor.
- Vitest UI: Previous uses cursor stack.
- Vitest UI: filter/search/date change resets pagination.
- Vitest UI snapshots/text assertions prove no hard-coded `2,459 logs` or
  static page numbers remain.
- Bun route/service cursor validation tests from `TASK-357-01` stay green.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_AUDIT_LOGS.md`
- `docs/guide/screens/audit-logs.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Audit list shows exact totals only when returned by backend.
- Next/Previous state follows real cursor metadata.
- Search/filter changes reset pagination state.

## Completion Notes

- `AuditList` now owns requested vs loaded cursor page state so failed next-page
  loads preserve the last successful page instead of drifting UI controls.
- `Next` sends the response-provided `nextCursor`; `Previous` uses the loaded
  cursor stack and is disabled on the first page.
- Search, date range, category, and severity changes reset pagination to the
  first page.
- Invalid or expired cursors map to a neutral recovery notice and reload the
  first page without inventing totals.
- Page-level export uses the active filter query without the current page
  cursor, so export remains a filtered-slice action rather than a single-page
  export.
- The old `audit-next-page` no-op marker and hard-coded `2,459 logs` count are
  covered by Vitest regression tests.
- Playwright verified first/next/previous cursor navigation with a 55-row
  restricted `audit:read` fixture.
