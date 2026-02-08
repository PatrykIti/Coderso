# TASK-050-12-01: Feature Grid Widget
# FileName: TASK-050-12-01_Feature_Grid_Widget.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-12, TASK-050-04  
**Status:** To Do

---

## Overview

Implement Feature Grid widget for benefit/value sections.
Target output: cards with icon/image, title, description, optional CTA per card.

---

## Scope

- Widget ID: `feature-grid`
- Variants:
  - `cards-3`
  - `cards-4`
  - `highlight-first`
- Model:
  - header: `eyebrow`, `title`, `description`
  - items[]: `icon`, `image`, `title`, `description`, `ctaLabel`, `ctaHref`
  - style: `columns`, `gap`, `surfaceColor`, `borderColor`, `borderWidth`, `radius`
- Wizard:
  - choose layout variant
  - set section title
  - choose item count + basic labels
- Visual:
  - card management and content editing
  - color/border/radius controls via pickers/selects
- Advanced:
  - technical tokens only (layout density, fallback fields)

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/featureGrid.tsx` | new widget model + schema + defaults + render | deterministic cards |
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | new wizard/visual/advanced editors | section-based Visual |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register widget definition | core catalog |
| `tests/unit/widgets/featureGrid.test.tsx` | new tests | schema/defaults/render |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | variant/layout markers |
| `tests/unit/ui/widget-template-editor.test.tsx` | add editor integration test | visual sections |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/featureGrid.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-feature-grid-widget.md`
