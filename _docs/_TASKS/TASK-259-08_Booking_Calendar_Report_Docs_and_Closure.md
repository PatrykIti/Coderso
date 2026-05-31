# TASK-259-08: Booking Calendar Report, Docs, and Closure

# FileName: TASK-259-08_Booking_Calendar_Report_Docs_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Documentation + Playwright QA + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-259-01, TASK-259-02, TASK-259-03, TASK-259-04, TASK-259-05, TASK-259-06, TASK-259-07
**Status:** Done (2026-05-18)

---

## Overview

Close the TASK-259 Booking Calendar-specific follow-up family with source-report
evidence, widget docs, task-board sync, changelog, and final validation.

This closure leaf must keep TASK-259 separate from TASK-258 and the concrete
shared/admin follow-up tasks opened for residual drift. Shared rows stay
attributed to TASK-296/TASK-297, Appointment Form rows stay attributed to
TASK-258, Booking admin workflow rows stay attributed to TASK-298, and only
Booking Calendar product-scope rows are marked fixed by TASK-259.

## Sub-Tasks

- [ ] Refresh `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` with
  fixed/deferred/excluded statuses for every source finding.
- [ ] Record the exact task owner for excluded rows:
  - TASK-296 for the shared Booking Calendar ARIA row;
  - TASK-297 for the shared Booking Calendar frame color-picker row;
  - TASK-258 for Appointment Form behavior affected by shared booking runtime
    script changes;
  - TASK-298 for Availability "Add row -> Save" workflow.
- [ ] Update `_docs/_WIDGETS/BOOKING_CALENDAR.md` with final data/editor/runtime
  behavior.
- [ ] Repair existing Booking Calendar widget-doc drift while updating the
  final contract: Wizard currently owns flow/copy/surface/interval basics,
  Visual owns status messages, Advanced owns defaults/diagnostics, and both
  `style.frameBackground` and `style.frameBorderColor` are clearable today.
- [ ] Update `_docs/WIDGET_PACK_MATRIX.md` only if final Booking Calendar
  behavior changes booking pack readiness.
- [ ] Update `_docs/_TASKS/README.md` statuses and statistics when the family
  moves to `Done`.
- [ ] Add a changelog entry in `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md`.
- [ ] Run final targeted validation and record skipped gates or blockers.

## Final Evidence Matrix

| Report finding group | Expected status | Evidence required |
|---|---|---|
| Admin preview catalog parity | Fixed by TASK-259-01 or deferred with reason | Admin preview hydration test and report evidence. |
| Date defaults/range/past-date safety | Fixed by TASK-259-02 or deferred with reason | Widget tests plus Bun public API/service tests. |
| Service context/summary formatting/timezone/empty state | Fixed by TASK-259-03 or deferred with reason | Widget render/editor/runtime summary locale/timezone tests and docs. |
| Loading/concurrency/clear selection | Fixed by TASK-259-04 or deferred with reason | Runtime script DOM tests and linked form smoke if event payload changed. |
| Visual calendar/availability/slot density | Fixed by TASK-259-05 or deferred with reason | Runtime script tests plus route/service tests for any API changes. |
| Layout variants/mobile/styling | Fixed by TASK-259-06 or deferred with reason | Widget/editor/schema tests and rendered evidence. |
| Default pickers/diagnostics | Fixed by TASK-259-07 or deferred with reason | Editor picker tests and diagnostics evidence. |
| Shared ARIA/color-picker rows | Excluded | Link to TASK-296 and TASK-297; do not mark fixed by TASK-259 or by a generic TASK-256 umbrella reference. |
| Booking admin Availability Add row UX | Excluded | Link to TASK-298 while it remains outside widget scope. |

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` | Add final TASK-259 evidence and routing notes. |
| `_docs/_WIDGETS/BOOKING_CALENDAR.md` | Final source-of-truth contract update. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if booking pack readiness changes. |
| `_docs/_TASKS/TASK-259*.md` | Move statuses and validation evidence to Done. |
| `_docs/_TASKS/README.md` | Move TASK-259 rows from To Do/In Progress to Done and update statistics. |
| `_docs/_CHANGELOG/*.md` | Add TASK-259 changelog entry. |
| `_docs/_CHANGELOG/README.md` | Index the TASK-259 changelog entry. |

## Implementation Pseudocode

```md
### TASK-259 Closeout Evidence

| Finding | Status | Owner | Evidence |
|---|---|---|---|
| Admin preview empty catalog | Fixed | TASK-259-01 | `bun run test:vitest -- ...` |
| Slot ARIA baseline | Excluded | TASK-296 | Shared-contract row, not TASK-259 scope |
```

Closure status flow:

```text
To Do -> In Progress on implementation start
In Progress -> Done only after docs, changelog, board, and validation are synced
```

Error handling:

- Do not mark a report finding fixed unless the code/test evidence exists or the
  row was verified as no longer reproducible.
- Do not mark a report finding excluded to shared/admin scope unless the
  closure evidence names the concrete physical follow-up task that owns it
  (`TASK-296`, `TASK-297`, `TASK-298`, or an explicit successor task).
- If a broad gate fails for unrelated reasons, isolate the targeted TASK-259
  suites and record the blocker before closure.
- If `_docs/_TASKS/README.md` has parallel-agent conflicts, resolve by
  preserving newer rows from both task families and recomputing statistics from
  live task statuses.

## Security Contract

This closure task adds no API routes.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must confirm validator coverage for any
  new widget/API fields added by implementation leaves.
- Anti-abuse: Playwright reports must not include secrets, local tokens,
  runtime slot tokens, private URLs, or committed PNG artifacts.
- Secret handling: no secrets in reports, docs, changelog, or task evidence.

## Testing Requirements

- `git diff --check`
- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- Create or extend
  `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`, then run
  `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`
  when runtime script leaves landed.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults changed.
- `bun test tests/unit/server/publicBookingApi.test.ts` when public slots route
  behavior changed.
- `bun test tests/unit/booking/bookingService.test.ts` when slot generation/date
  behavior changed.
- Route registration and `mapBookingError` coverage when public/internal booking
  route handlers or known booking error mappings changed.
- `bun run test:vitest -- tests/vitest/validation/bookingSchemas.test.ts` when
  route schemas changed. Extend this suite with
  `bookingPublicSlotQuerySchema` coverage before using it as public slot proof.
- Extend
  `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` with
  linked Appointment Form event-consumption assertions if the shared runtime
  selection payload changed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md`
- `_docs/_WIDGETS/BOOKING_CALENDAR.md`
- `_docs/WIDGET_PACK_MATRIX.md` only if readiness changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- A new `_docs/_CHANGELOG/*.md` entry

## Changelog Policy

- This leaf owns the final TASK-259 changelog entry unless an earlier leaf
  already created a changelog that explicitly lists all TASK-259 task IDs.

## Acceptance Criteria

- TASK-259 rows are Done only after validation and changelog evidence exists.
- The Booking Calendar report clearly separates TASK-259 fixes from shared/admin
  follow-up fixes and TASK-258 Appointment Form ownership, with concrete
  physical task IDs for excluded shared/admin rows.
- No PNG screenshots or temporary Playwright artifacts are committed.
- `_docs/_TASKS/README.md` statistics match the final visible task rows after
  resolving any parallel-agent board edits.
