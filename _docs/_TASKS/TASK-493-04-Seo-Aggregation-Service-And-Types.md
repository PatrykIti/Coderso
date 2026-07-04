# TASK-493-04: SEO Aggregation Service + `seoTypes` Extension
# FileName: TASK-493-04-Seo-Aggregation-Service-And-Types.md

**Parent Task:** TASK-493
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-01, TASK-493-03-L02, TASK-493-02-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Aggregate the persisted search-performance/indexing data into the shapes the SEO
Manager needs — a real **indexed-pages count**, total **impressions/clicks**,
average **position**, **top queries**, per-document performance, and current
**sitemap status** — replacing the heuristic-only surface. Extend `seoTypes.ts`
with the new shapes and expose internal read routes.

The existing meta heuristic (`analyzeSeoDocument`, `score`/`status`/`issues`)
stays as the meta-quality signal; this adds index/performance signals beside it.

---

## Sub-Tasks

| LNN | Title | Lane | Status |
|-----|-------|------|--------|
| L01 | Aggregation service + `seoTypes` extension | Vitest | ⏳ To Do |
| L02 | Search-performance & overview read routes | Bun | ⏳ To Do |

---

## Dependencies

- Subtask 01 (tables), 03-L02 (search/index data populated), 02-L02 (sitemap
  status). L01 can be built/tested against fixture rows before 02/03 are wired.

---

## Testing Requirements

- L01 — Vitest over pure merge/aggregation given fixture rows (counts, sums,
  averages, top-N queries, `toNumber` coercion).
- L02 — Bun route-integration for the internal read routes (auth/RBAC, shapes,
  caching).
