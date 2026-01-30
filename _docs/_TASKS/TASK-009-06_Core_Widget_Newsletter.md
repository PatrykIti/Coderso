# TASK-009-06: Core Widget – Newsletter
# FileName: TASK-009-06_Core_Widget_Newsletter.md

**Priority:** Medium  
**Category:** CMS/Widgets  
**Estimated Effort:** Small  
**Dependencies:** TASK-009-01, TASK-009-02  
**Status:** To Do  

---

## Overview

Implement core widget **Newsletter** zgodnie z `_docs/_WIDGETS/NEWSLETTER.md`.
Formularz zapisu + optional success state.

---

## Implementation Checklist

| File | Change | Notes |
| --- | --- | --- |
| `core/widgets/core/newsletter.tsx` | new | schema + defaults + render + registerWidget |
| `core/ui/widgets/editors/NewsletterEditor.tsx` | new | wizard/visual/advanced |
| `tests/unit/widgets/newsletter.test.tsx` | new | render defaults |

---

## Renderer Notes

- Input email + CTA button.
- Optional success message.
- a11y: label + aria.

---

## Editor Notes

- Wizard: title, placeholder, CTA label.
- Visual: preview form.
- Advanced: spacing + alignment.

---

## Testing Requirements

- render default state
- validator rejects missing CTA label

---

## Docs

- Update `_docs/_WIDGETS/NEWSLETTER.md` if schema changes

---

## Changelog (planned)

- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-widget-registry-and-core-widgets.md`
