# TASK-259-05: Booking Calendar Availability Calendar and Slot Density

# FileName: TASK-259-05_Booking_Calendar_Availability_Calendar_and_Slot_Density.md

**Priority:** High
**Category:** Widgets + Booking + Runtime UX + Public Read API
**Estimated Effort:** Very Large
**Dependencies:** TASK-259-02, TASK-259-04, TASK-259
**Status:** Done (2026-05-18)

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

`TASK-252-07-10` documented earlier research around Booking Calendar
`displayMode`, but the current live widget does not expose that field. This leaf
supersedes that unlanded research for the current codebase: do not resurrect the
old `displayMode` contract unless this task is explicitly revised.

V1 product decision: ship a bounded `week` visual picker with `native` as the
backward-compatible fallback. Defer a full month grid to a future task unless a
later product decision explicitly expands this leaf. V1 availability markers
reuse the existing public slot lookup for at most seven visible dates; do not
add a new public summary route in this leaf unless the seven-day strategy fails
performance validation and the task is updated with explicit route
registration, schema, rate-limit, and `mapBookingError` coverage.

## Scope Boundary

This leaf does not own:

- public slot past-date safety, owned by TASK-259-02;
- refresh loading/AbortController primitives, owned by TASK-259-04;
- generic interactive widget ARIA baseline now routed to TASK-296; this leaf
  may still add labels for new Booking Calendar calendar controls;
- Booking admin Availability tab row editing UX from report section 7.4.

## Sub-Tasks

- [ ] Add schema/defaults for `datePickerMode` and `slotIntervalMode`, for
  `native | week` and `fixed | service-duration | non-overlapping`.
- [ ] Add a bounded seven-day availability lookup shape for the visual week
  picker using `GET /api/booking/slots` per visible date.
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
| `core/server/publicBookingApi.ts` | Keep existing slots route as the V1 availability source; update only if slot-density query behavior changes. |
| `core/server/validation/bookingSchemas.ts` | Add strict schema for any new slot-density parameter; add summary-route schema only if the task is explicitly revised. |
| `core/server/routes/bookingRoutes.ts` | Add `mapBookingError` and route-registration coverage only if this leaf is revised to introduce a new public/internal availability route. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Add schema/render coverage for date picker and density mode fields. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add editor coverage for mode controls. |
| `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` | Create or extend this happy-dom runtime script suite with date navigation, date selection, and availability marker coverage. |
| `tests/unit/booking/bookingService.test.ts` | Add non-overlapping slot generation coverage. |
| `tests/unit/server/publicBookingApi.test.ts` | Add slot-density query coverage if public API behavior changes; add summary route coverage only if the task is revised to create that route. |

## Implementation Pseudocode

```ts
type BookingDatePickerMode = "native" | "week";
type BookingSlotIntervalMode = "fixed" | "service-duration" | "non-overlapping";

function resolveSlotStepMinutes(serviceDuration: number, configuredInterval: number, mode: BookingSlotIntervalMode) {
  if (mode === "fixed") return configuredInterval;
  if (mode === "service-duration") return serviceDuration;
  return Math.max(configuredInterval, serviceDuration);
}

function buildAvailabilityDates(anchorDate: string, mode: BookingDatePickerMode, range: DateRange) {
  const dates = mode === "week" ? currentWeek(anchorDate) : [anchorDate];
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
- If this task is later revised to add a new public summary route, reject
  unbounded ranges and unknown query parameters, and add route registration plus
  `mapBookingError` coverage before implementation.

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
- Create or extend
  `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`, then run
  `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`
- `bun test tests/unit/widgets/validator.test.ts` when widget schema/defaults
  change.
- `bun test tests/unit/booking/bookingService.test.ts`
- `bun test tests/unit/server/publicBookingApi.test.ts` if route/query behavior
  changes.
- Route registration and `mapBookingError` coverage if this leaf is revised to
  add a new availability route.
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
