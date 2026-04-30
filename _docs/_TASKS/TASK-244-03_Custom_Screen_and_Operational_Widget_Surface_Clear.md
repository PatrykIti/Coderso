# TASK-244-03: Custom Screen and Operational Widget Surface Clear

# FileName: TASK-244-03_Custom_Screen_and_Operational_Widget_Surface_Clear.md

**Priority:** High
**Category:** Widgets + Screens + Operational Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-244-02
**Status:** To Do

---

## Overview

Add clearable surface contracts to widgets that currently hard-code framed
runtime shells rather than exposing style fields.

This subtask covers the widgets where the problem is most structural:

- custom screen widgets use hard-coded frame/background classes;
- booking/listing/search/commerce widgets render operational controls inside
  forced panels and tables.

## Sub-Tasks

- [ ] TASK-244-03-01: Custom Screen Widget Frame Surface Clear
- [ ] TASK-244-03-02: Booking, Listing, Search, and Commerce Frame Surface Clear

## Files to Change

- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/widgets/core/bookingCalendar.tsx`
- `core/widgets/core/appointmentForm.tsx`
- `core/widgets/core/listingFilters.tsx`
- `core/widgets/core/searchBox.tsx`
- `core/widgets/core/productGallery.tsx`
- `core/widgets/core/productTable.tsx`
- `core/widgets/core/productCompare.tsx`
- matching editor files and tests

## Implementation Order

1. Add style data contracts to screen widgets without changing their content
   binding semantics.
2. Replace hard-coded frame background classes with clearable style output.
3. Add operational widget surface fields only where they control visual shells,
   not status/warning/error colors.
4. Keep controls functional and accessible after background removal.
5. Add targeted runtime/editor tests.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/screenWidgets.test.tsx tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/searchBox.test.tsx tests/vitest/widgets/productGallery.test.tsx tests/vitest/widgets/productTable.test.tsx tests/vitest/widgets/productCompare.test.tsx`
- Matching editor-wave tests:
  - `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  - `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
  - `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
  - `tests/vitest/ui/search-box-editor-wave.test.tsx`
  - `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
  - `tests/vitest/ui/product-table-editor-wave.test.tsx`
  - `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- add missing per-widget docs for screen/operational widgets if the current docs
  do not have a target page
- `_docs/_TASKS/README.md` status only when this subtask moves state

## Acceptance Criteria

1. Screen widget frames can be cleared without switching variants.
2. Operational widgets can remove visual panel/table surfaces while preserving
   labels, controls, and validation states.
3. No status/error/warning colors are removed accidentally.
4. Runtime and editor tests prove field removal and output omission.
