# 1309 - TASK-493 SEO: Indexing & Search-Performance Pipeline

**Date:** 2026-08-19
**Version:** Unreleased
**Tasks:** TASK-493

## Key Changes

- Generated a real sitemap from published pages/entries honouring robots/noindex, served at the public `/sitemap.xml` with a `robots.txt` `Sitemap:` directive.
- Added Google Search Console integration: encrypted service-account credential, server-side client, sitemap submission/status tracking, and bounded search-performance + indexed-pages sync.
- Added four Drizzle tables (migration 0079): `seo_indexed_pages`, `seo_search_metrics`, `seo_search_queries`, `seo_sitemap_submissions` with strict domain types and `normalize*` helpers.
- Rewired the admin SEO Manager to real overview/search-performance/sitemap data with a fifth additive stat card and a new admin cached resource.
- Registered the shared `task-493` smoke suite with verified SEO flows.
