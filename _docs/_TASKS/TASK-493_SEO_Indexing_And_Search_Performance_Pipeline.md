# TASK-493: SEO — Indexing & Search-Performance Pipeline
# FileName: TASK-493_SEO_Indexing_And_Search_Performance_Pipeline.md

**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Large
**Dependencies:** TASK-027 (SEO Manager core), Integrations registry + secret store (`core/services/integrations/*`, `core/services/security/secretStore.ts`)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Business Goal

Today the SEO Manager persists real meta CRUD (`seo_documents`) and computes a
**length-based heuristic** audit score in `analyzeSeoDocument`
(`core/services/seo/seoService.ts:200`). It has **no real index signal**: there
is no table for indexed pages, impressions, clicks, search queries, or sitemap
submission status, and the shipped TASK-479 reskin (`TASK-479-26-L02`)
deliberately has **no "Indexed pages" card** (`TASK-479-26-L02:97-99,160`).

This task builds the **full indexing + search-performance pipeline**: a sitemap
that we generate and submit, a server-side Google Search Console (GSC)
integration that pulls real indexed-pages / impressions / clicks / queries, a
schema to persist that data, and an aggregation surface that exposes real index
signals. Subtask 05-L01 then **adds** a new "Indexed pages" `StatCard` backed by
real `overview.indexedPages` to the reskin's stat row (additive — it sits
alongside Optimized pages and does not relabel it). Owners can finally answer
"is this page indexed, and how is it performing in search?" from inside the
admin.

---

## Scope

### In scope

- New persistence for search-performance/indexing data: indexed-page status,
  per-URL search metrics (impressions/clicks/CTR/position), top search queries,
  and sitemap submission status — with **full migration artifacts**.
- Sitemap XML generation from real pages/entries (honouring `robots`/noindex),
  a public `GET /sitemap.xml` route + `robots.txt` `Sitemap:` directive, and an
  admin-triggered sitemap **submission + status tracking** flow.
- Server-side GSC integration credential via the **Integrations secret store**
  (encrypted, never to client), plus a server-side auth client and a data-sync
  service that fetches indexed pages + Search Analytics and persists them.
- SEO service aggregation + `seoTypes` extension exposing **real** indexed-pages
  / impressions / clicks / queries (replacing the heuristic-only surface), and
  internal read routes for the aggregated data.
- Rewire `SeoManagerPage` (and `seoClient`) to **add** the real-data
  "Indexed pages" `StatCard` and surface search-performance data alongside the
  existing stats (additive, not a relabel).
- Tests in the correct lanes + source-of-truth doc updates.

### Out of scope

- Changing the existing meta-CRUD audit (`analyzeSeoDocument` length checks) or
  the `seo_documents` shape — the heuristic stays as the *meta-quality* signal;
  this task **adds** index/performance signals alongside it.
- Non-Google search engines (Bing Webmaster, Yandex). The connector is designed
  GSC-first; other providers are a follow-on.
- Backlink/keyword-rank research, content suggestions, or AI rewrite.
- Public write endpoints. The pipeline exposes one public **read** route
  (`/sitemap.xml`); all mutation/sync is internal admin-only.

### What the TASK-479 reskin already covers vs. what this task adds

- `TASK-479-26-L02-SEO-Manager-Restyle` restyles the SEO Manager shell: a
  `PageHeader`, a **4-up stat row (Avg score / Issues / Optimized pages /
  Warnings)** (`TASK-479-26-L02:97-99`), and a soft `DataTable`. That work is
  **visual only** and keeps data loading byte-for-byte; it deliberately ships
  **no "Indexed pages" card** (`TASK-479-26-L02:160`).
- This task supplies the **real backend** the restyle has no source for
  (indexed count, impressions, clicks, queries, sitemap status), and subtask
  05-L01 **adds** a new "Indexed pages" `StatCard` backed by real
  `overview.indexedPages` **alongside** the Optimized pages stat (additive —
  it must not remove or relabel Optimized pages). Wiring must not regress the
  reskin's cache contract (`cacheKeys.seoList` / `cacheKeys.seoDetail`).

---

## Sub-Tasks

| NN | Title | Effort | Status |
|----|-------|--------|--------|
| 01 | Search-Performance & Indexing Schema (+ full migration) | Medium | ⏳ To Do |
| 02 | Sitemap Generation, Submission & Status Tracking | Medium | ⏳ To Do |
| 03 | Google Search Console Integration (credential + fetch) | Large | ⏳ To Do |
| 04 | SEO Aggregation Service + `seoTypes` Extension | Medium | ⏳ To Do |
| 05 | SEO Manager Page Rewire to Real Data | Medium | ⏳ To Do |
| 06 | Tests & Documentation | Medium | ⏳ To Do |

Implementation/dependency order:
**01 → 03-L01 → 02-L01 → 03-L02 → 02-L02 → 04-L01 → 04-L02 → 05 → 06**
(sitemap *generation* 02-L01 needs only 01 + existing pages/entries; sitemap
*submission* 02-L02 reuses the GSC client from 03-L01; GSC sync 03-L02 lands
before aggregation 04-L01 reads its output; 04-L02 is the **route/validation
assembly leaf** owning `seoRoutes.ts` + `seoSchemas.ts`, so it lands after the
services it mounts; 05 rewires the admin, 06 closes with tests + docs).

---

## Testing Requirements

- **Bun lane** (`tests/integration/routes/*`, `tests/security/*`, `tests/perf/*`):
  the public `/sitemap.xml` route, all internal `/admin/api/seo/*` sync +
  sitemap routes, GSC outbound-fetch behaviour, secret-never-to-client
  assertions, and the end-to-end pipeline smoke + perf gate.
- **Vitest lane** (`tests/vitest/*`, `tests/vitest/ui-integration/*`): schema
  `normalize*`/defaults, the sitemap XML builder (pure), the aggregation merge
  logic over fixture rows, and the `SeoManagerPage` render of real data.
- DB changes (subtask 01) require **full migration artifacts** (SQL +
  `meta/*_snapshot.json` + `meta/_journal.json` entry) plus a Bun migration-apply
  smoke test. Re-read the live journal immediately before allocating the index:
  next free is **0079** (`0078_backup_users_staging` is the last shipped entry).
- Final gates per leaf: `bun run lint`, `bun run typecheck` (or repo
  equivalents), `bun test`, and `vitest run` for the touched lanes.

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md` — new `seo_indexed_pages`, `seo_search_metrics`,
  `seo_search_queries`, `seo_sitemap_submissions` tables.
- `_docs/CMS_API.md` — extend the **SEO Manager** section with the new
  search-performance/overview/sitemap endpoints and the public `/sitemap.xml`.
- `_docs/SEARCH_SPEC.md` — addendum describing the search-performance ingest
  (GSC) vs. the existing admin search.
- `_docs/SECURITY_SPEC.md` — note GSC credential handling (encrypted secret,
  server-side-only outbound, never to client cache/log).

---

## Notes

- **Permissions:** `permissionCatalog.ts` has **no** `seo:read`/`seo:write`
  permissions. To stay consistent and verified, SEO **data** routes reuse
  `content:read` / `content:write` (matching the existing `seoRoutes.ts`), and
  the GSC **connector** + sitemap **submission** (settings-grade, secret-bearing)
  reuse `settings:read` / `settings:write` (matching `integrationsRoutes.ts`).
  Introducing dedicated `seo:*` permissions is intentionally **out of scope**.
- **GSC registry entry scopes:** the 03-L01 Integrations registry entry lists
  `scopes: ["seo:read", "search-console:read"]` as a **descriptive label** of
  what the connector reads, **not** `permissionCatalog` RBAC — no `seo:*`
  permission exists or is introduced. Runtime permission checks stay
  `content:read`/`content:write` (SEO data) and `settings:read`/`settings:write`
  (connector + sitemap submission).
- **Secret store:** the GSC credential is registered as `secret`-typed
  Integration fields (`registry.ts`), encrypted via `encryptSecret`
  (`secretStore.ts`, `MEDIA_SECRET_MASTER_KEY`), and only ever decrypted
  server-side through `getIntegrationRuntimeConfig("google-search-console")`.
- **Schema/route ownership:** schemas/enums/`normalize*` live in the
  domain/service modules (`core/services/seo/*`); route modules **re-export**
  and never re-declare them.
- Do **not** edit `_docs/_TASKS/README.md` board rows — the orchestrator syncs
  the board. The single changelog entry is owned by 06-L02 and pinned to
  **1309** (verified next-free; 1308 used by TASK-467).
