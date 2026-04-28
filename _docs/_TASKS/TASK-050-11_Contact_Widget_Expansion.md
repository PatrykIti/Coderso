# TASK-050-11: Contact Widget Expansion
# FileName: TASK-050-11_Contact_Widget_Expansion.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** Done (2026-02-08)

---

## Overview

Expand the Contact widget to fully match v1 documentation and align editing
quality with Hero, Navigation, Footer, Timeline, Compare Timeline, and
Newsletter.

Contact is a **non-slot** widget focused on contact details, configurable form
fields, map embed, and layout clarity across Wizard/Visual/Advanced modes.

Execution is split into two detailed subtasks:

- `TASK-050-11-01` Contact Widget Bugfixes and UX Hardening (**Done, 2026-02-08**)
- `TASK-050-11-02` Contact Widget Visual Rebuild and Advanced Cleanup (**Done, 2026-02-08**)

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/CONTACT.md`:

- Form: `fields[]`, `required[]`, `submitLabel`
- Contact: `phone`, `email`, `address`, `hours`
- Map: `enabled`, `embedUrl`
- Style: `spacing`, `background`, `columns`

Notes:
- Keep additive schema changes for compatibility.
- Normalize legacy payloads at runtime/editor boundaries.

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Layout (form-left / form-right / minimal)
2) Form fields selection (name, email, phone, message)
3) Contact details (phone/email/address)

Wizard should generate safe defaults with no technical friction.

### Visual
- Variant cards + practical content/styling controls.
- In final state, Contact owns variant controls in Visual
  (no duplicate generic picker).

### Advanced
- 11-01: broad controls while model stabilizes.
- 11-02: technical-only controls (no duplicate content/style from Visual).

---

## Rendering Requirements

Update `ContactBlock` to:
- render variants deterministically (`form-left` / `form-right` / `minimal`),
- respect selected fields and required rules,
- render embedded map only when enabled and valid,
- apply style settings for spacing/background/columns.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/contact.tsx` | expand data model + schema + defaults | per docs |
| `core/widgets/core/contact.tsx` | add normalization + deterministic rendering | variants + map + style |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | wizard hardening | split in 11-01 |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | section-based visual + advanced cleanup | split in 11-02 |
| `tests/unit/widgets/contact.test.tsx` | add/expand widget tests | schema/defaults/render |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | variant/layout parity |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | cover visual variant ownership | 11-02 |
| `tests/unit/ui/widget-template-editor.test.tsx` | contact editor integration | visual sections |

---

## Sub-Tasks

- **TASK-050-11-01:** Contact Widget Bugfixes and UX Hardening  
  Scope: model/schema parity, normalization hardening, renderer correctness,
  wizard reliability, and baseline tests.
- **TASK-050-11-02:** Contact Widget Visual Rebuild and Advanced Cleanup  
  Scope: section-based Visual IA, variant ownership in Visual, and
  technical-only Advanced scope.

---

## Testing Requirements

- Unit: schema validates form fields, required rules, map settings, and style.
- Unit: renderer respects variant layouts and conditional map visibility.
- UI: wizard/visual/advanced field coverage.

---

## Documentation Updates Required

- `_docs/_WIDGETS/CONTACT.md` (final fields + examples)
- `_docs/WIDGETS.md` (if summary fields change)
