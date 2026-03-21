# TASK-122: Menus Admin UI Assistant Documentation Refresh
# FileName: TASK-122_Menus_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/menus/*`  
**Status:** Done (2026-03-21)

---

## Overview

Refresh the assistant-facing documentation for the Menus surface based on a real
authenticated walkthrough of the local admin UI. The goal is to replace the old
generic article with a more guided document that matches the shipped menu
builder, active menu metadata area, create dialog, item hierarchy, and item
settings workflow.

## Scope

1. Review the current Menus assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on `http://localhost:5173/admin/menus` with an
   authenticated session and record actual behavior.
3. Rewrite `docs/screens/menus.md` using the `Basic / Medium / Instruction /
   Advanced` structure with more guided user instructions.
4. Keep this task in `In Progress` until the user reviews the draft.

## Sub-Tasks

1. Capture the current Menus builder flow:
   - header actions,
   - active menu selection,
   - location and menu name editing,
   - menu structure area,
   - drag-and-drop instructions.
2. Capture create flow:
   - `New Menu` dialog,
   - required vs optional fields.
3. Capture item-editing flow from code and available UI state:
   - page vs custom URL links,
   - parent hierarchy,
   - visibility,
   - badge,
   - description,
   - icon.
4. Rewrite the doc without documenting instance-specific sample menu labels as
   if they were product behavior.

## Acceptance Criteria

1. The Menus assistant doc describes the current shipped UI rather than the old
   generic workflow summary.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about create flow, builder flow, item settings, and
   save/discard behavior.
4. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of `http://localhost:5173/admin/menus`
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/menus/*`

## Documentation Updates Required

- `docs/screens/menus.md`
- `_docs/_TASKS/TASK-122_Menus_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-21)

- Real browser walkthrough completed against local admin UI:
  - Menus page shell,
  - delayed builder hydration state,
  - loaded active menu builder state,
  - `New Menu` dialog.
- Menu item settings workflow was additionally verified against
  `core/admin/ui/menus/MenuItemDrawer.tsx` and `MenuItemForm.tsx`.
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-21)

- Rewrote `docs/screens/menus.md` to match the shipped builder, create dialog,
  save/discard behavior, hierarchy workflow, and item settings flow.
- Kept the doc as one canonical Menus article because the local workflow is a
  single builder surface rather than two clearly separated route families.
- User review completed before closure.
