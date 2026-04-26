# TASK-213-05-01: Repeatable Count Field Sync Matrix
# FileName: TASK-213-05-01_Repeatable_Count_Field_Sync_Matrix.md

**Priority:** Medium
**Category:** Widget Editors + Data Contracts
**Estimated Effort:** Medium
**Dependencies:** TASK-213-05
**Status:** To Do

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
- Gallery Mosaic;
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
- `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`
- `core/widgets/core/statsKpi.tsx`
- `core/widgets/core/logoCloud.tsx`
- `core/widgets/core/faqAccordion.tsx`
- `core/widgets/core/gridColumns.tsx`
- matching `tests/vitest/widgets/*.test.tsx` files.

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
  - `tests/vitest/widgets/compareTimeline.test.tsx`
  - `tests/vitest/widgets/pricingPlans.test.tsx`
  - `tests/vitest/widgets/testimonials.test.tsx`
- Manual Playwright:
  - change count selectors and verify visible rows/copy align.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- affected `_docs/_WIDGETS/*` docs if quick setup fields change.

## Acceptance Criteria

1. No audited count selector silently controls uneditable Wizard rows.
2. Count-driven normalizers stay deterministic and bounded.
3. Tests cover row/count alignment for every touched widget.
