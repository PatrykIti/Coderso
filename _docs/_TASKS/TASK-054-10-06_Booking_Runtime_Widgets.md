# TASK-054-10-06: Booking Runtime Widgets
# FileName: TASK-054-10-06_Booking_Runtime_Widgets.md

**Priority:** High  
**Category:** Widgets/Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-10-05  
**Status:** Done (2026-02-18)

---

## Goal
Provide runtime widgets for booking flows: calendar slot picker + appointment form submission.

## Scope
1. `booking-calendar` widget with resource/service/date/slot selector.
2. `appointment-form` widget with customer data + submit.
3. Runtime submission to booking reservation endpoint.
4. Optional form submission linkage and success states.

## Sub-Tasks
- `TASK-054-10-06-01`: Public runtime booking API + runtime resolver payload
- `TASK-054-10-06-02`: `booking-calendar` widget + editors
- `TASK-054-10-06-03`: `appointment-form` widget + shared runtime client script
- `TASK-054-10-06-04`: QA/tests/docs/changelog closure

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

## Delivered
- Added runtime widgets:
  - `booking-calendar`
  - `appointment-form`
- Added shared runtime client script (`bookingRuntimeScript`) with `flowId`-based slot sync.
- Added public runtime booking API:
  - `GET /api/booking/slots`
  - `POST /api/booking/reservations`
- Added runtime booking resolver + nonce bridge for widget hydration.
- Added widget editors and registration wiring for admin/runtime registries.
- Added tests for widgets and public booking runtime API handler.
