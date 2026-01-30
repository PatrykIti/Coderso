# TASK-009-03: Core Widget – Hero
# FileName: TASK-009-03_Core_Widget_Hero.md

**Priority:** High  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-009-01, TASK-009-02  
**Status:** To Do  

---

## Overview

Implement core widget **Hero** zgodnie z `_docs/_WIDGETS/HERO.md`.
Widget musi mieć warianty + schema + defaults + trzy edytory (wizard/visual/advanced)
+ renderer.

---

## Required Variants (from spec)
- `centered`
- `split`
- `media-left`

---

## Implementation Checklist

| File | Change | Notes |
| --- | --- | --- |
| `core/widgets/core/hero.tsx` | new | schema + defaults + render + registerWidget |
| `core/ui/widgets/editors/HeroEditor.tsx` | new | wizard/visual/advanced |
| `tests/unit/widgets/hero.test.tsx` | new | render defaults |

---

## Renderer Notes

- Use design tokens (spacing, typography, colors).
- Support CTA button + optional secondary CTA.
- Support optional background image.

---

## Editor Notes

- Wizard: pytania „headline”, „subhead”, „CTA?”
- Visual: wybór wariantu + tylko pola z tego wariantu
- Advanced: spacing, alignment, layout

---

## Testing Requirements

- default render does not crash
- invalid variant rejected by validator

---

## Docs

- Update `_docs/_WIDGETS/HERO.md` if schema changes

---

## Changelog (planned)

- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-widget-registry-and-core-widgets.md`
