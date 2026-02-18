# TASK-054-10-08: Booking Runtime Access Modes and Internal Portal
# FileName: TASK-054-10-08_Booking_Runtime_Access_Modes_and_Internal_Portal.md

**Priority:** High  
**Category:** Booking / Security / Runtime API  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-10-06, TASK-038-07, TASK-020-11-03  
**Status:** In Progress

---

## Goal
Add WordPress-like access control for booking runtime submissions:
- `public` mode (nonce + optional reCAPTCHA),
- `internal` mode (authenticated session OR API key scope).

## Scope
1. Service-level booking access mode persisted in service `settings`.
2. Admin UI control in Booking -> Services editor.
3. Runtime API enforcement for:
   - `GET /api/booking/slots`
   - `POST /api/booking/reservations`
4. API key scope contract for internal booking submit flows.
5. Tests + docs.

## Sub-Tasks
- `TASK-054-10-08-01`: Booking access mode model + admin UI wiring
- `TASK-054-10-08-02`: Public booking API access enforcement (auth/API key/public nonce)
- `TASK-054-10-08-03`: Tests, docs, changelog closure

## Files (planned)
- `core/services/booking/bookingAccess.ts` (new)
- `core/services/booking/bookingService.ts`
- `core/server/publicBookingApi.ts`
- `core/server/validation/bookingSchemas.ts`
- `core/admin/services/bookingClient.ts`
- `core/admin/ui/booking/bookingTypes.ts`
- `core/admin/ui/booking/BookingPage.tsx`
- `core/admin/ui/booking/components/ServicesTab.tsx`
- `core/admin/ui/settings/apiKeyScopes.ts`
- `tests/unit/booking/bookingAccess.test.ts` (new)
- `tests/unit/server/publicBookingApi.test.ts`
- `tests/unit/booking/bookingService.test.ts`

## Acceptance Criteria
1. Booking service supports `public|internal` access mode in a stable contract.
2. In `public` mode:
   - slots/reservations keep existing public protections,
   - reservation submit enforces nonce (+ optional bot protection).
3. In `internal` mode:
   - requests require authenticated session or API key with booking scope,
   - nonce/captcha are not required.
4. Admin UI clearly explains behavior and allows mode changes per service.
5. Unit/integration tests cover both modes and authorization outcomes.
