# TASK-280-05: Product Gallery Source Collections and Filter Controls

# FileName: TASK-280-05_Product_Gallery_Source_Collections_and_Filter_Controls.md

**Priority:** Medium
**Category:** Widgets + Commerce + Admin UI + Runtime Query
**Estimated Effort:** Large
**Dependencies:** TASK-280-03, TASK-280-04, TASK-280
**Status:** To Do

---

## Overview

Repair Product Gallery source-control truthfulness: query normalization,
collection selection guidance, and bounded Product Gallery filters.

This leaf covers `CODE-05`, `UX-05`, `BF-08`, and `BF-11` from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`.

## Scope Boundary

In scope:

- remove Product Gallery query double-normalization in
  `buildProductGalleryQueryInput`;
- improve Product Gallery collection selection UX when collections are loading,
  empty, or selected by raw ID fallback;
- add bounded Product Gallery price-filter fields only if the existing commerce
  query service supports them safely;
- preserve source field defaults and legacy payload compatibility.

Out of scope:

- changing Product Compare/Product Table behavior accidentally through shared
  `CommerceSourceFields` without explicit test coverage;
- arbitrary query operators or unbounded filter JSON;
- client-side provider fetching.

## Source Findings

- `CODE-05`: `buildProductGalleryQueryInput()` normalizes Product Gallery data,
  then normalizes `source` again.
- `UX-05` and `BF-08`: collection selection is hard to use when no commerce
  collections are visible; raw ID fallback remains the only manual option.
- `BF-11`: price min/max filters are missing from Product Gallery source
  controls.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productGallery.tsx` | Simplify query input data flow and add Product Gallery source/filter fields if approved. |
| `core/widgets/core/commerceWidgetShared.ts` | Extend shared source types only if price filters must be shared; otherwise keep Product Gallery-local fields isolated. |
| `core/services/commerce/commerceQueryService.ts` | Add allowlisted price filters only if they can be represented safely and tested. |
| `core/services/commerce/commerceWidgetRuntime.ts` | Preserve normalized Product Gallery query input for runtime hydration. |
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Add Product Gallery source UX copy, collection guidance, and filter controls. |
| `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx` | Touch only if shared collection UI changes are intentional and covered for other commerce widgets. |
| `tests/vitest/widgets/productGallery.test.tsx` | Cover query input, source/filter normalization, and legacy defaults. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Cover collection empty/loading/selected guidance and filter controls. |
| `tests/vitest/ui/commerce-widget-editor-shared.test.tsx` | Add coverage when shared `CommerceSourceFields` behavior changes. |
| `tests/vitest/ui/product-compare-editor-wave.test.tsx` | Add focused regression coverage if shared commerce editor changes affect Product Compare. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Add focused regression coverage if shared commerce editor changes affect Product Table. |
| `tests/vitest/widgets/productCompare.test.tsx` | Add runtime/query regression coverage if shared commerce source or money behavior affects Product Compare. |
| `tests/vitest/widgets/productTable.test.tsx` | Add runtime/query regression coverage if shared commerce source or money behavior affects Product Table. |
| `tests/unit/commerce/commerceQueryService.test.ts` | Cover price filters if runtime query semantics change. |
| `tests/unit/commerce/commerceWidgetRuntime.test.ts` | Cover Product Gallery runtime query payload. |
| `_docs/_WIDGETS/PRODUCT_GALLERY.md` | Document source controls and any filter fields. |
| `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` | Update source-control findings. |

## Implementation Pseudocode

Query cleanup:

```ts
export const buildProductGalleryQueryInput = (value: ProductGalleryData) => {
  const normalized = normalizeProductGalleryData(value);
  return buildCommerceWidgetQueryInput(normalized.source);
};
```

Optional Product Gallery filter model:

```ts
type ProductGalleryFilters = {
  minPrice?: number;
  maxPrice?: number;
};

function normalizeProductGalleryFilters(value: unknown): ProductGalleryFilters {
  const minPrice = normalizeOptionalPositiveInteger(readUnknown(value, "minPrice"));
  const maxPrice = normalizeOptionalPositiveInteger(readUnknown(value, "maxPrice"));
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    return { minPrice: maxPrice, maxPrice: minPrice };
  }
  return compactObject({ minPrice, maxPrice });
}
```

Data flow:

- Editor updates Product Gallery source/filter fields.
- Normalizer clamps filter values and removes invalid entries.
- Query builder emits only allowlisted `pricing.amount` filters accepted by
  `commerceQueryService`.
- Runtime hydration uses the normalized query once.

Error handling:

- Invalid numbers are removed or clamped.
- Empty collection lists show useful copy and preserve selected raw IDs.
- Shared `CommerceSourceFields` changes must include regression coverage for
  Product Compare/Table or be avoided.
- Query service rejects unknown filter fields and keeps stable error codes.

Regression-test shape:

```ts
test("product gallery query input is built from normalized source once", () => {
  const query = buildProductGalleryQueryInput({
    source: { limit: 999, sortField: "pricing.amount", sortDir: "asc" },
  });
  expect(query.pagination.limit).toBe(48);
  expect(query.sort).toEqual([{ field: "pricing.amount", dir: "asc" }]);
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: new source/filter fields must be schema-owned and
  unknown query fields must be rejected by runtime query validation.
- Anti-abuse: no arbitrary filter JSON, query operators, provider names, or
  client-owned data-source config.
- Secret handling: provider credentials and privileged commerce settings stay
  backend-owned.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/commerce-widget-editor-shared.test.tsx`
  when shared `CommerceSourceFields` behavior changes.
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
  and `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
  when shared commerce editor behavior affects Product Compare/Table.
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx` and
  `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx` when
  shared commerce source/query/render helpers affect those widgets.
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/commerce/commerceQueryService.test.ts` when filters
  change runtime query semantics.
- `bun test tests/unit/widgets/validator.test.ts` when schema changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`
- `_docs/_TASKS/TASK-280-05_Product_Gallery_Source_Collections_and_Filter_Controls.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Product Gallery query input is normalized once and remains deterministic.
- Collection source controls are understandable when collections are empty,
  loading, failed, selected, or represented only by fallback IDs.
- Price filters, if added, are bounded, validated, tested, and backend-owned.
- Shared commerce editor/query changes are not hidden as Product Gallery-only
  work without explicit cross-widget tests.
