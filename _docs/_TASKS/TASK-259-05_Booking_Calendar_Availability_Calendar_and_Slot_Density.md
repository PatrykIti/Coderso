# TASK-259-05: Booking Calendar Availability Calendar and Slot Density

# FileName: TASK-259-05_Booking_Calendar_Availability_Calendar_and_Slot_Density.md

**Priority:** High
**Category:** Widgets + Booking + Runtime UX + Public Read API
**Estimated Effort:** Very Large
**Dependencies:** TASK-259-02, TASK-259-04, TASK-259
**Status:** To Do

---

## Overview

Add a product-grade date-selection surface and reduce confusing overlapping
slot density.

`REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.1, 3.8, 7.2, and 8 show three
related gaps:

- the widget uses a native date input instead of a visual calendar/week picker;
- users cannot see which dates have availability before clicking;
- the default `intervalMinutes=15` with a 30-minute service creates many
  overlapping slots.

This leaf must keep public availability requests bounded and compatible with the
date policy from TASK-259-02 and request cancellation from TASK-259-04.

## Scope Boundary

This leaf does not own:

- public slot past-date safety, owned by TASK-259-02;
- refresh loading/AbortController primitives, owned by TASK-259-04;
- generic interactive widget ARIA baseline from TASK-256-04, except labels for
  new Booking Calendar calendar controls;
- Booking admin Availability tab row editing UX from report section 7.4.

## Sub-Tasks

- [ ] Decide whether v1 ships month, week, or hybrid month/week calendar UI.
  Prefer the smallest UX that exposes availability without creating a second
  booking product.
- [ ] Add schema/defaults for `datePickerMode` and `slotIntervalMode`, for
  example `native`, `week`, `month` and `fixed`, `service-duration`,
  `non-overlapping`.
- [ ] Add a bounded availability lookup shape for the visual calendar. Reuse
  `GET /api/booking/slots` per selected date if the range is small, or add a
  bounded internal/public availability summary route only if repeated per-day
  calls are too slow.
- [ ] Ensure availability lookups obey the same auth/rate-limit/date-range/token
  policy as public slot reads.
- [ ] Render unavailable dates as disabled/empty, available dates with a count
  or dot, and selected date with stable visual state.
- [ ] Add non-overlapping slot behavior so service duration can drive the slot
  increment when configured.
- [ ] Keep legacy `intervalMinutes` behavior backward compatible for existing
  pages that intentionally want overlapping slots.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/bookingCalendar.tsx` | Add date picker and slot interval mode fields, schema/defaults/normalizer, and render markers. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Add controls for date picker mode and slot density mode. |
| `core/widgets/core/bookingRuntimeScript.ts` | Add visual calendar rendering, bounded availability lookup, selected date sync, and slot-density query behavior. |
| `core/services/booking/bookingService.ts` | Add non-overlap interval resolution or availability summary helper if required. |
| `core/server/publicBookingApi.ts` | Add or update public availability read behavior only if a summary route is necessary. |
| `core/server/validation/bookingSchemas.ts` | Add strict schema for any new summary query or slot-density parameter. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Add schema/render coverage for date picker and density mode fields. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add editor coverage for mode controls. |
| `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` | Add date navigation, date selection, and availability marker coverage. |
| `tests/unit/booking/bookingService.test.ts` | Add non-overlapping slot generation coverage. |
| `tests/unit/server/publicBookingApi.test.ts` | Add summary route or query coverage if public API changes. |

## Implementation Pseudocode

```ts
type BookingDatePickerMode = "native" | "week" | "month";
type BookingSlotIntervalMode = "fixed" | "service-duration" | "non-overlapping";

function resolveSlotStepMinutes(serviceDuration: number, configuredInterval: number, mode: BookingSlotIntervalMode) {
  if (mode === "fixed") return configuredInterval;
  if (mode === "service-duration") return serviceDuration;
  return Math.max(configuredInterval, serviceDuration);
}

function buildAvailabilityDates(anchorDate: string, mode: BookingDatePickerMode, range: DateRange) {
  const dates = mode === "week" ? currentWeek(anchorDate) : visibleMonth(anchorDate);
  return dates.filter((date) => isWithinRange(date, range));
}
```

Runtime flow:

```ts
async function refreshAvailability() {
  const dates = buildAvailabilityDates(currentDate, datePickerMode, policy);
  const results = await loadAvailabilityBounded({
    serviceId,
    resourceId,
    dates,
    signal,
  });
  renderCalendarDays(results);
}

function onCalendarDayClick(date) {
  if (!date.available) return;
  dateInput.value = date.value;
  void loadSlots();
}
```

Error handling:

- If availability summary fails, keep the date picker usable and show fallback
  copy; do not block manual date selection.
- If a selected date becomes unavailable after fetching slots, render configured
  empty-slot copy.
- If a new public summary route is created, reject unbounded ranges and unknown
  query parameters.

## Security Contract

This leaf may extend public read behavior.

- Endpoint visibility: public read only; no writes.
- Auth model: reuse the existing booking access evaluator and slots token policy
  for public availability data.
- RBAC: internal services still require session/API key where configured.
- CSRF: unchanged because reads only.
- Rate-limit bucket: use `public_read`; batch/summary requests must have bounded
  date ranges.
- Reject-unknown validation: new query fields must be allowlisted and strict.
- Anti-abuse: cap visible range, max dates per request, and response payload
  size; do not allow arbitrary availability scans.
- Secret handling: no slot tokens, nonce values, provider secrets, or private
  diagnostics in availability payloads, DOM, reports, or changelog.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`
- `bun test tests/unit/booking/bookingService.test.ts`
- `bun test tests/unit/server/publicBookingApi.test.ts` if route/query behavior
  changes.
- `bun run test:vitest -- tests/vitest/validation/bookingSchemas.test.ts` if
  validation schemas change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.1,
  3.8, and 7.2 after validation.
- Update `_docs/_WIDGETS/BOOKING_CALENDAR.md` with date picker modes,
  availability signals, and slot density semantics.

## Changelog Policy

- Covered by the TASK-259 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Users can navigate dates without guessing which dates have available slots.
- Slot density can avoid overlapping slots for normal service-duration booking
  flows while preserving legacy fixed-interval behavior.
- Availability requests are bounded, rate-limited, and respect the public access
  policy.
- Visual calendar/date picker remains usable when availability summary fails.
