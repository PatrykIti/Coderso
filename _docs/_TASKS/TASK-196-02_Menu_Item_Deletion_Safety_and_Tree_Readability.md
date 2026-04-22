# TASK-196-02: Menu Item Deletion Safety and Tree Readability
# FileName: TASK-196-02_Menu_Item_Deletion_Safety_and_Tree_Readability.md

**Priority:** High
**Category:** CMS/Menus + Admin/UI + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-196-01
**Status:** Done (2026-04-22)

---

## Overview

Make menu item editing safer and the tree easier to understand.

This task covers the highest-friction interactions inside the editor after the
IA split:

- deletion must stop using browser-native confirm,
- submenu relationships must become visually truthful,
- drag/edit/delete affordances must communicate intent clearly.

## Sub-Tasks

- `TASK-196-02-01_Delete_Confirmation_Dialog_and_Descendant_Context.md`
- `TASK-196-02-02_Nested_Tree_Indentation_and_Row_Affordance_Clarity.md`

## Files to Change

- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/menus/MenuTree.tsx`
- `core/admin/ui/menus/MenuItemRow.tsx`
- `core/admin/ui/menus/MenuItemDrawer.tsx`
- new `core/admin/ui/menus/MenuItemDeleteDialog.tsx`
- `tests/vitest/ui/menu-item-delete-dialog.test.tsx`
- `tests/vitest/ui/menu-tree.test.tsx`
- `tests/vitest/ui/menu-item-row.test.tsx`
- `tests/vitest/ui/menu-leaf-components.test.tsx`

## Architecture

Current owner seams:

- tree flattening / display composition:
  - `MenuEditorPage.tsx`
  - `MenuTree.tsx`
- row visuals and action semantics:
  - `MenuItemRow.tsx`
- drawer-level delete trigger:
  - `MenuItemDrawer.tsx`
- delete confirmation rendering:
  - `MenuItemDeleteDialog.tsx`

The existing tree already carries `parentId`, `orderIndex`, and nested
`children[]` structure. This task should make that structure visible and safe,
not invent a second hierarchy model.

Responsibility split:

- `MenuEditorPage.tsx` owns deletion candidate state and descendant resolution.
- `MenuItemDeleteDialog.tsx` owns the shared confirmation copy and real dialog
  wrapper contract.
- `MenuItemRow.tsx` and `MenuItemDrawer.tsx` remain trigger-only entrypoints.

## Implementation Direction

- Keep deletion confirmation editor-owned or extracted into a tiny Menus dialog
  component; do not reintroduce `window.confirm()`.
- Keep one shared delete flow for row action and drawer action so the user sees
  the same warning either way.
- Prove visual nesting from the actual `depth`/tree data, not only from helper
  copy.
- Improve row affordances without creating duplicate primary actions:
  - row click can stay the primary select/open-details action,
  - explicit edit/delete controls must still say what they do,
  - drag affordance must be visually separate from edit/delete affordance.

## Security Contract

- Visibility: internal admin Menus editor only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - deletion dialog is UX safety only; the saved payload still goes through the
    existing validated replace flow,
  - descendant context shown in the dialog must come from the current in-memory
    tree only and not leak unrelated menus.

## Testing Requirements

- `tests/vitest/ui/menu-item-delete-dialog.test.tsx`
  - real `Dialog` wrapper contract for the Menus delete flow
  - confirm/cancel actions, danger copy, and descendant context render without
    mocking `@/components/ui/dialog`
- `tests/vitest/ui/menu-tree.test.tsx`
  - prove nested structure is rendered in a visually distinct way
  - prove drag target hints remain visible when moving items
- `tests/vitest/ui/menu-item-row.test.tsx`
  - row exposes explicit drag/edit/delete affordances and accessible labels
- `tests/vitest/ui/menu-leaf-components.test.tsx`
  - row and drawer delete entrypoints go through the same dialog path
  - delete confirmation uses descendant-aware messaging

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Deleting a menu item is confirmed in the product UI, not by the browser.
2. Nested relationships are visible in the tree, not only stored in data.
3. Drag, edit, and delete controls are visually and semantically clearer.
4. Delete dialog rendering has one named owner instead of being reimplemented in
   row and drawer flows.
