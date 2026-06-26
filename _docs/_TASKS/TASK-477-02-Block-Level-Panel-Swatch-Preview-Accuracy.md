# TASK-477-02: Block-Level Panel Swatch Preview Accuracy
# FileName: TASK-477-02-Block-Level-Panel-Swatch-Preview-Accuracy.md

**Parent Task:** TASK-477
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-477-01

**Status:** ⏳ To Do

---

## Overview

The block-level panel color controls (Text color, Background, Border color, and
the gradient stop editor) share the same preview-vs-applied mismatch as the inline
toolbar (TASK-477-01): they render token swatches from the **DEFAULT-token**
palette while applying `var(--color-*)` resolved against the live site theme.

Unlike the inline toolbar, these `ColorSwatchControl` instances live in the dark
floating panel (admin chrome), so previewing with the raw CSS var is not reliable
(it may resolve against the admin theme, not the page theme). The correct fix is
to thread the **live resolved site tokens** into the palette.

**Related neutral-token var-name mismatch (discovered in TASK-477-01).** The
palette tokens `bg`/`surface`/`text` carry `var(--color-bg)` / `var(--color-surface)`
/ `var(--color-text)`. The front emits those names (`tokenCss.ts:92-94`), but the
admin canvas defines `--color-background` / `--color-foreground` / `--color-muted`
instead — so those tokens render an invalid color in-editor while resolving on the
front (no single `var()` works in both). This task should also decide the
canonical neutral-token contract (align `tokenCss` emission, the
`pageAuthoringSanitizers` allowlist, and the palette so a stored neutral mark
resolves both in-editor and on the front), rather than only fixing previews. The
inline toolbar already side-steps this by curating to resolving tokens + a hex
picker (TASK-477-01).

## Current State (verified)

- `core/admin/ui/pages/editorControls/ColorSwatchControl.tsx:118` draws swatches
  with `backgroundColor: swatch.previewValue ?? swatch.value`; `palette` defaults
  to `getPageEditorColorPalette()` (DEFAULT_TOKENS).
- `PageEditor.tsx` passes no live palette: registry `swatch` case (~`:4360`) and
  the gradient stop editor (~`:4172`) call `ColorSwatchControl` /
  `getPageEditorColorPalette()` without site tokens.
- The resolved site tokens are computable from settings:
  `mergeTokens(DEFAULT_TOKENS, readSiteDesignTokenOverrides(settings))`
  (`PageEditor.tsx:335, 391`).

## Implementation sketch (execution-ready)

1. In `PageEditor`, memoize a site palette from the resolved tokens:
   ```tsx
   const sitePalette = useMemo(
     () => getPageEditorColorPalette(mergeTokens(DEFAULT_TOKENS, readSiteDesignTokenOverrides(settings))),
     [settings]
   );
   ```
   (Reuse whatever `settings` source the typography-css-vars hook at `:388` uses;
   expose it to the main component if it is currently hook-local.)
2. Pass `palette={sitePalette}` to every page-editor `ColorSwatchControl`
   (registry `swatch` case + gradient stops). Thread it through
   `RegistryControlInput` props so the registry case can forward it.
3. Keep `ColorSwatchControl`'s `previewValue ?? value` rendering — with live
   `previewValue` it is now correct.

## Regression-test shape

- Render `ColorSwatchControl` with a palette whose `previewValue` differs from the
  default; assert the swatch `background-color` equals the passed `previewValue`.
- A `RegistryControlInput` swatch test asserting the threaded palette reaches
  `ColorSwatchControl`.

## Validation

- `bun --cwd core lint`, `bun --cwd core lint:types`, page-editor Vitest suites.
- Live smoke: Background/Text color panel swatches preview the live token colors.

## Security note

No routes/auth/schema. Display-only token threading; values still sanitized on
write/render.
