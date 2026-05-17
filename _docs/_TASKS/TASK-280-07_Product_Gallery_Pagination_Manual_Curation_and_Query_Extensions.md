# TASK-280-07: Product Gallery Pagination Manual Curation and Query Extensions

# FileName: TASK-280-07_Product_Gallery_Pagination_Manual_Curation_and_Query_Extensions.md

**Priority:** Medium
**Category:** Widgets + Commerce + Runtime Query + Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-280-03, TASK-280-05, TASK-280
**Status:** To Do

---

## Overview

Add bounded Product Gallery result navigation and manual curation behavior after
the base Product Gallery source/runtime contracts are stable.

This leaf covers `BF-06` and `BF-10` from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`.

## Scope Boundary

In scope:

- Product Gallery pagination/load-more or view-more behavior backed by the
  existing commerce runtime query model;
- manual curated product ordering only if product IDs can be resolved through
  backend-owned commerce services;
- editor controls for pagination mode and curated product order;
- tests for page/reset behavior and stable curated ordering.

Out of scope:

- arbitrary public API endpoints;
- client-side provider fetching or client-owned search indices;
- cart/checkout mutations;
- Product Compare/Product Table pagination unless split to a commerce-shared
  task.

## Source Findings

- `BF-06`: Product Gallery supports only a static limit from 1 to 48 and has no
  pagination or "load more" behavior.
- `BF-10`: Product Gallery has no manual product ordering / drag-and-drop
  curation mode.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productGallery.tsx` | Add pagination/curation schema, defaults, normalizer, query input, and runtime markers. |
| `core/services/commerce/commerceQueryService.ts` | Add offset/page or explicit product-id ordering only through allowlisted query fields. |
| `core/services/commerce/commerceWidgetRuntime.ts` | Preserve total/page data and curated result ordering. |
| `core/services/commerce/commerceRuntimeResolver.ts` | Resolve curated product IDs through existing product query owners if required. |
| `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` | Add pagination and manual curation controls with clear empty/loading states. |
| `tests/vitest/widgets/productGallery.test.tsx` | Cover pagination markers, load-more/view-more output, and manual order rendering. |
| `tests/vitest/ui/product-gallery-editor-wave.test.tsx` | Cover pagination/curation editor controls and reorder behavior. |
| `tests/unit/commerce/commerceQueryService.test.ts` | Cover page/offset and product-id filters if query semantics change. |
| `tests/unit/commerce/commerceWidgetRuntime.test.ts` | Cover hydrated total/page/curated order behavior. |
| `tests/integration/routes/commerceRoutes.test.ts` | Extend when admin/internal commerce read routes are reused or changed. |
| `tests/integration/runtime/product-gallery-load-more.test.ts` | Create if a public runtime `load-more` route is introduced. |
| `tests/security/product-gallery-load-more.test.ts` | Create if a public runtime read route is introduced, covering rate-limit and reject-unknown anti-abuse behavior. |
| `_docs/_WIDGETS/PRODUCT_GALLERY.md` | Document pagination and manual curation behavior. |
| `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` | Update BF-06 and BF-10 fixed/deferred notes. |

## Implementation Pseudocode

Schema model:

```ts
type ProductGalleryPaginationMode = "none" | "view-all" | "load-more";
type ProductGalleryCurationMode = "query" | "manual";

type ProductGalleryCuration = {
  mode?: ProductGalleryCurationMode;
  productIds?: string[];
};

type ProductGalleryPagination = {
  mode?: ProductGalleryPaginationMode;
  pageSize?: number;
  viewAllHref?: string;
};
```

Data flow:

- Query mode uses current `source` plus optional pagination settings.
- Manual mode sends an allowlisted product ID array to the backend resolver,
  which returns only those products in the selected order.
- Runtime stores `resolved.total`, `resolved.items`, and any page metadata
  required by the renderer.
- Editor reorder controls update `curation.productIds` without touching source
  filters.

Error handling:

- Manual product IDs are de-duped, trimmed, and capped.
- Missing product IDs render a source-aware empty state with editor guidance.
- `load-more` is only enabled if a real runtime interaction route exists; until
  then prefer safe `view-all` link behavior or defer.
- Unsafe `viewAllHref` values are rejected or stripped through safe-href rules.

Regression-test shape:

```ts
test("manual product gallery order is preserved after hydration", async () => {
  const data = { curation: { mode: "manual", productIds: ["b", "a"] } };
  const resolved = await hydrateProductGalleryRuntimeData(data, { preview: true }, deps);
  expect(resolved.resolved?.items?.map((item) => item.id)).toEqual(["b", "a"]);
});
```

## Security Contract

No public write endpoints are added.

- Endpoint visibility: none by default. If client-side `load-more` requires a
  route, it must be explicitly reviewed as either internal admin preview or
  public read-only runtime endpoint.
- Auth model: existing admin auth for editor curation; public read route, if
  added, must expose only published-safe commerce data.
- RBAC: unchanged admin widget edit permissions.
- CSRF: read-only routes do not mutate state; public/admin writes are out of
  scope.
- Rate-limit bucket: any runtime read route must use the existing public read
  bucket or a commerce-read bucket.
- Reject-unknown validation: pagination and curation payloads must reject
  unknown fields and arbitrary query operators.
- Anti-abuse: cap product IDs/page size, reject arbitrary filters, and keep
  provider resolution backend-owned.
- Secret handling: no provider secrets or privileged commerce settings in
  widget JSON or public responses.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/commerce/commerceQueryService.test.ts` when query
  semantics change.
- `bun test tests/integration/routes/commerceRoutes.test.ts` if an existing
  admin/internal commerce read route is reused or changed.
- `bun test tests/integration/runtime/product-gallery-load-more.test.ts` and
  `bun test tests/security/product-gallery-load-more.test.ts` if a public
  runtime `load-more` endpoint is added.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`
- `_docs/_TASKS/TASK-280-07_Product_Gallery_Pagination_Manual_Curation_and_Query_Extensions.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Product Gallery has a bounded path for more-than-limit browsing or a clearly
  documented deferral.
- Manual curation preserves editor-chosen order through backend-owned product
  resolution.
- Query and curation fields are schema-owned, capped, and tested.
- No arbitrary public query or provider-fetch surface is introduced.
