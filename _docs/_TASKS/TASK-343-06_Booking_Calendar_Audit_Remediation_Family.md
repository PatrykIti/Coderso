# TASK-343-06: Booking Calendar Audit Remediation Family

# FileName: TASK-343-06_Booking_Calendar_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Booking Calendar + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Close the remaining Booking Calendar truthfulness drift around partial surface
clear behavior and misleading Advanced booking-flow matching.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_BOOKING_CALENDAR_WIDGET.md:214-219`
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx:338-352,417-468`
- `core/widgets/core/bookingCalendar.tsx:498-502,658-666`

## Sub-Tasks

- [ ] Make partial Surface clear return to a truthful legacy fallback state or
  explicitly present the new mixed-style semantics.
- [ ] Prevent Advanced from implying a self-match for booking flow selection.
- [ ] Add regression coverage for both the clear path and flow-summary logic.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/core/bookingCalendar.tsx` | Reconcile legacy fallback classes with partially cleared surface styles. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Keep flow summary truthful and aligned with the same filtering logic as Wizard. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Cover surface clear and flow-summary runtime semantics. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Cover Advanced flow-summary truthfulness. |

## Implementation Pseudocode

```ts
function hasAnySurfaceOverride(style: BookingCalendarStyle): boolean {
  return Boolean(style.frameBackground || style.frameBorderColor || style.selectedSlotBackground);
}

function resolveBookingFlowSummary(context: EditorContext, calendars: CalendarSummary[]) {
  return calendars.filter((calendar) => calendar.blockId !== context.blockId);
}
```

## Regression Test Shape

- Clearing one surface field no longer leaves an in-between misleading visual
  state without explanation.
- Advanced flow summary never treats the current block as its own match.

## Security Contract

No API routes are added.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_BOOKING_CALENDAR_WIDGET.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Surface clear behavior is truthful and visually consistent.
- Advanced no longer implies a self-matched booking flow.

