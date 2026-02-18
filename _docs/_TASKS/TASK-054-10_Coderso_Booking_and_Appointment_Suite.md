# TASK-054-10: Coderso Booking and Appointment Suite
# FileName: TASK-054-10_Coderso_Booking_and_Appointment_Suite.md

**Priority:** High  
**Category:** Booking Domain + Admin/UI + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-07, TASK-054-09  
**Status:** In Progress (started 2026-02-18)

---

## Goal
Provide full booking and appointments features (JetBooking + JetAppointment parity baseline) for service businesses (e.g., automotive workshops).

## Features
- Resources: staff, bays, tools, vehicles/equipment.
- Services and durations with buffers.
- Availability calendar, blackout dates, overrides.
- Booking flow with confirmation, reschedule, cancel.
- Optional payment/deposit integration.

## Scope (Detailed)
1. Booking domain model:
   - resources, services, service-resource mapping,
   - weekly availability rules + blackout windows,
   - reservations with conflict-safe status lifecycle.
2. Slot engine:
   - deterministic slot generation in requested timezone,
   - overlap detection against active reservations and blackouts,
   - buffers before/after service duration.
3. Admin API (internal):
   - CRUD for resources and services,
   - availability configuration,
   - slot preview and reservation management.
4. Admin UI:
   - Coderso Booking list/config screens,
   - service/resource/schedule cards with validation feedback,
   - reservation table with status transitions.
5. Runtime widgets:
   - booking calendar (slot picker),
   - appointment form (customer details + confirm).
6. Security/runtime:
   - internal endpoints behind RBAC,
   - public booking submit protected with existing public-write protections.

## Non-Goals (Phase 1)
- Full payment gateway settlement orchestration.
- Multi-provider calendar sync (Google/Outlook) in first release.
- Arbitrary recurrence DSL beyond weekly rules + explicit blackouts.

## Sub-Tasks
- `TASK-054-10-01`: Domain contract + validation schemas
- `TASK-054-10-02`: DB schema + migration (`booking_*` tables)
- `TASK-054-10-03`: Slot engine + conflict detection service
- `TASK-054-10-04`: Admin API routes + RBAC + error mapping
- `TASK-054-10-05`: Admin UI for resources/services/schedules/reservations
- `TASK-054-10-06`: Runtime widgets (`booking-calendar`, `appointment-form`)
- `TASK-054-10-07`: QA/tests/docs/changelog closure

## Implementation Order
1. Contract + migration + service primitives.
2. Slot generation/conflict engine.
3. API routes and permission wiring.
4. Admin UI shell and flows.
5. Runtime widgets and end-to-end booking path.
6. Full regression matrix and docs.

## Progress Update (2026-02-18)
- Completed in this slice:
  - `TASK-054-10-01`: booking validation contract (`bookingSchemas`) with UUID/date-time-safe payload checks.
  - `TASK-054-10-02`: DB foundation (`booking_resources`, `booking_services`, `booking_service_resources`, `booking_schedules`, `booking_blackouts`, `bookings`) + migration `0041_booking_foundation.sql`.
  - `TASK-054-10-03`: booking service layer with:
    - resources/services CRUD,
    - service-resource and schedule setup,
    - blackout windows,
    - slot preview with reservation/blackout conflict filtering,
    - reservation creation and status transitions.
  - `TASK-054-10-04`: internal admin API routes `/booking/*` + RBAC (`booking:read`, `booking:write`) + deterministic error mapping.
- Pending:
  - runtime booking widgets (`TASK-054-10-06`),
  - final QA/docs closure (`TASK-054-10-07`).

## Progress Update (2026-02-18, Booking Admin UI)
- Completed `TASK-054-10-05`:
  - added `/admin/coderso/booking` admin screen with tabs:
    - resources CRUD,
    - services CRUD,
    - availability (schedules + blackouts),
    - reservations (create + status transitions),
    - slot preview.
  - enabled Coderso Booking navigation as `Beta` (preview lifecycle).
  - added booking admin client tests and UI rendering test coverage.

## Files to Change
- `core/db/schema.ts` (booking tables)
- `core/services/booking/*` (new)
- `core/server/routes/bookingRoutes.ts` (new)
- `core/server/validation/bookingSchemas.ts` (new)
- `core/services/admin/permissionsCatalog.ts` (booking permissions)
- `core/server/routes/index.ts` (register routes)
- `core/admin/ui/booking/*` (new)
- `core/widgets/core/bookingCalendar.tsx` (new)
- `core/widgets/core/appointmentForm.tsx` (new)
- `tests/unit/booking/*` (new)
- `tests/integration/routes/bookingRoutes.test.ts` (new)

## Pseudocode
```ts
const slots = getAvailableSlots({
  serviceId,
  resourceId,
  date,
  timezone,
  rules, // weekly windows + blackouts
  existingReservations, // statuses blocking slot usage
  buffers,
});

if (!slotAvailable(slots, requestedSlot)) throw new ApiError("slot_unavailable", ...);
await createReservation({ requestedSlot, customerData });
```

## Acceptance Criteria
1. Admin can configure resources/services/schedules without developer help.
2. Frontend users can book and manage appointments reliably.
3. Conflict prevention and timezone handling are test-covered.
4. No 500 for known domain errors (mapped API codes for UX-safe responses).
5. Reservation flow is deterministic under repeated preview requests.
