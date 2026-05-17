# TASK-256-06-03: Hero, Timeline, Pricing, FAQ, and Testimonials Accessibility

# FileName: TASK-256-06-03_Hero_Timeline_Pricing_FAQ_and_Testimonials_Accessibility.md

**Priority:** High
**Category:** Widgets + Marketing Content + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06, TASK-256-06-02
**Status:** To Do

---

## Overview

Repair the remaining marketing widget findings for `hero`, `timeline`,
`pricing-plans`, `faq-accordion`, and `testimonials`.

This leaf excludes page-shell defects found while testing widget pages. Page
editor history/auth, preview toolbar, discard, and viewport-control issues must
be split by TASK-256-08 into a page-shell follow-up if still reproducible.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:126-159,166-181,256-260,271-284` for
  media/gradient/alt/editor drift plus page-shell-only findings that need
  separate ownership.
- `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md:121,156,170,192,262-273` for
  race conditions, Wizard showing only part of the model, mobile date
  visibility, line style on cards, connector width, and ARIA. These Timeline
  implementation rows are routed to TASK-256-01 and TASK-291 instead of being
  fixed in this broad mixed-widget leaf.
- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:154-200,206-236,286-294,320-347`
  for plan count/variant drift, missing clear, static toggle, pricing
  semantics, and validation priorities.
- `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md:97-99,119,141-145,179,303-305,314,328-338`
  for single-open runtime, spacing/default guards, expand indicator, spacing
  `none` double-border, and ARIA. FAQ clear controls and CSS-variable picker
  behavior remain owned by TASK-256-02.
- `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md:136-180,291-304` for
  slider-static scroll-snap, variant/count sync, heading hierarchy,
  section/article ARIA, clear gaps, Wizard field gaps, and avatar/media scope.

## Scope Decision Matrix

| Finding | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| Hero widget media/gradient/alt/link drift | Fix here | `HeroEditors.tsx`, `hero.tsx` | None |
| Hero page history auth/toolbar/discard/viewport issues | Out of widget leaf scope | `PageEditor.tsx`, `PageRevisionDrawer.tsx`, preview toolbar owners | TASK-256-08 creates page-shell task if still reproducible |
| Timeline Visual race | Shared root in TASK-256-01; Timeline proof in TASK-291-07 | TASK-256-01 shared editor owners | TASK-291 must not duplicate the shared atomic update contract |
| Timeline Wizard/status/editor UX | Routed to TASK-291-01 and TASK-291-02 | `TimelineEditors.tsx` via TASK-291 | This leaf does not edit Timeline editors |
| Timeline mobile date/lineStyle/connector/ARIA issues | Routed to TASK-291-03, with shared ARIA policy in TASK-256-04 | `timeline.tsx` via TASK-291 | This leaf does not edit Timeline renderer |
| Pricing static toggle/plan-count drift | Fix here | `PricingPlansEditors.tsx`, `pricingPlans.tsx` | None |
| FAQ single-open, chevron, ARIA, spacing resolver, and `spacing="none"` double-border behavior | Fix here plus TASK-256-04 | `FaqAccordionEditors.tsx`, `faqAccordion.tsx` | FAQ clear/CSS-variable picker work stays in TASK-256-02; question-aware default-open labels stay in TASK-266-04. |
| FAQ `spacing="none"` double-border renderer defect | Fix here with renderer spacing/border regression | `faqAccordion.tsx` | None |
| FAQ animation, SEO JSON-LD, rich text answers, max-width/layout typography, and remove confirmation | Future product scope unless needed to repair current misleading controls | `TASK-266-01`, `TASK-266-02`, `TASK-266-03`, `TASK-266-05`, `TASK-266-06` | TASK-256-08 references TASK-266 instead of creating duplicate FAQ follow-ups. |
| Testimonials slider-static lacks scroll-snap behavior | Fix here or rename/static-proof the variant so the control is truthful | `testimonials.tsx` | None |
| Testimonials clear gaps for text/accent colors | Fix through TASK-256-02 helpers | `TestimonialsEditors.tsx` | None |
| Testimonials Wizard rating/role/avatar/source gaps, avatar media picker, remove confirmation, and rating-0 semantics | Future product/editor UX scope unless a current visible control is misleading | `TASK-290-01`, `TASK-290-02`, `TASK-290-03`, `TASK-290-04`, `TASK-290-08` | TASK-256-08 references TASK-290 instead of creating duplicate testimonials follow-ups. |
| Testimonials true carousel, drag/drop, rich media picker | Future product scope unless current `slider-static` label is misleading | `TASK-290-03`, `TASK-290-04`, `TASK-290-07`, `TASK-290-08` | TASK-256-08 references TASK-290 instead of creating duplicate testimonials follow-ups. |

## Sub-Tasks

- [ ] Fix hero widget-owned media, gradient, alt, and safe-link findings.
- [ ] Add explicit page-shell follow-up notes for non-widget Hero findings.
- [ ] Route timeline Visual mode race to TASK-256-01 and timeline-specific
  Wizard/status/editor, mobile date, line style, connector width, and
  timeline/list ARIA findings to TASK-291-01 through TASK-291-03.
- [ ] Fix pricing plan-count/variant desync, `highlightRing` clear, billing
  toggle behavior, and accessible pricing semantics.
- [ ] Fix FAQ single-open behavior, expand indicator, spacing resolver, and ARIA.
- [ ] Fix FAQ `spacing="none"` double-border output.
- [ ] Classify testimonials `slider-static`: rename/static-proof it or make it
  interactive only if that is required by the existing contract.
- [ ] Add testimonial avatar/image lazy and alt assertions.
- [ ] Add testimonials clear-control ownership for `textColor` and
  `accentColor`; defer Wizard/media-picker/remove-confirm expansions through
  TASK-256-08 if they remain product scope.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | media/gradient controls | Make visible controls persist and render truthfully; keep page-shell findings out of this leaf. |
| `core/widgets/core/hero.tsx` | media/link render | Alt/media/link safety and any confirmed gradient runtime drift. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | 596-615, 965-971 | Plan count/variant sync, missing clear, billing controls, and validation feedback. |
| `core/widgets/core/pricingPlans.tsx` | 232-239, 390-405, 664-727 | Explicit token guards, interactive or static billing semantics, table/plan ARIA. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | behavior section | Single-open editor truthfulness only. Clear controls and CSS-variable picker preservation are owned by TASK-256-02; question-aware default-open labels are owned by TASK-266-04. |
| `core/widgets/core/faqAccordion.tsx` | 142-145, 316-365, spacing/border render | Explicit spacing resolver, single-open runtime script, chevron, summary/content ARIA, and no doubled borders for `spacing="none"`. |
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | 336-350, 659-674, media/style sections | Variant/count sync, text/accent clear controls, slider-static scope, avatar clear/lazy/alt controls, and accessibility labels. |
| `core/widgets/core/testimonials.tsx` | 38-42, 155-158, 359, 382 | Lazy images, alt semantics, slider-static scroll-snap or truthful naming, heading hierarchy, and static-vs-interactive output. |

Timeline-specific implementation is excluded from this file list; see
TASK-291-01, TASK-291-02, TASK-291-03, and TASK-291-07.

## Implementation Pseudocode

Timeline rows:

- TASK-256-01 owns the shared atomic editor patch mechanism.
- TASK-291 owns Timeline-specific editor, renderer, report, docs, and closure
  work.
- This leaf may reference TASK-291 evidence in final report closure but must not
  patch `TimelineEditors.tsx` or `timeline.tsx`.

FAQ single-open:

```js
function bindFaqSingleOpen(root) {
  if (root.dataset.faqMultipleOpen === "true") return;
  root.querySelectorAll("details").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open) return;
      root.querySelectorAll("details[open]").forEach((other) => {
        if (other !== details) other.open = false;
      });
    });
  });
}
```

Error handling:

- Timeline unsupported statuses and renderer behavior are validated in TASK-291,
  not in this mixed-widget leaf.
- Pricing over-limit or hidden plans are preserved until explicit normalization.
- FAQ invalid default-open indices clamp to `-1` or the closest valid item.
- Hero page-shell failures are not marked fixed by widget tests.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update validator tests if schemas change.
- Anti-abuse: external links remain safe, runtime scripts scope to their widget
  root, and no user-authored script execution is added.
- Secret handling: no secrets in media/link payloads, diagnostics, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- Timeline-specific editor/renderer tests run through TASK-291, not this leaf.
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when link
  semantics change.
- `bun test tests/unit/widgets/validator.test.ts` if schemas/defaults change.
- `bun test tests/unit/widgets/registry.test.ts` if registry/default wiring changes.
- Run `bun --cwd core lint` and `bun --cwd core lint:types`.
- Run `bun run gates:coderso` for the completed implementation leaf.
- Run `bun run scan:security:strict`.
- Run `bun run precommit` before any manual commit or task closure commit.

## Documentation Updates Required

- Update the non-Timeline touched Playwright reports with fixed/deferred status.
  Timeline report/docs closure is owned by TASK-291-07.
- Update `_docs/_WIDGETS/HERO.md`, `_docs/_WIDGETS/PRICING_PLANS.md`,
  `_docs/_WIDGETS/FAQ.md`, and `_docs/_WIDGETS/TESTIMONIALS.md` when behavior
  changes. Timeline docs are owned by TASK-291.
- Update `_docs/WIDGETS.md` only if shared accessibility or editor-mode
  contracts change.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Widget-owned findings are fixed with focused editor/runtime tests.
- Page-shell findings are not hidden inside widget closure.
- Pricing, FAQ, and testimonials expose truthful interactive/static behavior;
  Timeline-specific truthfulness is verified by TASK-291.
- Public runtime output has accessible names, states, and safe links/media.
