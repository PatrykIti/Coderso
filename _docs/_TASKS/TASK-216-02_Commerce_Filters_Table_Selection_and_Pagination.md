# TASK-216-02: Commerce Filters, Table, Selection, and Pagination
# FileName: TASK-216-02_Commerce_Filters_Table_Selection_and_Pagination.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-216-01, TASK-205
**Status:** Done (2026-04-26)

---

## Overview

Bring the Commerce catalog read model, filter bar, product table, checkbox
selection, and shared pagination to Pages parity while preserving Commerce
product fields and collection enrichment.

## Sub-Tasks

- [x] TASK-216-02-01: Commerce Filter Model and Collection Enrichment
- [x] TASK-216-02-02: Product Table Selection and Commerce Columns
- [x] TASK-216-02-03: Shared Pagination and Visible Selection

## Security Contract

- Visibility: internal Commerce admin UI.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: `commerce:read`.
- CSRF: no writes in this subtask.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: filters are client-side view state over cached
  products/collections; do not send new ad hoc payloads to the server.
- Anti-abuse: filter labels and missing collection fallbacks must be bounded and
  must not expose raw payloads.

## Testing Requirements

- Search/status/collection/stock filters produce deterministic visible rows.
- Filter changes reset pagination and trim selection.
- Table supports select-all for visible rows only.
- Empty states distinguish no products from no products matching filters.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Commerce filters and product table match Pages list ergonomics.
2. Selection is derived from visible paginated products only.
3. Product records are not mutated while building filter/enriched view models.

## Closure Evidence

- Completed on 2026-04-26 as part of TASK-216 Commerce catalog list parity.
- Validation: `bun --cwd core lint`, `bun --cwd core lint:types`, targeted Vitest Commerce UI/admin/pagination/toast/prefetch suites, `bun test tests/integration/routes/commerceRoutes.test.ts` outside sandbox with repo env, and Commerce runtime smoke tests outside sandbox with repo env.
- Gate note: `bun run gates:coderso` was attempted and remains blocked by the pre-existing stale Functional UI smoke paths under `tests/unit/ui/*`; current matching UI suites live under `tests/vitest/ui/*`.
