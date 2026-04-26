# TASK-216-02-01: Commerce Filter Model and Collection Enrichment
# FileName: TASK-216-02-01_Commerce_Filter_Model_and_Collection_Enrichment.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-216-02, TASK-216-01-01
**Status:** Done (2026-04-26)

---

## Overview

Create a Commerce-specific list filter/view model for products. It should reuse
cached products and collections, support the agreed list filters, and avoid
duplicating API schema or persistence normalization in UI code.

## Sub-Tasks

- [x] Filter by search text across product title, slug, and excerpt.
- [x] Filter by status `all | published | draft | archived`.
- [x] Filter by collection id using `collections` from `useCommerceCatalog`.
- [x] Filter by stock state `all | in_stock | out_of_stock | backorder`.
- [x] Build a collection label map from cached collections.
- [x] Render bounded missing-collection fallback labels without mutating
  product records.
- [x] Export pure filter/view-model helpers when that makes unit tests cheaper
  than full component rendering.

## Files to Change

- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/admin/ui/commerce/CommerceFilters.tsx` if extracted.
- `core/admin/ui/commerce/commerceListModel.ts` if extracted.
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/ui/commerce-list-page-wave.test.tsx` if added.

## Security Contract

- Visibility: internal admin UI filter state only.
- Auth model: unchanged.
- RBAC: `commerce:read`.
- CSRF: no writes.
- Rate-limit bucket: no new server request beyond existing cached reads.
- Reject-unknown validation: no new server payload; client-side filters must not
  pretend to validate product persistence payloads.
- Anti-abuse: search/filter text remains local view state and must not be
  echoed into unsafe markup.

## Pseudocode

```ts
export function filterCommerceProducts(input: {
  products: CommerceProductRecord[];
  collections: CommerceCollectionRecord[];
  search: string;
  status: "all" | CommerceProductStatus;
  collectionId: "all" | string;
  stockState: "all" | CommerceStockState;
}) {
  const collectionLabels = new Map(input.collections.map((item) => [item.id, item.name]));
  return input.products
    .filter((product) => matchesSearch(product, input.search))
    .filter((product) => input.status === "all" || product.status === input.status)
    .filter((product) => input.stockState === "all" || product.stock.state === input.stockState)
    .filter((product) =>
      input.collectionId === "all" || product.collectionIds.includes(input.collectionId)
    )
    .map((product) => ({
      product,
      collectionLabels: product.collectionIds.map((id) => collectionLabels.get(id) ?? "Missing collection"),
    }));
}
```

## Testing Requirements

- Search matches title, slug, and excerpt.
- Status filter counts and visible rows update correctly.
- Collection filter uses cached collection ids and labels.
- Stock filter handles all known stock states.
- Missing collection ids produce bounded fallback copy.
- Filter changes reset pagination and selection through the shell.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Commerce filters are deterministic and Commerce-specific.
2. Collection enrichment comes from the existing collection cache.
3. No route, schema, or product persistence behavior changes in this leaf.

## Closure Evidence

- Completed on 2026-04-26 as part of TASK-216 Commerce catalog list parity.
- Validation: `bun --cwd core lint`, `bun --cwd core lint:types`, targeted Vitest Commerce UI/admin/pagination/toast/prefetch suites, `bun test tests/integration/routes/commerceRoutes.test.ts` outside sandbox with repo env, and Commerce runtime smoke tests outside sandbox with repo env.
- Gate note: `bun run gates:coderso` was attempted and remains blocked by the pre-existing stale Functional UI smoke paths under `tests/unit/ui/*`; current matching UI suites live under `tests/vitest/ui/*`.
