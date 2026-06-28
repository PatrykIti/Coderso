# TASK-493-05-L01: `seoClient` & `SeoManagerPage` Real-Data Rewire
# FileName: TASK-493-05-L01-Seo-Manager-Real-Data-Rewire.md

**Parent Subtask:** TASK-493-05
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-04-L02, TASK-493-02-L02, TASK-493-03-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Render real indexing/search-performance data in the SEO Manager and
  let admins trigger a performance **sync** and a sitemap **submit**, replacing
  the placeholder/heuristic stats.
- **Owning module(s) to create-or-extend:**
  - `core/admin/services/seoClient.ts` (**extend** — add `getSeoOverview()`,
    `getSearchPerformance(params)`, `submitSitemap(body)`, `syncSearchPerformance(body)`
    calling the subtask 02/03/04 endpoints; reuse the existing apiClient + cache
    helpers used by `listSeoCached`/`updateSeo`).
  - `core/admin/ui/seo/SeoManagerPage.tsx` (**extend** — fetch the overview
    alongside the list; feed the **stat row** from real `SeoOverview` and
    **ADD/relabel an "Indexed pages" `StatCard` backed by `overview.indexedPages`**.
    NOTE: the TASK-479-26-L02 reskin's 4-up is Avg score / Issues / **Optimized
    pages** / Warnings — it deliberately does **not** render an "Indexed pages"
    card (it drops the prototype's fabricated one), so this leaf **adds or
    relabels** an "Indexed pages" card rather than flipping a pre-existing
    placeholder. Add "Sync performance" + "Submit sitemap" actions). The current
    `averageScore`/`scanLabel` derivation at `:160-177` and `getHealth` at `:35`
    stay; the "Indexed pages" value is sourced from `overview.indexedPages` (no
    existing "Indexed pages" placeholder to flip).
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
- **Auth model:** the admin session already attached by `apiClient`; the
  sync/submit POSTs carry the standard admin CSRF token like other admin writes.
- **RBAC:** the UI surfaces sync/submit actions; the **server** enforces
  `settings:write` (and read routes `content:read`). The client must handle a
  `403` gracefully (hide/disable the action, show a toast) rather than assuming
  permission.
- **CSRF / Rate-limit:** handled server-side; the client just propagates the CSRF
  header via the existing `apiClient`.
- **Validation:** request bodies match the server schemas (reject-unknown server
  side); the client sends only the documented fields.
- **Secret/PII handling:** the UI never receives or renders the GSC credential
  (the read endpoints return only aggregates). Do not log responses with PII;
  there is none beyond public query strings.

---

## Implementation Pseudocode

```ts
// core/admin/services/seoClient.ts (extend)
export const getSeoOverview = () => apiClient.get<SeoOverview>("/seo/overview");
export const getSearchPerformance = (p: SearchPerfParams) =>
  apiClient.get<SeoSearchPerformance>("/seo/search-performance", { query: p });
export const syncSearchPerformance = (b?: { startDate?: string; endDate?: string }) =>
  apiClient.post("/seo/search-performance/sync", b ?? {});
export const submitSitemap = (b?: { sitemapPath?: string }) =>
  apiClient.post("/seo/sitemap/submit", b ?? {});
```

```tsx
// core/admin/ui/seo/SeoManagerPage.tsx (extend)
const [overview, setOverview] = useState<SeoOverview | null>(getCachedSeoOverview());
useEffect(() => { void getSeoOverview().then(setOverview).catch(noop); }, []);
// stat row: add/relabel an "Indexed pages" StatCard -> overview?.indexedPages ?? 0
// new actions:
const onSync = async () => { await syncSearchPerformance(); await refresh({ force: true });
                             setOverview(await getSeoOverview()); };
const onSubmitSitemap = async () => { await submitSitemap(); setOverview(await getSeoOverview()); };
```

**Data flow:** mount → `getSeoOverview` + existing `listSeoCached` → render real
stats + table → user clicks Sync/Submit → POST → refetch overview/list. Reuse the
existing cache-event subscription (`subscribeCacheEvents`, `:135`) so the list
stays consistent.

**Error handling:** reuse the page's `error`/`toast` pattern (`:200-248`);
surface `403` as a disabled action + toast, `409 gsc_not_configured` as a
"Connect Google Search Console in Settings → Integrations" hint.

**Regression-test shape:**
- Render: real `indexedPages`/`impressions`/`clicks` show; empty overview ⇒
  zeros + empty-state copy.
- Actions: Sync/Submit call the right client methods and refetch; a `403`
  disables the action without crashing.
- Cache: `cacheKeys.seoList`/`seoDetail` contract unchanged.

---

## Testing Requirements

- **Vitest ui-integration**
  (`tests/vitest/ui-integration/seo-manager-performance.test.tsx`) — render +
  interaction with mocked `seoClient`. Admin-UI render flow ⇒ Vitest lane.
- `bun run lint` + `bun run typecheck`.
