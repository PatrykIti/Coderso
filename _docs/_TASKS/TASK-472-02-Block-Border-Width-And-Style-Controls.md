# TASK-472-02: Block Border Width And Style Controls
# FileName: TASK-472-02-Block-Border-Width-And-Style-Controls.md

**Parent Task:** TASK-472
**Priority:** High
**Category:** Pages / Page Editor V2 / Renderer
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Blocks can set a border **color** but not its **width** or **style**: the
renderer hardcodes `1px solid` whenever a border color is set. Add `borderWidth`
and `borderStyle` to the block style contract, controls in the panel, and have
the renderer read them — preserving the current `1px solid` look for legacy
blocks that only set a color.

---

## Current State (verified)

- `core/services/pages/pageRendererV2.tsx:464-466` — in `toPageBlockVisualStyle`:
  `borderColor: <sanitized>`, `borderStyle: borderColor ? "solid" : undefined`,
  `borderWidth: borderColor ? "1px" : undefined`. Width/style are hardcoded.
- `core/services/pages/pageEditorControlRegistry.ts:442-450` — only
  `block.style.borderColor` (input `color`) exists; no width/style controls.
- `PageBlockStyleV2` (`pageDocumentV2.ts`, ~346-379) — has `borderColor` but no
  `borderWidth` / `borderStyle`.

---

## Sub-Tasks

- [ ] Add `borderWidth?: number` (clamp 0–12px) and
      `borderStyle?: "solid"|"dashed"|"dotted"|"double"|"none"` to
      `PageBlockStyleV2`, the JSON schema (nullable + reject-unknown), and
      `normalizeBlockStyle` (clamp width; enum-validate style).
- [ ] Add `block.style.borderWidth` (number, clamp 0–12, `panel: "style"`) and
      `block.style.borderStyle` (segmented/select over the enum,
      `panel: "style"`) controls to `pageUniversalBlockControls`, with sensible
      render defaults registered in `pageBlockRenderDefaults`.
- [ ] Update the renderer to read stored values with **backward-compatible
      fallbacks**: when a border color is set but width/style are unset, keep
      `1px` / `solid` so existing blocks paint identically.
- [ ] Add renderer regression coverage for non-default width/style and the
      legacy color-only fallback.

---

## Implementation Pseudocode

```ts
// pageDocumentV2.ts
export const pageBorderStyles = ["solid", "dashed", "dotted", "double", "none"] as const;
export const PAGE_BLOCK_BORDER_WIDTH_CLAMP = { min: 0, max: 12 } as const;
// PageBlockStyleV2: borderWidth?: number; borderStyle?: PageBorderStyle;

// pageRendererV2.tsx — toPageBlockVisualStyle (replace hardcoded 1px/solid)
const hasBorder = Boolean(borderColor) || (style.borderWidth ?? 0) > 0;
return {
  // …unchanged
  borderColor: borderColor ?? undefined,
  borderStyle: hasBorder ? (style.borderStyle ?? "solid") : undefined,
  borderWidth: hasBorder ? `${style.borderWidth ?? 1}px` : undefined,
};
```

Data flow: control → `style.borderWidth`/`style.borderStyle` → normalize
(clamp/enum) → renderer reads stored value with the legacy fallback.

Regression-test shape:
- color-only block ⇒ still `1px solid` (no regression).
- `borderWidth: 4`, `borderStyle: "dashed"` ⇒ painted `4px dashed`.
- `borderStyle: "none"` ⇒ no visible border even with a color set.
- unknown `borderStyle` rejected by schema; width clamped to 0–12.

---

## Security Contract

- No new endpoints. `borderWidth` numeric clamp; `borderStyle` enum
  reject-unknown. Border color continues through `sanitizeAuthoringCssColor`. No
  new CSS-injection surface.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (border width/style fields).
- `_docs/_TASKS/TASK-472*.md` (status), `_docs/_CHANGELOG/` on task closure.
