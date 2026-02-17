# TASK-054-10: Coderso Booking and Appointment Suite
# FileName: TASK-054-10_Coderso_Booking_and_Appointment_Suite.md

**Priority:** High  
**Category:** Booking Domain + Admin/UI + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-07, TASK-054-09  
**Status:** To Do

---

## Goal
Provide full booking and appointments features (JetBooking + JetAppointment parity baseline) for service businesses (e.g., automotive workshops).

## Features
- Resources: staff, bays, tools, vehicles/equipment.
- Services and durations with buffers.
- Availability calendar, blackout dates, overrides.
- Booking flow with confirmation, reschedule, cancel.
- Optional payment/deposit integration.

## Files to Change
- `core/db/schema.ts` (booking tables)
- `core/services/booking/*` (new)
- `core/server/routes/bookingRoutes.ts` (new)
- `core/admin/ui/booking/*` (new)
- `core/widgets/core/bookingCalendar.tsx` (new)
- `core/widgets/core/appointmentForm.tsx` (new)

## Pseudocode
```ts
const slots = getAvailableSlots({
  serviceId,
  resourceId,
  date,
  timezone,
  rules,
  existingReservations,
});

if (!slotAvailable(slots, requestedSlot)) throw new ApiError("slot_unavailable", ...);
await createReservation({ requestedSlot, customerData });
```

## Acceptance Criteria
1. Admin can configure resources/services/schedules without developer help.
2. Frontend users can book and manage appointments reliably.
3. Conflict prevention and timezone handling are test-covered.
