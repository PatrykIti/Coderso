# TASK-050-04: Widget Slot System (Core)
# FileName: TASK-050-04_Widget_Slot_System_Core.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-03  
**Status:** ✅ Done (2026-02-04)

---

## Overview

Introduce a **slot-based nesting model** for widgets. Slots allow widgets to
define specific insertion areas (e.g. hero content, footer columns, navigation
right rail). This replaces the generic `children` model with a structured
`slots` object, while keeping backward compatibility.

---

## Goals

- Replace free-form `children` with **named slots**.
- Allow insert dialog to pick a slot when a target widget supports them.
- Render slot content inside the correct visual area of each widget.
- Keep existing data compatible (`children` maps to a default slot).

---

## Data / Model Requirements

### 1) Widget definition
Add slot metadata to widget definitions:

```ts
type WidgetSlotDefinition = {
  id: string;                // e.g. "content", "right", "column-1"
  label: string;             // "Hero Content"
  maxItems?: number;         // optional limit
  allowedTypes?: string[];   // optional allowlist
};

type WidgetDefinition = {
  ...
  slots?: WidgetSlotDefinition[];
};
```

### 2) Widget block data
Extend block model with slots storage:

```ts
type WidgetBlock = {
  ...
  slots?: Record<string, WidgetBlock[]>;
};
```

### 3) Backward compatibility
If a block has `children` but no `slots`, treat it as:
```
slots.default = children
```

---

## UI / UX Requirements

- Insert dialog:
  - If target block has slots → show slot selector (dropdown).
  - If no slots → keep existing behavior (insert after block).
  - If slot has `maxItems`, disable when full and show hint.
  - If `allowedTypes` exists, filter/disable incompatible widgets.

- Block list:
  - Render nested blocks grouped by slot (header per slot).
  - Show slot label + count (e.g. “Right slot (2)”).
  - Keep drag/drop + reorder scoped to a slot.

---

## Rendering Requirements

Widget renderer passes slot content down to widget component:

```ts
render: ComponentType<{ data: T; variant: string; slots?: Record<string, WidgetBlock[]> }>
```

Slots should not automatically render globally. Each widget is responsible for
placement of slots in its own JSX layout.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/types.ts` | add `WidgetSlotDefinition`, `WidgetDefinition.slots`, `WidgetBlock.slots` | new types |
| `core/widgets/registry.ts` | validate slots schema | ensure ids + labels |
| `core/widgets/validator.ts` | normalize `slots`, map legacy `children` | no data loss |
| `core/server/validation/widgetSchemas.ts` | extend block schema for `slots` | recursive validation |
| `core/server/validation/pageSchemas.ts` | extend block schema for `slots` | recursive validation |
| `core/widgets/renderers/widgetRenderer.tsx` | pass slots to widget component | do not auto-render |
| `core/admin/ui/pages/builder/blockUtils.ts` | add helpers for slot CRUD | insert/reorder/remove |
| `core/admin/ui/pages/builder/BlockList.tsx` | render slots groups | drag/drop per slot |
| `core/admin/ui/widgets/WidgetInsertDialog.tsx` | add slot selector | only for slot-capable widgets |
| `core/admin/ui/widgets/WidgetLibraryPage.tsx` | insert to slot when chosen | respect allowedTypes/maxItems |
| `tests/unit/pageBuilder/blockList.test.tsx` | slot rendering + reorder | update coverage |
| `tests/unit/ui/widgetInsertUtils.test.ts` | slot options + filtering | update coverage |
| `tests/unit/widgets/renderer.test.tsx` | slots passed to widget render | new case |

---

## Testing Requirements

- Unit: slot normalization + legacy `children` mapping.
- Unit: block utils insert/reorder/remove inside slots.
- Unit: renderer passes slots into widget render and does not auto-render.
- UI: insert dialog shows slots for slot-enabled widgets.

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (slot definitions and block shape)
- `_docs/PAGE_MODEL.md` (slot-based block structure)
- `_docs/README.md` (only if new docs are added)
