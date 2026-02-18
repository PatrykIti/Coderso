# 245-2026-02-18 - Coderso Booking foundation (domain + API)

Date: 2026-02-18
Version: Unreleased
Tasks: TASK-054-10

## Key Changes
- Added Booking domain foundation in DB/schema:
  - `booking_resources`
  - `booking_services`
  - `booking_service_resources`
  - `booking_schedules`
  - `booking_blackouts`
  - `bookings`
- Added migration artifacts:
  - `core/db/migrations/0041_booking_foundation.sql`
  - `core/db/migrations/meta/0041_snapshot.json`
  - journal update in `core/db/migrations/meta/_journal.json`

- Added booking service layer (`core/services/booking/bookingService.ts`) with:
  - resource/service CRUD,
  - service-resource mapping,
  - schedule and blackout management,
  - reservation create/status update,
  - slot preview with conflict filtering (reservations + blackout windows).

- Added internal admin API routes (`/admin/api/booking/*`) in:
  - `core/server/routes/bookingRoutes.ts`
  - route registration in `core/server/routes/index.ts`

- Added RBAC permissions:
  - `booking:read`
  - `booking:write`
  in `core/services/admin/permissionsCatalog.ts`.

## Tests
- Added:
  - `tests/integration/routes/bookingRoutes.test.ts`
  - `tests/unit/booking/bookingService.test.ts`
  - `tests/unit/validation/bookingSchemas.test.ts`
- Validation in this slice:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/routes/bookingRoutes.test.ts tests/unit/booking/bookingService.test.ts tests/unit/validation/bookingSchemas.test.ts`
