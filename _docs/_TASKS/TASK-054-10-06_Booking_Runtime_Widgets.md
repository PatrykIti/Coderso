# TASK-054-10-06: Booking Runtime Widgets
# FileName: TASK-054-10-06_Booking_Runtime_Widgets.md

**Priority:** High  
**Category:** Widgets/Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-10-05  
**Status:** To Do

---

## Goal
Provide runtime widgets for booking flows: calendar slot picker + appointment form submission.

## Scope
1. `booking-calendar` widget with resource/service/date/slot selector.
2. `appointment-form` widget with customer data + submit.
3. Runtime submission to booking reservation endpoint.
4. Optional form submission linkage and success states.

## Files (planned)
- `core/widgets/core/bookingCalendar.tsx`
- `core/widgets/core/appointmentForm.tsx`
- `core/admin/ui/widgets/editors/Booking*Editors.tsx`
- `tests/unit/widgets/bookingCalendar.test.tsx`
- `tests/unit/widgets/appointmentForm.test.tsx`

## Acceptance Criteria
1. Widgets render on public runtime and preview.
2. Slot selection + reservation submission path is functional.
3. Error/success states are visible and user friendly.
4. Tests cover normalize/validation/runtime behavior.
