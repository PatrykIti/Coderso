# TASK-256-06: Marketing Widget Report Findings

# FileName: TASK-256-06_Marketing_Widget_Report_Findings.md

**Priority:** High
**Category:** Widgets + Marketing Content + Runtime Render + Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-04, TASK-256-07
**Status:** To Do

---

## Overview

Apply the shared TASK-256 repairs to marketing and content widgets after the
shared mode, clear, slot, accessibility, and cross-report classification
contracts land.

This parent coordinates physical child leaves. Do not implement every marketing
widget from this broad parent in one patch.

This task owns marketing/content shared-contract repairs for report evidence in:

- `hero`
- `timeline`
- `feature-grid`
- `testimonials`
- `pricing-plans`
- `faq-accordion`
- `cta-banner`
- `logo-cloud`
- `gallery-mosaic`
- `stats-kpi`
- `team`

Do not turn every missing feature listed in reports into immediate scope. Repair
shared contract drift first: misleading existing controls, unsafe public output,
clear/token drift, media/link safety, and accessibility relationships. New
larger product features are deferred into follow-up tasks with explicit
owner/docs/tests.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:126-159,166-181,256-260,271-284`
- `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md:73,92-93,145,170,192,266-270`
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:72-83,157-176,181-186,247-276,289-294`
- `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md:136-180,291-304`
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:154-200,206-236,286-294,320-347`
- `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md:96,116,119,125,140-144,173-180,262-266,332-336`
- `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md:132-161,175-185,223-241`
- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md:38-116,134-153`
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:54-94,195-220,226-227,274-281`
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:42-116,170-206`
- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md:42-91,210-339,365-393`

## Sub-Tasks

- [ ] TASK-256-06-01: Feature Grid and Stats KPI Truthful Controls.
- [ ] TASK-256-06-02: CTA Banner, Logo Cloud, and Gallery Media Links.
- [ ] TASK-256-06-03: Hero, Timeline, Pricing, FAQ, and Testimonials
  Accessibility.
- [ ] TASK-256-06-04: Team Profile Links and Accessibility.

## Scope Decision Matrix

| Finding class | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| Broken/misleading existing controls | Fix in the relevant child leaf when the drift matches a TASK-256 shared contract | Widget editor/runtime owner | None |
| Public link/media security and ARIA | Fix in the relevant child leaf through shared safe-output/accessibility contracts | Widget renderer plus editor tests | None |
| Page-shell issues found while testing a widget, such as history auth, toolbar aria, discard, or viewport controls | Do not patch inside widget leaves | `core/admin/ui/pages/PageEditor.tsx`, `core/admin/ui/pages/PageRevisionDrawer.tsx`, shared preview toolbar owners | TASK-256-08 must create a separate page-shell follow-up before closure if still reproducible |
| Major new features such as drag-and-drop, true carousel/lightbox, marquee, rich text, per-item advanced typography, or SEO schema | Defer unless needed to make an existing control truthful | Future product task | TASK-256-08 records future scope |

## Files to Change

| Child | Evidence scope | Primary owner files | Required shared-contract change |
|---|---|---|---|
| TASK-256-06-01 | `feature-grid`, `stats-kpi` | `FeatureGridEditors.tsx`, `featureGrid.tsx`, `StatsKpiEditors.tsx`, `statsKpi.tsx` | Fix truthful columns/count/divider controls, variant-bound item counts, grid layout holes, clear controls, and KPI ARIA. |
| TASK-256-06-02 | `cta-banner`, `logo-cloud`, `gallery-mosaic` | `CtaBannerEditors.tsx`, `ctaBanner.tsx`, `LogoCloudEditors.tsx`, `logoCloud.tsx`, `GalleryMosaicEditors.tsx`, `galleryMosaic.tsx` | Fix empty badges, clear controls, link/media security, alt/ARIA, hover/focus behavior, and media type truthfulness. |
| TASK-256-06-03 | `hero`, `timeline`, `pricing-plans`, `faq-accordion`, `testimonials` | `HeroEditors.tsx`, `hero.tsx`, `TimelineEditors.tsx`, `timeline.tsx`, `PricingPlansEditors.tsx`, `pricingPlans.tsx`, `FaqAccordionEditors.tsx`, `faqAccordion.tsx`, `TestimonialsEditors.tsx`, `testimonials.tsx` | Fix residual contract bugs around media/alt/link safety, timeline mode/status/wizard, pricing toggle/semantics, FAQ single-open/ARIA, and testimonial media/slider scope. |
| TASK-256-06-04 | `team` | `TeamEditors.tsx`, `team.tsx` | Fix spotlight columns truthfulness, social link safety, section/header ARIA, photo lazy loading, and Wizard/profile UX drift. |

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

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

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

- Update editor waves through child leaves:
  - `tests/vitest/ui/hero-editor-wave.test.tsx`
  - `tests/vitest/ui/timeline-editor-wave.test.tsx`
  - `tests/vitest/ui/feature-grid-editor-wave.test.tsx`
  - `tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
  - `tests/vitest/ui/testimonials-editor-wave.test.tsx`
  - `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
  - `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `tests/vitest/ui/cta-banner-editor-wave.test.tsx`
  - `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
  - `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
  - `tests/vitest/ui/team-editor-wave.test.tsx`
- Update runtime tests through child leaves:
  - `tests/vitest/widgets/hero.test.tsx`
  - `tests/vitest/widgets/timeline.test.tsx`
  - `tests/vitest/widgets/featureGrid.test.tsx`
  - `tests/vitest/widgets/statsKpi.test.tsx`
  - `tests/vitest/widgets/testimonials.test.tsx`
  - `tests/vitest/widgets/pricingPlans.test.tsx`
  - `tests/vitest/widgets/faqAccordion.test.tsx`
  - `tests/vitest/widgets/ctaBanner.test.tsx`
  - `tests/vitest/widgets/logoCloud.test.tsx`
  - `tests/vitest/widgets/galleryMosaic.test.tsx`
  - `tests/vitest/widgets/team.test.tsx`
  - `tests/vitest/widgets/widgetSafeHref.test.ts` where link semantics change.
- Update `tests/unit/widgets/validator.test.ts` when schemas change.
- Run targeted Vitest suites, relevant Bun validator/registry suites, lint, and
  type lint.

## Documentation Updates Required

- Update touched widget docs under `_docs/_WIDGETS/*.md`.
- Update `_docs/WIDGETS.md` only for shared contract adjustments.
- Update Playwright reports with fixed/deferred evidence.
- Add follow-up tasks for deferred product expansions that are not contract
  repairs.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Marketing widget editors no longer expose controls that have no runtime
  effect.
- Fixed variant item/count behavior is deterministic and visible to editors.
- Clear/style/link/media behavior is consistent with shared contracts.
- Runtime output has required accessible names, image alt/lazy behavior where
  applicable, and safe external link attributes.
- Tests prove each repaired report finding.
