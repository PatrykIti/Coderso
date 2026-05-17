# TASK-297: Shared Widget Color Picker Residual Controls

# FileName: TASK-297_Shared_Widget_Color_Picker_Residual_Controls.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Shared Controls
**Estimated Effort:** Large
**Dependencies:** TASK-256-02
**Status:** To Do

---

## Overview

Create the post-TASK-256 shared follow-up for generic widget style fields that
still expose raw text inputs where the product expects a color-picker-level
control.

The first actionable seed is Booking Calendar report row 3.14 in
`_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md`, where
`style.frameBackground` and `style.frameBorderColor` are still plain text
inputs. This remains shared editor-control work and must not be patched inside
TASK-259.

## Scope Boundary

This task does not own:

- widget-local style semantics such as selected-slot colors or layout variants,
  owned by TASK-259-06;
- shared accessibility/runtime semantics, owned by TASK-296;
- changes to clear semantics already landed under earlier frame-surface tasks.

## Sub-Tasks

- [ ] Decide the shared color-input contract for late widgets that still use
  `ClearableInputField` for color-like surface fields.
- [ ] Add the shared control plumbing needed for bounded color-picker UX
  without removing the existing token/custom-value escape hatch.
- [ ] Adopt the shared control in Booking Calendar frame fields as the first
  executable owner path.
- [ ] Add focused shared-control and Booking Calendar editor coverage.
- [ ] Refresh report/task/docs evidence so widget tasks can exclude this row to
  a concrete shared owner.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Add or extend the shared clearable color-input control used by late widget editors. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Adopt the shared color-picker control for frame fields without changing Booking Calendar-specific style semantics. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Add focused coverage for the shared color-picker behavior. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add Booking Calendar editor coverage for the shared frame color control. |
| `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` | Update shared-row ownership/evidence after implementation. |
| `_docs/_TASKS/README.md` | Keep board status/statistics synchronized when this task moves. |

## Implementation Pseudocode

```tsx
function ClearableColorField(props: {
  value?: string;
  onChange: (next: string) => void;
  onClear: () => void;
}) {
  return (
    <ClearableInputField
      {...props}
      inputMode="color-or-token"
      showColorPicker
      allowTokenFallback
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
- The shared control preserves clear/token/custom-value semantics while adding
  a bounded picker UX.
- Later widget-only closure tasks can point to TASK-297 as the concrete
  physical owner for this shared row.
