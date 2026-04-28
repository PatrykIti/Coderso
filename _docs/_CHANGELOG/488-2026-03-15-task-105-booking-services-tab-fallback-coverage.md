# 488. TASK-105 Booking Services Tab Fallback Coverage

**Date:** 2026-03-15  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Booking
- Expanded `BookingServicesTab` coverage for public-access fallback rows, no-price rendering, unchecked resource assignment states, and disabled save-assignment behavior.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/booking-tabs-leaf.test.tsx`
- Full `bun run test:coverage` passed with:
  - `460` files / `1709` tests
  - `% Stmts`: `69.10`
  - `% Branch`: `60.20`
  - `% Funcs`: `72.60`
  - `% Lines`: `72.26`
