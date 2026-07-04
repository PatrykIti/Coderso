# TASK-493-05: SEO Manager Page Rewire to Real Data
# FileName: TASK-493-05-Seo-Manager-Page-Rewire.md

**Parent Task:** TASK-493
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-04-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Wire `SeoManagerPage` and `seoClient` to the real overview + search-performance
endpoints so the admin shows actual indexed-pages / impressions / clicks /
queries / sitemap status instead of the heuristic placeholder, and add a
"Submit sitemap" / "Sync performance" affordance. Must preserve the existing
list + cache contract (`cacheKeys.seoList` / `cacheKeys.seoDetail`) that the
TASK-479 reskin also relies on.

---

## Sub-Tasks

| LNN | Title | Lane | Status |
|-----|-------|------|--------|
| L01 | `seoClient` + `SeoManagerPage` real-data rewire | Vitest (ui-integration) | ⏳ To Do |

---

## Dependencies

- Subtask 04-L02 (read routes) and 02-L02/03-L02 (the submit/sync write routes
  the new buttons call).

---

## Testing Requirements

- Vitest ui-integration render of the page against mocked client calls — real
  stats render, empty state, sync/submit actions invoke the right client
  methods, cache contract preserved.
