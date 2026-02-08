# TASK-050-12-02: Testimonials Widget
# FileName: TASK-050-12-02_Testimonials_Widget.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-12-01  
**Status:** Done (2026-02-08)

---

## Overview

Implement Testimonials widget for social proof sections.
Target output: quote cards with author avatar/name/role and optional rating.

---

## Scope

- Widget ID: `testimonials`
- Variants:
  - `grid`
  - `spotlight`
  - `slider-static`
- Model:
  - title block: `eyebrow`, `title`, `description`
  - testimonials[]: `quote`, `author`, `role`, `avatar`, `rating`, `sourceLabel`
  - style: `cardSurface`, `cardBorder`, `textColor`, `accentColor`, `spacing`
- Wizard:
  - choose variant
  - add 2-3 initial testimonials
- Visual:
  - manage testimonials and ratings
  - style controls with color pickers
- Advanced:
  - technical display tokens and fallback toggles

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/testimonials.tsx` | new widget model + schema + defaults + render | deterministic output |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | new editors | Visual-first IA |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register widget definition | core catalog |
| `tests/unit/widgets/testimonials.test.tsx` | new tests | schema/defaults/render |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | markers |
| `tests/unit/ui/widget-template-editor.test.tsx` | add editor integration | visual sections |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/testimonials.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/TESTIMONIALS.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-testimonials-widget.md`
