# TASK-296: Shared Interactive Widget Accessibility Residuals

# FileName: TASK-296_Shared_Interactive_Widget_Accessibility_Residuals.md

**Priority:** High
**Category:** Widgets + Accessibility + Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-256-08
**Status:** To Do

---

## Overview

Create the post-TASK-256 shared follow-up for interactive widget accessibility
rows that were classified but never received a concrete physical owner.

The first actionable seed is Booking Calendar report rows 3.12 and 5.6 in
`_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md`: missing live-region
status updates, slot-list semantics, selected-state semantics, and region
labels. This task exists so widget-owned TASK-259 work can stay focused on
Booking Calendar product scope instead of quietly absorbing a new shared drift.

## Scope Boundary

This task does not own:

- Booking Calendar product fields such as price, timezone copy, date policy,
  calendar layout, or slot-density behavior, owned by TASK-259;
- Appointment Form product/runtime submission behavior, owned by TASK-258;
- generic color-picker/editor token controls, owned by TASK-297.

## Sub-Tasks

- [ ] Define the shared late-report accessibility contract for interactive
  widgets that still lack a concrete TASK-256 owner.
- [ ] Repair Booking Calendar status live-region semantics without weakening the
  existing runtime-script scoping contract.
- [ ] Add list/selected-state semantics for Booking Calendar slot results and
  labels for the calendar region.
- [ ] Decide whether any helper extracted from Booking Calendar is truly shared;
  if not, keep the implementation narrow but close it as shared follow-up scope.
- [ ] Refresh report/task/docs evidence so later widget closure tasks can point
  at this physical owner instead of stale TASK-256 references.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/bookingCalendar.tsx` | Add shared accessibility markers such as live-region, list semantics, selected-state, and region labels where the widget surface currently lacks them. |
| `core/widgets/core/bookingRuntimeScript.ts` | Keep slot button state and runtime updates synchronized with the shared accessibility contract. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Add render coverage for the accessibility markers owned by this task. |
| `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` | Add DOM/runtime assertions for selected-state and live-region updates. |
| `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` | Update shared-row ownership/evidence after implementation. |
| `_docs/_WIDGETS/BOOKING_CALENDAR.md` | Update source-of-truth accessibility notes only for the shared contract rows touched here. |
| `_docs/_TASKS/README.md` | Keep board status/statistics synchronized when this task moves. |

## Implementation Pseudocode

```ts
function applyInteractiveA11y(root: HTMLElement) {
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Booking calendar");

  statusNode.setAttribute("aria-live", "polite");
  slotsNode.setAttribute("role", "list");
  slotsNode.setAttribute("aria-label", "Available time slots");
}

function renderSlotButton(slot, selection) {
  button.setAttribute("aria-pressed", isSelected(slot, selection) ? "true" : "false");
}
```

Error handling:

- Keep accessibility labels deterministic and text-only.
- Do not break the scoped runtime-instance behavior already owned by
  `TASK-256-04`.
- If a shared helper would widen the scope beyond Booking Calendar, split the
  extra work into a new physical task instead of hiding it inside this one.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md`
- `_docs/_WIDGETS/BOOKING_CALENDAR.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the task is completed

## Acceptance Criteria

- Booking Calendar no longer relies on stale TASK-256 references for the shared
  ARIA/report rows this task owns.
- Status updates, slot list semantics, selected-state semantics, and region
  labels are covered by focused widget/runtime tests.
- Later widget-only closure tasks can point to TASK-296 as the concrete
  physical owner for these shared rows.
