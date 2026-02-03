# TASK-050-09: Compare Timeline Widget Expansion
# FileName: TASK-050-09_Compare_Timeline_Widget_Expansion.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** To Do

---

## Overview

Expand the Compare Timeline widget to fully match the v1 documentation. This is a
**non-slot** widget focused on richer axis/track configuration and highlight
segments.

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/COMPARE_TIMELINE.md`:

- Axis: `steps[]` with `label` + optional `description`
- Tracks: `label`, `markers`, optional `segments[{ from, to, label }]`
- Highlight: `color`, label style
- Guides: `enabled`, `style`
- Layout: spacing between tracks, label position

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Track labels (A/B)
2) Axis steps (3–6)
3) Markers for track A
4) Markers for track B
5) Highlight segments on/off
6) Accent/highlight target track

### Visual
- Variant selection (dual-track / highlight)
- Quick marker/segment preview

### Advanced
- Full axis + track editor
- Segment editor with validation (from <= to)
- Guides + highlight style controls

---

## Rendering Requirements

Update `CompareTimelineBlock` to:
- Render tracks with markers
- Render segments for highlight variant
- Respect spacing + label positioning

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/compareTimeline.tsx` | expand data model + schema + defaults | per docs |
| `core/widgets/core/compareTimeline.tsx` | update render variants | highlight segments |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | expand wizard flow | track + steps |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | expand visual + advanced | markers + segments |
| `tests/unit/widgets/compareTimeline.test.tsx` | extend schema/default tests | add highlight case |

---

## Testing Requirements

- Unit: schema validates track markers + segments.
- Unit: renderer draws highlight segments correctly.
- UI: wizard/visual/advanced fields present.

---

## Documentation Updates Required

- `_docs/_WIDGETS/COMPARE_TIMELINE.md` (final fields + examples)
- `_docs/WIDGETS.md` (if summary fields change)
