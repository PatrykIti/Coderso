# TASK-132: Reviews Admin UI Assistant Documentation Refresh
# FileName: TASK-132_Reviews_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/reviews/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Reviews surface based on a
real authenticated walkthrough of the local admin UI. The goal is to separate
Reviews moderation from the old combined `Reviews, Popups, and Engagement`
article and replace the reviews part with a more guided document that matches
the shipped moderation workflow.

## Scope

1. Review the current engagement-related assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/coderso/reviews`
   with an authenticated session and record actual behavior.
3. Create a dedicated Reviews moderation assistant doc.
4. Update the coverage matrix so `/coderso/reviews` points to the new canonical
   doc.
5. Keep `/coderso/popups*` on the older combined doc until Popups is reviewed
   separately.
6. Keep this task in `In Progress` until the user reviews the draft.

## Sub-Tasks

1. Capture the current moderation flow:
   - status tabs,
   - search,
   - review table,
   - review details panel.
2. Capture current empty-state behavior for the local dataset.
3. Rewrite the reviews docs without pretending popups behavior was verified in
   this pass.
4. Update route coverage only for the reviews route in this step.

## Acceptance Criteria

1. Reviews docs describe the current shipped moderation UI instead of the old
   generic combined engagement summary.
2. The new doc uses the `docs/README.md` contract and is ready for assistant
   ingest.
3. The draft is explicit about moderation tabs, search, table, and detail
   actions.
4. The coverage matrix points `/coderso/reviews` to the new canonical doc.
5. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of local Reviews UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/reviews/*`

## Documentation Updates Required

- `docs/coderso/reviews-moderation.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-132_Reviews_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Real browser walkthrough completed against local Reviews UI:
  - moderation screen,
  - status tabs,
  - search field,
  - review detail panel,
  - empty-state table.
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-22)

- Added a dedicated reviews assistant doc:
  - `docs/coderso/reviews-moderation.md`
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/reviews` now points to the
  new canonical doc.
- Left `/coderso/popups*` on the older combined engagement doc until Popups is
  reviewed separately.
- User review completed before closure.
