# TASK-485-04-L01: Store tab → real catalog (browse + loading/empty/error)
# FileName: TASK-485-04-L01-Store-Tab-Catalog-Rewire.md

**Parent Subtask:** TASK-485-04
**Priority:** High
**Category:** Store / Plugins / Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-485-02-L03 (`storeCatalogClient`).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Replace the hardcoded `catalog` array in `PluginStorePage` so the
  Store tab fetches the real catalog via `storeCatalogClient`, with hydrate +
  background revalidate and explicit loading / empty / error / not-configured
  states. `StoreList` / `StoreDetail` keep their props; only the data source
  changes.
- **Owning module(s) to create-or-extend:**
  - **Edit** `core/admin/ui/store/PluginStorePage.tsx` (delete `catalog`; add a
    `useStoreCatalog` hook/state).
  - **Create** `core/admin/ui/store/hooks/useStoreCatalog.ts` (fetch + cacheBus
    subscribe + status state). Optional: a `mapCatalogItemToStoreVM` adapter if
    `StoreList`/`StoreDetail` props need the legacy `StoreCatalogItem` shape — map
    only **real** fields; do not synthesize `securityScore`/`downloads`/`status`.
  - **Reuse/Update** `core/admin/ui/store/types.ts` — narrow `StoreCatalogItem` to
    the real fields (or add a `StoreCatalogItemVM`) so the UI cannot read a field
    the API never returns.
- **Source-of-truth docs:** `_docs/STORE_SPEC.md`, `_docs/ADMIN_CACHE.md`,
  `_docs/CMS_API.md`.
- **Out of scope:** install/update actions (L02), installed tab (L02), tests
  (L03), catalog API itself (subtask 02).

---

## Security Contract

UI consumer of the internal `GET /admin/api/store/catalog*` (`store:browse`).
No new endpoint/auth/data surface. The page must **not** render or cache any
secret (download URL / signature / checksum) — the route VM already excludes
them, and the UI must not reintroduce mock secret-like fields. A
`store_not_configured` / `store_unavailable` code renders a calm empty/error state
(not a crash, not fabricated rows).

---

## Implementation Pseudocode

```ts
// core/admin/ui/store/hooks/useStoreCatalog.ts
import { useEffect, useState } from "react";
import { fetchStoreCatalog, invalidateStoreCatalog } from "@/services/storeCatalogClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { cacheKeys } from "@/services/cachePolicy";

export function useStoreCatalog() {
  const [items, setItems] = useState<StoreCatalogItemVM[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error" | "not_configured">("loading");

  const load = async (force?: boolean) => {
    try {
      const data = await fetchStoreCatalog({ force });
      setItems(data);
      setStatus(data.length ? "ready" : "empty");
    } catch (e) {
      setStatus(isApiClientError(e) && e.code === "store_not_configured" ? "not_configured" : "error");
    }
  };

  useEffect(() => {
    load();                                   // hydrate (cache) then revalidate
    return subscribeCacheEvents((ev) => { if (ev.key === cacheKeys.storeCatalogList) load(true); });
  }, []);

  return { items, status, reload: () => load(true), invalidate: invalidateStoreCatalog };
}
```

```tsx
// core/admin/ui/store/PluginStorePage.tsx  (store tab)
const { items: storeItems, status } = useStoreCatalog();
// remove the `catalog` const and `useState(catalog)`; drive StoreList/StoreDetail
// from storeItems; render <StoreEmpty/>, <StoreError/>, <StoreNotConfigured/> per status.
```

**Data flow:** mount → `useStoreCatalog` → `fetchStoreCatalog` (cache→network) →
status state → `StoreList`/`StoreDetail`. CacheBus invalidation (e.g. after an
install/uninstall in L02) reloads. **Error handling:** typed `ApiClientError`
codes drive distinct states; never fall back to mock data.

**Regression-test shape (Vitest, L03):** renders catalog rows from a mocked
client; shows empty state on `[]`; shows not-configured state on
`store_not_configured`; reacts to a cacheBus invalidate by refetching.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Vitest (ui-integration):** assertions added in L03's
  `tests/vitest/ui-integration/plugin-store-rewire.test.tsx`. No Bun lane.
