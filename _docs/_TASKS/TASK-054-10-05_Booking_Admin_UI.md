# TASK-054-10-05: Booking Admin UI
# FileName: TASK-054-10-05_Booking_Admin_UI.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-10-01..04  
**Status:** Done (2026-02-18)

---

## Goal
Deliver Coderso Booking admin screens so non-technical users can manage resources, services, schedules, blackouts, slot preview, and reservations.

## Scope
1. `BookingPage` under `/admin/coderso/booking`.
2. Tabs/sections:
   - Resources,
   - Services,
   - Availability (schedules + blackouts),
   - Reservations,
   - Slot Preview.
3. Admin client integration (`/admin/api/booking/*`).
4. Error/loading/empty states.
5. Coderso navigation exposure as `Beta`.

## Files to Create
- `core/admin/services/bookingClient.ts`
- `core/admin/ui/booking/BookingPage.tsx`
- `tests/unit/admin/bookingClient.test.ts`
- `tests/unit/ui/booking-page.test.tsx`

## Files to Update
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/navigation/codersoModules.ts`
- `core/admin/services/cachePolicy.ts` (if booking cache keys added)
- `core/admin/utils/adminPrefetch.ts` (optional booking prefetch)
- `tests/unit/ui/coderso-modules.test.ts`

## Pseudocode
```ts
loadPage() {
  resources = await listBookingResourcesCached()
  services = await listBookingServicesCached()
  reservations = await listBookingReservationsCached()
  blackouts = await listBookingBlackoutsCached()
}

onCreateResource(payload) -> createBookingResource(payload) -> refresh resources
onCreateService(payload) -> createBookingService(payload) -> refresh services
onSaveSchedules(resourceId, rows) -> setBookingSchedules(resourceId, rows)
onSaveServiceResources(serviceId, rows) -> setBookingServiceResources(serviceId, rows)
onCreateBlackout(payload) -> createBookingBlackout(payload) -> refresh blackouts
onPreviewSlots(payload) -> previewBookingSlots(payload)
onCreateReservation(payload) -> createBookingReservation(payload) -> refresh reservations
onChangeReservationStatus(id, status) -> updateBookingReservationStatus(id, status)
```

## Acceptance Criteria
1. Booking screen is reachable from Coderso sidebar (`/admin/coderso/booking`).
2. Admin can create/edit resources/services and assign schedules/resources.
3. Slot preview works and returns list/results without console errors.
4. Reservation create/status update works from UI.
5. API errors are surfaced as user-readable messages.
6. Unit tests cover rendering and client routes.

## Delivered
- Follow-up refactor completed in `TASK-054-10-05-01`:
  - split booking UI into tab components,
  - extracted shared booking types/defaults,
  - extracted shared booking parse/format helpers.
- Added `BookingPage` under `/admin/coderso/booking` with tabs:
  - `Resources`
  - `Services`
  - `Availability`
  - `Reservations`
  - `Slot Preview`
- Added full admin client wiring for booking endpoints in `core/admin/services/bookingClient.ts`:
  - cache-backed list/read helpers,
  - create/update/delete operations,
  - schedule/resource mapping setters,
  - reservation status transitions.
- Enabled Coderso Booking in sidebar as `Beta` (`preview` lifecycle).
- Added route + backward alias/prefetch coverage for `/booking -> /coderso/booking`.
- Added tests:
  - `tests/unit/admin/bookingClient.test.ts`
  - `tests/unit/ui/booking-page.test.tsx`
  - updated nav/path/prefetch tests for booking.
