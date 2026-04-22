# TASK-196-02-02: Nested Tree Indentation and Row Affordance Clarity
# FileName: TASK-196-02-02_Nested_Tree_Indentation_and_Row_Affordance_Clarity.md

**Priority:** High
**Category:** CMS/Menus + Admin/UI + Tree UX
**Estimated Effort:** Medium
**Dependencies:** TASK-196-02
**Status:** Done (2026-04-22)

---

## Overview

Make the menu tree explain itself visually.

This leaf covers the report items that currently make the tree feel ambiguous:

- child items do not read as children strongly enough,
- drag-and-drop does not have enough visual support,
- explicit edit controls compete with row click without enough explanation.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/menus/MenuTree.tsx`
- `core/admin/ui/menus/MenuItemRow.tsx`
- `tests/vitest/ui/menu-tree.test.tsx`
- `tests/vitest/ui/menu-item-row.test.tsx`

## Implementation Direction

- Treat the current `depth` model as the owner for nesting and make the visual
  output match it unmistakably.
- Minimum hierarchy improvements:
  - stronger indentation,
  - visible nested guide or parent-context hint,
  - no ambiguity between root items and child items.
- Minimum affordance improvements:
  - drag handle looks draggable,
  - edit button has explicit label/title/tooltip semantics,
  - delete button has explicit label/title/tooltip semantics,
  - drag hover/drop target feedback remains obvious.
- Do not remove row click as the primary open-details action unless the real
  component path proves it is harming keyboard/accessibility behavior.

## Security Contract

- Visibility: internal admin tree UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - drag/drop affordance changes must not loosen cycle protection or parent
    validation,
  - visual nesting must still reflect the saved tree data truthfully.

## Testing Requirements

- `tests/vitest/ui/menu-tree.test.tsx`
  - child items render with distinct hierarchy styling
  - drag target placeholder or intent hint renders when moving items
- `tests/vitest/ui/menu-item-row.test.tsx`
  - drag handle remains explicit
  - edit/delete controls expose accessible labels or titles
  - row still exposes a clear primary action state

## Documentation Updates Required

- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Child menu items are visibly different from root items.
2. Drag/edit/delete affordances communicate different actions clearly.
3. The real tree UI, not only mocked component wiring, proves the hierarchy
   fix.
