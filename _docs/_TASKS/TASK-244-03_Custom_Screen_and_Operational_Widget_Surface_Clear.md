# TASK-244-03: Custom Screen and Operational Widget Surface Clear

# FileName: TASK-244-03_Custom_Screen_and_Operational_Widget_Surface_Clear.md

**Priority:** High
**Category:** Widgets + Screens + Operational Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-244-02-01, TASK-244-02-02
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
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx`
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx` only if
  product surface controls are shared
- exact runtime/editor tests listed in TASK-244-03-01 and TASK-244-03-02

## Implementation Order

1. Add style data contracts to screen widgets without changing their content
   binding semantics.
2. Replace hard-coded frame background classes with clearable style output.
3. Add operational widget surface fields only where they control visual shells,
   not status/warning/error colors.
4. Keep controls functional and accessible after background removal.
5. Add targeted runtime/editor tests.

## Security Contract

- Visibility:
  - admin screen/operational widget controls are internal admin UI;
  - rendered widget output remains public runtime output.
- Auth model:
  - no new endpoint is introduced;
  - edits keep the existing authenticated admin page/template/custom-screen save
    flow.
  - existing admin writes remain session-authenticated; API-key scope is not
    applicable because this subtask does not introduce an internal API-key mode.
- RBAC:
  - unchanged existing custom-screen, page, template, and widget-template write
    permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - every new `style` field must be owned by the widget schema/default/normalizer
    and must reject unknown keys.
- Anti-abuse:
  - no public write surface is added;
  - nonce, signature/HMAC, and reCAPTCHA are not applicable because no public
    write endpoint is added.
  - user-controlled style values must not be emitted as dynamic class fragments.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/screenWidgets.test.tsx tests/vitest/ui/screen-widgets-editor-wave.test.tsx` after TASK-244-03-01 creates or extends `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/custom-screen-binding-panel.test.tsx` only if binding-panel behavior changes
- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/searchBox.test.tsx tests/vitest/widgets/productGallery.test.tsx tests/vitest/widgets/productTable.test.tsx tests/vitest/widgets/productCompare.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/ui/product-gallery-editor-wave.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- add exact missing per-widget docs only if implementation introduces a new docs
  page; otherwise operational widgets document shared clear semantics in
  `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` status only when this subtask moves state

## Acceptance Criteria

1. Screen widget frames can be cleared without switching variants.
2. Operational widgets can remove visual panel/table surfaces while preserving
   labels, controls, and validation states.
3. No status/error/warning colors are removed accidentally.
4. Runtime and editor tests prove field removal and output omission.
5. Clear paths do not serialize `"transparent"` or empty strings as off-state
   payloads.
