# TASK-054-11-05-01: Commerce Admin Client, Cache, and Prefetch
# FileName: TASK-054-11-05-01_Commerce_Admin_Client_Cache_and_Prefetch.md

**Priority:** High  
**Category:** Admin/Services  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11-04  
**Status:** Done (2026-02-19)

---

## Goal
Add admin client contract for commerce products/collections with local cache and SPA prefetch compatibility.

## Scope
1. Add `commerceClient` with typed CRUD/query helpers.
2. Add cache keys and localStorage hydration for:
   - products list/detail,
   - collections list.
3. Add cache invalidation + cross-tab sync events.
4. Wire route prefetch for `/coderso/commerce`.
5. Add canonical alias mapping for `/commerce -> /coderso/commerce`.

## Files
- `core/admin/services/commerceClient.ts` (new)
- `core/admin/services/cachePolicy.ts`
- `core/admin/utils/adminPrefetch.ts`
- `core/admin/utils/adminPaths.ts`
- `tests/unit/admin/commerceClient.test.ts` (new)
- `tests/unit/admin/adminPaths.test.ts`
- `tests/unit/admin/adminPrefetch.test.ts`

## Pseudocode
```ts
const products = await listCommerceProductsCached({ force: false });
writeLocalCache(cacheKeys.commerceProductsList, products);
broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "update" });
```

## Acceptance Criteria
1. Commerce list/editor can hydrate immediately from cache.
2. Cache updates propagate between tabs via `cacheBus`.
3. Prefetch warms commerce datasets on route intent.

## Delivered
- Added admin commerce client:
  - `core/admin/services/commerceClient.ts`
- Added cache keys:
  - `core/admin/services/cachePolicy.ts`
- Added SPA prefetch for commerce route:
  - `core/admin/utils/adminPrefetch.ts`
- Added canonical alias `/commerce -> /coderso/commerce`:
  - `core/admin/utils/adminPaths.ts`
- Added unit coverage:
  - `tests/unit/admin/commerceClient.test.ts`
  - `tests/unit/admin/adminPaths.test.ts` (commerce alias assertions)
  - `tests/unit/admin/adminPrefetch.test.ts` (commerce alias prefetch assertion)
