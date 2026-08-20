# TASK-493-04: SEO Aggregation Service + `seoTypes` Extension
# FileName: TASK-493-04-Seo-Aggregation-Service-And-Types.md

**Parent Task:** TASK-493
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-01, TASK-493-03-L02, TASK-493-02-L02
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-19

---

## Overview

Aggregate the persisted search-performance/indexing data into the shapes the SEO
Manager needs — a real **indexed-pages count**, total **impressions/clicks**,
average **position**, **top queries**, per-document performance, and current
**sitemap status** — replacing the heuristic-only surface. Extend `seoTypes.ts`
with the new shapes (L01) and assemble the complete route/validation surface
(L02 is the single writer of `seoRoutes.ts` + `seoSchemas.ts`: all five routes,
all three schemas, and the `mapSeoError` extension).

The existing meta heuristic (`analyzeSeoDocument`, `score`/`status`/`issues`)
stays as the meta-quality signal; this adds index/performance signals beside it.

---

## Sub-Tasks

| LNN | Title | Lane | Status |
|-----|-------|------|--------|
| L01 | Aggregation service + `seoTypes` extension | Vitest | ✅ Done |
| L02 | SEO routes + validation assembly (5 routes, 3 schemas) | Bun | ✅ Done |

---

## Dependencies

- Subtask 01 (tables), 03-L02 (search/index data populated), 02-L02 (sitemap
  status). L01 can be built/tested against fixture rows before 02/03 are wired.
  L02 imports the 02-L02/03-L02 services (sync + sitemap) and is the single
  writer of the route/validation files; 02-L02/03-L02 own services only.

---

## Testing Requirements

- L01 — Vitest over pure merge/aggregation given fixture rows (counts, sums,
  averages, top-N queries, `toNumber` coercion).
- L02 — Bun route-integration for all five routes: registration, RBAC
  (`content:read` reads / `settings:write` writes), CSRF on the two POSTs,
  reject-unknown on all three schemas, and `mapSeoError` status mapping.
