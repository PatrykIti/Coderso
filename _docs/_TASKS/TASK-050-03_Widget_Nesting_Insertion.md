# TASK-050-03: Widget Nesting (Insert Into Existing Block)
# FileName: TASK-050-03_Widget_Nesting_Insertion.md

**Priority:** Medium  
**Category:** Admin/UI + CMS/Widgets  
**Estimated Effort:** Large  
**Dependencies:** TASK-049-06, TASK-049-05  
**Status:** ✅ Done (2026-02-03)

---

## Overview

Enable inserting widgets **inside** another widget (nested blocks) when the
selected target supports child content. This should allow flexible layouts
(e.g. a Hero with inner content slots), while preserving current flat list
behavior for widgets that do not support children.

---

## UX Requirements

- Insert dialog should detect if the target block supports nesting.
- If supported, insert should append as a child of that block (not as a new
  top-level block).
- If not supported, fallback to current behavior (insert after block).
- Provide clear UI hint when nesting is available vs not available.

---

## Data / Model Requirements

- Extend widget block model to support nested children:
  - `children?: WidgetBlock[]` (or `slots: Record<string, WidgetBlock[]>`).
- Define which widgets can host children:
  - New registry flag (e.g. `canHaveChildren: boolean` or `slots: string[]`).
- Maintain backward compatibility for existing blocks (children optional).

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/types.ts` | extend block model | add children/slots |
| `core/widgets/registry.ts` | add host flag | `canHaveChildren` or `slots` |
| `core/widgets/renderers/widgetRenderer.tsx` | update | render nested blocks |
| `core/ui/pages/builder/blockUtils.ts` | update | helper to insert child blocks |
| `core/admin/ui/widgets/WidgetInsertDialog.tsx` | update | show nesting availability |
| `core/admin/ui/widgets/WidgetLibraryPage.tsx` | update | insert logic for nested blocks |
| `core/admin/ui/pages/builder/BlockList.tsx` | update | display nested blocks |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | update | child management UI |
| `tests/unit/widgets/renderer.test.tsx` | add | nested rendering case |
| `tests/unit/pageBuilder/blockList.test.tsx` | add | nested blocks in UI |
| `tests/unit/ui/dialogs.test.tsx` | update | insert dialog nesting state |

---

## Testing Requirements

- Unit: insert helper nests blocks when supported.
- Unit: renderer displays nested blocks.
- Integration: insert into existing block persists nested structure.

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (nesting rules and container widgets)
- `_docs/PAGE_MODEL.md` (block schema updates)
- `_docs/README.md` (index if new docs are added)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-nesting.md`
