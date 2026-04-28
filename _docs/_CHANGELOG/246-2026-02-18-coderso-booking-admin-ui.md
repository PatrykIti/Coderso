# 246-2026-02-18 - Coderso Booking admin UI

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-10-05

## Key Changes
- Added Booking admin screen at `/admin/coderso/booking`:
  - `Resources` (CRUD),
  - `Services` (CRUD),
  - `Availability` (resource schedules + blackout windows),
  - `Reservations` (manual create + status transitions),
  - `Slot Preview` (service/resource/date slot generation preview).
- Added booking admin client API layer in `core/admin/services/bookingClient.ts`:
  - cache-backed list/detail helpers,
  - schedule and service-resource assignment operations,
  - reservation status update operations.
- Refactored booking admin UI for maintainability:
  - split `BookingPage` into tab-specific components under `core/admin/ui/booking/components/*`,
  - extracted shared contracts/defaults into `core/admin/ui/booking/bookingTypes.ts`,
  - extracted shared parser/formatter helpers into `core/admin/ui/booking/bookingHelpers.ts`.
- Enabled Coderso Booking module in navigation as `Beta` (`preview` lifecycle).
- Added booking route support in admin app and legacy alias/prefetch coverage:
  - `/booking -> /coderso/booking`.

## Tests
- Added:
  - `tests/unit/admin/bookingClient.test.ts`
  - `tests/unit/ui/booking-page.test.tsx`
- Updated:
  - `tests/unit/ui/coderso-modules.test.ts`
  - `tests/unit/admin/adminPaths.test.ts`
  - `tests/unit/admin/adminPrefetch.test.ts`
