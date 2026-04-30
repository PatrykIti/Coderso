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
- `core/services/customScreens/customScreenSchemas.ts` only if schema
  persistence behavior must change; otherwise keep it as explicit validation
  proof that new screen widget payloads survive the existing normalizer
- `tests/vitest/widgets/screenWidgets.test.tsx`
- `tests/vitest/ui/screen-widgets-editor-wave.test.tsx` (create if missing)
- `tests/vitest/admin/custom-screen-schemas.test.ts`
- `tests/vitest/ui/custom-screen-binding-panel.test.tsx` only if binding panel
  behavior changes
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`

No per-widget docs currently exist for `screen-record-header`,
`screen-field-group`, or `screen-field-value`. Document shared screen-widget
clear semantics in `_docs/WIDGETS.md`; create exact new docs only if
implementation introduces those pages.

## Implementation Notes

Do not remove the screen-only surface restriction. These widgets remain scoped to
custom screen builder surfaces.

Custom screen persistence must stay on the existing service schema path,
`core/services/customScreens/customScreenSchemas.ts`:
`normalizeCustomScreenBlocks()` calls `normalizeWidgetBlocks()` after
registering runtime widgets. New screen widget `style` fields must pass through
that path without adding a custom-screen-only schema bypass, and cleared style
keys must remain absent after normalization. Cover this in
`tests/vitest/admin/custom-screen-schemas.test.ts` in addition to runtime and
editor-wave tests.

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

Default and compatibility policy:

- Use **creation default only** for newly added screen frame style fields:
  defaults for new blocks should live in the widget defaults / inserted block
  payload, not in a renderer-only forced class.
- Preserve old saved screen widgets through the existing shallow default merge.
  If implementation finds legacy data that still omits the new `style` object
  after defaults are applied, add a local widget normalizer adapter and cover it
  with compatibility tests.
- When clearing the last field in `style`, persist `style: {}` as the explicit
  clear override for shallow-merge defaults. Do not collapse it to `undefined`
  if that would make the renderer treat the block like an old defaulted payload.

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
| `screen-field-group` | subtle/default frame surfaces at `screenFieldGroup.tsx:79-80`; empty-group placeholder at `screenFieldGroup.tsx:105` remains an intentional builder state unless product explicitly makes placeholder styling configurable | Add `Clear` for group frame surface style keys in `ScreenEditors.tsx` | Assert cleared group frame omits `bg-muted/20` and `bg-background/80` equivalents while children still bind; do not remove empty placeholder affordance as a side effect |
| `screen-field-value` | inline/stacked surfaces at `screenFieldValue.tsx:80` and `screenFieldValue.tsx:99` | Add `Clear` for field value surface style keys in `ScreenEditors.tsx` | Assert cleared inline and stacked variants preserve bound value rendering |
| `screen-two-column` | two-column frame at `screenTwoColumn.tsx:93`; empty drop-area placeholder at `screenTwoColumn.tsx:111` remains an intentional builder state unless product explicitly makes placeholder styling configurable | Add `Clear` for column/frame surfaces in `ScreenEditors.tsx` | Assert cleared two-column frame preserves column layout and drop area affordance |

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

`shouldUseLegacyDefaultFrameSurface` must be implemented only for a concrete
legacy-adapter case proven by the field audit above. The default path is the
creation-default-only policy with `style: {}` as the clear override. Do not make
absence mean both "cleared" and "default" in the same normalized payload.

For the `screen-record-header` current card gradient, do not replace clear with a
variant switch. Add a real clearable background/gradient contract.

## Security Contract

- Visibility:
  - custom screen widget editor controls are internal admin UI;
  - custom screen widget render output remains public/runtime screen output where
    custom screens are rendered.
- Auth model:
  - no new endpoint is introduced;
  - edits persist through the existing authenticated custom-screen/page save flow.
- RBAC:
  - unchanged existing custom-screen and page/template write permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - new screen widget `style` fields must stay in the owning widget schemas with
    unknown keys rejected.
- Anti-abuse:
  - no public write surface is added;
  - frame background/gradient values must render through validated fields and
    inline styles, not dynamic class-name interpolation.
- Compatibility:
  - screen-only widget restrictions and binding behavior must not be loosened by
    clear support.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/screenWidgets.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/screen-widgets-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/custom-screen-schemas.test.ts`
- `bun run test:vitest -- tests/vitest/ui/custom-screen-binding-panel.test.tsx`
  only if implementation changes binding panel behavior
- Add tests that prove:
  - existing default screen frames still render as before;
  - new `style` fields pass widget schema validation and unknown `style` keys
    are still rejected;
  - custom-screen schema normalization accepts configured screen style fields,
    preserves cleared omission, and rejects unknown screen style keys through
    `normalizeCustomScreenBlocks()`;
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
4. Runtime, editor, and custom-screen schema tests cover cleared and default
   states.
5. Clear removes style keys instead of writing transparent sentinels.
