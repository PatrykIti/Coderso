# TASK-134: Popups Admin UI Assistant Documentation Refresh
# FileName: TASK-134_Popups_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/popups/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Popups surface based on a
real authenticated walkthrough of the local admin UI. The goal is to separate
Popups from the old combined engagement article and replace the popup portion
with a more guided document that matches the shipped popup list and popup editor
workflow.

## Scope

1. Review the current engagement-related assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/coderso/popups`
   with an authenticated session and record actual behavior.
3. Create a dedicated Popups assistant doc.
4. Update the coverage matrix so `/coderso/popups*` points to the new canonical
   doc.
5. Remove the now-obsolete combined Reviews/Popups doc.
6. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the popup list flow:
   - search,
   - status tabs,
   - popup table,
   - row actions.
2. Capture the popup editor flow:
   - identity,
   - trigger,
   - targeting and frequency,
   - content,
   - display settings,
   - save/publish/discard actions.
3. Rewrite the docs without pretending popups are only a generic “engagement”
   concept rather than a concrete admin workflow.
4. Update route coverage only for the popup routes in this step.

## Acceptance Criteria

1. Popups docs describe the current shipped UI instead of the old generic
   combined engagement summary.
2. The new doc uses the `docs/README.md` contract and is ready for assistant
   ingest.
3. The draft is explicit about lifecycle, triggers, targeting, and content
   setup.
4. The coverage matrix points `/coderso/popups` and `/coderso/popups/:id` to
   the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Popups UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/popups/*`

## Documentation Updates Required

- `docs/coderso/popups.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-134_Popups_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Authenticated browser walkthrough completed against local Popups UI:
  - popup list,
  - popup editor.
- No automated lint or test commands were run because this was a docs-only
  change.
