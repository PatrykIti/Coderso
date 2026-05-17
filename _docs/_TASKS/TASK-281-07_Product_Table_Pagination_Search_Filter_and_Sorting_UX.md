# TASK-281-07: Product Table Pagination Search Filter and Sorting UX

# FileName: TASK-281-07_Product_Table_Pagination_Search_Filter_and_Sorting_UX.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Public Query UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-281, TASK-281-01, TASK-281-02, TASK-281-05, TASK-256-04
**Status:** To Do

---

## Overview

Add Product Table-owned front-end query controls for larger catalogs. This leaf
covers `UX-02`, `UX-04`, `UX-06`, `UX-08`, and `BF-15` from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

Current state: source `search`, status, collection filters, sort field, sort
direction, and limit are configured only by the admin. The public table is
static after SSR hydration and cannot paginate, search, filter, or sort.

## Scope Boundary

In scope:

- schema-owned controls for enabling public search, filters, sort headers, and
  pagination/load-more;
- bounded public query payload shape using existing commerce query semantics;
- visible active sort/filter/search state and loading/error states;
- admin preview diagnostics for enabled public controls.

Out of scope:

- exposing arbitrary query builders to public visitors;
- provider-specific search engines or client-side provider secrets;
- bulk selection/admin operations;
- changing commerce product CRUD.

## Sub-Tasks

- [ ] Add schema-owned Product Table controls for search, filters, sorting, and
  pagination mode.
- [ ] Define the public/admin query payload and strict validation clamps.
- [ ] Add public control markup with accessible loading, empty, and error
  states.
- [ ] Add route/client behavior only after the route security contract is
  explicit.
- [ ] Add renderer/editor/runtime/route tests for the chosen query-control path.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add `controls` schema/defaults/normalizer, public control markup, data attributes, and accessible state output. |
| `core/services/commerce/commerceWidgetRuntime.ts` | Support offset/page metadata if server-side pagination uses runtime hydration. |
| `core/services/commerce/commerceRuntimeResolver.ts` | Keep public queries published-safe unless preview/auth state intentionally allows draft rows. |
| `core/server/routes/commerceRoutes.ts` and validation schemas | Add or reuse a strictly validated public/admin Product Table query route if client-side controls require JSON refresh. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Add editor controls for public search, filters, sort, and pagination mode. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert controls render with accessible labels, safe defaults, and bounded data attributes. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Assert editor controls normalize Product Table `controls` fields. |
| `tests/unit/commerce/commerceWidgetRuntime.test.ts` | Assert query pagination/status behavior if runtime hydration changes. |
| Route validation/error tests | Add if a public or admin Product Table query endpoint is introduced. |

## Implementation Pseudocode

Data shape:

```ts
type ProductTableControls = {
  search?: "none" | "client" | "server";
  filters?: "none" | "collections" | "status" | "collections-status";
  sorting?: "none" | "indicator" | "interactive";
  pagination?: "none" | "load-more" | "paged";
  pageSize?: number;
};
```

Public query input:

```ts
function buildProductTablePublicQuery(
  data: ProductTableData,
  state: ProductTableRuntimeState
) {
  const normalized = normalizeProductTableData(data);
  return {
    ...buildProductTableQueryInput(normalized),
    search: clampSearch(state.search),
    status: resolveAllowedPublicStatus(normalized.source?.status, state.status),
    collectionIds: intersectAllowedCollections(normalized.source?.collectionIds, state.collectionIds),
    pagination: {
      limit: clampPageSize(normalized.controls?.pageSize),
      offset: clampOffset(state.page),
    },
  };
}
```

Error handling:

- Empty search resets to the admin-configured source query.
- Sort fields are limited to the current schema enum.
- Page size is clamped below or equal to the Product Table max.
- Public runtime must not return draft/archived products unless current preview
  mode or admin-authenticated behavior explicitly allows it.
- Loading state must not duplicate rows on stale response.

## Security Contract

This leaf may add a public read endpoint if client-side controls require JSON
refresh. If the implementation stays SSR-only, the public endpoint rows below
are not applicable.

- Endpoint visibility: public read for published Product Table data, or
  internal admin read for preview.
- Auth model: public endpoint unauthenticated but published-safe; admin preview
  endpoint authenticated.
- RBAC: admin preview requires `commerce:read`; public route never grants
  draft/private commerce access.
- CSRF: not required for public read-only GET; required or explicitly
  documented as read-only for POST.
- Rate-limit bucket: public commerce-read bucket with search/filter/pagination
  clamps; authenticated admin bucket for preview.
- Reject-unknown validation: strict schema for search, status, collection IDs,
  sort field, sort direction, limit, and offset. Reject unknown fields.
- Anti-abuse: clamp search length, page size, offset, and collection/status
  count; avoid unbounded polling and raw filter operators.
- Secret handling: no provider keys, private product fields, draft-only data, or
  signed media URLs in public responses.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- Route registration, validation, and error mapping tests for any new route.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Relevant security route tests if a public endpoint is added.

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with public controls and route
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` UX-02/UX-04/UX-06/
  UX-08/BF-15 evidence after implementation.
- Update `_docs/CMS_API.md` only if a new API route is introduced.
- Update `_docs/SECURITY_SPEC.md` only if the public-read hardening policy
  changes.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Product Table can offer bounded public search, filter, sort, and pagination
  controls without exposing arbitrary commerce queries.
- Public runtime query behavior preserves published-only safety by default.
- Loading, stale-response, empty, and error states are accessible and tested.
- Admin editors can preview and configure the public controls without
  publishing blind changes.
