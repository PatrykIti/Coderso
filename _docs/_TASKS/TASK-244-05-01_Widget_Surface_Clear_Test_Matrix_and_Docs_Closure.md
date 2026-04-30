# TASK-244-05-01: Widget Surface Clear Test Matrix and Docs Closure

# FileName: TASK-244-05-01_Widget_Surface_Clear_Test_Matrix_and_Docs_Closure.md

**Priority:** Medium
**Category:** Widgets + QA + Docs
**Estimated Effort:** Small
**Dependencies:** TASK-244-02-01, TASK-244-02-02, TASK-244-03-01, TASK-244-03-02, TASK-244-04-01, TASK-244-04-02
**Status:** To Do

---

## Overview

Create and execute the final TASK-244 validation matrix. The implementer must
not close the task based only on broad lint/type success; every real surface
problem needs targeted proof.

## Sub-Tasks

- None. This is an execution leaf.

## Required Matrix

| Group | Runtime proof | Editor proof | Docs proof |
|---|---|---|---|
| Hero/shared controls | `tests/vitest/widgets/hero.test.tsx` and `tests/vitest/widgets/heroEditors.test.tsx` prove cleared gradient/background/overlay/button backgrounds omit output; `tests/vitest/widgets/section.test.tsx` proves Section no-regression unless Section adopts the shared clear helper | `tests/vitest/ui/hero-editor-wave.test.tsx` proves `Clear` removes nested `background`/`style` keys; `tests/vitest/ui/section-editor-wave.test.tsx` is required only if Section editor behavior changes | `_docs/_WIDGETS/HERO.md`, `_docs/_WIDGETS/SECTION.md` only if Section docs change, `_docs/WIDGETS.md` |
| Screen widgets | `tests/vitest/widgets/screenWidgets.test.tsx` proves cleared screen frame surfaces omit background classes/styles | `tests/vitest/ui/screen-widgets-editor-wave.test.tsx` must be created or extended to import `ScreenEditors.tsx` and prove removed style keys; `tests/vitest/ui/custom-screen-binding-panel.test.tsx` is only required if binding panel behavior changes | `_docs/WIDGETS.md`, `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md` where two-column docs change |
| Operational widgets | `tests/vitest/widgets/bookingCalendar.test.tsx`, `tests/vitest/widgets/appointmentForm.test.tsx`, `tests/vitest/widgets/listingFilters.test.tsx`, `tests/vitest/widgets/searchBox.test.tsx`, `tests/vitest/widgets/productGallery.test.tsx`, `tests/vitest/widgets/productTable.test.tsx`, `tests/vitest/widgets/productCompare.test.tsx` prove cleared shells/tables/cards omit forced backgrounds | The seven operational editor-wave tests listed in TASK-244-03-02 prove `Clear` removes keys | `_docs/WIDGETS.md`; exact new `_docs/_WIDGETS/*.md` files only if introduced |
| Composite/content widgets | `tests/vitest/widgets/gridColumns.test.tsx`, marketing/content Vitest widget suites, and Bun-owned `tests/unit/widgets/contentList.test.tsx`, `tests/unit/widgets/postsFeedWidget.test.tsx`, `tests/unit/widgets/entryTeaser.test.tsx` prove cleared surfaces/overlays omit output | The sixteen editor-wave tests listed in TASK-244-04-01 prove `Clear` removes keys | Exact docs listed in TASK-244-04-01 |
| Form/shell/panel widgets | `tests/vitest/widgets/contact.test.tsx`, `tests/vitest/widgets/newsletter.test.tsx`, `tests/vitest/widgets/formEmbed.test.tsx`, `tests/vitest/widgets/navigation.test.tsx`, `tests/vitest/widgets/footer.test.tsx`, `tests/vitest/widgets/accordionWidget.test.tsx`, `tests/vitest/widgets/tabs.test.tsx`, `tests/vitest/widgets/toggleBlock.test.tsx` prove cleared backgrounds omit output | The eight editor-wave tests listed in TASK-244-04-02 prove `Clear` removes keys | `_docs/_WIDGETS/CONTACT.md`, `_docs/_WIDGETS/NEWSLETTER.md`, `_docs/_WIDGETS/FORM_EMBED.md`, `_docs/_WIDGETS/NAVIGATION.md`, `_docs/_WIDGETS/FOOTER.md`, `_docs/WIDGETS.md` |

Every group must also include a negative payload assertion: `Clear` must not
write `"transparent"` or an empty string solely as an off-state sentinel.

## Exact Validation Commands

Run the exact commands below unless the implementation narrows the touched
surface and records why a listed suite is intentionally skipped.

`tests/vitest/ui/screen-widgets-editor-wave.test.tsx` is not existing proof in
the current checkout. TASK-244-03-01 must create that suite before closure runs
the screen widgets command below; do not count the missing file as a skipped
validation lane.

```sh
bun run test:vitest -- tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/screenWidgets.test.tsx tests/vitest/ui/screen-widgets-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/searchBox.test.tsx tests/vitest/widgets/productGallery.test.tsx tests/vitest/widgets/productTable.test.tsx tests/vitest/widgets/productCompare.test.tsx
bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/ui/product-gallery-editor-wave.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/ui/product-compare-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/featureGrid.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/widgets/testimonials.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/widgets/statsKpi.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/widgets/logoCloud.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/compareTimeline.test.tsx
bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/widgets/entryTeaser.test.tsx
bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/ui/feature-grid-editor-wave.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/ui/testimonials-editor-wave.test.tsx tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx
bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/widgets/tabs.test.tsx tests/vitest/widgets/toggleBlock.test.tsx
bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx
bun --cwd core lint
bun --cwd core lint:types
bun run gates:coderso
git diff --check
bun run precommit
```

## Testing Requirements

- Run all targeted suites from implementation leaves.
- Grep/diff review after implementation:
  - no new `"transparent"` off-state writes in editor clear handlers;
  - no `backgroundColor: "transparent"` assertions used as proof of clear when
    the contract requires omitted output;
  - saved widget payload fixtures omit cleared fields.
- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
- Final:
  - `bun run gates:coderso`
  - `bun run precommit` before manual commit
- DB-backed suites:
  - source `.env` first when required by the touched Bun-owned suites:
    `set -a && source .env && set +a`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- exact `_docs/_WIDGETS/*.md` files named by TASK-244 implementation leaves
- `_docs/_TASKS/TASK-244*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and matching changelog entry on completion

## Closure Notes

Fill this section during implementation closure.

- Final changelog number:
- Validation commands:
- Known skipped suites:
- Remaining exclusions:

## Acceptance Criteria

1. Matrix is complete and references real tests.
2. TASK-244 task files are marked Done only after implementation validates.
3. Board counts and changelog index are synchronized.
4. Any skipped tests or compatibility exceptions are explicit.
5. Closure notes include explicit no-transparent-sentinel evidence for every
   implemented clear path.
