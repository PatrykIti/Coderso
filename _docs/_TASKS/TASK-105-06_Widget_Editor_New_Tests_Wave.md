# TASK-105-06: Widget Editor New Tests Wave
# FileName: TASK-105-06_Widget_Editor_New_Tests_Wave.md

**Priority:** High  
**Category:** QA + Widgets  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-01  
**Status:** In Progress (2026-03-08)

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
- direct Vitest coverage for `StatsKpiEditors`
- direct Vitest coverage for `CommerceWidgetEditorShared`
- direct Vitest coverage for `ProductCompareEditors`
- direct Vitest coverage for `ProductGalleryEditors`
- direct Vitest coverage for `ProductTableEditors`
- direct Vitest coverage for `TemplateSectionEditors`
- deeper follow-up coverage for `ListingFiltersEditors`
- direct Vitest coverage for `PricingPlansEditors`
- direct Vitest coverage for `TeamEditors`
- direct Vitest coverage for `TestimonialsEditors`
- direct Vitest coverage for `FaqAccordionEditors`
- direct Vitest coverage for `HeroEditors`
- direct Vitest coverage for `NavigationEditors`
- direct Vitest coverage for `ContactEditors`
- direct Vitest coverage for `BookingCalendarEditors`
- direct Vitest coverage for `CompareTimelineEditors`
- direct Vitest coverage for `FeatureGridEditors`
- direct Vitest coverage for `FooterEditors`
- direct Vitest coverage for `LogoCloudEditors`
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
- deeper branch and token coverage for `SectionEditors`
- deeper branch coverage for `GridColumnsEditors`
- deeper branch coverage for `ToggleBlockEditors`
- deeper branch coverage for `StackEditors`
- deeper branch coverage for `SpacerEditors`
- deeper line and branch coverage for `DividerEditors`

Current `2026-03-10` widget editor snapshot after the latest residual-closure follow-up:
- `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx` -> `90.84%` lines / `66.04%` branches
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` -> `100.00%` lines / `74.59%` branches
- `core/admin/ui/widgets/editors/PostsFeedEditors.tsx` -> `96.70%` lines / `64.00%` branches
- `core/admin/ui/widgets/editors/ContentListEditors.tsx` -> `85.38%` lines / `64.66%` branches
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` -> `87.50%` lines / `66.07%` branches
- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx` -> `93.93%` lines / `73.33%` branches
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx` -> `100.00%` lines / `62.50%` branches
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx` -> `95.00%` lines / `63.15%` branches
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx` -> `100.00%` lines / `62.50%` branches
- `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` -> `100.00%` lines / `71.79%` branches
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` -> `97.18%` lines / `58.82%` branches
- `core/admin/ui/widgets/editors/TeamEditors.tsx` -> `97.67%` lines / `60.71%` branches
- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` -> `89.01%` lines / `63.33%` branches
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` -> `89.77%` lines / `60.00%` branches
- `core/admin/ui/widgets/editors/HeroEditors.tsx` -> `99.35%` lines / `91.32%` branches
- `core/admin/ui/widgets/editors/NavigationEditors.tsx` -> `91.73%` lines / `72.12%` branches
- `core/admin/ui/widgets/editors/ContactEditors.tsx` -> `92.85%` lines / `63.80%` branches
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` -> `100.00%` lines / `70.58%` branches
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` -> `96.42%` lines / `66.37%` branches
- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` -> `88.23%` lines / `58.97%` branches
- `core/admin/ui/widgets/editors/FooterEditors.tsx` -> `96.85%` lines / `89.47%` branches
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` -> `98.80%` lines / `64.00%` branches
- `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` -> `89.69%` lines / `63.79%` branches
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` -> `95.74%` lines / `66.66%` branches
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` -> `100.00%` lines / `62.50%` branches
- `core/admin/ui/widgets/editors/TimelineEditors.tsx` -> `99.10%` lines / `84.21%` branches
- `core/admin/ui/widgets/editors/NewsletterEditors.tsx` -> `93.65%` lines / `61.42%` branches
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` -> `98.07%` lines / `64.28%` branches
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

Remaining hotspots in this wave:
- `StatsKpiEditors.tsx`
- `FeatureGridEditors.tsx`
- `TestimonialsEditors.tsx`
- `RichTextSectionEditors.tsx`
- `FaqAccordionEditors.tsx`
- `EntryTeaserEditors.tsx`
- `NavigationEditors.tsx`
- `ContactEditors.tsx`

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
