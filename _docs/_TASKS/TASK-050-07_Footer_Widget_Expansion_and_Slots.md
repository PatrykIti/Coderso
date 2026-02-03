# TASK-050-07: Footer Widget Expansion + Slots
# FileName: TASK-050-07_Footer_Widget_Expansion_and_Slots.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** To Do

---

## Overview

Expand the Footer widget to match the documented v1 spec and add slots for
footer columns and a bottom strip area.

---

## Slot Design (Footer)

- Slot ID: `column-1` → Label: `Column 1`
- Slot ID: `column-2` → Label: `Column 2`
- Slot ID: `column-3` → Label: `Column 3`
- Optional slot: `bottom` → Label: `Bottom Strip`

Placement:
- Columns render inside the main footer grid.
- Bottom slot renders in the footer’s lower bar (legal / extra actions).

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/FOOTER.md`:

- Columns: `{ title, links: [{ label, href }] }`
- Legal: `copyright`, `privacy`, `terms`
- Social: `[{ type, href }]`
- Layout: spacing + alignment

Notes:
- Columns still render basic links, but slots enable richer content.
- Schema + defaults should handle all columns safely.

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Layout (2 columns / 3 columns / minimal)
2) Column titles
3) Legal + social basics

### Visual
- Variant cards for each layout
- Column preview with example link counts

### Advanced
- Full link editor per column (labels + URLs)
- Social list management
- Legal row settings

---

## Rendering Requirements

Update `FooterBlock` to:
- Render columns from data model
- Render `slots.column-*` within respective column
- Render `slots.bottom` in lower strip

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/footer.tsx` | expand `FooterData`, schema, defaults | per docs |
| `core/widgets/core/footer.tsx` | add `slots` definition | columns + bottom |
| `core/widgets/core/footer.tsx` | render slots | column placement |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | expand wizard flow | layout + titles + legal |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | expand visual + advanced | links + social |
| `tests/unit/widgets/footer.test.tsx` | add/extend tests | schema + defaults |
| `tests/unit/widgets/renderer.test.tsx` | verify slot render | column slot |

---

## Testing Requirements

- Unit: schema validates social + links.
- Unit: renderer places column/bottom slot content correctly.
- UI: wizard/visual/advanced field coverage.

---

## Documentation Updates Required

- `_docs/_WIDGETS/FOOTER.md` (final data model + slots)
- `_docs/WIDGETS.md` (slot support overview)
- `_docs/PAGE_MODEL.md` (slot example snippet)
