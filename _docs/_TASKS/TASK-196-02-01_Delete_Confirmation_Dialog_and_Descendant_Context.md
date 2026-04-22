# TASK-196-02-01: Delete Confirmation Dialog and Descendant Context
# FileName: TASK-196-02-01_Delete_Confirmation_Dialog_and_Descendant_Context.md

**Priority:** High
**Category:** CMS/Menus + Admin/UI + Destructive Actions
**Estimated Effort:** Medium
**Dependencies:** TASK-196-02
**Status:** To Do

---

## Overview

Replace the native delete confirm with a product-owned dialog that tells the
user what will be removed.

The dialog must answer two questions before deletion:

- which item is about to be removed,
- how many descendant items will be removed with it.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/menus/MenuItemDrawer.tsx`
- `core/admin/ui/menus/MenuTree.tsx` only if the row action flow needs a small
  trigger change
- optional new `core/admin/ui/menus/MenuItemDeleteDialog.tsx`
- `tests/vitest/ui/menu-leaf-components.test.tsx`
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
- `tests/vitest/ui/dialogs.test.tsx` only if a real shared dialog path is the
  cleanest regression owner

## Implementation Direction

- Use the current tree state to calculate descendant count.
- Dialog copy should include:
  - item label,
  - descendant count when `> 0`,
  - irreversible-action wording,
  - clear primary danger action and secondary cancel action.
- Both delete entrypoints must open the same dialog:
  - row delete button,
  - drawer `Delete Item`.
- Do not add Menus-only global state or event bus just for this dialog.

## Security Contract

- Visibility: internal admin destructive confirmation only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - confirm UI must not remove items until the user explicitly accepts,
  - the dialog must not expose hidden menu data from other menus.

## Testing Requirements

- `tests/vitest/ui/menu-leaf-components.test.tsx`
  - both delete entrypoints open the same dialog
  - dialog copy contains label and descendant count
  - cancel keeps the item tree intact
  - confirm removes the item and descendants from local draft state
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
  - at least one real editor path proves the dialog integrates with the actual
    editor shell, not only leaf mocks
- `tests/vitest/ui/dialogs.test.tsx`
  - only if needed to keep a real `Dialog` wrapper path in scope

## Documentation Updates Required

- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Native browser confirm is gone from the Menus editor delete flow.
2. The dialog names the affected item and descendant impact before confirmation.
3. Row-level and drawer-level delete behave consistently.
