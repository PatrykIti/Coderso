# TASK-242-02-01: Flow Layout and Container Widget None Tokens

# FileName: TASK-242-02-01_Flow_Layout_and_Container_Widget_None_Tokens.md

**Priority:** High
**Category:** Layout Widgets + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-242-02
**Status:** To Do

---

## Overview

Add or alias `none` for layout primitives and shell/container widgets where the
current configuration forces spacing, padding, or radius.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/stack.tsx`
- `core/widgets/core/splitLayout.tsx`
- `core/widgets/core/divider.tsx`
- `core/widgets/core/spacer.tsx`
- `core/widgets/core/gridColumns.tsx`
- `core/widgets/core/screenTwoColumn.tsx`
- `core/widgets/core/hero.tsx`
- `core/widgets/core/navigation.tsx`
- `core/widgets/core/footer.tsx`
- runtime widget tests under `tests/vitest/widgets/`
- existing `tests/unit/widgets/` suites only if a touched surface already lives
  there
- editor files and editor-wave tests are owned by TASK-242-03-01, except for
  minimal editor label/test fixes required when an exported runtime token array
  is already imported directly by the editor.

## Required Changes

| Widget | Fields | Render behavior |
|---|---|---|
| `stack` | responsive `gap.desktop/tablet/mobile` | `none` and legacy `"0"` render zero gap |
| `splitLayout` | `gap` | `none` and legacy `"0"` render `gap-0` |
| `divider` | `marginTop`, `marginBottom` | `none` and legacy `"0"` render `0rem` |
| `spacer` | responsive `height.desktop/tablet/mobile` | `none` and legacy `"0"` render `0rem` |
| `gridColumns` | `gapX`, `gapY`, `columnPadding` | `none` renders `gap-x-0`, `gap-y-0`, or `p-0` |
| `screenTwoColumn` | `gap` | `none` renders zero grid/flex gap |
| `hero` | `borderRadius`, `mediaRadius` | `none` removes rounded classes |
| `navigation` | `paddingY`, `itemGap` | `none` renders zero vertical padding/gap |
| `footer` | `columnGap`, `sectionPaddingY` | `none` renders zero gap/padding |

## Ownership Boundaries

- This leaf owns runtime/schema/type/normalizer/render changes for layout-facing
  spacing, gap, padding, and radius tokens only.
- `TASK-242-03-02` owns typography, max-width/content-width, logo height, input
  size, and button size runtime changes.
- `TASK-242-03-01` owns exposing the approved values in admin editor selects
  after this runtime leaf and `TASK-242-03-02` have landed.
- Some current editors derive select options directly from exported runtime token
  arrays, including stack, split layout, grid columns, divider, and spacer. If
  this leaf adds `none` to one of those exported arrays, update the affected
  editor option builder in the same implementation chunk so the UI shows `None`
  instead of raw labels such as `Gap none`, and update the immediately affected
  editor-wave assertion. Keep broader editor interaction coverage in
  TASK-242-03-01.
- Keep zero-token fields backward compatible: add literal `none` as an accepted
  token and map both `none` and existing `"0"` values to zero output unless a
  field-specific test proves canonicalizing `"0"` is safe.

## Security Contract

- Visibility: public widget output plus internal admin editor.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: schema enums must list `none`; free-form divider
  and spacer fields must normalize only `none`, known tokens, or safe CSS length
  inputs already accepted today.
- Anti-abuse: no arbitrary class-name passthrough.

## Pseudocode

```ts
const gapTokens = ["none", "0", "1", "2", "3", "4", "6", "8"] as const;
type GapToken = (typeof gapTokens)[number];

function normalizeGap(value: unknown, fallback: GapToken): GapToken {
  return gapTokens.includes(value as GapToken) ? (value as GapToken) : fallback;
}

const gapClassMap: Record<GapToken, string> = {
  none: "gap-0",
  "0": "gap-0",
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "6": "gap-6",
  "8": "gap-8",
};
```

## Testing Requirements

- Add render/normalizer assertions for at least one `none` value per widget.
- Keep legacy `"0"` assertions for stack, split layout, divider, and spacer.
- Update runtime widget suites such as `tests/vitest/widgets/stack.test.tsx`,
  `splitLayout.test.tsx`, `divider.test.tsx`, `spacer.test.tsx`,
  `gridColumns.test.tsx`, `screenWidgets.test.tsx`, `hero.test.tsx`,
  `navigation.test.tsx`, and `footer.test.tsx` as applicable.
- Do not update editor-wave select assertions in this leaf; editor option
  visibility and interactions are owned by TASK-242-03-01, except for the
  minimal label/assertion fixes needed when changing an exported token array
  would otherwise break current editor tests or expose raw `none` labels.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/STACK.md`
- `_docs/_WIDGETS/SPLIT_LAYOUT.md`
- `_docs/_WIDGETS/DIVIDER.md`
- `_docs/_WIDGETS/SPACER.md`
- `_docs/_WIDGETS/GRID_COLUMNS.md`
- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/FOOTER.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Layout primitive schemas, normalizers, and renderers accept `none` for the
   approved runtime fields.
2. Existing `"0"` saved values still render exactly as zero spacing and keep
   their observable normalized/marker contract unless explicitly documented.
3. Radius-capable shell fields can remove forced rounded corners.
4. Editor select visibility remains deferred to TASK-242-03-01.
