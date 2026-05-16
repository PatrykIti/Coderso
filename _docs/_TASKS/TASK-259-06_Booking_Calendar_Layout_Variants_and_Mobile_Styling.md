# TASK-259-06: Booking Calendar Layout Variants and Mobile Styling

# FileName: TASK-259-06_Booking_Calendar_Layout_Variants_and_Mobile_Styling.md

**Priority:** Medium
**Category:** Widgets + Booking + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-259-03, TASK-259-04, TASK-259
**Status:** To Do

---

## Overview

Add Booking Calendar layout variants and widget-owned visual styling for selected
slot state and mobile control density.

`REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.7, 3.13, and 3.16 show that the
widget has only the `default` variant, selected/hover slot colors are hardcoded,
and mobile control layout stacks four controls vertically before slot results.

## Scope Boundary

This leaf does not own:

- generic frame background/border color-picker behavior from TASK-256-02 only
  after TASK-256-07/TASK-256-08 names a concrete Booking Calendar owner/test
  path;
- visual calendar availability UI from TASK-259-05;
- shared widget mode atomic update behavior from TASK-256-01.

## Sub-Tasks

- [ ] Add Booking Calendar variants such as `default`, `compact`, `inline`, and
  `horizontal` only after verifying they map to real runtime layout classes.
- [ ] If the widget owns variant selection in Visual mode, set
  `editorCapabilities.visualOwnsVariantSelection = true` and avoid duplicated
  generic variant controls.
- [ ] Add selected-slot and hover style fields, for example
  `style.selectedSlotBackground`, `style.selectedSlotBorderColor`, and
  `style.slotHoverBorderColor`, normalized through existing clearable style
  helpers.
- [ ] Improve mobile controls to avoid a long one-column form when space allows,
  without breaking narrow screens.
- [ ] Keep variants beginner-friendly: do not expose raw class names or
  arbitrary layout fragments.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/bookingCalendar.tsx` | Add variant ids, variant class maps, selected/hover style fields, schema/defaults/normalizer, and mobile layout classes. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Add Visual variant controls and selected-slot style controls; do not duplicate shared frame color-picker work. |
| `core/widgets/core/index.ts` | Update editor capability only if Booking Calendar owns Visual variant selection. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Add variant render and style clear coverage. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add editor coverage for variant and selected-slot style controls. |
| `tests/unit/widgets/validator.test.ts` | Run/update when schema/defaults change. |

## Implementation Pseudocode

```ts
export type BookingCalendarVariantId = "default" | "compact" | "inline" | "horizontal";

const variantClassMap: Record<BookingCalendarVariantId, string> = {
  default: "space-y-4 rounded-xl border p-5",
  compact: "space-y-3 rounded-lg border p-3",
  inline: "space-y-4 border-0 p-0",
  horizontal: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]",
};

function resolveBookingCalendarVariant(value: string | undefined): BookingCalendarVariantId {
  return value && value in variantClassMap ? (value as BookingCalendarVariantId) : "default";
}
```

Style flow:

```ts
const slotStyleVars = compactStyle({
  "--booking-slot-selected-bg": resolveClearableStyleValue(style.selectedSlotBackground),
  "--booking-slot-selected-border": resolveClearableStyleValue(style.selectedSlotBorderColor),
  "--booking-slot-hover-border": resolveClearableStyleValue(style.slotHoverBorderColor),
});
```

Error handling:

- Unknown variant ids normalize to `default` for backward compatibility.
- Cleared selected/hover style fields omit inline CSS variables instead of
  serializing `transparent` or empty strings.
- Mobile layout classes must not hide labels or controls at narrow widths.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must reject unknown variant/style fields.
- Anti-abuse: do not accept arbitrary class names, inline event handlers, or
  scriptable style content.
- Secret handling: no secrets or private diagnostics in style fields or variant
  metadata.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.7,
  3.13, and 3.16 after validation.
- Update `_docs/_WIDGETS/BOOKING_CALENDAR.md` with variants, mobile behavior,
  and selected-slot style fields.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if these variants change booking
  pack readiness.

## Changelog Policy

- Covered by the TASK-259 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Booking Calendar exposes real, tested layout variants instead of only
  `default`.
- Mobile layout is shorter and remains usable at narrow widths.
- Selected-slot and hover styles are widget-owned, clearable, and schema-tested.
- Shared frame/background color-picker work remains outside this leaf.
