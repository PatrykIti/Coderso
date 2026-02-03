# TASK-050-10: Newsletter Widget Expansion
# FileName: TASK-050-10_Newsletter_Widget_Expansion.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** To Do

---

## Overview

Expand the Newsletter widget to fully match the v1 documentation. This is a
**non-slot** widget focused on form configuration, consent, and integration.

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/NEWSLETTER.md`:

- Content: `title`, `description`, `placeholder`
- Consent: `enabled`, `label`, `required`
- Submit: `label`, `successMessage`
- Integration: `actionUrl` or `webhookId`
- Style: `spacing`, `alignment`, `background`

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Style (inline / stacked / minimal)
2) Title + description
3) Button label
4) Consent checkbox (on/off + label)

### Visual
- Variant previews + quick content edits

### Advanced
- Full integration settings (actionUrl/webhookId)
- Success message + required consent toggle
- Style controls (alignment + spacing)

---

## Rendering Requirements

Update `NewsletterBlock` to:
- Render variants properly (inline/stacked/minimal)
- Show consent checkbox if enabled
- Apply style settings

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/newsletter.tsx` | expand data model + schema + defaults | per docs |
| `core/widgets/core/newsletter.tsx` | update render variants | inline/stacked/minimal |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | expand wizard flow | title + consent |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | expand visual + advanced | integration + style |
| `tests/unit/widgets/newsletter.test.tsx` | add tests | schema + defaults |

---

## Testing Requirements

- Unit: schema validates consent + integration fields.
- Unit: renderer respects variant layouts.
- UI: wizard/visual/advanced coverage.

---

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md` (final fields + examples)
- `_docs/WIDGETS.md` (if summary fields change)
