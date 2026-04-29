# TASK-242-03-02: Typography, Size, Width Runtime None Tokens

# FileName: TASK-242-03-02_Typography_Size_Width_Runtime_None_Tokens.md

**Priority:** High
**Category:** Widget Runtime + Typography Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-242-03
**Status:** To Do

---

## Overview

Add runtime/schema support for `none` on off-capable typography, width, logo,
input, and button size tokens before the editor select rollout exposes those
values.

This leaf owns production widget contracts only. Editor option arrays and
editor-wave assertions remain owned by TASK-242-03-01.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Current line refs | Fields |
|---|---|---|
| `core/widgets/core/hero.tsx` | `125-166`, `221-287`, `320-455`, `541` | `layout.maxWidth`, `layout.contentWidth`, `style.headlineSize`, `style.subheadSize`, `style.bodySize`, `style.borderRadius`, `style.mediaRadius`, `style.primaryButtonSize`, `style.secondaryButtonSize` |
| `core/widgets/core/navigation.tsx` | `184-202`, `236-256`, `366-387` | `layout.maxWidth`, `layout.paddingY`, `layout.itemGap`, `style.fontSize` |
| `core/widgets/core/footer.tsx` | `119-136`, `192-210`, `332-391` | `layout.maxWidth`, `layout.columnGap`, `layout.sectionPaddingY`, `style.fontSize` |
| `core/widgets/core/richTextSection.tsx` | `13-16`, `148-160`, `58-76`, `229`, `405-561` | `style.fontScale`, `style.spacing`; confirm `options.maxWidth="full"` remains the no-limit width switch |
| `core/widgets/core/timeline.tsx` | `8-14`, `138-162`, `58`, `350`, `403`, `474`, `550` | `layout.spacing`, `style.titleSize`, `style.descriptionSize`; keep marker/line sizes out unless TASK-242-01 reclassifies them |
| `core/widgets/core/compareTimeline.tsx` | `7-12`, `165`, `187-189`, `365`, `597`, `608-610` | `layout.trackSpacing`, `style.trackLabelSize`, `style.stepLabelSize`, `style.segmentLabelSize` |
| `core/widgets/core/formEmbed.tsx` | `210-224`, `80-112`, `265`, `501-538` | `layout.width`, `layout.spacing`, `style.radius`, `style.inputSize` |
| `core/widgets/core/logoCloud.tsx` | `6-7`, `89-92`, `35-42`, `134`, `214-354` | `style.logoHeight`, `style.gap` |

Line refs are current as of 2026-04-29. Refresh them with `rg` if another
branch changes these files before implementation starts.

## Required Changes

| Widget | Field | `none` behavior |
|---|---|---|
| `hero` | `layout.maxWidth`, `layout.contentWidth` | emit no max-width/content-width class |
| `hero` | `headlineSize`, `subheadSize`, `bodySize` | emit no forced text-size class |
| `hero` | `borderRadius`, `mediaRadius` | emit no forced radius class |
| `hero` | `primaryButtonSize`, `secondaryButtonSize` | emit no forced button size class beyond base button styling |
| `navigation` | `layout.maxWidth` | emit no max-width wrapper class |
| `navigation` | `layout.paddingY`, `layout.itemGap` | zero vertical padding/item gap |
| `navigation` | `style.fontSize` | emit no forced text-size class |
| `footer` | `layout.maxWidth` | emit no max-width wrapper class |
| `footer` | `layout.columnGap`, `layout.sectionPaddingY` | zero column gap/section padding |
| `footer` | `style.fontSize` | emit no forced text-size class |
| `richTextSection` | `style.fontScale` | emit no forced prose/text scale class |
| `richTextSection` | `style.spacing` | zero rich text block spacing |
| `timeline` | `layout.spacing` | zero step spacing |
| `timeline` | `style.titleSize`, `style.descriptionSize` | emit no forced label text-size class |
| `compareTimeline` | `layout.trackSpacing` | zero track spacing |
| `compareTimeline` | label size fields | emit no forced label text-size class |
| `formEmbed` | `layout.width` | emit no forced width preset when `none` is selected |
| `formEmbed` | `layout.spacing`, `style.radius`, `style.inputSize` | zero spacing, no forced radius, no forced input size |
| `logoCloud` | `style.logoHeight` | emit no forced logo height class |
| `logoCloud` | `style.gap` | zero logo gap |

## Security Contract

- Visibility: public widget output plus internal admin editor data.
- Auth model: unchanged; no endpoint is introduced.
- RBAC: unchanged existing page/template/widget save permissions.
- CSRF: unchanged existing admin save flow.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: schemas must list `none` only for approved fields;
  unrelated unknown tokens still reject or normalize exactly as they do today.
- Anti-abuse: render output must come from fixed token maps; do not concatenate
  raw user-provided token strings into class names.
- Compatibility: saved legacy values keep their current output; legacy `"0"`
  aliases may normalize to `none` only where output is unchanged.

## Pseudocode

Use local token arrays where the widget already owns its token contract.

```ts
const labelSizeTokens = ["none", "sm", "base", "lg"] as const;
type LabelSizeToken = (typeof labelSizeTokens)[number];

const labelSizeClassMap: Record<LabelSizeToken, string> = {
  none: "",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
};

function resolveLabelSize(value: unknown, fallback: LabelSizeToken): LabelSizeToken {
  return labelSizeTokens.includes(value as LabelSizeToken) ? (value as LabelSizeToken) : fallback;
}
```

For width tokens, keep `none` distinct from existing semantic width choices.

```ts
const widthClassMap: Record<WidthToken, string> = {
  none: "",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  full: "max-w-none",
};
```

For zero-compatible spacing tokens:

```ts
function resolveSpacing(value: unknown, fallback: SpacingToken): SpacingToken {
  if (value === "0") return "none";
  if (value === "none") return "none";
  return spacingTokens.includes(value as SpacingToken) ? (value as SpacingToken) : fallback;
}
```

## Testing Requirements

Update or add render/normalizer tests before the editor-only assertions land:

| Surface | Test owner |
|---|---|
| hero runtime normalization/render | add focused coverage under `tests/unit/widgets/*.test.tsx`; editor behavior later in `tests/vitest/ui/hero-editor-wave.test.tsx:810`, `1151` |
| navigation runtime normalization/render | add focused coverage under `tests/unit/widgets/*.test.tsx`; editor behavior later in `tests/vitest/ui/navigation-editor-wave.test.tsx:1049`, `1276`, `1335` |
| footer runtime normalization/render | add focused coverage under `tests/unit/widgets/*.test.tsx`; editor behavior later in `tests/vitest/ui/footer-editor-wave.test.tsx:203`, `427` |
| rich text runtime normalization/render | add focused coverage under `tests/unit/widgets/*.test.tsx`; editor behavior later in `tests/vitest/ui/rich-text-section-editor-wave.test.tsx:350`, `647` |
| timeline runtime normalization/render | add focused coverage under `tests/unit/widgets/*.test.tsx`; editor behavior later in `tests/vitest/ui/timeline-editor-wave.test.tsx:385`, `581` |
| compare timeline runtime normalization/render | add focused coverage under `tests/unit/widgets/*.test.tsx`; editor behavior later in `tests/vitest/ui/compare-timeline-editor-wave.test.tsx:387`, `585` |
| form embed runtime normalization/render | add focused coverage under `tests/unit/widgets/*.test.tsx`; editor behavior later in `tests/vitest/ui/form-embed-editor-wave.test.tsx:404`, `542` |
| logo cloud runtime normalization/render | add focused coverage under `tests/unit/widgets/*.test.tsx`; editor behavior later in `tests/vitest/ui/logo-cloud-editor-wave.test.tsx:433`, `548`, `605` |

Run:

```bash
bun --cwd core lint
bun --cwd core lint:types
git diff --check
```

Also run focused widget tests touched by the implementation. Use Vitest only
for Bun-free editor/UI assertions.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/FOOTER.md`
- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/_WIDGETS/FORM_EMBED.md` if present; otherwise update the nearest form
  embed widget doc that owns this surface.
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Runtime schemas accept `none` only for approved typography, width, and size
   tokens.
2. Normalizers preserve explicit `none` and keep existing defaults unchanged.
3. Renderers map `none` to empty or zero output deterministically.
4. Invalid tokens still reject or fall back according to each existing widget
   contract.
5. Focused runtime and later editor coverage proves the option is visible and
   rendered correctly.
