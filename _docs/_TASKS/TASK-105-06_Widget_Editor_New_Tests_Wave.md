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

Current `2026-03-09` widget editor snapshot after the latest layout/social-proof slice:
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
- `core/admin/ui/widgets/editors/HeroEditors.tsx` -> `82.37%` lines / `82.26%` branches
- `core/admin/ui/widgets/editors/NavigationEditors.tsx` -> `91.73%` lines / `72.12%` branches
- aggregate `core/admin/ui/widgets/editors/*` -> `68.06%` lines / `59.06%` branches across `40` tracked files

Remaining hotspots in this wave:
- `ContactEditors.tsx`
- `LogoCloudEditors.tsx`
- `RichTextSectionEditors.tsx`
- `BookingCalendarEditors.tsx`
- `CompareTimelineEditors.tsx`
- `FeatureGridEditors.tsx`

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
