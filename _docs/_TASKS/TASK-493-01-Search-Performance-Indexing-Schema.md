# TASK-493-01: Search-Performance & Indexing Schema (+ full migration)
# FileName: TASK-493-01-Search-Performance-Indexing-Schema.md

**Parent Task:** TASK-493
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-027 (SEO Manager core)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Add the persistence layer the pipeline reads from and writes to: indexed-page
status, per-URL search metrics, top search queries, and sitemap submission
status. These tables live next to `seoDocuments` in `core/db/tables/seo.ts` and
are owned by a new domain types module under `core/services/seo/`. The `core/db/schema.ts` facade needs no change (it already re-exports `./tables/seo`). The existing
`seo_documents` table is **not** changed.

Because this adds tables, it carries **full Drizzle migration artifacts** (SQL +
snapshot + journal entry). The next migration index is **0079** (latest on disk
is `core/db/migrations/0078_backup_users_staging.sql`).

---

## Sub-Tasks

| LNN | Title | Lane | Status |
|-----|-------|------|--------|
| L01 | Schema tables + domain types/enums/`normalize*` | Vitest | ⏳ To Do |
| L02 | Full migration artifacts (0079 SQL + snapshot + journal) + apply smoke | Bun | ⏳ To Do |

---

## Dependencies

- Upstream: TASK-027 (the `seoDocuments` table and `seoTypes.ts` this builds
  beside).
- Downstream: subtasks 02 (sitemap status), 03 (GSC sync writes), 04
  (aggregation reads) all depend on these tables existing.

---

## Testing Requirements

- L01 — Vitest over the pure `normalize*`/default helpers and enum guards in the
  new types module.
- L02 — Bun migration-apply smoke (`migrate` against a throwaway DB, assert the
  four tables + indexes exist), plus a Drizzle `generate`/snapshot drift check.
- DB change ⇒ migration artifacts are mandatory and are reviewed as part of L02.
