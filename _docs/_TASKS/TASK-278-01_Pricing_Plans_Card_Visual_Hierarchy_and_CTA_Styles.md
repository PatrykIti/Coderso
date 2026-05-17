# TASK-278-01: Pricing Plans Card Visual Hierarchy and CTA Styles

# FileName: TASK-278-01_Pricing_Plans_Card_Visual_Hierarchy_and_CTA_Styles.md

**Priority:** High
**Category:** Widgets + Pricing Plans + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-256-04, TASK-256-06-03, TASK-278
**Status:** To Do

---

## Overview

Add Pricing Plans-owned card hierarchy controls: plan-level descriptions,
plan-level surfaces, CTA variants, highlighted badge treatment, and a "popular"
banner affordance for highlighted plans.

This leaf must not reimplement TASK-256 clear-control or safe-link behavior.
It builds on those contracts and only expands the Pricing Plans product model.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:185-189` - BUG-06, every
  badge uses `highlightRing`.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:245-252` - BF-02 and BF-03
  for per-plan surface and CTA style.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:254-255` - BF-05 per-plan
  description/subline.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:260-261` - BF-07 highlighted
  banner.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:291` - A2 badge contrast
  risk; TASK-256 owns baseline accessibility, this leaf owns product hierarchy.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:355-362` - badge color
  observation.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:461-467` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/pricingPlans.tsx` | Extend `PricingPlanItem`, schema, defaults, normalizer, and card renderer for `description`, `surface`, `badgeTone`, `ctaStyle`, and optional highlighted-banner text without raw class names. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add plan-local description and visual controls in Visual mode and keep labels stable for repeated plan cards. |
| `tests/vitest/widgets/pricingPlans.test.tsx` | Cover normalized plan description, plan-level visual fields, badge tone fallback, highlighted banner output, and CTA style rendering. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Cover plan description editing, plan-level visual controls, and highlighted-plan indicator updates. |
| `tests/vitest/widgets/renderer.test.tsx` | Update if shared renderer snapshots or widget markers change. |
| `tests/unit/widgets/validator.test.ts` | Add schema accept/reject coverage for new plan visual fields. |
| `_docs/_WIDGETS/PRICING_PLANS.md` | Document plan-level visual fields and highlighted-banner behavior. |
| `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` | Mark BUG-06/BF-02/BF-03/BF-07 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
type PricingPlanCtaStyle = "outline" | "filled" | "ghost";
type PricingPlanBadgeTone = "neutral" | "accent" | "highlight";

type PricingPlanVisual = {
  description?: string;
  surface?: string;
  badgeTone?: PricingPlanBadgeTone;
  ctaStyle?: PricingPlanCtaStyle;
  highlightLabel?: string;
};

function normalizePricingPlanVisual(input: unknown, highlighted: boolean): PricingPlanVisual {
  return {
    description: normalizeOptionalText(input.description),
    surface: normalizeClearableColor(input.surface),
    badgeTone: isBadgeTone(input.badgeTone) ? input.badgeTone : highlighted ? "highlight" : "neutral",
    ctaStyle: isCtaStyle(input.ctaStyle) ? input.ctaStyle : highlighted ? "filled" : "outline",
    highlightLabel: normalizeOptionalText(input.highlightLabel),
  };
}
```

Data flow:

- Editor controls patch `plans[index].description` and `plans[index].visual`.
- `normalizePricingPlansData` normalizes legacy and new plan visual fields.
- `PricingPlansBlock` passes normalized plan visuals into cards and CTA render.
- Renderer emits stable `data-pricing-plan` and `data-pricing-highlighted`
  markers so tests can assert hierarchy without relying on screenshots.

Error handling:

- Missing plan visual fields normalize to current output where possible.
- Unknown visual enums fall back to deterministic defaults and are rejected by
  validator tests for persisted payloads.
- Highlighted plan banner renders only when `highlighted === true` and label
  text is non-empty.
- CTA style never bypasses `normalizeWidgetSafeHref`; unsafe hrefs remain
  stripped by the existing owner.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: new nested visual fields must use
  `additionalProperties: false` and explicit enum values.
- Anti-abuse: no raw HTML, script, user-authored class names, or arbitrary style
  maps. Color inputs remain bounded string tokens handled by existing clearable
  style rules.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  markers or shared output assumptions change.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` with BUG-06, BF-02,
  BF-03, BF-05, BF-07, and A2 evidence or deferral notes.
- `_docs/_TASKS/TASK-278-01_Pricing_Plans_Card_Visual_Hierarchy_and_CTA_Styles.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Non-highlighted badges no longer inherit the highlighted plan color by
  default.
- Highlighted plan visual hierarchy is visible in cards without relying only on
  box shadow.
- Plan-level CTA styles are schema-owned, normalized, rendered, and covered by
  editor and renderer tests.
- Plan cards can render schema-owned description/subline copy with legacy
  payloads still omitting it safely.
- Existing saved Pricing Plans payloads still render with compatible defaults.
