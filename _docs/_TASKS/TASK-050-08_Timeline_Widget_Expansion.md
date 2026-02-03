# TASK-050-08: Timeline Widget Expansion
# FileName: TASK-050-08_Timeline_Widget_Expansion.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** To Do

---

## Overview

Expand the Timeline widget to fully match the v1 documentation. This is a
**non-slot** widget focused on richer layout, step metadata, and visual
controls.

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/TIMELINE.md`:

- Steps: `title`, `description`, `icon`, `accent`
- Layout: `orientation`, `align`, `spacing`, `labelPosition`
- Guides: `enabled`, `style`
- Line/markers: `lineStyle`, `thickness`, `markerSize`
- Background: `color`

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Count of steps (3–8)
2) Variant (milestones / cards / compact)
3) Orientation (horizontal / vertical)
4) Label position (top / bottom)
5) Guides on/off

Wizard should create placeholder steps with stable IDs.

### Visual
- Preview per variant
- Only show fields relevant to selected variant

### Advanced
- Full steps editor (titles, descriptions, icons, accents)
- Line + marker size controls
- Layout spacing + alignment options

---

## Rendering Requirements

Update `TimelineBlock` to:
- Render variants correctly (milestones/cards/compact)
- Respect orientation + label position
- Apply guides + line styles

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/timeline.tsx` | expand data model + schema + defaults | per docs |
| `core/widgets/core/timeline.tsx` | update render variants | layout + guides |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | expand wizard flow | per docs |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | expand visual + advanced | full controls |
| `tests/unit/widgets/timeline.test.tsx` | extend schema/default tests | add layout cases |

---

## Testing Requirements

- Unit: schema validates step metadata + layout options.
- Unit: renderer supports orientation + label positions.
- UI: wizard/visual/advanced fields exist.

---

## Documentation Updates Required

- `_docs/_WIDGETS/TIMELINE.md` (final fields + examples)
- `_docs/WIDGETS.md` (if summary fields change)
