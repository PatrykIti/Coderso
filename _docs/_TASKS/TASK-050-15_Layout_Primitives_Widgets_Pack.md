# TASK-050-15: Layout Primitives Widgets Pack
# FileName: TASK-050-15_Layout_Primitives_Widgets_Pack.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-14, TASK-050-04, TASK-051-03  
**Status:** Done (2026-02-09)

---

## Overview

Add a layout-focused widget pack that lets editors build scalable page
structures without overloading content widgets with container logic.

This pack introduces reusable layout primitives:
- Section
- Grid/Columns
- Stack
- Split Layout
- Spacer
- Divider

It also adds repeatable slot support so selected layout widgets can expose
an elastic number of slots instead of fixed slot sets.

---

## Sub-Tasks

- **TASK-050-15-01:** Repeatable Slots Core for Layout Widgets
- **TASK-050-15-02:** Section Layout Widget
- **TASK-050-15-03:** Grid/Columns Layout Widget
- **TASK-050-15-04:** Stack Layout Widget
- **TASK-050-15-05:** Split Layout Widget
- **TASK-050-15-06:** Spacer Widget
- **TASK-050-15-07:** Divider Widget

## Progress

- Done: `TASK-050-15-01`
- Done: `TASK-050-15-02`
- Done: `TASK-050-15-03`
- Done: `TASK-050-15-04`
- Done: `TASK-050-15-05`
- Done: `TASK-050-15-06`
- Done: `TASK-050-15-07`

---

## Architecture Notes

- Keep three-layer styling model:
  - page defaults (`Page Details`)
  - section/layout widget scope
  - content widget local styling
- Repeatable slots must be deterministic:
  - stable `slotId` values in data model
  - no index-based IDs in persisted payload
- Preserve backward compatibility:
  - existing fixed-slot widgets remain unchanged
  - repeatable slot metadata is additive
- Keep Visual mode primary for structure editing.
- Keep Advanced mode technical-only.

---

## Implementation Order

1. Implement repeatable slot infrastructure (`15-01`).
2. Implement Section and Grid/Columns (`15-02`, `15-03`) on top of repeatable slots.
3. Implement Stack and Split (`15-04`, `15-05`) for composition presets.
4. Implement Spacer and Divider (`15-06`, `15-07`) as utility primitives.
5. Add integration tests for nested layout trees and insert/reorder flows.

---

## Testing Requirements

- Unit tests for slot normalization/validation and insertion rules.
- Widget tests for each primitive:
  - schema/defaults
  - renderer markers
  - wizard/visual/advanced sections
- Integration tests for nested composition in template editor and runtime preview.
- Required commands:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test`

---

## Documentation Updates Required

- `_docs/_WIDGETS/SECTION.md`
- `_docs/_WIDGETS/GRID_COLUMNS.md`
- `_docs/_WIDGETS/STACK.md`
- `_docs/_WIDGETS/SPLIT_LAYOUT.md`
- `_docs/_WIDGETS/SPACER.md`
- `_docs/_WIDGETS/DIVIDER.md`
- `_docs/_WIDGETS/README.md`
- `_docs/WIDGETS.md`
- `_docs/PAGE_MODEL.md` (layout layering + inheritance notes)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-layout-primitives-pack.md`
