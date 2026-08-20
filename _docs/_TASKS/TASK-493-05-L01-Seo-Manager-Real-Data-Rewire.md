# TASK-493-05-L01: `seoClient` & `SeoManagerPage` Real-Data Rewire
# FileName: TASK-493-05-L01-Seo-Manager-Real-Data-Rewire.md

**Parent Subtask:** TASK-493-05
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-04-L02, TASK-493-02-L02, TASK-493-03-L02
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-19

---

## Overview

- **Goal:** Render real indexing/search-performance data in the SEO Manager and
  let admins trigger a performance **sync** and a sitemap **submit**, replacing
  the placeholder/heuristic stats.
- **Owning module(s) to create-or-extend:**
  - `core/admin/services/seoClient.ts` (**extend ADDITIVELY** — add
    `getSeoOverview()`, `getSearchPerformance(params)`, `submitSitemap(body)`,
    `syncSearchPerformance(body)` calling the subtask 02/03/04 endpoints via
    the real `apiRequest<T>(path, init, { withCsrf })` seam
    (`apiClient.ts:179`); **new methods only** — never change the existing
    list/detail methods or cache contract. Cross-stream guard:
    TASK-551-09-L04 later hardens admin cache clients (lands after 493); this
    leaf must stay additive so that hardening can land cleanly).
  - `core/admin/services/cachePolicy.ts` (**extend** — ADD a
    `cacheKeys.seoOverview` entry only; the existing `cacheKeys.seoList` /
    `seoDetail` entries stay byte-identical).
  - `core/admin/ui/seo/SeoManagerPage.tsx` (**extend** — fetch the overview
    alongside the list; feed the **stat row** from real `SeoOverview` and
    **ADD a new "Indexed pages" `StatCard` backed by `overview.indexedPages`**
    (ADDITIVE: the TASK-479-26-L02 reskin's 4-up is Avg score / Issues /
    **Optimized pages** / Warnings — it deliberately does **not** render an
    "Indexed pages" card, so this leaf adds a fifth card and must NOT relabel
    away Optimized pages. Add "Sync performance" + "Submit sitemap" actions).
    The current `averageScore`/`scanLabel` derivation at `:162-193` and
    `getHealth` at `:37` stay; the "Indexed pages" value is sourced from
    `overview.indexedPages` (no existing "Indexed pages" placeholder to flip).
  - Optionally a small `SeoPerformancePanel.tsx` for the top-queries/series view
    (kept additive; the table/drawer stay as-is).
- **Source-of-truth docs:** `_docs/CMS_API.md` (endpoints consumed),
  `_docs/SEARCH_SPEC.md`.
- **Out of scope:** backend routes/services (02/03/04); the visual restyle owned
  by `TASK-479-26-L02` (this leaf wires data into whatever component state
  exists at implementation time and must not regress that restyle's look or
  cache contract).

---

## Security Contract

- **Endpoint visibility:** n/a — admin client/UI only; it calls the **internal**
  routes built in 02/03/04, which enforce their own RBAC/CSRF.
- **Auth model:** the admin session already attached by the `apiRequest` seam
  (`apiClient.ts:179`); the sync/submit POSTs carry the standard admin CSRF
  token via `{ withCsrf: true }`, like other admin writes (same as `updateSeo`).
- **RBAC:** the UI surfaces sync/submit actions; the **server** enforces
  `settings:write` (and read routes `content:read`). The client must handle a
  `403` gracefully (hide/disable the action, show a toast) rather than assuming
  permission.
- **CSRF / Rate-limit:** handled server-side; the client propagates the CSRF
  header via the `apiRequest` `{ withCsrf: true }` option (the same seam
  `updateSeo` already uses).
- **Validation:** request bodies match the server schemas (reject-unknown server
  side); the client sends only the documented fields.
- **Secret/PII handling:** the UI never receives or renders the GSC credential
  (the read endpoints return only aggregates). Do not log responses with PII;
  there is none beyond public query strings.

---

## Implementation Pseudocode

```ts
// core/admin/services/seoClient.ts (extend ADDITIVELY — new methods only;
// existing list/detail methods + cache contract untouched. TASK-551-09-L04
// later hardens admin cache clients after 493 lands.)
import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs } from "@/services/cachePolicy";
import { createMemoryBackedLocalCache } from "@/utils/storageCache";
import type { SeoOverview, SeoSearchPerformance } from "../../services/seo/seoTypes";

// Client params type, owned locally by 05-L01 (exported for consumers).
export type SearchPerfParams = {
  targetId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
};

const isSeoOverview = (v: unknown): v is SeoOverview => Boolean(v && typeof v === "object");

// Read-through overview cache using the SAME helpers listSeoCached uses
// (createMemoryBackedLocalCache + cachePolicy TTL). The cacheKeys.seoList /
// cacheKeys.seoDetail contract is preserved byte-identically.
const seoOverviewCache = createMemoryBackedLocalCache({
  key: cacheKeys.seoOverview,
  ttlMs: cacheTtlMs.list,
  validate: isSeoOverview,
});

export const getCachedSeoOverview = () => seoOverviewCache.read();

export async function getSeoOverview(options?: { force?: boolean }) {
  if (!options?.force) {
    const cached = getCachedSeoOverview();
    if (cached) return cached;
  }
  const overview = await apiRequest<SeoOverview>("/seo/overview", { method: "GET" });
  seoOverviewCache.write(overview);
  return overview;
}

export function getSearchPerformance(p: SearchPerfParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(p)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return apiRequest<SeoSearchPerformance>(
    `/seo/search-performance?${params.toString()}`,
    { method: "GET" }
  );
}

export function syncSearchPerformance(b?: { startDate?: string; endDate?: string }) {
  return apiRequest(
    "/seo/search-performance/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b ?? {}),
    },
    { withCsrf: true }
  );
}

export function submitSitemap(b?: { sitemapPath?: string }) {
  return apiRequest(
    "/seo/sitemap/submit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b ?? {}),
    },
    { withCsrf: true }
  );
}
```

```tsx
// core/admin/ui/seo/SeoManagerPage.tsx (extend)
const [overview, setOverview] = useState<SeoOverview | null>(getCachedSeoOverview());
useEffect(() => { void getSeoOverview().then(setOverview).catch(noop); }, []);
// stat row: ADD a new 5th "Indexed pages" StatCard -> overview?.indexedPages ?? 0
// (the 479-26-L02 4-up — Avg score / Issues / Optimized pages / Warnings — stays as-is)
// new actions:
const onSync = async () => { await syncSearchPerformance(); await refresh({ force: true });
                             setOverview(await getSeoOverview({ force: true })); };
const onSubmitSitemap = async () => { await submitSitemap();
                                      setOverview(await getSeoOverview({ force: true })); };
```

**Data flow:** mount → `getSeoOverview` (read-through cache via
`getCachedSeoOverview`) + existing `listSeoCached` → render real stats + table
→ user clicks Sync/Submit → POST via `apiRequest(..., { withCsrf: true })` →
refetch overview/list. Reuse the existing cache-event subscription
(`subscribeCacheEvents`, `:138`) so the list stays consistent.

**Error handling:** reuse the page's `error`/`toast` pattern (`:200-248`,
including the `handleSave` result toast at `:243`) ;
surface `403` as a disabled action + toast, `409 gsc_not_configured` as a
"Connect Google Search Console in Settings → Integrations" hint.

**Regression-test shape:**
- Render: real `indexedPages`/`impressions`/`clicks` show; empty overview ⇒
  zeros + empty-state copy.
- Actions: Sync/Submit call the right client methods and refetch; a `403`
  disables the action without crashing.
- Cache: `cacheKeys.seoList`/`seoDetail` contract unchanged;
  `getCachedSeoOverview()` returns the cached overview read-through and
  `getSeoOverview({ force: true })` revalidates after sync/submit.

---

## Testing Requirements

- **Vitest ui-integration**
  (`tests/vitest/ui-integration/seo-manager-performance.test.tsx`) — render +
  interaction with mocked `seoClient`. Admin-UI render flow ⇒ Vitest lane.
- `bun run lint` + `bun run typecheck`.
