# 781 - TASK-244 widget surface clear controls

Date: 2026-04-30
Version: Unreleased
Tasks: TASK-244, TASK-244-01, TASK-244-01-01, TASK-244-01-02, TASK-244-02, TASK-244-02-01, TASK-244-02-02, TASK-244-02-03, TASK-244-03, TASK-244-03-01, TASK-244-03-02, TASK-244-04, TASK-244-04-01, TASK-244-04-02, TASK-244-05, TASK-244-05-01

## Key Changes

### Widgets

- Added shared clearable-style helpers so cleared visual surface fields stay
  absent from widget data and runtime inline styles.
- Updated Hero, Section, custom-screen, operational, marketing/content, form,
  navigation/footer, and primitive panel widgets to clear configured
  backgrounds, gradients, overlays, card surfaces, table shells, and frame
  surfaces without saving `transparent` or empty-string sentinels.
- Preserved deliberate authored `transparent` values as valid color input while
  keeping TASK-242 `none` token semantics separate from TASK-244 `Clear`.

### Admin UI

- Added reusable clear field controls and wired them through widget editor waves
  so surface clear actions remove the owning style keys.
- Kept semantic behavior modes, content fields, source/query configuration,
  accessibility states, and CTA link behavior independent of visual clears.

### Documentation

- Documented global `Clear` versus `None` semantics in `_docs/WIDGETS.md`.
- Updated affected per-widget docs with clearable surface fields and corrected
  stale style-field examples.
- Closed the TASK-244 task family and synchronized the task board.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/clearableStyle.test.ts tests/vitest/ui/clearable-fields.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/section.test.tsx tests/vitest/ui/section-editor-wave.test.tsx` - PASS, 7 files / 38 tests.
- `bun run test:vitest -- tests/vitest/widgets/screenWidgets.test.tsx tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/ui/screen-widgets-editor-wave.test.tsx tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/searchBox.test.tsx tests/vitest/widgets/productGallery.test.tsx tests/vitest/widgets/productTable.test.tsx tests/vitest/widgets/productCompare.test.tsx` - PASS, 10 files / 51 tests.
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/featureGrid.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/widgets/testimonials.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/widgets/statsKpi.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/widgets/logoCloud.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/compareTimeline.test.tsx` - PASS, 13 files / 109 tests.
- `set -a && source ../Nextless/.env && set +a && bun test tests/unit/widgets/contentList.test.tsx tests/unit/widgets/postsFeedWidget.test.tsx tests/unit/widgets/entryTeaser.test.tsx` - PASS, 33 tests.
- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/widgets/tabs.test.tsx tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx` - PASS, 9 files / 79 tests.
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/ui/product-gallery-editor-wave.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/ui/product-compare-editor-wave.test.tsx` - PASS, 7 files / 25 tests.
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/ui/feature-grid-editor-wave.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/ui/testimonials-editor-wave.test.tsx tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/ui/compare-timeline-editor-wave.test.tsx` - PASS, 16 files / 78 tests.
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx` - PASS, 8 files / 35 tests.
- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx` - PASS, 6 tests after the final root typecheck nullability fix.
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `bun run gates:coderso` - PASS; optional DB-backed booking, kit-install,
  and store-revocation checks skipped because `DATABASE_URL` was not configured
  in the gate environment.
- `git diff --check` - PASS.
- `bun run precommit` - PASS.

## Notes

- The isolated worktree intentionally sources `../Nextless/.env` for Bun-owned
  content widget tests because the task worktree does not contain its own
  `.env`.
- Running the Bun-owned content widget command without env first fails with
  `DATABASE_URL is not set`; the env-backed rerun passed.
- Grep validation found no editor clear handler that writes `transparent`, an
  empty string, or an empty object as a clear sentinel.
