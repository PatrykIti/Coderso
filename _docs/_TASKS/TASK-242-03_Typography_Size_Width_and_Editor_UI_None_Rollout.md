# TASK-242-03: Typography, Size, Width, and Editor UI None Rollout

# FileName: TASK-242-03_Typography_Size_Width_and_Editor_UI_None_Rollout.md

**Priority:** High
**Category:** Widget Editors + Typography Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-242-02
**Status:** Done (2026-04-29)

---

## Overview

Add `none` to off-capable typography, size, logo/input/button, and width
controls, then expose all new `none` values in widget editor select controls.

This subtask owns typography/width/size runtime changes plus the editor-facing
UX for the full TASK-242 rollout. Spacing, gap, padding, and radius runtime
changes stay owned by TASK-242-02 leaves.

## Sub-Tasks

- [x] TASK-242-03-02: Typography, Size, Width Runtime None Tokens
- [x] TASK-242-03-01: Widget Editor Select Option Regressions

## Files to Change

- `core/widgets/core/hero.tsx`
- `core/widgets/core/navigation.tsx`
- `core/widgets/core/footer.tsx`
- `core/widgets/core/richTextSection.tsx`
- `core/widgets/core/timeline.tsx`
- `core/widgets/core/compareTimeline.tsx`
- `core/widgets/core/formEmbed.tsx`
- `core/widgets/core/logoCloud.tsx`
- `core/admin/ui/widgets/editors/*.tsx`
- `tests/vitest/ui/*editor-wave.test.tsx`

Runtime file edits in this parent are limited to typography, max-width/content
width, logo height, input size, and button size. Editor files may expose every
approved `none` option from TASK-242 after the runtime leaf that owns the field
has landed.

## Required Changes

| Widget | Fields | `none` behavior |
|---|---|---|
| `hero` | `layout.maxWidth`, `layout.contentWidth` | no max-width class |
| `hero` | `headlineSize`, `subheadSize`, `bodySize` | no forced text-size class |
| `hero` | `primaryButtonSize`, `secondaryButtonSize` | no forced button size class, only base button styling |
| `navigation` | `layout.maxWidth`, `style.fontSize`, `style.fontWeight` | no max-width/text-size/font-weight class |
| `footer` | `layout.maxWidth`, `style.fontSize` | no max-width/text-size class |
| `richTextSection` | `style.fontScale`, `style.lineHeight` | no prose/text scale or forced leading class; keep `options.maxWidth="full"` as the existing no-limit width unless TASK-242-01 decides otherwise |
| `timeline` | `titleSize`, `descriptionSize` | no forced label text-size class |
| `compareTimeline` | `trackLabelSize`, `stepLabelSize`, `segmentLabelSize` | no forced label text-size class |
| `formEmbed` | `layout.width`, `style.inputSize` | no forced width/input size preset when safe |
| `logoCloud` | `style.logoHeight` | no forced logo height class |

Spacing, gap, padding, and radius fields that appear in these same widget files
are intentionally out of scope here and remain in TASK-242-02-01 or
TASK-242-02-02.

## Security Contract

- Visibility: internal admin controls and public render output.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: schema enums explicitly list `none`.
- Anti-abuse: class output must come from fixed token maps only.

## Pseudocode

```ts
const textSizeClassMap: Record<TextSizeToken, string> = {
  none: "",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const maxWidthClassMap: Record<MaxWidthToken, string> = {
  none: "",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};
```

## Testing Requirements

- Editor select tests must assert `none` appears in relevant option lists.
- Renderer tests must prove `none` removes the forced class and does not fall
  back to the default token.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Typography and size controls can disable widget-level presets.
2. Editor UI exposes `None` consistently.
3. Existing default typography remains unchanged unless the user explicitly
   selects `none`.
