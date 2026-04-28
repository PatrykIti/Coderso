# TASK-138: Search Admin UI Assistant Documentation Refresh
# FileName: TASK-138_Search_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/search/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the global Admin Search surface
based on a real authenticated walkthrough of the local admin UI. The goal is to
replace the old generic article with guided documentation that matches the
shipped recent-searches sidebar, grouped results, filters, and result-routing
flow on `/admin/search`.

## Scope

1. Review the current Admin Search assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/search` with an
   authenticated session and record actual behavior.
3. Rewrite `docs/screens/search.md` using the `Basic / Medium / Instruction /
   Advanced` structure with more guided user instructions.
4. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the current search shell:
   - search input,
   - minimum query rule,
   - loading/error/empty states.
2. Capture the left sidebar flow:
   - recent searches,
   - date range filter,
   - category filters,
   - clear action.
3. Capture the results flow:
   - grouped result sections,
   - `View All`,
   - content-type filter tabs,
   - result selection/prefetch behavior.
4. Rewrite the doc without treating admin search like a generic omnibox only;
   the page route is a guided results workspace with filters.

## Acceptance Criteria

1. The Search assistant doc describes the current shipped UI rather than the old
   generic search summary.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about minimum query length, recent searches, filters,
   grouped results, and navigation flow.
4. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Admin Search UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/search/*`

## Documentation Updates Required

- `docs/screens/search.md`
- `_docs/_TASKS/TASK-138_Search_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Admin Search UI:
  - search page shell,
  - recent-searches sidebar and `Try:` chips,
  - date-range and category filter shell,
  - content-type tabs,
  - minimum query-length state.
- Authenticated `/admin/api/search` query contract verified from the live
  session to confirm result and category payloads for the rewritten doc.
- Grouped results and route-resolution behavior verified against:
  - `core/admin/ui/search/SearchPage.tsx`
  - `core/admin/ui/search/SearchResults.tsx`
  - `core/admin/ui/search/searchNavigation.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
