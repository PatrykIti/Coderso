# TASK-298: Booking Admin Availability Row Draft and Save UX

# FileName: TASK-298_Booking_Admin_Availability_Row_Draft_and_Save_UX.md

**Priority:** Medium
**Category:** Booking + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-259
**Status:** Done (2026-05-19)

---

## Overview

Own the Booking admin Availability-tab UX from
`_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` section 7.4.

Today the draft row form and the persisted schedule table share the same panel,
and clicking `Save schedules` without first clicking `Add row` silently saves
nothing. This is a Booking admin workflow problem, not Booking Calendar widget
scope, so TASK-259 excludes it to this physical follow-up.

## Scope Boundary

This task does not own:

- Booking Calendar widget editor/runtime behavior, owned by TASK-259;
- public booking slot API/date-policy/runtime semantics;
- shared widget control or ARIA follow-ups owned by TASK-296/TASK-297.

## Sub-Tasks

- [x] Make the draft schedule row state visually distinct from saved schedule
  rows.
- [x] Add guidance or validation so `Save schedules` cannot silently noop when
  the user has an unsaved draft row.
- [x] Decide whether `Save schedules` should auto-commit the current draft row,
  block with inline guidance, or both; document the chosen contract.
- [x] Add focused Booking admin tests for the updated Availability-tab flow.
- [x] Refresh report/task/docs evidence so TASK-259 closure can point to this
  concrete admin owner.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/booking/BookingPage.tsx` | Own draft/save state handling for Availability-tab schedule rows. |
| `core/admin/ui/booking/components/AvailabilityTab.tsx` | Make draft-vs-saved row UX explicit and expose the chosen save guidance. |
| `tests/vitest/ui/booking-page.test.tsx` | Add BookingPage flow coverage for the draft/save UX. |
| `tests/vitest/ui/booking-tabs-interactions-wave.test.tsx` | Add focused Availability-tab interaction coverage if the component contract changes. |
| `tests/vitest/ui/booking-tabs-leaf.test.tsx` | Update leaf render coverage when empty/save guidance changes. |
| `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` | Update the out-of-scope admin-row ownership note after implementation. |
| `_docs/_TASKS/README.md` | Keep board status/statistics synchronized when this task moves. |

## Implementation Pseudocode

```tsx
function handleSaveSchedules() {
  if (draftRowIsDirty(scheduleDraft) && !draftAlreadyCommitted(scheduleDraft, scheduleRows)) {
    setInlineWarning("Add the draft row before saving schedules.");
    return;
  }

  return persistScheduleRows(scheduleRows);
}
```

Error handling:

- Dirty-draft guidance must not erase the current draft inputs.
- Saving with zero persisted rows should remain explicit rather than looking
  like a silent success.
- Keep schedule validation errors separate from save-flow guidance.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/booking-page.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-tabs-interactions-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-tabs-leaf.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the task is completed

## Acceptance Criteria

- Availability-tab users can tell the difference between a draft row and saved
  rows.
- `Save schedules` no longer silently succeeds while ignoring an unsaved draft
  row.
- TASK-259 closure can point to TASK-298 as the concrete out-of-widget owner
  for report section 7.4.
