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
- corresponding editor files under `core/admin/ui/widgets/editors/`
- focused tests under `tests/vitest/ui/` and `tests/unit/widgets/`

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

function normalizeGap(value: unknown, fallback: GapToken): GapToken {
  if (value === "0") return "none";
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

- Update existing editor-wave select assertions for stack, split layout, grid
  columns, hero, navigation, and footer.
- Add render/normalizer assertions for at least one `none` value per widget.
- Keep legacy `"0"` assertions for stack, split layout, divider, and spacer.
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

1. Layout primitives can disable spacing through a visible `None` editor option.
2. Existing `"0"` saved values still render exactly as zero spacing.
3. Radius-capable shell fields can remove forced rounded corners.
