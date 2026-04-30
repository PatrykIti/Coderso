# TASK-244-03-01: Custom Screen Widget Frame Surface Clear

# FileName: TASK-244-03-01_Custom_Screen_Widget_Frame_Surface_Clear.md

**Priority:** High
**Category:** Widgets + Custom Screens
**Estimated Effort:** Medium
**Dependencies:** TASK-244-03
**Status:** To Do

---

## Overview

Add clearable frame/surface style contracts to custom screen widgets:

- `screen-record-header`
- `screen-field-group`
- `screen-field-value`
- `screen-two-column`

These widgets currently hard-code frame backgrounds and, for record header card
variant, a gradient. Users can switch variants in some cases, but cannot keep
the layout and remove the visual surface.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/screenRecordHeader.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenFieldValue.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `tests/vitest/widgets/screenWidgets.test.tsx`
- relevant custom-screen UI tests if editor controls are added there
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- missing per-widget docs for screen widgets if added during closure

## Implementation Notes

Do not remove the screen-only surface restriction. These widgets remain scoped to
custom screen builder surfaces.

Add minimal style contracts such as:

```ts
type ScreenFrameStyle = {
  frameBackground?: string;
  frameGradient?: string;
  frameBorderColor?: string;
};
```

Only add fields that are required to clear current forced surfaces. Avoid a broad
screen design-system refactor.

## Implementation Pseudocode

```ts
const frameBackground = resolveClearableStyleValue(data.style?.frameBackground);
const frameGradient = resolveClearableStyleValue(data.style?.frameGradient);

const frameStyle = compactStyle({
  backgroundColor: frameBackground,
  backgroundImage: frameGradient,
  borderColor: resolveClearableStyleValue(data.style?.frameBorderColor),
});

const frameClassName = joinClasses(
  "rounded-3xl border p-6",
  data.style?.frameBackground || data.style?.frameGradient ? undefined : undefined
);
```

For the `screen-record-header` current card gradient, do not replace clear with a
variant switch. Add a real clearable background/gradient contract.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/screenWidgets.test.tsx`
- Add tests that prove:
  - existing default screen frames still render as before;
  - cleared frame background/gradient omits forced `bg-*`/`bg-gradient-*`
    classes or inline background styles;
  - editor `Clear` removes the relevant `style` keys.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- new docs for `screen-record-header`, `screen-field-group`, and
  `screen-field-value` if they remain undocumented
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Every custom screen widget frame surface can be cleared.
2. Clearing does not change widget variant or binding behavior.
3. Screen-only widget restrictions remain unchanged.
4. Runtime/editor tests cover cleared and default states.
