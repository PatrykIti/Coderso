# TASK-471-02-L01: Decouple Self-Alignment From Content
# FileName: TASK-471-02-L01-Decouple-Self-Alignment-From-Content.md

**Parent Subtask:** TASK-471-02
**Priority:** High
**Category:** Pages / Page Editor V2 / Renderer
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Overview

Make `align: center`/`right` center/end the **block box** within its column for
every block type, decoupling block self-alignment from text/content alignment,
without regressing text alignment or legacy layout.

## Current State (verified)

- `pageRendererV2.tsx:397-402` — `pageBlockAlignmentClass`:
  `center→justify-self-center`, `right→justify-self-end`, `left→justify-self-start`.
- `pageRendererV2.tsx:391-395` — `pageBlockWidthClass`: `full→w-full`,
  `auto→w-fit`, unset→none.
- `pageRendererV2.tsx:582-593` — `toPageBlockRenderProps` always joins
  `"max-w-full"` + width class + align class; a `w-full`/stretched grid item
  defeats `justify-self:center`.
- `pageRendererV2.tsx:507-514` — `toPageBlockLayoutStyle` sets
  `textAlign: style.align` (content alignment — keep).
- Section grid: `toPageSectionRenderProps` content is `grid w-full`.
- `align` is **universal**: `getPageEditorControlsForTarget`
  (`pageEditorControlRegistry.ts:870-889`) gives `pageUniversalBlockControls`
  (incl. `block.style.align`) to every block type — it only *removes the Layout-panel
  copy* for `styleAlignTypographyBlockTypes` (relocated to the Typography group).
  The align class is applied to every block frame. So the center defect affects
  all block types uniformly (no media-specific gap).

## Required end-state contract

1. `align:center` centers the block box in its track; `align:right` ends it;
   `align:left`/unset starts it — for **every** block type incl. media.
2. Content/text alignment (`text-align`) still works (no regression).
3. Backward compatible (unset behaves as today); admin canvas == front;
   responsive per-breakpoint align overrides honor the same contract.

## Sub-Tasks

- [ ] **Reproduce first** per block type (text/button/image): record emitted
      `className`/inline style for each `align`; pin the failing layer (frame
      stretch vs grid-vs-flex parent vs Tailwind class availability).
- [ ] Decouple self-alignment from content alignment in the renderer.
- [ ] Make centering robust regardless of default/`full` width: when
      `align ≠ left`, don't force-stretch (resolve to fit width) and center via a
      grid-safe mechanism (`justify-self` + `margin-inline:auto`).
- [ ] Confirm centering works across representative block types incl. media
      (image/video/gallery) — `align` is already universal, so no new control is
      needed; verify the renderer fix benefits them.
- [ ] Verify responsive align overrides in `pageResponsiveCss.ts`.
- [ ] Decide + document full-width+center UX (default: `align` governs the block
      box; content alignment stays via the text controls).
- [ ] Renderer regression coverage for `align × width × block-type`.

## Implementation Pseudocode

```ts
// pageRendererV2.tsx
const isSelfAligned = (a?: PageBlockStyle["align"]) => a === "center" || a === "right";

const effectiveWidthClass = (style?: PageBlockStyle) =>
  isSelfAligned(style?.align) ? "w-fit" : pageBlockWidthClass(style?.width);

const pageBlockSelfAlignClass = (a?: PageBlockStyle["align"]) =>
  a === "center" ? "justify-self-center mx-auto"
  : a === "right" ? "justify-self-end ms-auto"
  : undefined;

export const toPageBlockRenderProps = (block: PageBlockV2): PageBlockRenderProps => ({
  className: joinPageRenderClasses(
    "max-w-full",
    effectiveWidthClass(block.style),
    pageBlockSelfAlignClass(block.style?.align),
  ),
  style: toPageBlockStyle(block),   // textAlign stays = content alignment
  dataAttributes: { /* unchanged */ },
});
```

Notes:
- If reproduction shows `justify-self-*` is absent from the Tailwind build, add
  it to the safelist / confirm the content glob; `mx-auto`/`ms-auto` is the
  grid-independent fallback regardless.
- Mirror `effectiveWidthClass`/self-align in `pageResponsiveCss.ts`.
- Media blocks already receive `block.style.align` (universal control) and the
  align class; the renderer fix above covers them — no new control registration.
  For `isPageBlockVisualElementType` blocks (button/image), confirm the self-align
  class lands on the block frame, not only the inner visual element.

Regression-test shape:
- `align:center`+`width:full` ⇒ not `w-full`; has `justify-self-center`/`mx-auto`.
- `align:right` ⇒ `justify-self-end`/`ms-auto`; `left`/unset ⇒ start (unchanged).
- text-align assertions unchanged; an `image` block centers (was impossible).

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts`
- `bun run test:vitest` (responsive CSS)
- `bun --cwd core lint` / `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (block `align` = block-box self-alignment vs content).
- `_docs/_TASKS/TASK-471-02*.md` status; changelog rolled up by TASK-471-05.
