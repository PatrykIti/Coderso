# TASK-216-01-01: Product and Collection Cache Hydration
# FileName: TASK-216-01-01_Product_and_Collection_Cache_Hydration.md

**Priority:** High
**Category:** Coderso Commerce + Admin Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-216-01
**Status:** Done (2026-04-26)

---

## Overview

Update `useCommerceCatalog` so products and collections follow the shared list
cache policy: hydrate from fresh cache immediately, background revalidate when
cache exists, foreground load when cache is absent, and refresh from cache-bus
events without mount-force refetch loops.

## Sub-Tasks

- [x] Reuse `resolveListMountRefreshOptions` for product and collection mount
  refresh decisions.
- [x] Reuse `resolveCacheRefreshBackground` inside product and collection
  refresh functions.
- [x] Track hydration separately for products and collections.
- [x] Preserve `getCachedCommerceProducts` and `getCachedCommerceCollections`
  as the immediate hydration sources.
- [x] Preserve `listCommerceProductsCached({ force })` and
  `listCommerceCollectionsCached({ force })` as the only network/cache
  wrappers.
- [x] Keep refresh call signatures compatible with current list/editor/widget
  callers or update every caller in the same leaf.
- [x] Refresh product cache events and collection cache events independently in
  the background.

## Files to Change

- `core/admin/ui/commerce/hooks/useCommerceCatalog.ts`
- `core/admin/ui/commerce/CommerceListPage.tsx` if refresh signatures change.
- `core/admin/ui/commerce/CommerceEditorPage.tsx` if refresh signatures change.
- `core/admin/ui/commerce/components/CommerceCollectionsPanel.tsx` if collection
  refresh signatures change.
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/admin/commerceClient.test.ts`
- `tests/vitest/admin/cacheRefresh.test.ts`

## Security Contract

- Visibility: internal admin read hook only.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: `commerce:read`.
- CSRF: no writes.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: unchanged.
- Anti-abuse: no public path, no user-controlled server query, and no privileged
  data is added to browser cache.

## Pseudocode

```ts
const initialProducts = useMemo(() => getCachedCommerceProducts(), []);
const hasInitialProducts = initialProducts !== null;
const productHydratedRef = useRef(hasInitialProducts);

const refreshProducts = async (
  options?: boolean | { force?: boolean; background?: boolean }
) => {
  const force = typeof options === "boolean" ? options : options?.force ?? false;
  const background = resolveCacheRefreshBackground({
    explicitBackground: typeof options === "object" ? options.background : undefined,
    hasHydrated: productHydratedRef.current,
  });
  if (!background) setIsLoadingProducts(true);
  const items = await listCommerceProductsCached({ force });
  setProducts(items);
  productHydratedRef.current = true;
  if (!background) setIsLoadingProducts(false);
};
```

## Testing Requirements

- Cached products render without `Loading products`.
- Cached empty product list renders a true empty state, not a loading state.
- Cached collections are available for list filters/enrichment.
- Product cache-bus events refresh products without toggling foreground loading.
- Collection cache-bus events refresh collections without refreshing products.
- Existing editor collection assignment behavior still renders after hook
  changes.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/commerceClient.test.ts tests/vitest/admin/cacheRefresh.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Commerce products and collections no longer force foreground refresh when
   valid cache exists.
2. Background refresh preserves visible cached rows.
3. Existing Commerce editor and collection picker consumers remain compatible.

## Closure Evidence

- Completed on 2026-04-26 as part of TASK-216 Commerce catalog list parity.
- Validation: `bun --cwd core lint`, `bun --cwd core lint:types`, targeted Vitest Commerce UI/admin/pagination/toast/prefetch suites, `bun test tests/integration/routes/commerceRoutes.test.ts` outside sandbox with repo env, and Commerce runtime smoke tests outside sandbox with repo env.
- Gate note: `bun run gates:coderso` was attempted and remains blocked by the pre-existing stale Functional UI smoke paths under `tests/unit/ui/*`; current matching UI suites live under `tests/vitest/ui/*`.
