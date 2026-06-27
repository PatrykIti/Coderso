# 1199 - TASK-477-02 Page Editor Block-Level Swatch Preview Accuracy

**Date:** 2026-06-27
**Version:** Unreleased
**Tasks:** TASK-477 (done), TASK-477-02

## Key Changes

### Page V2 Authoring (block-level color controls)

- The block-level panel color controls (Text color, Background, Border color,
  gradient stops, badge colors) now **preview the exact color they apply**. They
  rendered token swatches from the `DEFAULT_TOKENS` palette while applying
  `var(--color-*)` resolved against the live site theme (e.g. accent showed orange
  but applied near-white). The live resolved site palette is now threaded to the
  swatches.
- The editor **canvas frame** now carries the site neutral color vars
  `--color-bg/-surface/-text`, so neutral block colors (e.g. a white block
  background set from a token) are **WYSIWYG in-editor**, matching the front.
  Previously the canvas only injected typography vars and the admin `@theme` maps
  the brand `--color-*` but not the neutrals, so a neutral block color rendered as
  an invalid color in-editor (it worked on the front, which emits all seven).

### Implementation

- `core/ui/theme/tokenCss.ts`: added `toPageCanvasColorCssVariableMap(tokens)` =
  site typography vars + only `--color-bg/-surface/-text`. Brand `--color-*` are
  deliberately omitted from the canvas frame — re-emitting them would override
  editor chrome (`ring-primary`, borders); no `core/admin/ui/pages` chrome consumes
  the neutrals, so emitting them is chrome-safe.
- `core/admin/ui/pages/PageEditor.tsx`: the canvas hook now resolves the site
  `DesignTokens` (`useCanvasSiteTokens`), from which the component derives both the
  canvas CSS vars (via the new map) and `sitePalette = getPageEditorColorPalette(siteTokens)`.
  The palette is threaded via a `PageEditorColorPaletteContext` provided around
  `ToolbarSubpanel` only (excludes host-appearance/menu controls) and consumed by
  `RegistryControlInput` (every block/section/badge color swatch) and
  `ToolbarGradientField`. `ColorSwatchControl` is unchanged (keeps its
  DEFAULT-palette default and `previewValue ?? value` rendering).

### Tests

- `tests/vitest/ui/themeTokens.test.ts`: `toPageCanvasColorCssVariableMap` emits the
  3 neutral `--color-*` + typography and excludes brand/border vars and shadcn
  aliases (chrome-safety contract).
- `tests/vitest/ui/page-editor-control-primitives.test.tsx`: `ColorSwatchControl`
  previews the passed palette's `previewValue` (not a hardcoded default).
- `tests/vitest/ui/page-editor-v2-flow.test.tsx`: with a `design.tokens` override,
  the canvas frame carries the site `--color-bg` (and not brand vars) and the block
  `bg` swatch previews that resolved value — proving hook → provider → context →
  preview.

## Validation

- `bun --cwd core lint` — pass; `bun --cwd core lint:types` — pass.
- `bunx vitest run` — themeTokens / control-primitives / page-editor-v2-flow
  (119) + page-renderer-v2 / page-document-v2 / control-ui-model regression.
- `bun run gates:coderso` — baseline.
- Live smoke (`coderso-dev-core-host` + `playwright-cli`): block Background swatch
  previews the site color AND applies it visibly in-canvas; accent text-color
  swatch previews its real near-white. Editor chrome (selection rings, ghost tiles)
  unchanged. Cold-cache → DEFAULT previews, no errors.

## Notes / Follow-up

- Closes TASK-477 (parent + 477-01 + 477-02). Docs: `_docs/PAGE_MODEL.md` /
  `_docs/DESIGN_TOKENS.md` note the canvas frame now carries site neutral
  `--color-*`.
- **Out of scope:** brand colors *applied* in-canvas still resolve `--color-*` to
  the admin theme via the globals `@theme` (only previews are fixed for brand;
  neutrals are fully WYSIWYG). Full brand in-canvas WYSIWYG needs a content-only
  wrapper excluding editor chrome — a larger follow-up.
