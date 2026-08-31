# TASK-105-06: Widget Editor New Tests Wave
# FileName: TASK-105-06_Widget_Editor_New_Tests_Wave.md

**Priority:** High  
**Category:** QA + Widgets  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-01  
**Status:** ⏭️ Superseded (2026-08-21)
**Superseded By:** TASK-580 (changelog 1323)

---

## Overview

Add real new tests for the still-undercovered widget editor files after the initial migration wave.

## Priority Hotspots

- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
- `core/admin/ui/widgets/editors/ContentListEditors.tsx`
- `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx`
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- `core/admin/ui/widgets/editors/Product*Editors.tsx`

## Pseudocode

```ts
renderWizardVisualAdvancedEditors();
assertConditionalSections();
assertResolvedRuntimeFields();
assertVariantSpecificBranches();
```

## Acceptance Criteria

1. The largest remaining widget editor gaps get targeted new tests.
2. Tests cover meaningful editor branching, not only generic presence checks.

## Progress Notes

Completed slices:
- direct Vitest coverage for `EntryTeaserEditors`
- direct Vitest coverage for `ListingFiltersEditors`
- direct Vitest coverage for `PostsFeedEditors`
- initial direct Vitest coverage for `ContentListEditors`
- deeper sparse-default coverage for `ContentListEditors`
- direct Vitest coverage for `StatsKpiEditors`
- direct Vitest coverage for `CommerceWidgetEditorShared`
- direct Vitest coverage for `ProductCompareEditors`
- direct fallback coverage for `ProductCompareEditors`
- direct Vitest coverage for `ProductGalleryEditors`
- deeper fallback coverage for `ProductGalleryEditors`
- direct Vitest coverage for `ProductTableEditors`
- direct fallback coverage for `ProductTableEditors`
- direct Vitest coverage for `TemplateSectionEditors`
- deeper follow-up coverage for `ListingFiltersEditors`
- direct Vitest coverage for `PricingPlansEditors`
- guard-behavior coverage for `PricingPlansEditors`
- direct Vitest coverage for `TeamEditors`
- deeper style-fallback coverage for `TeamEditors`
- direct Vitest coverage for `TestimonialsEditors`
- deeper sparse-default coverage for `TestimonialsEditors`
- direct Vitest coverage for `FaqAccordionEditors`
- deeper sparse-default coverage for `FaqAccordionEditors`
- direct Vitest coverage for `HeroEditors`
- direct Vitest coverage for `NavigationEditors`
- deeper sparse-default coverage for `NavigationEditors`
- direct Vitest coverage for `ContactEditors`
- deeper sparse-default coverage for `ContactEditors`
- direct Vitest coverage for `BookingCalendarEditors`
- direct Vitest coverage for `CompareTimelineEditors`
- direct Vitest coverage for `FeatureGridEditors`
- deeper sparse-default coverage for `FeatureGridEditors`
- direct Vitest coverage for `FooterEditors`
- deeper sparse/empty-state coverage for `FooterEditors`
- direct Vitest coverage for `LogoCloudEditors`
- deeper sparse-default coverage for `LogoCloudEditors`
- direct Vitest coverage for `RichTextSectionEditors`
- direct Vitest coverage for `GalleryMosaicEditors`
- direct Vitest coverage for `CtaBannerEditors`
- direct Vitest coverage for `TimelineEditors`
- direct Vitest coverage for `NewsletterEditors`
- direct Vitest coverage for `SearchBoxEditors`
- direct Vitest coverage for `SectionEditors`
- direct Vitest coverage for `TabsEditors`
- direct Vitest coverage for `SplitLayoutEditors`
- direct Vitest coverage for `GridColumnsEditors`
- direct Vitest coverage for `AccordionEditors`
- direct Vitest coverage for `ToggleBlockEditors`
- direct Vitest coverage for `FormEmbedEditors`
- direct Vitest coverage for `StackEditors`
- direct Vitest coverage for `SpacerEditors`
- deeper branch coverage for `SplitLayoutEditors`
- direct Vitest coverage for `DividerEditors`
- direct Vitest coverage for `AppointmentFormEditors`
- deeper value-path coverage for `CtaBannerEditors`
- deeper branch and line coverage for `HeroEditors`
- deeper branch and line coverage for `ContentListEditors`
- deeper fallback and async-cleanup coverage for `PostsFeedEditors`
- deeper branch and token coverage for `SectionEditors`
- deeper branch coverage for `GridColumnsEditors`
- deeper branch coverage for `ToggleBlockEditors`
- deeper branch coverage for `StackEditors`
- deeper branch coverage for `SpacerEditors`
- deeper line and branch coverage for `DividerEditors`

Current `2026-03-10` widget editor snapshot after the latest residual-closure follow-up:
- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` -> `90.84%` lines / `66.04%` branches
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` -> `100.00%` lines / `74.59%` branches
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` -> `100.00%` lines / `73.33%` branches
- `core/admin/ui/widgets/editors/ContentListEditors.tsx` -> `100.00%` lines / `93.98%` branches
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` -> `87.50%` lines / `66.07%` branches
- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx` -> `93.93%` lines / `73.33%` branches
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` -> `100.00%` lines / `73.68%` branches
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` -> `100.00%` lines / `71.79%` branches
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` -> `97.18%` lines / `58.82%` branches
- `core/admin/ui/widgets/editors/TeamEditors.tsx` -> `100.00%` lines / `74.00%` branches
- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` -> `100.00%` lines / `86.66%` branches
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` -> `100.00%` lines / `91.66%` branches
- `core/admin/ui/widgets/editors/HeroEditors.tsx` -> `99.35%` lines / `91.32%` branches
- `core/admin/ui/widgets/editors/NavigationEditors.tsx` -> `100.00%` lines / `81.41%` branches
- `core/admin/ui/widgets/editors/ContactEditors.tsx` -> `100.00%` lines / `80.95%` branches
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` -> `100.00%` lines / `70.58%` branches
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` -> `96.42%` lines / `66.37%` branches
- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` -> `100.00%` lines / `82.05%` branches
- `core/admin/ui/widgets/editors/FooterEditors.tsx` -> `100.00%` lines / `92.10%` branches
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` -> `100.00%` lines / `81.25%` branches
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` -> `89.69%` lines / `63.79%` branches
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` -> `95.74%` lines / `66.66%` branches
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` -> `100.00%` lines / `62.50%` branches
- `core/admin/ui/widgets/editors/TimelineEditors.tsx` -> `99.10%` lines / `84.21%` branches
- `core/admin/ui/widgets/editors/NewsletterEditors.tsx` -> `93.65%` lines / `61.42%` branches
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` -> `100.00%` lines / `73.80%` branches
- `core/admin/ui/widgets/editors/SectionEditors.tsx` -> `100.00%` lines / `61.22%` branches
- `core/admin/ui/widgets/editors/TabsEditors.tsx` -> `100.00%` lines / `64.86%` branches
- `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` -> `100.00%` lines / `96.96%` branches
- `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` -> `100.00%` lines / `97.61%` branches
- `core/admin/ui/widgets/editors/AccordionEditors.tsx` -> `100.00%` lines / `67.64%` branches
- `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` -> `100.00%` lines / `96.66%` branches
- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` -> `100.00%` lines / `79.31%` branches
- `core/admin/ui/widgets/editors/StackEditors.tsx` -> `100.00%` lines / `97.22%` branches
- `core/admin/ui/widgets/editors/SpacerEditors.tsx` -> `100.00%` lines / `96.42%` branches
- `core/admin/ui/widgets/editors/DividerEditors.tsx` -> `98.33%` lines / `71.73%` branches
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx` -> `97.22%` lines / `70.00%` branches
- `core/admin/ui/widgets/editors/ContentListEditors.tsx` -> `98.46%` lines / `68.42%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `96.12%` lines / `72.42%` branches across `40` tracked files

Additional defensive follow-up on 2026-03-10:
- Added sparse-normalization fallback cases for `AppointmentFormEditors`, `CtaBannerEditors`, and `SectionEditors`.
- Added stale async transition coverage plus unresolved source cleanup coverage for `ContentListEditors`.
- Re-ran the authoritative full-lane snapshot and confirmed it stayed flat at `96.12%` lines / `72.42%` branches for aggregate `core/admin/ui/widgets/editors/*`, so this slice improved defensive scenario confidence without materially moving the full-lane percentages.

Parallel low-line follow-up on 2026-03-10:
- Deepened real editor-wave coverage for `StatsKpiEditors`, `FeatureGridEditors`, `TestimonialsEditors`, `RichTextSectionEditors`, `FaqAccordionEditors`, `EntryTeaserEditors`, and `NavigationEditors`.
- Isolated targeted runs for that batch moved those files to:
  - `StatsKpiEditors.tsx` -> `97.72%` lines / `91.07%` branches
  - `FeatureGridEditors.tsx` -> `100.00%` lines / `58.97%` branches
  - `TestimonialsEditors.tsx` -> `100.00%` lines / `63.33%` branches
  - `RichTextSectionEditors.tsx` -> `100.00%` lines / `91.37%` branches
  - `FaqAccordionEditors.tsx` -> `100.00%` lines / `63.33%` branches
  - `EntryTeaserEditors.tsx` -> `96.73%` lines / `88.27%` branches
  - `NavigationEditors.tsx` -> `97.93%` lines / `75.22%` branches
- Re-ran the authoritative full-lane snapshot and it still remained flat at `96.12%` lines / `72.42%` branches for aggregate `core/admin/ui/widgets/editors/*`, so these gains are currently confirmed in targeted runs but not yet reflected in the global summary artifact.

Contact and newsletter follow-up on 2026-03-10:
- Deepened `ContactEditors` coverage around visual submit-label/contact-detail updates, required-field reorder down-path, and text-token `ColorField` input handling.
- Deepened `NewsletterEditors` coverage around visual title/description copy, CTA label edits, and switching integration mode back to webhook with direct webhook-id updates.
- Isolated targeted runs for that follow-up moved:
  - `ContactEditors.tsx` -> `100.00%` lines / `65.71%` branches
  - `NewsletterEditors.tsx` -> `100.00%` lines / `61.42%` branches
- Re-ran the authoritative full-lane snapshot and it still remained flat at `96.12%` lines / `72.42%` branches for aggregate `core/admin/ui/widgets/editors/*`.

Compare/posts/shared follow-up on 2026-03-10:
- Deepened `CompareTimelineEditors` coverage around visual marker toggles, additional color token paths, and advanced add-step growth.
- Deepened `PostsFeedEditors` coverage around category mode, manual deselection, empty catalog behavior, and generic loader failures.
- Tightened `CommerceWidgetEditorShared` numeric guard coverage for non-finite number input handling.
- Scoped `ProductGalleryEditors` empty-state assertions to the correct section so the test exercises the real editor contract instead of relying on duplicate global labels.
- Isolated targeted runs for that follow-up moved:
  - `CompareTimelineEditors.tsx` -> `100.00%` lines / `67.25%` branches
  - `PostsFeedEditors.tsx` -> `97.80%` lines / `62.66%` branches
  - `CommerceWidgetEditorShared.tsx` -> `100.00%` lines / `73.33%` branches
  - `ProductGalleryEditors.tsx` -> `95.00%` lines / `63.15%` branches
- Re-ran the authoritative full-lane snapshot and it still remained flat at `96.12%` lines / `72.42%` branches for aggregate `core/admin/ui/widgets/editors/*`.

Commerce shared number-guard follow-up on 2026-03-10:
- Added one more explicit non-finite numeric input path (`1e309`) to the shared commerce number-field test so the clamp-to-current behavior is locked for overflow-style input as well as `Infinity`.
- Isolated targeted run for `CommerceWidgetEditorShared.tsx` stayed at `100.00%` lines / `73.33%` branches.

Gallery mosaic follow-up on 2026-03-10:
- Deepened `GalleryMosaicEditors` coverage around visual header-title updates, first-item image URL edits, move-down ordering, and raw overlay-token inputs without a variant handler.
- Isolated targeted run for `GalleryMosaicEditors.tsx` moved to `100.00%` lines / `66.66%` branches.
- Re-ran the authoritative full-lane snapshot and it still remained flat at `96.12%` lines / `72.42%` branches for aggregate `core/admin/ui/widgets/editors/*`.

Pricing plans follow-up on 2026-03-10:
- Deepened `PricingPlansEditors` coverage around visual plan-count contraction/expansion, plan move-up ordering, and feature move-down flow.
- Isolated targeted run for `PricingPlansEditors.tsx` moved to `99.29%` lines / `59.80%` branches.
- Canonical full-lane snapshot was not rebaselined separately for this narrow slice; the latest authoritative totals still come from `coverage/vitest/coverage-summary.json`.

Canonical full-lane rebaseline after the report-path fix on 2026-03-10:
- `test:coverage` now runs through `scripts/run-vitest-coverage.ts` and writes the canonical full-lane summary to `coverage/vitest/coverage-summary.json`.
- Previous “flat” comparisons against `/tmp/nextless-vitest-cov/coverage-summary.json` were using a stale artifact and are now superseded.
- Current authoritative full-lane snapshot from `coverage/vitest/coverage-summary.json`:
  - `% Stmts`: `60.75`
  - `% Branch`: `51.40`
  - `% Funcs`: `65.24`
  - `% Lines`: `63.65`
- Current authoritative widget-editor aggregate:
  - `core/admin/ui/widgets/editors/*` -> `99.17%` lines / `77.13%` branches across `40` tracked files
- Current authoritative widget-editor low-line hotspots are now:
  - `EntryTeaserEditors.tsx` -> `96.73%` lines / `88.27%` branches
  - `FooterEditors.tsx` -> `96.85%` lines / `89.47%` branches
  - `PricingPlansEditors.tsx` -> `97.18%` lines / `58.82%` branches
  - `TeamEditors.tsx` -> `97.67%` lines / `60.71%` branches
  - `StatsKpiEditors.tsx` -> `97.72%` lines / `91.07%` branches
  - `NavigationEditors.tsx` -> `97.93%` lines / `75.22%` branches
  - `DividerEditors.tsx` -> `98.33%` lines / `71.73%` branches
  - `LogoCloudEditors.tsx` -> `98.80%` lines / `64.00%` branches

Footer/team/navigation/logo/divider/entry follow-up on 2026-03-10:
- Deepened `FooterEditors` coverage around visible-column title edits and social-link removal in visual mode.
- Deepened `TeamEditors` coverage around member-count expansion, second-card move-up ordering, social-link add flow, and raw card token updates.
- Deepened `NavigationEditors` coverage around no-handler variant selection and generic non-API menu/media fallback paths.
- Deepened `LogoCloudEditors` coverage around direct logo-name editing before reorder/remove.
- Deepened `DividerEditors` coverage around the second advanced spacing input (`marginBottom`).
- Deepened `EntryTeaserEditors` coverage around generic content-type failures, API entry failures, source-mode switching, and fallback-title updates.
- Fresh canonical full-lane snapshot from `coverage/vitest/coverage-summary.json` after this batch:
  - `% Stmts`: `60.84`
  - `% Branch`: `51.45`
  - `% Funcs`: `65.47`
  - `% Lines`: `63.75`
- Updated widget-editor aggregate:
  - `core/admin/ui/widgets/editors/*` -> `99.76%` lines / `77.43%` branches across `40` tracked files
- Updated authoritative file snapshots from the canonical full-lane run:
  - `FooterEditors.tsx` -> `100.00%` lines / `89.47%` branches
  - `TeamEditors.tsx` -> `100.00%` lines / `61.90%` branches
  - `NavigationEditors.tsx` -> `99.17%` lines / `76.10%` branches
  - `LogoCloudEditors.tsx` -> `100.00%` lines / `64.00%` branches
  - `DividerEditors.tsx` -> `100.00%` lines / `71.73%` branches
  - `EntryTeaserEditors.tsx` -> `100.00%` lines / `90.74%` branches

Stats/navigation/pricing/hero follow-up on 2026-03-10:
- Deepened `StatsKpiEditors` coverage around isolated wizard value updates and visual divider toggles.
- Deepened `NavigationEditors` coverage around API-flavored menu-sync fallback and direct color-picker updates in the colors section.
- Deepened `PricingPlansEditors` coverage around the remaining visual `ColorField` picker path.
- Deepened `HeroEditors` coverage around the wizard secondary CTA URL path and the advanced background color picker branch.
- Fresh canonical full-lane snapshot from `coverage/vitest/coverage-summary.json` after this batch:
  - `% Stmts`: `60.87`
  - `% Branch`: `51.45`
  - `% Funcs`: `65.55`
  - `% Lines`: `63.78`
- Updated widget-editor aggregate:
  - `core/admin/ui/widgets/editors/*` -> `99.97%` lines / `77.47%` branches across `40` tracked files
- Updated authoritative file snapshots from the canonical full-lane run:
  - `StatsKpiEditors.tsx` -> `100.00%` lines / `91.07%` branches
  - `NavigationEditors.tsx` -> `100.00%` lines / `76.54%` branches
  - `PricingPlansEditors.tsx` -> `100.00%` lines / `59.80%` branches
  - `HeroEditors.tsx` -> `100.00%` lines / `91.32%` branches

Timeline line-gap closure on 2026-03-11:
- Deepened `TimelineEditors` coverage around the remaining visual `Up` reordering path.
- Fresh canonical full-lane snapshot from `coverage/vitest/coverage-summary.json` after this slice:
  - `% Stmts`: `60.87`
  - `% Branch`: `51.45`
  - `% Funcs`: `65.56`
  - `% Lines`: `63.78`
- Updated widget-editor aggregate:
  - `core/admin/ui/widgets/editors/*` -> `100.00%` lines / `77.47%` branches across `40` tracked files
- Updated authoritative file snapshot:
  - `TimelineEditors.tsx` -> `100.00%` lines / `84.21%` branches

Logo cloud safety follow-up on 2026-03-11:
- Added sparse/default fallback assertions across wizard, visual, and advanced editors plus no-handler variant safety coverage.
- Isolated targeted run for `LogoCloudEditors.tsx` stayed at `100.00%` lines / `64.00%` branches.
- Canonical full-lane snapshot was not rebaselined separately for this narrow safety slice.

Product compare/table branch cleanup on 2026-03-11:
- Deepened `ProductCompareEditors` and `ProductTableEditors` around sparse/default fallback branches for wizard limits and empty runtime payload state.
- Isolated targeted runs moved:
  - `ProductCompareEditors.tsx` -> `100.00%` lines / `75.00%` branches
  - `ProductTableEditors.tsx` -> `100.00%` lines / `75.00%` branches
- Canonical full-lane snapshot was not rebaselined separately for this narrow branch-only slice.

Feature grid safety follow-up on 2026-03-11:
- Added sparse/default fallback assertions for `FeatureGridEditors` across wizard, visual, and advanced modes plus inert variant-card coverage without a handler.
- Isolated targeted run for `FeatureGridEditors.tsx` stayed at `100.00%` lines / `58.97%` branches.
- Canonical full-lane snapshot was not rebaselined separately for this narrow safety slice.

Newsletter/pricing safety follow-up on 2026-03-11:
- Added sparse/default fallback assertions for `NewsletterEditors` across wizard, visual, and advanced modes plus inert variant handling without a callback.
- Added sparse/default fallback assertions for `PricingPlansEditors` across wizard, visual, and advanced modes plus inert variant handling without a callback.
- Isolated targeted runs stayed at:
  - `NewsletterEditors.tsx` -> `100.00%` lines / `61.42%` branches
  - `PricingPlansEditors.tsx` -> `100.00%` lines / `59.80%` branches
- Canonical full-lane snapshot was not rebaselined separately for this narrow safety slice.

Newsletter/team/logo refactor follow-up on 2026-03-11:
- Removed redundant nullish/default branches after `normalizeNewsletterData`, `normalizeTeamData`, and `normalizeLogoCloudData` inside the corresponding editors.
- Kept behavior unchanged while collapsing dead UI-only branch noise that could never differ after normalization.
- Fresh canonical full-lane snapshot from `coverage/vitest/coverage-summary.json` after this refactor batch:
  - `% Stmts`: `60.90`
  - `% Branch`: `51.47`
  - `% Funcs`: `65.56`
  - `% Lines`: `63.81`
- Updated widget-editor aggregate:
  - `core/admin/ui/widgets/editors/*` -> `100.00%` lines / `78.41%` branches across `40` tracked files
- Updated authoritative file snapshots from the canonical full-lane run:
  - `NewsletterEditors.tsx` -> `100.00%` lines / `70.00%` branches
  - `TeamEditors.tsx` -> `100.00%` lines / `70.00%` branches
  - `LogoCloudEditors.tsx` -> `100.00%` lines / `71.87%` branches

Search box follow-up on 2026-03-13:
- Deepened `SearchBoxEditors` coverage around wizard mode switching, persisted global endpoint state, and clearing listing-query selection back to the sentinel empty option.
- Isolated targeted run for `SearchBoxEditors.tsx` moved to `100.00%` lines / `73.80%` branches.
- Canonical full-lane snapshot was not rebaselined separately for this narrow follow-up slice.

Contact sparse-default follow-up on 2026-03-13:
- Added explicit sparse/default assertions for `ContactEditors` across wizard, visual, and advanced modes, including inert minimal-variant clicks without a handler plus default map metadata state.
- Isolated targeted run for `ContactEditors.tsx` stayed at `100.00%` lines / `65.71%` branches.
- Canonical full-lane snapshot was not rebaselined separately for this narrow follow-up slice.

Fresh canonical `2026-03-14` rebaseline:
- `core/admin/ui/widgets/editors/*` -> `100.00%` lines / `83.01%` branches across `40` tracked files
- the latest full-lane report confirms the wave is now effectively line-complete; remaining work here is branch-only hardening and infra-noise handling in `core/admin/ui/widgets/editors/index.ts`
- current lowest branch files in the shipped editor set are:
  - `PricingPlansEditors.tsx` -> `100.00%` lines / `59.80%` branches
  - `TabsEditors.tsx` -> `100.00%` lines / `64.86%` branches
  - `GalleryMosaicEditors.tsx` -> `100.00%` lines / `66.66%` branches
  - `SearchBoxEditors.tsx` -> `100.00%` lines / `66.66%` branches
  - `CompareTimelineEditors.tsx` -> `100.00%` lines / `67.25%` branches


## Current authoritative rebaseline (2026-08-19, HEAD 3c470092, worktree run)

All numbers below come from the fresh canonical full-lane run generated TODAY
at this HEAD (`bun scripts/run-vitest-coverage.ts`, artifact
`coverage/vitest/coverage-summary.json`). Aggregates are weighted
(`sum covered / sum total`), the same method the artifact `total` entry uses.
Per-file percentages below are rounded from exact covered/total fractions;
istanbul truncates `pct` at 2dp, so a minority of values differ by `0.01` from
the artifact's `pct` field while every fraction matches exactly.
Lane totals: `80.17` stmts / `71.94` branch / `79.92` funcs / `83.24` lines.

Every `2026-03-*` snapshot above is HISTORICAL. The directory now holds `46`
files (the historical snapshots tracked `40`): six landed after the March
snapshots and reset the aggregate. Verified additions:

- `ScreenEditors.tsx` -> `0b78aad0` 2026-04-28
- `ClearableFields.tsx` -> `b71898e6` 2026-05-04
- `WidgetEditorControls.tsx`, `TokenOrPixelField.tsx`,
  `LinkDestinationField.tsx` -> `3cecce6b` 2026-05-31
- `SharedColorControl.tsx` -> `3cecce6b` 2026-05-31 (last-touched `605afa6c` 2026-07-12)

The historical `100.00%` lines / `83.01%` branches claim is superseded. Real
aggregate at HEAD: `83.84%` lines / `72.03%` branches across `46` files
(`8072/9628` lines, `7279/10106` branches) = `1556` uncovered lines /
`2827` uncovered branches. `44` of `46` files are below `100%` lines; only
`WidgetEditorControls.tsx` (`13/13`) is line-complete and `index.ts` carries
`0` executable lines.

Per-file snapshot (`lines% / branches%`, covered/total), 46 files:

- `AccordionEditors.tsx` -> `95.16 / 86.09` (`118/124`, `130/151`)
- `AppointmentFormEditors.tsx` -> `83.04 / 75.41` (`142/171`, `92/122`)
- `BookingCalendarEditors.tsx` -> `77.78 / 59.71` (`105/135`, `83/139`)
- `ClearableFields.tsx` -> `98.53 / 92.39` (`67/68`, `85/92`)
- `CommerceWidgetEditorShared.tsx` -> `87.27 / 83.06` (`96/110`, `103/124`)
- `CompareTimelineEditors.tsx` -> `89.58 / 62.68` (`215/240`, `131/209`)
- `ContactEditors.tsx` -> `70.96 / 54.05` (`193/272`, `180/333`)
- `ContentListEditors.tsx` -> `90.94 / 83.99` (`291/320`, `299/356`)
- `CtaBannerEditors.tsx` -> `77.72 / 71.14` (`143/184`, `143/201`)
- `DividerEditors.tsx` -> `89.74 / 74.19` (`105/117`, `92/124`)
- `EntryTeaserEditors.tsx` -> `86.33 / 77.80` (`341/395`, `389/500`)
- `FaqAccordionEditors.tsx` -> `93.06 / 83.33` (`201/216`, `155/186`)
- `FeatureGridEditors.tsx` -> `92.34 / 79.32` (`229/248`, `188/237`)
- `FooterEditors.tsx` -> `51.69 / 49.72` (`153/296`, `176/354`)
- `FormEmbedEditors.tsx` -> `85.66 / 72.32` (`239/279`, `209/289`)
- `GalleryMosaicEditors.tsx` -> `87.47 / 69.42` (`314/359`, `227/327`)
- `GridColumnsEditors.tsx` -> `90.94 / 80.51` (`291/320`, `252/313`)
- `HeroEditors.tsx` -> `95.52 / 85.65` (`619/648`, `603/704`)
- `LinkDestinationField.tsx` -> `92.50 / 88.89` (`37/40`, `48/54`)
- `ListingFiltersEditors.tsx` -> `83.49 / 74.25` (`354/424`, `493/664`)
- `LogoCloudEditors.tsx` -> `92.26 / 74.51` (`298/323`, `190/255`)
- `NavigationEditors.tsx` -> `84.10 / 73.55` (`275/327`, `253/344`)
- `NewsletterEditors.tsx` -> `82.81 / 76.57` (`183/221`, `183/239`)
- `PostsFeedEditors.tsx` -> `85.15 / 62.18` (`281/330`, `217/349`)
- `PricingPlansEditors.tsx` -> `87.45 / 59.11` (`216/247`, `172/291`)
- `ProductCompareEditors.tsx` -> `73.91 / 60.11` (`119/161`, `107/178`)
- `ProductGalleryEditors.tsx` -> `80.11 / 64.38` (`149/186`, `141/219`)
- `ProductTableEditors.tsx` -> `89.58 / 81.05` (`172/192`, `124/153`)
- `RichTextSectionEditors.tsx` -> `68.91 / 65.77` (`266/386`, `244/371`)
- `ScreenEditors.tsx` -> `59.73 / 62.77` (`89/149`, `59/94`)
- `SearchBoxEditors.tsx` -> `87.36 / 70.71` (`76/87`, `70/99`)
- `SectionEditors.tsx` -> `89.91 / 76.19` (`294/327`, `256/336`)
- `SharedColorControl.tsx` -> `97.67 / 94.57` (`42/43`, `87/92`)
- `SpacerEditors.tsx` -> `98.33 / 85.51` (`59/60`, `59/69`)
- `SplitLayoutEditors.tsx` -> `92.86 / 83.04` (`91/98`, `93/112`)
- `StackEditors.tsx` -> `96.59 / 85.96` (`85/88`, `49/57`)
- `StatsKpiEditors.tsx` -> `80.72 / 84.97` (`180/223`, `164/193`)
- `TabsEditors.tsx` -> `93.23 / 78.51` (`124/133`, `95/121`)
- `TeamEditors.tsx` -> `82.28 / 59.16` (`311/378`, `239/404`)
- `TemplateSectionEditors.tsx` -> `63.04 / 52.54` (`29/46`, `31/59`)
- `TestimonialsEditors.tsx` -> `75.18 / 57.94` (`206/274`, `135/233`)
- `TimelineEditors.tsx` -> `59.45 / 56.60` (`129/217`, `120/212`)
- `ToggleBlockEditors.tsx` -> `85.71 / 82.22` (`84/98`, `37/45`)
- `TokenOrPixelField.tsx` -> `87.27 / 69.74` (`48/55`, `53/76`)
- `WidgetEditorControls.tsx` -> `100.00 / 88.46` (`13/13`, `23/26`)
- `index.ts` -> `0.00 / 0.00` (`0/0`, `0/0`) — pure re-export barrel, `0` executable lines; pct is vacuous (zero executable lines)

## S6 Coordination Gate (2026-08-19)

Implementation of this wave is DEFERRED until Stream 6 FAZA 0 research
(`_TMP-S6-widget-removal.md`) confirms the old-widget cut scope. Context:
TASK-467 (changelog 1308, 2026-08-18) just shipped the lazy widget-editor
registry, so this system received active investment yesterday; S6 plans to
remove the whole old widget system (`core/widgets/*` +
`core/admin/ui/widgets/editors/*` + the Widget Library route), with an
explicit collision note against this wave.

- If S6 CONFIRMS removal -> this wave is superseded into the S6 family: the
  editor tests die with their sources and S6 owns deletion + the coverage
  rebaseline. RESOLVED 2026-08-21: S6 confirmed removal and TASK-580 closed
  (changelog 1323); this wave is superseded — the editor sources and their
  tests were deleted with the system and the coverage rebaseline was folded
  into TASK-580.
- If S6 decides RETENTION/adapter -> resume implementation from this
  re-baselined contract: `46` files, `1556` uncovered lines / `2827`
  uncovered branches, worst files first (`FooterEditors` `51.69/49.72`,
  `TimelineEditors` `59.45/56.60`, `ScreenEditors` `59.73/62.77`,
  `TemplateSectionEditors` `63.04/52.54`, `RichTextSectionEditors`
  `68.91/65.77`, `ContactEditors` `70.96/54.05`, `ProductCompareEditors`
  `73.91/60.11`, `TestimonialsEditors` `75.18/57.94`, `BookingCalendarEditors`
  `77.78/59.71`, `CtaBannerEditors` `77.72/71.14`, `ProductGalleryEditors`
  `80.11/64.38`).

Branch-only hardening on the CURRENT files is explicitly NOT started now:
writing new branch tests for surfaces S6 may delete is wasted work, and
marking this wave Done while files sit at `83.84%` lines would be metric
manipulation, which TASK-105 forbids. The wave therefore stays
`🚧 In Progress` under the gate.

`index.ts` barrel disposition (verified): it is a pure re-export with `0`
executable lines and DEAD CODE at HEAD — `grep` across `core/` finds zero
importers of the barrel path or of `editors/index` after TASK-467-03-L02
moved consumers to the lazy registry. The artifact reports `0/0` covered/total
(`pct 0.00`, vacuous because there are zero executable lines), so it costs
nothing to the aggregate and is NOT a wave coverage target. Disposition: S6 deletes it with the system; on retention it stays a
`0`-line artifact and may be recorded in the coverage manifest as an
exclude-with-reason (dead re-export barrel) if the lane manifest requires an
explicit note.

`TokenOrPixelField.tsx` note (verified): it has NO direct test file anywhere
under `tests/` (its `87.27%` lines come only transitively via editor tests).
On retention, give it a direct suite.

Test-file split plan (applies ONLY if the wave resumes; each split file must
stay independently runnable in the Vitest lane, pattern: named suites +
shared fixture module):

- `tests/vitest/widgets/formRuntimeScript.test.ts` (`5866`): split by runtime
  responsibility into SIX+ named suites (arithmetic: 5866 lines / 3 suites is
  ~1955 per file, over the gate) -> `formRuntimeScript-render.test.ts`,
  `formRuntimeScript-state.test.ts`, `formRuntimeScript-submit.test.ts`,
  `formRuntimeScript-validation.test.ts`, `formRuntimeScript-reset.test.ts`,
  `formRuntimeScript-subscriptions.test.ts`; heavy fixture data moves to
  `formRuntimeScriptFixtures.ts` so each split file lands `<=1000` lines.
- `tests/vitest/widgets/renderer.test.tsx` (`1708`): split by widget family
  -> `renderer-hero-cta.test.tsx`, `renderer-content-grid.test.tsx`,
  `renderer-embed.test.tsx`.
- `tests/vitest/widgets/productTable.test.tsx` (`1509`): split by table
  behavior -> `productTable-render.test.tsx`,
  `productTable-interaction.test.tsx`.
- `tests/vitest/widgets/formEmbed.test.tsx` (`1284`): split by embed mode ->
  `formEmbed-script.test.tsx`, `formEmbed-iframe.test.tsx`.
- `tests/vitest/widgets/section.test.tsx` (`1002`) and
  `gridColumns.test.tsx` (`1001`): trim/extract shared fixtures to a support
  module and keep each suite under the gate.
- Editor-wave suites over the gate (verified current sizes): `hero-editor-wave`
  `2550`, `navigation-editor-wave` `1818`, `grid-columns-editor-wave` `1798`,
  `content-list-editor-wave` `1565`, `entry-teaser-editor-wave` `1503`,
  `feature-grid-editor-wave` `1478`, `posts-feed-editor-wave` `1407`,
  `logo-cloud-editor-wave` `1390`, `pricing-plans-editor-wave` `1204`,
  `newsletter-editor-wave` `1166`, `compare-timeline-editor-wave` `1098`,
  `gallery-mosaic-editor-wave` `1078`, `faq-accordion-editor-wave` `1074`,
  `cta-banner-editor-wave` `1058`, `team-editor-wave` `1028`,
  `product-table-editor-wave` `1028` (all under `tests/vitest/ui/`). Split
  each by wizard/visual/advanced mode responsibility; shared fixtures stay in
  a per-family `*Fixtures.tsx` support module. If S6 removes the sources, all
  of these die with them instead of being split.

**Changelog pin:** `1322` (TASK-105-06) stays reserved for this wave's closure
either way (S6-supersession closure or resumed implementation closure). Verify
the live `_docs/_CHANGELOG/README.md` at closure (highest consumed row today:
`1308`, next unreserved: `1309`; `1309-1319` are reserved for S1/S3).

The retention/resume branch never applies: this task is terminal (Superseded).


## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
