# TASK-213-05-01: Repeatable Count Field Sync Matrix
# FileName: TASK-213-05-01_Repeatable_Count_Field_Sync_Matrix.md

**Priority:** Medium
**Category:** Widget Editors + Data Contracts
**Estimated Effort:** Medium
**Dependencies:** TASK-213-05
**Status:** Done (2026-04-26)

---

## Overview

Fix the global count mismatch pattern from the widget audit.

Widgets with count selectors must not expose `count=4/6` while only allowing
the user to edit two or three rows in the same Wizard step. The first pass
should verify and repair at least:

- Stats KPI;
- Logo Cloud;
- FAQ Accordion;
- Grid Columns;
- Gallery Mosaic only for count/copy consistency; media-picking gaps stay owned
  by `TASK-213-06-02`;
- Team and Timeline as current-state verification from the report's broad
  `GLOBAL-1` list; repair only if the current checkout still reproduces a
  count/row mismatch;
- Compare Timeline;
- Pricing Plans and Testimonials only if current code still reproduces the
  mismatch after inspection.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx`
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx`
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`
- `core/admin/ui/widgets/editors/GridColumnsEditors.tsx`
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
- `core/admin/ui/widgets/editors/TeamEditors.tsx` if current-state verification
  fails
- `core/admin/ui/widgets/editors/TimelineEditors.tsx` if current-state
  verification fails
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`
- `core/widgets/core/statsKpi.tsx`
- `core/widgets/core/logoCloud.tsx`
- `core/widgets/core/faqAccordion.tsx`
- `core/widgets/core/gridColumns.tsx`
- matching `tests/vitest/widgets/*.test.tsx` files.
- Existing UI editor wave suites for every touched editor:
  - `tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
  - `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
  - `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `tests/vitest/ui/grid-columns-editor-wave.test.tsx`
  - `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
  - `tests/vitest/ui/team-editor-wave.test.tsx` if Team is touched
  - `tests/vitest/ui/timeline-editor-wave.test.tsx` if Timeline is touched
  - `tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
  - `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
  - `tests/vitest/ui/testimonials-editor-wave.test.tsx`

## Implementation Direction

For every widget, choose one explicit contract:

1. Wizard exposes all rows controlled by the Wizard count selector.
2. Wizard exposes a fixed quick subset and the selector label/copy says it is a
   quick subset, with full count management in Visual.

Preferred when row count is small:

```tsx
const items = normalizeItems(value.items, selectedCount);

{items.map((item, index) => (
  <RepeatableQuickRow
    key={item.id}
    label={`Metric ${index + 1}`}
    value={item}
    onChange={(patch) => updateItem(index, patch)}
  />
))}
```

For large media/logo lists:

```tsx
<Select value={String(quickCount)}>
  <SelectItem value="3">3 quick logos</SelectItem>
</Select>
<p>Use Visual to manage all {totalCount} logos.</p>
```

Do not hide preset rows that will render publicly without telling the user.

## Security Contract

- Visibility: internal admin editors plus public rendering of normalized widget
  data.
- Auth/RBAC/CSRF/rate-limit: unchanged existing page/template editor contracts.
- Reject-unknown validation: changed counts/defaults must be reflected in the
  owner normalizer/schema before UI exposure.
- Anti-abuse: generated rows must use safe defaults and cannot introduce unsafe
  href/media/html values.

## Testing Requirements

- For each touched widget:
  - Wizard render contains row labels matching selected count or explicit quick
    subset helper copy;
  - changing count adds/removes deterministic normalized rows;
  - min/max clamp tests remain green.
- Required targeted suites:
  - `tests/vitest/widgets/statsKpi.test.tsx`
  - `tests/vitest/widgets/logoCloud.test.tsx`
  - `tests/vitest/widgets/faqAccordion.test.tsx`
  - `tests/vitest/widgets/gridColumns.test.tsx`
  - `tests/vitest/widgets/galleryMosaic.test.tsx`
  - `tests/vitest/widgets/team.test.tsx` if touched
  - `tests/vitest/widgets/timeline.test.tsx` if touched
  - `tests/vitest/widgets/compareTimeline.test.tsx`
  - `tests/vitest/widgets/pricingPlans.test.tsx`
  - `tests/vitest/widgets/testimonials.test.tsx`
  - matching `tests/vitest/ui/*-editor-wave.test.tsx` suites for each touched
    editor listed in Files to Change.
- Manual Playwright:
  - change count selectors and verify visible rows/copy align.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- affected `_docs/_WIDGETS/*` docs if quick setup fields change.

## Acceptance Criteria

1. No audited count selector silently controls uneditable Wizard rows.
2. Count-driven normalizers stay deterministic and bounded.
3. Tests cover row/count alignment for every touched widget.
