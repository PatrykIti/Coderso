# 377. TASK-105 Booking Page Coverage Follow-Up

**Date:** 2026-03-08  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Booking
- Replaced the old `BookingPage` smoke render with direct `happy-dom` coverage for resource, service, schedule, blackout, reservation, slot-preview, refresh, and cache-bus flows.
- Kept the existing leaf coverage for `Availability`, `Services`, `Reservations`, `SlotPreview`, and `Resources` tabs while finally exercising the parent shell that orchestrates all of them.

### Coverage Progress
- Previous snapshot after the listings/themes follow-up slices: `49.85% stmts`, `44.24% branch`, `44.91% funcs`, `52.48% lines`
- Current snapshot after this booking shell slice: `51.04% stmts`, `44.91% branch`, `45.79% funcs`, `53.66% lines`
- `BookingPage.tsx` moved to `90.11%` lines / `63.25%` branches
- `bookingHelpers.ts` moved to `84.48%` lines / `67.39%` branches
- Combined `core/admin/ui/booking/*` average now sits at `65.04%` lines / `77.41%` branches

### Remaining Focus
- Booking is no longer blocked by the parent page shell; the remaining work is mostly residual helper/page branches.
- The next highest-value open work in `TASK-105-04` is now `ThemesPage.tsx` and the remaining theme drawer/page branches.
