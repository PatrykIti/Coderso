# 241-2026-02-18 - Coderso filters and search suite

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-08

## Key Changes
- Runtime Contract: Added shared listing runtime token/facet contract (`filterContract`) for `lq.<queryId>.*` URL state.
- Filters Engine: Added safe runtime overrides + facet metrics in `filterEngine` with deterministic rejection of invalid tokens.
- Search API: Added public `GET /api/search` (pages/entries/posts, published-only, source scoping).
- Filters API: Added internal `POST /admin/api/filters/preview` for RBAC preview of runtime tokens against saved listing queries.
- Widgets: Added `listing-filters` and `search-box` widgets with runtime script (`listingRuntimeScript`) and SSR hydration.
- Runtime Safety: Public page cache now skips requests with query params, preventing stale filtered HTML responses.
- Admin UI: Added Coderso pages `/coderso/filters` and `/coderso/search`, enabled both modules in Coderso nav as `Beta`.
- Registry Wiring: Added widget editors and registry/runtime wiring for new widgets in admin and public renderers.
- Tests: Added/updated unit + integration coverage for filter engine, search index service, listing runtime resolver, widgets, coderso nav, pages, and filter route registration.
