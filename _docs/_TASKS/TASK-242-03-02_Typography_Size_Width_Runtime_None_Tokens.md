# TASK-242-03-02: Typography, Size, Width Runtime None Tokens

# FileName: TASK-242-03-02_Typography_Size_Width_Runtime_None_Tokens.md

**Priority:** High
**Category:** Widget Runtime + Typography Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-242-01-02
**Status:** To Do

---

## Overview

Add runtime/schema support for `none` on off-capable typography, width, logo,
input, and button size tokens before the editor select rollout exposes those
values.

This leaf owns production widget contracts only. Editor option arrays and
editor-wave assertions remain owned by TASK-242-03-01. Spacing, gap, padding,
and radius runtime fields are intentionally owned by TASK-242-02-01 and
TASK-242-02-02.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Current line refs | Fields |
|---|---|---|
| `core/widgets/core/hero.tsx` | `125-166`, `221-287`, `320-455`, `541` | `layout.maxWidth`, `layout.contentWidth`, `style.headlineSize`, `style.subheadSize`, `style.bodySize`, `style.primaryButtonSize`, `style.secondaryButtonSize` |
| `core/widgets/core/navigation.tsx` | `184-203`, `236-268`, `366-389` | `layout.maxWidth`, `style.fontSize`, `style.fontWeight` |
| `core/widgets/core/footer.tsx` | `119-136`, `192-210`, `332-391` | `layout.maxWidth`, `style.fontSize` |
| `core/widgets/core/richTextSection.tsx` | `13-16`, `148-160`, `58-80`, `229`, `405-561` | `style.fontScale`, `style.lineHeight`; keep `options.maxWidth="full"` as the existing no-limit width switch |
| `core/widgets/core/timeline.tsx` | `8-14`, `138-162`, `58`, `350`, `403`, `474`, `550` | `style.titleSize`, `style.descriptionSize`; keep marker/line sizes out unless TASK-242-01 reclassifies them |
| `core/widgets/core/compareTimeline.tsx` | `7-12`, `165`, `187-189`, `365`, `597`, `608-610` | `style.trackLabelSize`, `style.stepLabelSize`, `style.segmentLabelSize` |
| `core/widgets/core/formEmbed.tsx` | `80-112`, `210-224`, `265-283`, `523-525`, `538-545`, `613-644` | `layout.width`, `style.inputSize` |
| `core/widgets/core/logoCloud.tsx` | `6-7`, `89-92`, `35-42`, `134`, `214-354` | `style.logoHeight` |

Line refs are current as of 2026-04-29. Refresh them with `rg` if another
branch changes these files before implementation starts.

## Required Changes

| Widget | Field | `none` behavior |
|---|---|---|
| `hero` | `layout.maxWidth`, `layout.contentWidth` | emit no max-width/content-width class |
| `hero` | `headlineSize`, `subheadSize`, `bodySize` | emit no forced text-size class |
| `hero` | `primaryButtonSize`, `secondaryButtonSize` | emit no forced button size class beyond base button styling |
| `navigation` | `layout.maxWidth` | emit no max-width wrapper class |
| `navigation` | `style.fontSize` | emit no forced text-size class |
| `navigation` | `style.fontWeight` | emit no forced font-weight class |
| `footer` | `layout.maxWidth` | emit no max-width wrapper class |
| `footer` | `style.fontSize` | emit no forced text-size class |
| `richTextSection` | `style.fontScale` | emit no forced prose/text scale class |
| `richTextSection` | `style.lineHeight` | emit no forced leading class while preserving readable defaults |
| `timeline` | `style.titleSize`, `style.descriptionSize` | emit no forced label text-size class |
| `compareTimeline` | label size fields | emit no forced label text-size class |
| `formEmbed` | `layout.width` | emit no forced width preset when `none` is selected |
| `formEmbed` | `style.inputSize` | emit no forced input size class while preserving usable base controls |
| `logoCloud` | `style.logoHeight` | emit no forced logo height class |

Do not edit spacing/gap/padding/radius token contracts in this leaf. Those fields
are covered by TASK-242-02 and should only be touched here if resolving a direct
merge conflict from an already-landed TASK-242-02 change.

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
- Compatibility: saved legacy values keep their current output and observable
  normalized/marker contract unless a field-specific task documents and tests a
  safe canonicalization.

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
const formEmbedWidthTokens = ["none", "sm", "md", "lg", "xl"] as const;
type FormEmbedWidthToken = (typeof formEmbedWidthTokens)[number];

const formEmbedWidthClassMap: Record<FormEmbedWidthToken, string> = {
  none: "",
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-2xl",
};
```

Do not add a new `full` value to `formEmbed.layout.width`; it does not exist in
the current runtime contract. `none` is the new no-forced-width option.

## Testing Requirements

Update or add render/normalizer tests before the editor-only assertions land:

| Surface | Test owner |
|---|---|
| hero runtime normalization/render | `tests/vitest/widgets/hero.test.tsx`; editor behavior later in `tests/vitest/ui/hero-editor-wave.test.tsx:810`, `1151` |
| navigation runtime normalization/render | `tests/vitest/widgets/navigation.test.tsx`; editor behavior later in `tests/vitest/ui/navigation-editor-wave.test.tsx:1049`, `1276`, `1335` |
| footer runtime normalization/render | `tests/vitest/widgets/footer.test.tsx`; editor behavior later in `tests/vitest/ui/footer-editor-wave.test.tsx:203`, `427` |
| rich text runtime normalization/render | `tests/vitest/widgets/richTextSection.test.tsx`; editor behavior later in `tests/vitest/ui/rich-text-section-editor-wave.test.tsx:350`, `647` |
| timeline runtime normalization/render | `tests/vitest/widgets/timeline.test.tsx`; editor behavior later in `tests/vitest/ui/timeline-editor-wave.test.tsx:385`, `581` |
| compare timeline runtime normalization/render | `tests/vitest/widgets/compareTimeline.test.tsx`; editor label-size behavior later in `tests/vitest/ui/compare-timeline-editor-wave.test.tsx:519-528`, `569-571` |
| form embed runtime normalization/render | `tests/vitest/widgets/formEmbed.test.tsx`; editor behavior later in `tests/vitest/ui/form-embed-editor-wave.test.tsx:404`, `542` |
| logo cloud runtime normalization/render | `tests/vitest/widgets/logoCloud.test.tsx`; editor behavior later in `tests/vitest/ui/logo-cloud-editor-wave.test.tsx:433`, `548`, `605` |

Run:

```bash
bun --cwd core lint
bun --cwd core lint:types
git diff --check
```

Also run focused widget tests touched by the implementation. Use Vitest only
for Bun-free widget runtime and editor/UI assertions; keep Bun only for existing
Bun-owned widget suites.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/FOOTER.md`
- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/_WIDGETS/FORM_EMBED.md`; create it if missing and add it to
  `_docs/_WIDGETS/README.md`.
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Runtime schemas accept `none` only for approved typography, width, and size
   tokens.
2. Normalizers preserve explicit `none` and keep existing defaults unchanged.
3. Renderers map `none` to empty or zero output deterministically.
4. Invalid tokens still reject or fall back according to each existing widget
   contract.
5. Focused runtime coverage proves the option renders correctly.
6. Editor option visibility remains deferred to TASK-242-03-01.
