# TASK-009-07: Core Widget – Contact
# FileName: TASK-009-07_Core_Widget_Contact.md

**Priority:** Medium  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-009-01, TASK-009-02  
**Status:** Done (2026-01-30)  

---

## Overview

Implement core widget **Contact** zgodnie z `_docs/_WIDGETS/CONTACT.md`.
Formularz + dane kontaktowe.

---

## Implementation Checklist

| File | Change | Notes |
| --- | --- | --- |
| `core/widgets/core/contact.tsx` | new | schema + defaults + render + registerWidget |
| `core/ui/widgets/editors/ContactEditor.tsx` | new | wizard/visual/advanced |
| `tests/unit/widgets/contact.test.tsx` | new | render defaults |

---

## Renderer Notes

- Form fields: name, email, message (min).
- Optional address/phone block.
- a11y: label + aria.

---

## Editor Notes

- Wizard: recipient email + toggle address block.
- Visual: variant preview (form + info).
- Advanced: layout (2-column), spacing.

---

## Testing Requirements

- default render ok
- validator rejects empty recipient

---

## Docs

- Update `_docs/_WIDGETS/CONTACT.md` if schema changes

---

## Changelog (planned)

- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-widget-registry-and-core-widgets.md`
