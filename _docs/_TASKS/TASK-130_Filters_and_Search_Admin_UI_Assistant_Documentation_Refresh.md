# TASK-130: Filters and Search Admin UI Assistant Documentation Refresh
# FileName: TASK-130_Filters_and_Search_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/listings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Coderso Filters and Search
surfaces based on a real authenticated walkthrough of the local admin UI. The
goal is to replace the old combined discovery article with two more guided
documents:
- runtime listing filters preview,
- global public search preview.

## Scope

1. Review the current combined Filters/Search assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior for:
   - `/admin/coderso/filters`
   - `/admin/coderso/search`
3. Split the old combined article into:
   - `listing-filters.md`
   - `public-search-preview.md`
4. Update the coverage matrix so Filters and Search point at separate canonical
   docs.
5. Keep this task in `In Progress` until the user reviews the split draft.

## Sub-Tasks

1. Capture the Filters screen flow:
   - listing query selector,
   - runtime query string input,
   - examples/help,
   - preview response summary and rows snapshot.
2. Capture the Search screen flow:
   - query and limit inputs,
   - source toggles,
   - preview response area.
3. Rewrite the docs without implying that Listings, Filters, and Search are one
   undifferentiated screen family in the UI.
4. Update route coverage so each screen has one canonical doc.

## Acceptance Criteria

1. Filters and Search assistant docs describe the current shipped UI rather than
   the old generic combined summary.
2. The split docs use the `docs/README.md` contract and are ready for assistant
   ingest.
3. The draft is explicit about preview/testing flow, not only high-level
   product theory.
4. The coverage matrix points `/coderso/filters` and `/coderso/search` at the
   right canonical docs.
5. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of local Filters and Search UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/listings/*`

## Documentation Updates Required

- `docs/coderso/listing-filters.md`
- `docs/coderso/public-search-preview.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-130_Filters_and_Search_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Real browser walkthrough completed against local admin UI:
  - Filters screen,
  - Search preview screen.
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-22)

- Replaced the old combined discovery assistant article with:
  - `docs/coderso/listing-filters.md`
  - `docs/coderso/public-search-preview.md`
- Updated `docs/_COVERAGE_MATRIX.md` so Filters and Search now point to
  separate canonical docs.
- User review completed before closure.
