# TASK-244-03-01: Custom Screen Widget Frame Surface Clear

# FileName: TASK-244-03-01_Custom_Screen_Widget_Frame_Surface_Clear.md

**Priority:** High
**Category:** Widgets + Custom Screens
**Estimated Effort:** Medium
**Dependencies:** TASK-244-01-01, TASK-244-01-02, TASK-244-02-02
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
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`

No per-widget docs currently exist for `screen-record-header`,
`screen-field-group`, or `screen-field-value`. Document shared screen-widget
clear semantics in `_docs/WIDGETS.md`; create exact new docs only if
implementation introduces those pages.

## Implementation Notes

Do not remove the screen-only surface restriction. These widgets remain scoped to
custom screen builder surfaces.

This leaf extends existing screen widget contracts in place. The current screen
widget schemas use `additionalProperties: false`, for example
`screenRecordHeader.tsx:17-27`, `screenFieldGroup.tsx:25-51`,
`screenFieldValue.tsx:17-43`, and `screenTwoColumn.tsx:26-55`. Add any new
style fields to the owning widget data type, schema, defaults, normalizer,
renderer, `ScreenEditors.tsx`, tests, and docs. Do not create a second screen
editor panel or bypass strict widget validation.

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

Schema/normalizer pseudocode:

```ts
type ScreenRecordHeaderData = {
  /* existing fields */
  style?: ScreenFrameStyle;
};

const screenFrameStyleSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    frameBackground: { type: "string" },
    frameGradient: { type: "string" },
    frameBorderColor: { type: "string" },
  },
};

function normalizeScreenFrameStyle(style: ScreenFrameStyle | undefined) {
  return compactObject({
    frameBackground: resolveClearableStyleValue(style?.frameBackground),
    frameGradient: resolveClearableStyleValue(style?.frameGradient),
    frameBorderColor: resolveClearableStyleValue(style?.frameBorderColor),
  });
}
```

## Per-Widget Implementation Matrix

| Widget | Runtime field/output | Editor clear behavior | Regression proof |
|---|---|---|---|
| `screen-record-header` | compact/card surfaces and card gradient at `screenRecordHeader.tsx:88-89`; pill surface at `screenRecordHeader.tsx:107` | Add `Clear` in `ScreenEditors.tsx` for frame background/gradient; do not require variant switch | `screenWidgets.test.tsx` asserts cleared card frame omits `bg-gradient-*` and forced `bg-background/*` output |
| `screen-field-group` | subtle/default surfaces at `screenFieldGroup.tsx:79-80`; empty-group surface at `screenFieldGroup.tsx:105` | Add `Clear` for group surface style keys in `ScreenEditors.tsx` | Assert cleared group frame omits `bg-muted/20` and `bg-background/80` equivalents while children still bind |
| `screen-field-value` | inline/stacked surfaces at `screenFieldValue.tsx:80` and `screenFieldValue.tsx:99` | Add `Clear` for field value surface style keys in `ScreenEditors.tsx` | Assert cleared inline and stacked variants preserve bound value rendering |
| `screen-two-column` | two-column frame and empty area surfaces at `screenTwoColumn.tsx:93` and `screenTwoColumn.tsx:111` | Add `Clear` for column/drop-area surfaces in `ScreenEditors.tsx` | Assert cleared two-column frame preserves column layout and drop area affordance |

## Implementation Pseudocode

```ts
const frameBackground = resolveClearableStyleValue(data.style?.frameBackground);
const frameGradient = resolveClearableStyleValue(data.style?.frameGradient);

const frameStyle = compactStyle({
  backgroundColor: frameBackground,
  backgroundImage: frameGradient,
  borderColor: resolveClearableStyleValue(data.style?.frameBorderColor),
});

const useLegacyDefaultFrameSurface = shouldUseLegacyDefaultFrameSurface(data);
const frameClassName = joinClasses(
  "rounded-3xl border p-6",
  useLegacyDefaultFrameSurface ? "bg-gradient-to-br from-background via-background to-muted/30" : undefined
);
```

`shouldUseLegacyDefaultFrameSurface` is a placeholder for the field-specific
compatibility decision from TASK-244-01-02. Do not make absence mean both
"cleared" and "default" in the same normalized payload.

For the `screen-record-header` current card gradient, do not replace clear with a
variant switch. Add a real clearable background/gradient contract.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/screenWidgets.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- Add tests that prove:
  - existing default screen frames still render as before;
  - new `style` fields pass widget schema validation and unknown `style` keys
    are still rejected;
  - normalizers preserve cleared/absent style fields according to
    TASK-244-01-02 instead of re-materializing cleared defaults;
  - cleared frame background/gradient omits forced `bg-*`/`bg-gradient-*`
    classes or inline background styles;
  - editor `Clear` removes the relevant `style` keys.
  - clear does not serialize `"transparent"` or empty strings as off-state
    payloads.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- new exact docs for `screen-record-header`, `screen-field-group`, and
  `screen-field-value` only if implementation creates those pages; otherwise
  keep their shared screen-widget clear semantics in `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Every custom screen widget frame surface can be cleared.
2. Clearing does not change widget variant or binding behavior.
3. Screen-only widget restrictions remain unchanged.
4. Runtime/editor tests cover cleared and default states.
5. Clear removes style keys instead of writing transparent sentinels.
