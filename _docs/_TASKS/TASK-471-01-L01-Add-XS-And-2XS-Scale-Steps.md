# TASK-471-01-L01: Add XS And 2XS Scale Steps
# FileName: TASK-471-01-L01-Add-XS-And-2XS-Scale-Steps.md

**Parent Subtask:** TASK-471-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Typography
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Overview

Add `xs` (0.75rem / 12px) and `2xs` (0.625rem / 10px) to the Page V2 font-size
scale, end to end: enum, CSS value map, token defaults, CSS variables, editor
labels, plus an accessibility floor note. The size control auto-derives its
options from the enum, so most of the work is extending the contract + fixing the
assertions that freeze the current scale.

## Current State (verified)

- `core/services/pages/pageDocumentV2.ts:176-185` —
  `pageTypographyFontSizes = ["sm","md","lg","xl","2xl","3xl","4xl","5xl"]`.
- `core/services/pages/pageDocumentV2.ts:248-257` —
  `pageTypographyFontSizeCssValues[token] = var(--text-<token>, <DEFAULT_TOKENS…>)`.
- `core/services/theme/tokenTypes.ts` — `DesignTokens.typography` type +
  `DEFAULT_TOKENS.typography` (`sm:0.875rem`, `md:1rem`, …); no `xs`/`2xs`.
- `core/ui/theme/tokenCss.ts` — `toPageTypographyCssVariableMap` /
  `toCssVariableMap` emit `--text-*` vars.
- `core/services/pages/pageEditorControlUiModel.ts` (`pageEditorOptionLabelCatalog`,
  ~94-162) — token→label map; no `xs`/`2xs`.
- `pageEditorControlRegistry.ts:509-518` — `block.style.fontSize` control options
  = `pageTypographyFontSizes` (auto-updates). `pageBlockStyleJsonSchema.fontSize`
  = `nullableEnumSchema(pageTypographyFontSizes)` (auto-updates).
- `pageRendererV2.tsx:486` reads `pageTypographyFontSizeCssValues[style.fontSize]`
  (auto-updates).
- Frozen assertion (separate post scope): `tests/vitest/ui/inspector-schemas.test.ts:27`
  asserts `["sm","md","lg","xl"]` over `TEXT_SCALE_OPTIONS`
  (`core/admin/ui/posts/editor/inspector/inspectorSchemas.ts:34-39`).

## Sub-Tasks

- [ ] Prepend `2xs`,`xs` to `pageTypographyFontSizes` (smallest first → segmented
      reads small→large).
- [ ] Add `xs`/`2xs` to `pageTypographyFontSizeCssValues` with the
      `var(--text-xs, …)` / `var(--text-2xs, …)` fallback pattern.
- [ ] Add `xs:"0.75rem"`, `2xs:"0.625rem"` to `DesignTokens.typography` (type) +
      `DEFAULT_TOKENS.typography` (values).
- [ ] Emit `--text-xs` / `--text-2xs` from `tokenCss.ts`.
- [ ] Add labels `xs → "X-small"`, `2xs → "XX-small"` to
      `pageEditorOptionLabelCatalog`.
- [ ] A11y floor: keep `xs` (12px) as the practical small floor; `2xs` (10px)
      opt-in with a sane minimum line-height; add a `DESIGN_TOKENS.md` note.
- [ ] Post-block scope decision (default: out of scope) — leave
      `TEXT_SCALE_OPTIONS` + `inspector-schemas.test.ts:27` unchanged unless the
      owner wants posts to share the scale; record the decision.
- [ ] Update tests hardcoding the page scale.

## Implementation Pseudocode

```ts
// pageDocumentV2.ts
export const pageTypographyFontSizes = [
  "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl",
] as const;

export const pageTypographyFontSizeCssValues: Record<PageTypographyFontSize, string> = {
  "2xs": `var(--text-2xs, ${DEFAULT_TOKENS.typography["2xs"]})`,
  xs:   `var(--text-xs, ${DEFAULT_TOKENS.typography.xs})`,
  sm:   `var(--text-sm, ${DEFAULT_TOKENS.typography.sm})`,
  // …unchanged md..5xl
};

// theme/tokenTypes.ts — DesignTokens.typography + DEFAULT_TOKENS
typography: { "2xs": "0.625rem", xs: "0.75rem", sm: "0.875rem", /* … */ }

// ui/theme/tokenCss.ts — emit "--text-2xs", "--text-xs"
// pageEditorControlUiModel.ts — "2xs":"XX-small", "xs":"X-small"
```

Data flow: enum → JSON schema → normalize (rejects out-of-enum; legacy `sm`
stays valid) → control options (auto) → renderer
`pageTypographyFontSizeCssValues[token]` → inline `font-size` → front resolves
`--text-*` (canvas falls back to literal rem).

Regression-test shape:
- Renderer paints `font-size: var(--text-xs, 0.75rem)` for `style.fontSize="xs"`.
- Schema accepts `2xs`/`xs`, still rejects an unknown size.
- Token CSS map contains `--text-2xs` + `--text-xs`.
- Unset `fontSize` unchanged (render-default still applies).

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/inspector-schemas.test.ts`
- `bun run test:vitest` (other hardcoded-scale assertions)
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` (`xs`/`2xs` + minimum-readable-size note).
- `_docs/_TASKS/TASK-471-01*.md` status; changelog rolled up by TASK-471-05.
