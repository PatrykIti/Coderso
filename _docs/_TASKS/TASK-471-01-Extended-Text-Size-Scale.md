# TASK-471-01: Extended Text Size Scale
# FileName: TASK-471-01-Extended-Text-Size-Scale.md

**Parent Task:** TASK-471
**Priority:** High
**Category:** Pages / Page Editor V2 / Typography
**Estimated Effort:** Small
**Dependencies:** TASK-424 (typography inspector)
**Status:** ⏳ To Do

---

## Overview

The Page V2 typography scale bottoms out at `sm` (0.875rem / 14px), so authors
cannot make text smaller than surrounding elements — blocking captions,
eyebrows, fine print, and (later) badge labels. Add two smaller steps,
`xs` (x-small, 0.75rem / 12px) and `2xs` (xx-small, 0.625rem / 10px), to the
Page V2 font-size scale. Naming mirrors the existing large end (`2xl`/`3xl`
↔ `2xs`), keeping the token vocabulary symmetric.

The size control auto-derives its options from the enum
(`pageEditorControlRegistry.ts:509-518`), so the bulk of the work is extending
the enum + the CSS value map + the token defaults + the editor labels, then
fixing the assertions that freeze the current scale.

---

## Current State (verified)

- `core/services/pages/pageDocumentV2.ts:176-185` — `pageTypographyFontSizes =
  ["sm","md","lg","xl","2xl","3xl","4xl","5xl"]`.
- `core/services/pages/pageDocumentV2.ts:248-257` —
  `pageTypographyFontSizeCssValues` maps each token to
  `var(--text-<token>, <DEFAULT_TOKENS.typography.<token>>)`.
- `core/services/theme/tokenTypes.ts` — `DesignTokens.typography` type +
  `DEFAULT_TOKENS.typography` values (`sm: 0.875rem`, `md: 1rem`, …); no
  `xs`/`2xs`.
- `core/ui/theme/tokenCss.ts` — `toPageTypographyCssVariableMap` /
  `toCssVariableMap` emit `--text-*` vars on `:root` and the page canvas.
- `core/services/pages/pageEditorControlUiModel.ts` (`pageEditorOptionLabelCatalog`,
  ~94-162) — maps tokens to human labels; no `xs`/`2xs` entries.
- `core/services/pages/pageEditorControlRegistry.ts:509-518` —
  `block.style.fontSize` control: `input: "segmented"`, `responsive: true`,
  `options: pageTypographyFontSizes` (auto-updates when the enum grows).
- `core/services/pages/pageRendererV2.tsx:486` — `toPageBlockTypographyStyle`
  reads `pageTypographyFontSizeCssValues[style.fontSize]` (auto-updates).
- Validation: `pageBlockStyleJsonSchema.fontSize` uses
  `nullableEnumSchema(pageTypographyFontSizes)` (auto-updates).
- Frozen assertion: `tests/vitest/ui/inspector-schemas.test.ts:27` asserts the
  **post** block scale `["sm","md","lg","xl"]` — separate
  `TEXT_SCALE_OPTIONS` (`core/admin/ui/posts/editor/inspector/inspectorSchemas.ts:34-39`);
  do **not** silently change post scope (see Sub-Tasks).

---

## Sub-Tasks

- [ ] Prepend `xs` and `2xs` to `pageTypographyFontSizes` (smallest first so the
      segmented control reads small→large): `["2xs","xs","sm",…,"5xl"]`.
- [ ] Add `xs`/`2xs` keys to `pageTypographyFontSizeCssValues` with the
      `var(--text-xs, …)` / `var(--text-2xs, …)` fallback pattern.
- [ ] Add `xs: "0.75rem"` and `2xs: "0.625rem"` to `DesignTokens.typography`
      (type) and `DEFAULT_TOKENS.typography` (values).
- [ ] Emit `--text-xs` / `--text-2xs` from `tokenCss.ts`
      (`toPageTypographyCssVariableMap` + `toCssVariableMap`) so the front and
      the canvas paint the new vars.
- [ ] Add labels `xs → "X-small"` and `2xs → "XX-small"` to
      `pageEditorOptionLabelCatalog`.
- [ ] **A11y floor:** keep `xs` (12px) as the practical small floor; document
      `2xs` (10px) as opt-in and ensure a sane minimum line-height when it is
      applied (no clamping below the readable line-height). Add a
      `DESIGN_TOKENS.md` note on minimum readable size.
- [ ] **Post-block scope decision (default: out of scope):** leave
      `TEXT_SCALE_OPTIONS` and `inspector-schemas.test.ts:27` unchanged unless
      the owner wants posts to share the scale. If included, extend both and the
      assertion together. State the decision in the closure.
- [ ] Update/extend tests that hardcode the page scale (search for
      `pageTypographyFontSizes`, `--text-sm`, font-size scale assertions).

---

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

// theme/tokenTypes.ts — DesignTokens.typography type + DEFAULT_TOKENS
typography: {
  "2xs": "0.625rem", // ~10px — opt-in, fine print only
  xs:    "0.75rem",  // ~12px — small floor (captions, badges, eyebrows)
  sm:    "0.875rem",
  // …unchanged
}

// ui/theme/tokenCss.ts — emit the new custom properties
// "--text-2xs": tokens.typography["2xs"], "--text-xs": tokens.typography.xs, …

// pageEditorControlUiModel.ts — pageEditorOptionLabelCatalog
// "2xs": "XX-small", "xs": "X-small", (sm: "Small" …)
```

Data flow: enum → JSON schema (`nullableEnumSchema`) → normalize (rejects values
outside the enum; legacy `sm` stays valid) → control options (auto) → renderer
`pageTypographyFontSizeCssValues[token]` → inline `font-size` on the text node →
front resolves the `--text-*` var (canvas falls back to the literal rem).

Regression-test shape:
- Renderer paints `font-size: var(--text-xs, 0.75rem)` for a block with
  `style.fontSize = "xs"`.
- Schema accepts `2xs`/`xs` and still rejects an unknown size.
- Token CSS map contains `--text-2xs` and `--text-xs`.
- Legacy block with unset `fontSize` is unchanged (render-default still applies).

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/inspector-schemas.test.ts`
- `bun run test:vitest` (catch other hardcoded-scale assertions)
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` (new `xs`/`2xs` steps + minimum-readable-size note).
- `_docs/_TASKS/TASK-471*.md` (status), `_docs/_CHANGELOG/` on family closure.
