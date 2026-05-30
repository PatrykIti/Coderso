# TASK-343-06: Booking Calendar Audit Remediation Family

# FileName: TASK-343-06_Booking_Calendar_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Booking Calendar + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Close the remaining Booking Calendar truthfulness drift around partial surface
clear behavior and misleading Advanced booking-flow matching.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_BOOKING_CALENDAR_WIDGET.md:214-219`
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx:338-352,417-468`
- `core/widgets/core/bookingCalendar.tsx:498-502,658-666`

## Sub-Tasks

- [x] Make partial Surface clear return to a truthful legacy fallback state or
  explicitly present the new mixed-style semantics.
- [x] Prevent Advanced from implying a self-match for booking flow selection.
- [x] Add regression coverage for both the clear path and flow-summary logic.

## Completion Notes

- Booking Calendar frame background and frame border now fall back independently
  to legacy theme classes when the corresponding Surface field is cleared.
- Selected-slot and hover swatches remain saved as root CSS variables without
  suppressing cleared frame fallback classes.
- Advanced booking-flow diagnostics now reuse the same peer-calendar filtering
  as Wizard, so the current block is never shown as its own match.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/core/bookingCalendar.tsx` | Reconcile legacy fallback classes with partially cleared surface styles. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Keep flow summary truthful and aligned with the same filtering logic as Wizard. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Cover legacy class and surface-style render semantics. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Cover Advanced flow-summary truthfulness. |

## Implementation Pseudocode

```ts
const frameBackground = resolveClearableStyleValue(style.frameBackground);
const frameBorderColor = resolveClearableStyleValue(style.frameBorderColor);
const legacyFrameBackgroundClass = frameBackground === undefined ? "bg-[var(--color-bg)]/95" : "";
const legacyFrameBorderClass =
  frameBorderColor === undefined ? "border-[var(--color-border)]" : "";

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

## Validation Evidence

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `git diff --cached --check`
- `bun scripts/playwright-widget-contract-smoke.ts --widget booking-calendar --session task-343-06-booking-calendar-rerun2 --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-06-booking-calendar-smoke-rerun2.json --output-md .tmp/task-343-06-booking-calendar-smoke-rerun2.md`

The first strict smoke attempt reached the public fixture but failed admin auth
because credentials were not exported into the process. The authenticated rerun
hung in the known first-helper-start admin probe. After restarting
`coderso-dev-core-host`, rerun2 passed with `adminFailures=0`,
`publicFailures=0`, `fixtureGaps=0`, and `metadataGaps=0`.
