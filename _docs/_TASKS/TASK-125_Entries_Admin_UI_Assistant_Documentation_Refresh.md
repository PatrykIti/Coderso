# TASK-125: Entries Admin UI Assistant Documentation Refresh
# FileName: TASK-125_Entries_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/entries/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Entries surface based on a
real authenticated walkthrough of the local admin UI. The goal is to replace
the old combined article with a split, more guided document set that matches
the shipped entries list, content type selection, create drawer, and entry
editor with metadata workflow.

## Scope

1. Review the current Entries assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior for:
   - `/admin/coderso/entries`
   - `/admin/coderso/entries/:type/:id`
3. Split the old combined Entries article into route-aligned docs for:
   - `Entries list + type selection + creation`
   - `Entry editor + metadata`
4. Rewrite the content using the `Basic / Medium / Instruction / Advanced`
   structure with more guided user instructions.
5. Keep this task in `In Progress` until the user reviews the split draft.

## Sub-Tasks

1. Capture the current entries list flow:
   - content type sidebar,
   - list/grid switch,
   - filters,
   - create drawer,
   - table/grid record view.
2. Capture the current entry editor flow:
   - title and slug editing,
   - tabbed field sections,
   - required field handling,
   - runtime preview,
   - save/publish actions,
   - metadata panel.
3. Rewrite the docs without documenting instance-specific record titles as if
   they were product behavior.
4. Update the coverage matrix so each route family points at one canonical
   assistant document.

## Acceptance Criteria

1. The Entries assistant docs describe the current shipped UI rather than the
   old generic workflow summary.
2. The split docs use the `docs/README.md` contract and are ready for assistant
   ingest.
3. The draft is explicit about type selection, record creation, field editing,
   metadata, and publish/preview flow.
4. The coverage matrix points `/coderso/entries` and
   `/coderso/entries/:type/:id` at the right canonical docs.
5. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of local Entries UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/entries/*`

## Documentation Updates Required

- `docs/coderso/entries-list-type-selection-and-creation.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-125_Entries_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Real browser walkthrough completed against local admin UI:
  - entries list shell,
  - content type selection,
  - entry table,
  - entry editor,
  - metadata sidebar.
- Entry creation flow additionally verified against
  `core/admin/ui/entries/EntryCreateDrawer.tsx`.
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-22)

- Replaced the old combined Entries assistant article with:
  - `docs/coderso/entries-list-type-selection-and-creation.md`
  - `docs/coderso/entry-editor-and-metadata.md`
- Updated `docs/_COVERAGE_MATRIX.md` so the list route and editor route now
  point to separate canonical docs.
- User review completed before closure.
