# TASK-259-04: Booking Calendar Loading, Concurrency, and Selection UX

# FileName: TASK-259-04_Booking_Calendar_Loading_Concurrency_and_Selection_UX.md

**Priority:** High
**Category:** Widgets + Booking + Runtime Script + UX
**Estimated Effort:** Large
**Dependencies:** TASK-259-02, TASK-259-03, TASK-259
**Status:** Done (2026-05-18)

---

## Overview

Improve the Booking Calendar runtime interaction loop: visible loading state,
disabled refresh while loading, request cancellation, skeleton/loading surface,
and clear selected slot.

`REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.5, 3.6, 3.17, 3.18, and 5.2 show
that the refresh button does not indicate loading, multiple rapid refresh clicks
start parallel fetches, loading is text-only, and selected slots cannot be
cleared.

## Scope Boundary

This leaf does not own:

- generic ARIA baseline now routed to TASK-296; this leaf may still add
  accessible labels for newly introduced Booking Calendar controls;
- visual calendar day availability and slot-count prefetching from TASK-259-05;
- Appointment Form submit/reset behavior from TASK-258, except for the shared
  selection event staying backward compatible.

## Sub-Tasks

- [ ] Add renderer markers for refresh loading label, skeleton container, and a
  clear-selection button.
- [ ] Update `bookingRuntimeScript.ts` to track one active slots request per
  calendar root using `AbortController`.
- [ ] Disable or mark the refresh button busy while a request is active.
- [ ] Ignore stale responses after a newer request starts.
- [ ] Render a small skeleton/placeholder state while slots are loading without
  causing layout jump.
- [ ] Add clear selection behavior that clears
  `window.__nextlessBookingRuntimeState.selections[flowId]`, resets selected
  slot styles, updates selected summary, and dispatches the existing
  `nextless:booking-slot-selected` event with `selection: null`.
- [ ] Preserve the current selection when refreshing the same date if the slot
  still exists; otherwise clear it with explicit copy.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/bookingCalendar.tsx` | Add clear button, loading/skeleton markers, optional copy fields, and stable data attributes. |
| `core/widgets/core/bookingRuntimeScript.ts` | Add request cancellation, busy state, skeleton rendering, stale-response guard, and clear-selection flow. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Add copy controls only if clear/loading labels become widget-owned fields. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Add marker/render coverage for loading and clear-selection controls. |
| `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` | New runtime script DOM tests for refresh busy state, abort/stale response, selection preservation, and clear event payload. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add editor coverage for new copy fields if added. |
| `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` | Extend linked Appointment Form runtime-event assertions if null-selection handling changes the shared selection payload. |

## Implementation Pseudocode

```ts
const activeRequests = new WeakMap<HTMLElement, AbortController>();

async function loadSlots(root) {
  const previous = activeRequests.get(root);
  previous?.abort();

  const controller = new AbortController();
  activeRequests.set(root, controller);
  setLoadingState(root, true);

  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (activeRequests.get(root) !== controller) return;
    renderSlots(payload.items);
  } catch (error) {
    if (error?.name === "AbortError") return;
    renderError();
  } finally {
    if (activeRequests.get(root) === controller) {
      activeRequests.delete(root);
      setLoadingState(root, false);
    }
  }
}

function clearSelection(flowId) {
  setSelection(flowId, null);
  renderSelectedSummary(null);
  renderSlots(lastRenderedItems);
}
```

Error handling:

- Abort errors are not user-visible errors.
- Network or JSON errors keep the current machine-readable error behavior and
  render configured user-facing error copy.
- Stale responses from older requests must not overwrite the latest slot list.
- Clear selection must be idempotent when no slot is selected.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: no schema change unless new copy/style fields are
  added; new fields must be schema-owned.
- Anti-abuse: request cancellation reduces duplicate slot requests but does not
  replace server-side rate limiting.
- Secret handling: do not log slot tokens, runtime tokens, request URLs with
  tokens, or private diagnostics to the DOM/report.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- Create or extend
  `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`, then run
  `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  if copy/schema fields change.
- Extend
  `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` with
  linked Appointment Form event-consumption assertions if null-selection
  behavior changes the shared selection payload.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.5,
  3.6, 3.17, 3.18, and 5.2 after validation.
- Update `_docs/_WIDGETS/BOOKING_CALENDAR.md` with loading, clear selection, and
  request behavior.

## Changelog Policy

- Covered by the TASK-259 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Refresh cannot start uncontrolled parallel slot fetches for the same calendar
  root.
- Refresh button and slot area show deterministic loading state.
- Clearing a selected slot updates the calendar, global runtime state, and any
  linked Appointment Form through the existing event contract.
- Stale slot responses cannot overwrite newer results.
