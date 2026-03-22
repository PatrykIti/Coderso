# TASK-129: Listings Admin UI Assistant Documentation Refresh
# FileName: TASK-129_Listings_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/listings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Listings surface based on a
real authenticated walkthrough of the local admin UI. The goal is to separate
Listings from the old combined `Listings, Filters, and Search` article and
replace the listings part with a more guided document that matches the shipped
queries list and listing editor workflow.

## Scope

1. Review the current listings-related assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior for:
   - `/admin/coderso/listings`
   - `/admin/coderso/listings/:id`
3. Create a dedicated Listings assistant doc covering:
   - listings list,
   - queries/templates tabs,
   - listing query editor,
   - preview flow.
4. Update the coverage matrix so `/coderso/listings*` points to the new
   canonical doc.
5. Keep this task in `In Progress` until the user reviews the draft.

## Sub-Tasks

1. Capture the listings list flow:
   - page header,
   - `Queries` and `Templates` tabs,
   - `New query`,
   - empty-state behavior.
2. Capture the listing query editor flow:
   - basics,
   - source selection,
   - filters,
   - sorting,
   - pagination,
   - fields and template context,
   - live preview,
   - save/discard actions.
3. Rewrite the listings docs without trying to cover Filters/Search UI that has
   not yet been verified in this pass.
4. Update route coverage only for the listings routes in this step.

## Acceptance Criteria

1. Listings docs describe the current shipped UI instead of the old generic
   combined summary.
2. The new doc uses the `docs/README.md` contract and is ready for assistant
   ingest.
3. The draft is explicit about list tabs, query editing, and runtime preview
   flow.
4. The coverage matrix points `/coderso/listings` and
   `/coderso/listings/:id` to the new canonical doc.
5. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of local Listings UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/listings/*`

## Documentation Updates Required

- `docs/coderso/listings-list-and-editor.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-129_Listings_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Real browser walkthrough completed against local admin UI:
  - listings list shell,
  - queries/templates tabs,
  - listing query editor in `new` mode.
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-22)

- Added a dedicated listings assistant doc:
  - `docs/coderso/listings-list-and-editor.md`
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/listings*` no longer shares a
  canonical doc with Filters and Search.
- Left `/coderso/filters` and `/coderso/search` on the old combined doc
  temporarily until those screens are reviewed separately.
- User review completed before closure.
