# TASK-050-10: Newsletter Widget Expansion
# FileName: TASK-050-10_Newsletter_Widget_Expansion.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-04  
**Status:** In Progress (2026-02-08)

---

## Overview

Expand the Newsletter widget to fully match v1 documentation and align its
editing quality with Hero, Navigation, Footer, Timeline, and Compare Timeline.

Newsletter is a **non-slot** widget focused on lead capture UX, consent policy,
submission behavior, and integration endpoint configuration.

Execution is split into two detailed subtasks:

- `TASK-050-10-01` Newsletter Widget Bugfixes and UX Hardening (**Done, 2026-02-08**)
- `TASK-050-10-02` Newsletter Widget Visual Rebuild and Advanced Cleanup (**To Do**)

---

## Data Model Expansion (per docs)

Align with `_docs/_WIDGETS/NEWSLETTER.md`:

- Content: `title`, `description`, `placeholder`
- Consent: `enabled`, `label`, `required`
- Submit: `label`, `successMessage`
- Integration: `mode`, `actionUrl`, `webhookId`
- Style: `spacing`, `alignment`, `background`, optional border/surface helpers

Notes:
- Keep additive schema changes for compatibility.
- Normalize legacy payloads at runtime/editor boundaries.

---

## Wizard / Visual / Advanced Requirements

### Wizard
1) Variant (inline / stacked / minimal)
2) Title + description
3) Button label
4) Consent baseline (on/off + short label)

Wizard should produce safe defaults for non-technical users.

### Visual
- Variant cards + practical content/styling controls
- In final state, Newsletter owns variant controls in Visual
  (no duplicate generic picker)

### Advanced
- 10-01: broad controls while model stabilizes
- 10-02: technical-only controls (no duplicate content/style from Visual)

---

## Rendering Requirements

Update `NewsletterBlock` to:
- render variants deterministically (`inline` / `stacked` / `minimal`)
- show consent checkbox only when enabled
- apply style settings for alignment/spacing/background
- preserve existing payload compatibility

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/newsletter.tsx` | expand data model + schema + defaults | per docs |
| `core/widgets/core/newsletter.tsx` | add normalization + deterministic renderer output | variant + style |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | wizard flow hardening | split in 10-01 |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | section-based visual + advanced cleanup | split in 10-02 |
| `tests/unit/widgets/newsletter.test.tsx` | add/expand widget tests | schema/defaults/render |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | variant/layout parity |
| `tests/unit/pageBuilder/visualPanel.test.tsx` | cover visual variant ownership | 10-02 |
| `tests/unit/ui/widget-template-editor.test.tsx` | newsletter editor integration | visual sections |

---

## Sub-Tasks

- **TASK-050-10-01:** Newsletter Widget Bugfixes and UX Hardening  
  Scope: model/schema parity, renderer correctness, wizard hardening, baseline
  tests.
- **TASK-050-10-02:** Newsletter Widget Visual Rebuild and Advanced Cleanup  
  Scope: section-based Visual IA, variant ownership in Visual, and technical-only
  Advanced scope.

---

## Testing Requirements

- Unit: schema validates consent + integration + style fields.
- Unit: renderer respects all variant layouts and consent behavior.
- UI: wizard/visual/advanced coverage with mode boundaries.

---

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md` (final fields + examples)
- `_docs/WIDGETS.md` (if generic summary changes)
