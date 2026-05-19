# TASK-297: Shared Widget Color Picker Residual Controls

# FileName: TASK-297_Shared_Widget_Color_Picker_Residual_Controls.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Shared Controls
**Estimated Effort:** Large
**Dependencies:** TASK-305
**Status:** To Do

---

## Overview

Use the already-landed shared color-control owner to close the remaining
Booking Calendar frame-color row without reopening shared helper ownership.

The first actionable seed is Booking Calendar report row 3.14 in
`_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md`, where
`style.frameBackground` and `style.frameBorderColor` are still plain text
inputs. The shared swatch-plus-text owner now already exists under `TASK-305`,
and the broader remaining adopter wave is tracked separately under `TASK-310`.
This task is therefore the Booking Calendar-specific adoption leaf for that
already-landed seam, and must not be patched inside TASK-259.

## Scope Boundary

This task does not own:

- the shared helper contract itself, which remains owned by `TASK-305` and the
  broader remaining-adopter cleanup in `TASK-310`;
- widget-local style semantics such as selected-slot colors or layout variants,
  owned by TASK-259-06;
- shared accessibility/runtime semantics, owned by TASK-296;
- changes to clear semantics already landed under earlier frame-surface tasks.

## Sub-Tasks

- [ ] Reuse the landed shared color-input contract for late widgets that still
  use `ClearableInputField` for color-like surface fields, starting with
  Booking Calendar.
- [ ] Extend the current shared owner only if Booking Calendar frame fields
  need a small additive adapter, not a second control contract.
- [ ] Adopt the shared control in Booking Calendar frame fields as the first
  executable owner path.
- [ ] Add focused shared-control and Booking Calendar editor coverage.
- [ ] Refresh report/task/docs evidence so widget tasks can exclude this row to
  a concrete shared owner.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Reuse the landed swatch-plus-text owner for Booking Calendar frame fields; touch only if the current API needs a small additive extension already consistent with `TASK-305` / `TASK-310`. |
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Touch only if Booking Calendar adoption needs an additive helper that belongs in the shared owner seam. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Adopt the shared color-picker control for frame fields without changing Booking Calendar-specific style semantics. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Add focused coverage only if Booking Calendar adoption extends the shared helper surface. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add Booking Calendar editor coverage for the shared frame color control. |
| `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` | Update shared-row ownership/evidence after implementation. |
| `_docs/_TASKS/README.md` | Keep board status/statistics synchronized when this task moves. |

## Implementation Pseudocode

```tsx
function BookingFrameColorField(props: {
  label: string;
  value?: string;
  onChange: (next: string) => void;
  onClear: () => void;
}) {
  return (
    <SharedColorControl
      label={props.label}
      value={props.value}
      onChange={props.onChange}
      onClear={props.onClear}
      placeholder="var(--color-bg)"
      pickerFallback="#ffffff"
    />
  );
}
```

Error handling:

- Keep token/custom CSS-value fallback explicit; do not trap editors in
  hex-only input.
- Do not widen the control into arbitrary class-name or unsafe style input.
- If more widgets need adoption after Booking Calendar, add them through
  explicit owner rows instead of silent opportunistic changes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the task is completed

## Acceptance Criteria

- Booking Calendar no longer relies on stale TASK-256 references for the shared
  color-picker row this task owns.
- Booking Calendar reuses the landed shared control instead of reopening shared
  color-input design from scratch, while the broader remaining adopter wave
  stays routed to `TASK-310`.
- The shared control preserves clear/token/custom-value semantics while adding
  a bounded picker UX.
- Later widget-only closure tasks can point to TASK-297 as the concrete
  physical owner for this shared row.
