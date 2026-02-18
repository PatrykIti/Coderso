# TASK-054-08: Coderso Filters and Search Suite
# FileName: TASK-054-08_Coderso_Filters_and_Search_Suite.md

**Priority:** High  
**Category:** CMS/Search + Admin/UI + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-07  
**Status:** Done (2026-02-18)

---

## Overview
Deliver faceted runtime filters and scoped search comparable to JetSmartFilters + JetSearch, integrated with Coderso listings and public runtime.

---

## Scope Delivered

### 1) Runtime filter/search contract
- Added shared contract module: `core/services/search/filterContract.ts`.
- Added URL token model:
  - `lq.<listingQueryId>.__q`
  - `lq.<listingQueryId>.__sort`
  - `lq.<listingQueryId>.__page`
  - `lq.<listingQueryId>.<field>.<operator>`
- Added facet normalization/token helpers for runtime + editor usage.

### 2) Filter runtime engine
- Extended engine in `core/services/search/filterEngine.ts`:
  - runtime token parsing,
  - safe runtime override application,
  - facet metrics computation (checkbox/radio/taxonomy/range/date-range/sort),
  - deterministic rejection of invalid runtime tokens.

### 3) Public search indexing service
- Added/extended `core/services/search/searchIndexService.ts`:
  - published-only search for `pages`, `entries`, `posts`,
  - source scoping (`sources=pages,entries,...`),
  - route-aware href mapping for content entries,
  - injectable deps for deterministic unit testing.

### 4) APIs
- Added schema file: `core/server/validation/filterSchemas.ts`.
- Added internal admin route: `POST /admin/api/filters/preview` in:
  - `core/server/routes/filterRoutes.ts`,
  - route registration in `core/server/routes/index.ts`.
- Added public endpoint: `GET /api/search` in `core/server/publicSite.tsx`.

### 5) Widget runtime integration
- Added widget runtime script: `core/widgets/core/listingRuntimeScript.ts`.
- Added widgets:
  - `core/widgets/core/listingFilters.tsx`
  - `core/widgets/core/searchBox.tsx`
- Added SSR hydration runtime service:
  - `core/services/search/listingRuntimeService.ts`
- Integrated runtime hydration in `core/server/publicSite.tsx` for:
  - `listing-filters`,
  - `search-box`,
  - existing listing-bound widgets (`content-list`, `entry-teaser`) with URL param inheritance.
- Disabled HTML cache reuse for requests with query params to avoid stale filtered HTML.

### 6) Widget editor + registry wiring
- Added editor files:
  - `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
  - `core/admin/ui/widgets/editors/SearchBoxEditors.tsx`
- Wired exports and registry:
  - `core/admin/ui/widgets/editors/index.ts`
  - `core/admin/ui/widgets/registry.ts`
  - `core/widgets/core/index.ts`
  - `core/widgets/runtime.tsx`
- Extended `content-list` runtime typing with `resolved.runtime` metadata.

### 7) Coderso module UI rollout
- Added pages:
  - `core/admin/ui/listings/ListingFiltersPage.tsx`
  - `core/admin/ui/listings/ListingSearchPage.tsx`
- Added routes in `core/admin/app/AdminApp.tsx`:
  - `/coderso/filters`
  - `/coderso/search`
- Enabled nav exposure in `core/admin/ui/navigation/codersoModules.ts`:
  - Filters: `preview`, default visible (`Beta`)
  - Search: `preview`, default visible (`Beta`)
- Added prefetch entries in `core/admin/utils/adminPrefetch.ts`.

---

## Testing Requirements (Completed)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test` (full suite)

Added tests:
- `tests/unit/search/filterEngine.test.ts`
- `tests/unit/search/searchIndexService.test.ts`
- `tests/unit/search/listingRuntimeService.test.ts`
- `tests/unit/widgets/listingFilters.test.tsx`
- `tests/unit/widgets/searchBox.test.tsx`
- `tests/unit/ui/listings-page.test.tsx` (extended)
- `tests/unit/ui/coderso-modules.test.ts` (extended)
- `tests/integration/routes/filters.test.ts`

---

## Documentation Updates Required (Completed)
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/241-2026-02-18-coderso-filters-search-suite.md`
