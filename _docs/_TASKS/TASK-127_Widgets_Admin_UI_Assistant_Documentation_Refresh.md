# TASK-127: Widgets Admin UI Assistant Documentation Refresh
# FileName: TASK-127_Widgets_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/widgets/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Widgets surface based on a
real authenticated walkthrough of the local admin UI. The goal is to replace
the old combined article with a split, more guided document set that matches
the shipped widget library and template editor workflows.

## Scope

1. Review the current Widgets assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior for:
   - `/admin/coderso/widgets`
   - `/admin/coderso/widgets/templates/:id`
3. Split the old combined Widgets article into route-aligned docs for:
   - `widget library`
   - `template editor`
4. Rewrite the content using the `Basic / Medium / Instruction / Advanced`
   structure with more guided user instructions.
5. Keep this task in `In Progress` until the user reviews the split draft.

## Sub-Tasks

1. Capture the widget library flow:
   - scopes,
   - categories,
   - favorites,
   - search,
   - filters,
   - empty state,
   - template/category actions from current UI and code.
2. Capture the template editor flow:
   - widget library rail,
   - template canvas,
   - preview/settings/details tabs,
   - template metadata,
   - layout controls,
   - save/discard flow.
3. Rewrite the docs without documenting local empty catalog state as if it were
   the only valid production behavior.
4. Update the coverage matrix so each route family points at one canonical
   assistant document.

## Acceptance Criteria

1. The Widgets assistant docs describe the current shipped UI rather than the
   old generic workflow summary.
2. The split docs use the `docs/README.md` contract and are ready for assistant
   ingest.
3. The draft is explicit about library discovery/reuse and template editing
   workflow.
4. The coverage matrix points `/coderso/widgets` and
   `/coderso/widgets/templates/:id` at the right canonical docs.
5. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of local Widgets UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/widgets/*`

## Documentation Updates Required

- `docs/coderso/widget-library.md`
- `docs/coderso/widget-template-editor.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-127_Widgets_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Real browser walkthrough completed against local admin UI:
  - Widget Library shell,
  - template editor route in `new` mode.
- Widget details/insert/category flows additionally verified against:
  - `core/admin/ui/widgets/WidgetLibraryPage.tsx`
  - `core/admin/ui/widgets/WidgetDetailsDrawer.tsx`
  - `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-22)

- Replaced the old combined Widgets assistant article with:
  - `docs/coderso/widget-library.md`
  - `docs/coderso/widget-template-editor.md`
- Updated `docs/_COVERAGE_MATRIX.md` so the library route and template editor
  route now point to separate canonical docs.
- User review completed before closure.
