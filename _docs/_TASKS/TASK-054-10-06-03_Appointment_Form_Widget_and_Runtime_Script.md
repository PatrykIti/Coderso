# TASK-054-10-06-03: Appointment Form Widget and Runtime Script
# FileName: TASK-054-10-06-03_Appointment_Form_Widget_and_Runtime_Script.md

**Priority:** High  
**Category:** Widgets Runtime Client  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-10-06-01, TASK-054-10-06-02  
**Status:** Done (2026-02-18)

---

## Goal
Add `appointment-form` widget and shared runtime client script that links form submission to selected calendar slot.

## Scope
1. `appointment-form` widget:
   - customer fields,
   - selected slot summary,
   - success/error states,
   - submission nonce integration.
2. Shared runtime client script:
   - calendar slot event bus (`flowId`),
   - submit payload assembly,
   - async POST submit to public runtime API,
   - UX states (loading/success/error).
3. Editors for appointment form.

## Files to Change
- `core/widgets/core/appointmentForm.tsx` (new)
- `core/widgets/core/bookingRuntimeScript.ts` (new)
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx` (new)
- `core/admin/ui/widgets/editors/index.ts`
- `core/widgets/core/index.ts`
- `core/admin/ui/widgets/registry.ts`
- `core/widgets/runtime.tsx`

## Pseudocode
```ts
calendarWidget.onSlotClick(slot) =>
  dispatch CustomEvent("nextless:booking-slot-selected", { flowId, slot })

appointmentForm.bind(flowId) => {
  listen slot-selected events
  update slot summary + enable submit
  submit => POST /api/booking/reservations with {
    serviceId, resourceId, startsAt, endsAt, timezone,
    customerName, customerEmail, customerPhone, notes,
    formNonce, captchaToken?
  }
}
```

## Acceptance Criteria
1. `booking-calendar` + `appointment-form` work together via shared `flowId`.
2. Submit is blocked when no slot is selected.
3. Success and error states are user-readable.
4. Runtime script is idempotent (safe with multiple widgets on page).
