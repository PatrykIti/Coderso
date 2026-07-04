# TASK-472-01-L02: Block Border Width And Style Controls
# FileName: TASK-472-01-L02-Block-Border-Width-And-Style-Controls.md

**Parent Subtask:** TASK-472-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Renderer
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Overview

Blocks can set a border color but not its width/style: the renderer hardcodes
`1px solid` whenever a color is set. Add `borderWidth` + `borderStyle` to the
block style contract, controls, and renderer reads — preserving the `1px solid`
look for legacy color-only blocks.

## Current State (verified)

- `core/services/pages/pageRendererV2.tsx:464-466` —
  `borderStyle: borderColor ? "solid" : undefined`,
  `borderWidth: borderColor ? "1px" : undefined` (hardcoded).
- `core/services/pages/pageEditorControlRegistry.ts:442-450` — only
  `block.style.borderColor`.
- `PageBlockStyleV2` (`pageDocumentV2.ts` ~346-379) — `borderColor` only.

## Sub-Tasks

- [x] Add `borderWidth?: number` (clamp 0–12) + `borderStyle?:
      "none"|"solid"|"dashed"|"dotted"` to `PageBlockStyleV2`, JSON
      schema (nullable + reject-unknown), and `normalizeBlockStyle`.
- [x] Add `block.style.borderWidth` (number, clamp 0–12) + `block.style.borderStyle`
      (segmented/select, `panel:"style"`) controls + render defaults.
- [x] Renderer reads stored values with legacy fallbacks (`1px`/`solid` when a
      color is set but width/style unset).
- [x] Renderer regression coverage for non-default + legacy fallback.

## Implementation Pseudocode

```ts
// pageDocumentV2.ts
export const pageBorderStyles = ["none","solid","dashed","dotted"] as const;
export const PAGE_BLOCK_BORDER_WIDTH_CLAMP = { min: 0, max: 12 } as const;
// PageBlockStyleV2: borderWidth?: number; borderStyle?: PageBorderStyle;

// pageRendererV2.tsx — toPageBlockVisualStyle
const hasBorder = Boolean(borderColor) || (style.borderWidth ?? 0) > 0;
return {
  // …unchanged
  borderColor: borderColor ?? undefined,
  borderStyle: hasBorder ? (style.borderStyle ?? "solid") : undefined,
  borderWidth: hasBorder ? `${style.borderWidth ?? 1}px` : undefined,
};
```

Regression-test shape:
- color-only ⇒ still `1px solid` (no regression).
- `borderWidth:4, borderStyle:"dashed"` ⇒ `4px dashed`.
- `borderStyle:"none"` ⇒ no border even with a color.
- unknown `borderStyle` rejected; width clamped 0–12.

## Security Contract

- No new endpoints. `borderWidth` numeric clamp; `borderStyle` enum
  reject-unknown; border color stays through `sanitizeAuthoringCssColor`. No new
  CSS-injection surface.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts`
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (border width/style fields).
- `_docs/_TASKS/TASK-472-01*.md` status; changelog rolled up by TASK-472-06.
