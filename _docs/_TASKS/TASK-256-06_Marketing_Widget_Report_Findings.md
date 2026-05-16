# TASK-256-06: Marketing Widget Report Findings

# FileName: TASK-256-06_Marketing_Widget_Report_Findings.md

**Priority:** High
**Category:** Widgets + Marketing Content + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-04
**Status:** To Do

---

## Overview

Apply the shared TASK-256 repairs to marketing and content widgets after the
shared mode, clear, slot, and accessibility contracts land.

This task owns widget-specific fixes for:

- `hero`
- `timeline`
- `feature-grid`
- `testimonials`
- `pricing-plans`
- `faq-accordion`

Do not turn every missing feature listed in reports into immediate scope. Repair
broken or misleading existing controls first. New larger product features should
be deferred into follow-up tasks with explicit owner/docs/tests.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:126-159,166-181,256-260,271-284`
- `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md:73,92-93,145,170,192,266-270`
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:157-176,181-186,247-276,289-294`
- `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md:72-126,136-160`
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:75-117,127-155,211-219,241-268`
- `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md:96,116,125,140-144,173-180`

## Sub-Tasks

- [ ] Fix hero editor fields that appear active but do not affect persisted
  state; preserve media/alt/link security rules.
- [ ] Fix timeline mode race, optional status handling, and ARIA semantics.
- [ ] Fix feature-grid variant/count/columns mismatch and missing clear controls.
- [ ] Triage testimonials static slider/avatar/media/a11y findings into repair
  vs future feature scope.
- [ ] Fix pricing plan-count/variant desync, `highlightRing` clear, billing
  toggle behavior, and pricing semantics.
- [ ] Fix FAQ accordion single-open behavior, clear controls, and ARIA.

## Files to Change

| Widget | Files and line refs | Required change |
|---|---|---|
| `hero` | `core/admin/ui/widgets/editors/HeroEditors.tsx`; `core/widgets/core/hero.tsx` | Fix visible-but-inactive gradient/media controls, alt/media field visibility, toolbar aria labels, and external link rel/security where reports confirm drift. |
| `timeline` | `core/admin/ui/widgets/editors/TimelineEditors.tsx`; `core/widgets/core/timeline.tsx` | Apply TASK-256-01 atomic mode fix, support optional/no status if existing model allows it, and add timeline semantics. |
| `feature-grid` | `core/widgets/core/featureGrid.tsx:266-332`; `core/admin/ui/widgets/editors/FeatureGridEditors.tsx:435-455,668-683` | Make columns/count controls match runtime effect, add missing clear, and explicit default-token guards. |
| `testimonials` | `core/widgets/core/testimonials.tsx:38-42,155-158`; `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Decide whether `slider-static` should be renamed/static or made interactive; add image lazy/alt improvements and clear/style consistency. |
| `pricing-plans` | `core/widgets/core/pricingPlans.tsx:232-239,390-405,664-727`; `core/admin/ui/widgets/editors/PricingPlansEditors.tsx:596-615,965-971` | Fix plan-count/variant desync, missing clear, static toggle, explicit token guards, and accessible pricing semantics. |
| `faq-accordion` | `core/widgets/core/faqAccordion.tsx:142-145,316-365`; `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Fix explicit spacing guard, single-open runtime, clear controls, expand indicator, and ARIA relationships. |

## Implementation Pseudocode

```tsx
function normalizeVariantBoundItems<TItem>({
  items,
  variant,
  countForVariant,
  normalizeItem,
}: {
  items: TItem[];
  variant: string;
  countForVariant: (variant: string) => number;
  normalizeItem: (item: TItem | undefined, index: number) => TItem;
}) {
  const count = countForVariant(variant);
  return Array.from({ length: count }, (_, index) => normalizeItem(items[index], index));
}

function handleVariantChangeWithBoundItems(nextVariant: string) {
  const nextData = {
    ...value,
    items: normalizeVariantBoundItems({
      items: value.items,
      variant: nextVariant,
      countForVariant: resolveItemCountForVariant,
      normalizeItem,
    }),
  };
  onVariantChange?.(nextVariant, nextData);
}
```

Interactive billing shape:

```tsx
function pricingRuntimeScript(root: HTMLElement) {
  root.querySelectorAll("[data-pricing-cycle-trigger]").forEach((button) => {
    button.addEventListener("click", () => {
      const cycle = button.getAttribute("data-pricing-cycle-trigger");
      if (cycle !== "monthly" && cycle !== "annual") return;
      root.setAttribute("data-pricing-cycle", cycle);
      syncPricingCycle(root, cycle);
    });
  });
}
```

Error handling:

- If a user has more plans/items than a fixed variant can display, the editor
  must warn or preserve hidden items without silently deleting them.
- If a report requests a new capability such as true carousel, media picker, or
  sticky comparison header, only include it here if needed to make an existing
  control truthful.
- External URLs must stay normalized through existing safe-href helpers.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update schema/validator tests if fields change.
- Anti-abuse: safe href/media normalization remains mandatory for CTA, badge,
  logo, avatar, image, and video fields.
- Secret handling: no secret-bearing media/provider values in widget data,
  browser cache, diagnostics, or Playwright reports.

## Testing Requirements

- Update editor waves:
  - `hero-editor-wave.test.tsx`
  - `timeline-editor-wave.test.tsx`
  - `feature-grid-editor-wave.test.tsx`
  - `testimonials-editor-wave.test.tsx`
  - `pricing-plans-editor-wave.test.tsx`
  - `faq-accordion-editor-wave.test.tsx`
- Update runtime tests:
  - `hero.test.tsx`
  - `timeline.test.tsx`
  - `featureGrid.test.tsx`
  - `testimonials.test.tsx`
  - `pricingPlans.test.tsx`
  - `faqAccordion.test.tsx`
  - `widgetSafeHref.test.ts` where link semantics change.
- Update `tests/unit/widgets/validator.test.ts` when schemas change.
- Run targeted Vitest suites, relevant Bun validator/registry suites, lint, and
  type lint.

## Documentation Updates Required

- Update touched widget docs under `_docs/_WIDGETS/*.md`.
- Update `_docs/WIDGETS.md` only for shared contract adjustments.
- Update Playwright reports with fixed/deferred evidence.
- Add follow-up tasks for deferred product expansions that are not contract
  repairs.

## Acceptance Criteria

- Marketing widget editors no longer expose controls that have no runtime
  effect.
- Fixed variant item/count behavior is deterministic and visible to editors.
- Clear/style/link/media behavior is consistent with shared contracts.
- Runtime output has required accessible names, image alt/lazy behavior where
  applicable, and safe external link attributes.
- Tests prove each repaired report finding.
