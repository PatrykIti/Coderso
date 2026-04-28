# TASK-126: Custom Screens Admin UI Assistant Documentation Refresh
# FileName: TASK-126_Custom_Screens_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/custom-screens/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Custom Screens surface based
on a real authenticated walkthrough of the local admin UI. The goal is to
replace the old combined article with a split, more guided document set that
matches the shipped list/builder workflow and the screen-bound records workflow.

## Scope

1. Review the current Custom Screens assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior for:
   - `/admin/coderso/custom-screens`
   - `/admin/coderso/custom-screens/:id`
   - `/admin/coderso/custom-screens/:id/entries`
   - `/admin/coderso/custom-screens/:id/entries/:entryId`
3. Split the old combined Custom Screens article into route-aligned docs for:
   - `screen list + builder`
   - `screen-bound records and entry workflow`
4. Rewrite the content using the `Basic / Medium / Instruction / Advanced`
   structure with more guided user instructions.
5. Keep this task in `In Progress` until the user reviews the split draft.

## Sub-Tasks

1. Capture the current list/builder flow:
   - empty-state list,
   - `New screen`,
   - screen builder library,
   - builder/preview tabs,
   - screen settings.
2. Capture the records workflow:
   - records list route,
   - `Open builder`,
   - `New record`,
   - collection-only/read-only states,
   - custom screen entry editor contract from UI + code.
3. Rewrite the docs without documenting instance-specific screen IDs as if they
   were product behavior.
4. Update the coverage matrix so each route family points at one canonical
   assistant document.

## Acceptance Criteria

1. The Custom Screens assistant docs describe the current shipped UI rather than
   the old generic workflow summary.
2. The split docs use the `docs/README.md` contract and are ready for assistant
   ingest.
3. The draft is explicit about builder flow, bindings/screen settings, and the
   records workflow.
4. The coverage matrix points `/coderso/custom-screens` and
   `/coderso/custom-screens/:id/entries*` at the right canonical docs.
5. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of local Custom Screens UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/custom-screens/*`

## Documentation Updates Required

- `docs/coderso/custom-screens-list-and-builder.md`
- `docs/coderso/custom-screen-records-and-entry-workflow.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-126_Custom_Screens_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Real browser walkthrough completed against local admin UI:
  - Custom Screens list empty state,
  - `new` screen builder route,
  - screen-bound records route in collection-only state.
- Screen-bound entry workflow additionally verified against:
  - `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`
  - `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
  - `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-22)

- Replaced the old combined Custom Screens assistant article with:
  - `docs/coderso/custom-screens-list-and-builder.md`
  - `docs/coderso/custom-screen-records-and-entry-workflow.md`
- Updated `docs/_COVERAGE_MATRIX.md` so the builder routes and records routes
  now point to separate canonical docs.
- User review completed before closure.
