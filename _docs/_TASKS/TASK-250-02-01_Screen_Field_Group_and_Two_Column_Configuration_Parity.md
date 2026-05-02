# TASK-250-02-01: `screen-field-group` and `screen-two-column` Configuration Parity
# FileName: TASK-250-02-01_Screen_Field_Group_and_Two_Column_Configuration_Parity.md

**Priority:** High
**Category:** Coderso Custom Screens + Layout Widget UX
**Estimated Effort:** Medium
**Dependencies:** TASK-250-02
**Status:** To Do

---

## Overview

Close the most obvious configuration-surface gap between screen layout widgets
and mature public widgets by expanding the editor affordances for
`screen-field-group` and `screen-two-column`.

Any newly added layout chrome controls must preserve the repo standard that
non-essential colors, borders, and similar styles can be removed through
`none` / `clear` instead of being locked in once configured.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/ScreenEditors.tsx`
- `core/widgets/core/screenFieldGroup.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `tests/vitest/ui/screen-widgets-editor-wave.test.tsx`
- `tests/vitest/widgets/screenLayoutEditors.test.tsx`

## Implementation Pseudocode

```tsx
function ScreenTwoColumnVisualEditor(props) {
  // 1. choose variant (`balanced` / `aside`)
  // 2. configure gap through token-friendly controls
  // 3. configure left/right labels and column chrome
  // 4. explain slot intent so the user knows what belongs in each column
}
```

```tsx
function ScreenFieldGroupVisualEditor(props) {
  // 1. edit group label/description
  // 2. configure panel chrome and any density/spacing controls
  // 3. explain the slot intent for grouped screen fields
}
```

```ts
function updateScreenTwoColumnData(input: {
  current: ScreenTwoColumnData;
  patch: Partial<ScreenTwoColumnData>;
}) {
  return normalizeScreenTwoColumnData({
    ...input.current,
    ...input.patch,
  });
}
```

```ts
function updateScreenFieldGroupData(input: {
  current: ScreenFieldGroupData;
  patch: Partial<ScreenFieldGroupData>;
}) {
  return normalizeScreenFieldGroupData({
    ...input.current,
    ...input.patch,
  });
}
```

```ts
const regressionMatrix = [
  {
    widget: "screen-two-column",
    assertions: [
      "variant switch updates visual state",
      "gap control persists normalized token",
      "column chrome supports none/clear",
      "slot guidance remains visible",
    ],
  },
  {
    widget: "screen-field-group",
    assertions: [
      "title/description persist normalized values",
      "panel chrome supports none/clear",
      "slot guidance remains visible",
    ],
  },
];
```

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC: screen widget configuration writes require `content:write`.
- CSRF: unchanged current screen-save path.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: new controls must remain inside the existing widget
  schema or an explicitly extended schema owned by the widget module.
- Style-removal rule:
  - new layout surface controls must support `none` / `clear` where removing the
    style is a meaningful product action.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - group/two-column editors cover more than style-clear regressions,
  - gap, variant, and layout-oriented controls are asserted,
  - runtime widgets remain valid through shared schema normalization,
  - any new chrome controls are covered for `none` / `clear` behavior,
  - the regression matrix above is represented in concrete editor tests rather
    than left implicit.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. `screen-field-group` and `screen-two-column` stop feeling like thin MVP
   editors.
2. Their editor surface becomes materially closer to other mature shared
   widgets.
3. Added style/chrome controls can be removed cleanly with `none` / `clear`.
4. The implementer can follow explicit helper/data-flow/test expectations
   without rediscovering the layout widget strategy during coding.
