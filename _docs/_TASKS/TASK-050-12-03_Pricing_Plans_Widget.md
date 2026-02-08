# TASK-050-12-03: Pricing Plans Widget
# FileName: TASK-050-12-03_Pricing_Plans_Widget.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-12-02  
**Status:** Done (2026-02-08)

---

## Overview

Implement Pricing Plans widget for offer comparison.
Target output: plan cards with price, billing period, features, and CTA.

---

## Scope

- Widget ID: `pricing-plans`
- Variants:
  - `three-plans`
  - `four-plans`
  - `comparison-rows`
- Model:
  - title block: `title`, `description`
  - plans[]: `name`, `price`, `period`, `badge`, `features[]`, `ctaLabel`, `ctaHref`, `highlighted`
  - style: `cardSurface`, `cardBorder`, `highlightRing`, `spacing`, `radius`
- Wizard:
  - choose plan count
  - fill basic plan names/prices
- Visual:
  - plan cards editing + highlight controls
  - style controls via pickers/selects
- Advanced:
  - technical spacing and fallback metadata

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/pricingPlans.tsx` | new widget model + schema + defaults + render | deterministic plan ordering |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | new editors | Visual sections |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register widget definition | core catalog |
| `tests/unit/widgets/pricingPlans.test.tsx` | new tests | schema/defaults/render |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | markers |
| `tests/unit/ui/widget-template-editor.test.tsx` | add editor integration | visual sections |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/pricingPlans.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/PRICING.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-pricing-plans-widget.md`
