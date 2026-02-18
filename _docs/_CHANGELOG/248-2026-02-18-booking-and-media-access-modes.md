# 248 - Booking and Media Access Modes

- **Date:** 2026-02-18
- **Version:** 0.1.248
- **Tasks:** TASK-054-10-08, TASK-054-10-08-01, TASK-054-10-08-02, TASK-054-10-08-03, TASK-054-10-09, TASK-054-10-09-01, TASK-054-10-09-02, TASK-054-10-09-03

## Key Changes

### Booking Runtime Access
- Added booking access contract (`public` / `internal`) with normalization and evaluation helpers.
- Added per-service runtime access mode in Booking -> Services editor.
- Public booking API now enforces per-service mode:
  - `public`: requires slots token for slots, nonce (+ optional bot protection) for reservation submit.
  - `internal`: requires authenticated session or API key with `booking.submit` scope.
- Added `booking.submit` to API key scope catalog in Settings UI.

### Media Delivery Access
- Extended storage settings contract with `delivery.accessMode` (`public` / `internal`).
- Added Delivery Access controls in Settings -> Storage.
- Hardened `/media/*` runtime handler:
  - `internal` mode blocks anonymous access,
  - allows authenticated session or API key with `media.read` scope.

### Tests
- Added unit tests:
  - `tests/unit/booking/bookingAccess.test.ts`
  - `tests/unit/media/mediaAccess.test.ts`
- Expanded booking/runtime and storage coverage:
  - `tests/unit/server/publicBookingApi.test.ts`
  - `tests/unit/booking/bookingService.test.ts`
  - `tests/unit/settings/storageSettings.test.ts`
  - `tests/unit/ui/storage-settings.test.tsx`
  - `tests/integration/server/mediaDeliveryAccess.test.ts` (DB-backed)
