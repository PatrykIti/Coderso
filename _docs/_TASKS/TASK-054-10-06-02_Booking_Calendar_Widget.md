# TASK-054-10-06-02: Booking Calendar Widget
# FileName: TASK-054-10-06-02_Booking_Calendar_Widget.md

**Priority:** High  
**Category:** Widgets + Admin Editors  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-10-06-01  
**Status:** Done (2026-02-18)

---

## Goal
Add `booking-calendar` widget for runtime slot selection and flow synchronization.

## Scope
1. Core widget definition (`booking-calendar`):
   - service selector,
   - resource selector,
   - date input,
   - slot list,
   - selected slot state.
2. Data normalization + schema + defaults.
3. Widget editors (wizard/visual/advanced).
4. Registration in core widgets and admin widget registry.

## Files to Change
- `core/widgets/core/bookingCalendar.tsx` (new)
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` (new)
- `core/admin/ui/widgets/editors/index.ts`
- `core/widgets/core/index.ts`
- `core/admin/ui/widgets/registry.ts`
- `core/widgets/runtime.tsx`

## Pseudocode
```ts
normalizeBookingCalendarData(input) => ({
  flowId,
  title,
  description,
  labels,
  intervalMinutes,
  defaultServiceId,
  defaultResourceId,
  endpoints,
  resolved
})

BookingCalendarBlock =>
  render selects + date + slot container
  data attrs for runtime script binding
  inject shared booking runtime script

createBookingCalendarWidget(editors) => {
  type: "booking-calendar",
  category: "forms",
  defaults,
  schema,
  editor,
  render
}
```

## Acceptance Criteria
1. Widget appears in library and page editor.
2. Runtime widget loads services/resources from resolved payload.
3. Slot selection is visible and emits flow-level selection event.
4. Editors expose basic UX copy and runtime behavior options.
