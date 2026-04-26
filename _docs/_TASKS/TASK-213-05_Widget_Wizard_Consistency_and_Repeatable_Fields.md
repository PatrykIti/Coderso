# TASK-213-05: Widget Wizard Consistency and Repeatable Fields
# FileName: TASK-213-05_Widget_Wizard_Consistency_and_Repeatable_Fields.md

**Priority:** Medium
**Category:** Widget Editors + Data Contracts + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-213, TASK-050, TASK-105-06
**Status:** To Do

---

## Overview

Repair the repeatable-field and label consistency issues from the per-widget QA
audit.

Widget wizards are supposed to be a safe quick setup for non-technical editors.
The report shows several places where a count selector controls more items than
the wizard exposes, where paired inputs have only one label, or where technical
field names such as `Flow key` appear without explanation.

This subtask keeps the `Wizard -> Visual -> Advanced` architecture intact. The
fix is not to move everything into Wizard; it is to make Wizard truthful,
deterministic, and accessible for the fields it does expose.

## Sub-Tasks

- `TASK-213-05-01_Repeatable_Count_Field_Sync_Matrix.md`
- `TASK-213-05-02_Paired_Input_Labels_and_Beginner_Helper_Text.md`

## Files to Change

- Repeatable count editors:
  - `core/admin/ui/widgets/editors/StatsKpiEditors.tsx`
  - `core/admin/ui/widgets/editors/LogoCloudEditors.tsx`
  - `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`
  - `core/admin/ui/widgets/editors/GridColumnsEditors.tsx`
  - `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
  - `core/admin/ui/widgets/editors/TeamEditors.tsx` and
    `core/admin/ui/widgets/editors/TimelineEditors.tsx` as current-state
    verification owners for the report's broader `GLOBAL-1` list; repair them
    only if the current checkout still reproduces the mismatch
  - `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx`
  - `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
  - `core/admin/ui/widgets/editors/TestimonialsEditors.tsx`
- Paired labels/helper-copy editors:
  - `core/admin/ui/widgets/editors/NavigationEditors.tsx`
  - `core/admin/ui/widgets/editors/FooterEditors.tsx`
  - `core/admin/ui/widgets/editors/HeroEditors.tsx`
  - `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
  - `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx`
  - `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
  - `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`
  - `core/admin/ui/widgets/editors/StackEditors.tsx`
  - `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
- Widget contracts:
  - `core/widgets/core/statsKpi.tsx`
  - `core/widgets/core/logoCloud.tsx`
  - `core/widgets/core/faqAccordion.tsx`
  - `core/widgets/core/gridColumns.tsx`
  - related `core/widgets/core/*` normalizers only when stored defaults change
- Relevant `tests/vitest/widgets/*.test.tsx` for every editor touched.
- Existing UI editor wave suites for every touched editor, including:
  - `tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
  - `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
  - `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `tests/vitest/ui/grid-columns-editor-wave.test.tsx`
  - `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
  - `tests/vitest/ui/navigation-editor-wave.test.tsx`
  - `tests/vitest/ui/footer-editor-wave.test.tsx`
  - `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  - `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
  - `tests/vitest/ui/split-layout-editor-wave.test.tsx`
  - `tests/vitest/ui/stack-editor-wave.test.tsx`
  - `tests/vitest/ui/toggle-block-editor-wave.test.tsx`

## Implementation Direction

Use a local repeatable quick-row helper or a small shared editor helper only if
it removes real duplication across at least three editors.

Preferred contract for Wizard:

```ts
const quickItems = normalizeItems(value.items, selectedCount);

return quickItems.map((item, index) => (
  <Input
    aria-label={`Metric ${index + 1} value`}
    value={item.value}
    onChange={(event) => updateItem(index, { value: event.target.value })}
  />
));
```

If exposing all rows would make Wizard too large, scope the count selector:

```ts
<Select value={String(quickItems.length)} ...>
  <SelectItem value="3">3 quick metrics</SelectItem>
</Select>
<p>More metrics are managed in Visual.</p>
```

Paired fields must each be named:

```tsx
<Input aria-label={`Link ${index + 1} label`} ... />
<Input aria-label={`Link ${index + 1} URL`} ... />
```

## Security Contract

- Visibility: internal admin widget editors plus public runtime rendering of
  normalized widget data.
- Auth model: unchanged admin session/API-key path for editing.
- RBAC: existing widget/page/template write permissions.
- CSRF: unchanged existing write calls.
- Rate-limit bucket: unchanged admin write/read buckets.
- Reject-unknown validation:
  - any changed defaults/counts must be reflected in owner schema and
    `normalize*` helpers in `core/widgets/core/*`;
  - no editor-only fields may be persisted outside schema.
- Anti-abuse:
  - href fields must keep existing safe URL validation/sanitization behavior;
  - helper text must not encourage raw IDs, secrets, provider keys, or private
    URLs in public-rendered widget data.

## Testing Requirements

- Each touched widget suite proves:
  - Wizard count selector and visible rows agree;
  - normalizers still clamp min/max and preserve deterministic ids;
  - paired inputs have visible labels or `aria-label`s;
  - technical helper copy exists where fields remain technical.
- For widgets named by the source report but not changed after inspection,
  record `current-state verified` evidence in `TASK-213-07` and
  `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md` instead of silently dropping them.
- Required targeted suites include:
  - `tests/vitest/widgets/statsKpi.test.tsx`
  - `tests/vitest/widgets/logoCloud.test.tsx`
  - `tests/vitest/widgets/faqAccordion.test.tsx`
  - `tests/vitest/widgets/gridColumns.test.tsx`
  - `tests/vitest/widgets/galleryMosaic.test.tsx`
  - `tests/vitest/widgets/navigation.test.tsx`
  - `tests/vitest/widgets/footer.test.tsx`
  - `tests/vitest/widgets/bookingCalendar.test.tsx`
  - `tests/vitest/widgets/appointmentForm.test.tsx`
  - the existing `tests/vitest/ui/*-editor-wave.test.tsx` suite for each
    touched editor listed above.
- Manual Playwright:
  - changing count visibly adds/removes matching quick rows or clearly explains
    that additional rows live in Visual;
  - screen-reader names are present for URL/name pairs.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- affected `_docs/_WIDGETS/*` files if widget-specific wizard contracts change
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Wizard counts no longer imply hidden preset rows that cannot be edited in the
   same quick setup context.
2. Every paired input is accessible by label or `aria-label`.
3. Technical fields that remain in Wizard have beginner-facing helper copy.
4. Widget schemas/defaults/normalizers and editor UI stay in sync.
