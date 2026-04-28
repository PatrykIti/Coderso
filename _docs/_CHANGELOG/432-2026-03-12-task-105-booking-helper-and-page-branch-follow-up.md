# 432. TASK-105 Booking Helper and Page Branch Follow-Up

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Admin UI
- Expanded `BookingPage` Vitest coverage for resource/service cancel handlers, resource save failure feedback, reservation-status error handling, and the no-available-slots success branch.
- Added direct Vitest coverage for `core/admin/ui/booking/bookingHelpers.ts`.

### Validation
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/booking-page.test.tsx`
  - `tests/vitest/ui/booking-helpers.test.ts`
- Targeted coverage re-check showed:
  - `BookingPage.tsx` -> `91.80%` lines / `63.85%` branches
  - `bookingHelpers.ts` -> `98.27%` lines / `95.65%` branches
