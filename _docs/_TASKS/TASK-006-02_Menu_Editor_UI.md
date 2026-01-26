# TASK-006-02: Menu Editor UI
# FileName: TASK-006-02_Menu_Editor_UI.md

**Priority:** Medium
**Category:** Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-006, TASK-024
**Status:** To Do

---

## Overview

Convert the menu editor HTML into shadcn-based components. The layout is a
split view: menu tree on the left and an editor drawer on the right.

## Reference UI

- `_docs/UI/admin_panel/2-menu_editor/code.html`
- `_docs/UI/admin_panel/2-menu_editor/screen.png`

## UI Composition

**Wrapper:** `SplitShell`

**Sections:**
- Tree list with indentation, drag handles, and inline actions.
- Right-side drawer with item form (label, link type, parent, url, toggles).
- Save/Discard actions in the top bar.

## Shadcn Components

- `Button`, `Card`, `Input`, `Select`, `Switch`, `Badge`, `Sheet`/`Drawer`,
  `DropdownMenu`, `Tooltip`, `Separator`, `ScrollArea`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/menus/MenuEditorPage.tsx` | create | page shell |
| `core/admin/ui/menus/MenuTree.tsx` | create | list + nesting |
| `core/admin/ui/menus/MenuItemRow.tsx` | create | row + actions |
| `core/admin/ui/menus/MenuItemDrawer.tsx` | create | right panel |
| `core/admin/ui/menus/MenuItemForm.tsx` | create | form fields |
| `core/admin/ui/layouts/SplitShell.tsx` | use | wrapper |

## Data + State

- Load menus via `GET /menus` and selected menu via `GET /menus/:id`.
- Update items via `PUT /menus/:id/items`.
- Keep local `MenuItemDraft[]` state with validation flags.

## Unit Tests

- `tests/unit/ui/menu-editor.test.tsx` renders tree + drawer.
- `tests/unit/ui/menu-item-form.test.tsx` validates required fields.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-menu-editor-ui.md`

