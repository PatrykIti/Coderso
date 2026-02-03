# TASK-050-11: Contact Widget Expansion
# FileName: TASK-050-11_Contact_Widget_Expansion.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** To Do

---

## Overview

Expand the Contact widget to fully match the v1 documentation. This is a
**non-slot** widget with configurable form fields, contact details, and
optional map embed.

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/CONTACT.md`:

- Form: `fields[]`, `required[]`, `submitLabel`
- Contact: `phone`, `email`, `address`, `hours`
- Map: `enabled`, `embedUrl`
- Style: `spacing`, `background`, `columns`

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Layout (form-left / form-right / minimal)
2) Form fields selection (name, email, phone, message)
3) Contact details (phone/email/address)

### Visual
- Variant preview with form + details
- Quick field toggles

### Advanced
- Full form field ordering + required toggle
- Map embed configuration
- Style and spacing controls

---

## Rendering Requirements

Update `ContactBlock` to:
- Render form + contact details based on variant
- Respect required fields and layout
- Render embedded map when enabled

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/contact.tsx` | expand data model + schema + defaults | per docs |
| `core/widgets/core/contact.tsx` | update render variants | layout + map |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | expand wizard flow | fields + details |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | expand visual + advanced | required + map |
| `tests/unit/widgets/contact.test.tsx` | add tests | schema + defaults |

---

## Testing Requirements

- Unit: schema validates form fields and map settings.
- Unit: renderer respects variant layouts.
- UI: wizard/visual/advanced field coverage.

---

## Documentation Updates Required

- `_docs/_WIDGETS/CONTACT.md` (final fields + examples)
- `_docs/WIDGETS.md` (if summary fields change)
