# TASK-485-02-L03: storeCatalogClient admin client + cache
# FileName: TASK-485-02-L03-Store-Catalog-Client-And-Cache.md

**Parent Subtask:** TASK-485-02
**Priority:** High
**Category:** Store / Plugins / Admin Client
**Estimated Effort:** Small
**Dependencies:** TASK-485-02-L02 (routes), TASK-485-01-L01 (cache conventions).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** A cached admin client over the catalog routes so the store gallery
  hydrates instantly and revalidates in the background — mirroring the subtask-01
  cache pattern.
- **Owning module(s) to create-or-extend:**
  - **Create** `core/admin/services/storeCatalogClient.ts`
    (`fetchStoreCatalog`, `fetchStoreCatalogDetail`, `invalidateStoreCatalog`).
  - **Extend** `core/admin/services/cachePolicy.ts` — add
    `storeCatalogList: "store:catalog:list"` and
    `storeCatalogDetail: (name) => "store:catalog:detail:" + createBoundedCacheKeySegment(name)`.
  - **Reuse** `apiClient`, `storageCache`, `cacheBus`, `cacheRefresh`.
- **Source-of-truth docs:** `_docs/ADMIN_CACHE.md`, `_docs/CMS_API.md`.
- **Out of scope:** UI consumption (subtask 04), routes (L02), domain normalize
  (L01). The client trusts the route VM (already secret-free) and does not
  re-derive compatibility.

---

## Security Contract

- **Endpoint visibility:** `internal` — `GET /admin/api/store/catalog*` only.
- **Auth model:** session (handled by `apiRequest`).
- **RBAC/CSRF:** route enforces `store:browse`; reads → no CSRF.
- **Validation:** uses `createBoundedCacheKeySegment` for the `:name` cache-key
  segment so an unbounded/odd plugin name cannot blow up the key space
  (matches the existing cachePolicy convention).
- **Secret/PII handling:** caches only the secret-free catalog VM; cacheBus
  carries keys only. Catalog data is public store data — safe to cache in
  `localStorage` per the ADMIN_CACHE policy.

---

## Implementation Pseudocode

```ts
// core/admin/services/storeCatalogClient.ts
import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { createMemoryBackedLocalCache } from "@/utils/storageCache";
import { broadcastCacheEvent } from "@/utils/cacheBus";

export type StoreCatalogItemVM = { name: string; latestVersion: string; description?: string; tags: string[] };
export type StoreCatalogDetailVM = StoreCatalogItemVM & {
  versions: Array<{ version: string; apiVersion: string; coreVersion: string;
    releaseType: "normal" | "security"; scanStatus?: string; compatible: boolean }>;
};

const listCache = createMemoryBackedLocalCache<StoreCatalogItemVM[]>({
  key: cacheKeys.storeCatalogList, ttlMs: cacheTtlMs.list,
});

export async function fetchStoreCatalog(options?: { force?: boolean }) {
  if (!options?.force) { const c = listCache.read(); if (c) return c; }
  const res = await apiRequest<{ items: StoreCatalogItemVM[] }>("/store/catalog", { method: "GET" });
  const items = res.items ?? [];
  listCache.write(items);
  return items;
}

export async function fetchStoreCatalogDetail(name: string) {
  const res = await apiRequest<{ item: StoreCatalogDetailVM }>(
    `/store/catalog/${encodeURIComponent(name)}`, { method: "GET" });
  return res.item;
}

export function invalidateStoreCatalog() {
  listCache.clear();
  broadcastCacheEvent({ key: cacheKeys.storeCatalogList, action: "invalidate" });
}
```

**Data flow:** gallery → `fetchStoreCatalog()` → cache hit OR
`GET /store/catalog` → cache. After a successful install/uninstall (subtask 03)
the UI calls `invalidateStoreCatalog()` so "installed" badges recompute against a
fresh catalog. **Error handling:** `apiRequest` throws `ApiClientError`
(`store_not_configured`/503, `store_unavailable`/502 surface as codes) → caller
renders the gallery error/empty state.

**Regression-test shape (Vitest):** cache hit avoids a 2nd `apiRequest`;
`force` refetches; `invalidateStoreCatalog` clears + broadcasts; detail uses the
`encodeURIComponent`'d name.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Vitest** (Bun-free): `tests/vitest/admin/storeCatalogClient.test.ts` (cache
  hit/miss/force, invalidate broadcast, detail path encoding). No Bun lane.
