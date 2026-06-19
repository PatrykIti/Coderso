# TASK-471-02: Block Center Self-Alignment Fix
# FileName: TASK-471-02-Block-Center-Self-Alignment-Fix.md

**Parent Task:** TASK-471
**Priority:** High
**Category:** Pages / Page Editor V2 / Renderer
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

The Layout-panel block `align` control offers `left` / `center` / `right`, but
`center` (and `right`) do not center/end the **block box** within its available
space — the block stays effectively left/full-width. The owner wants `center` to
center the block relative to its available container space, for **all** block
types.

Root cause (verified): `align` is **overloaded** onto two different concerns at
once, and the self-alignment half cannot take effect:

- **Self-alignment** of the block frame in its section/column track is applied as
  a `justify-self-*` utility class
  (`pageRendererV2.tsx:397-402` `pageBlockAlignmentClass`:
  `center→justify-self-center`, `right→justify-self-end`,
  `left→justify-self-start`). The frame is always emitted with `max-w-full`
  (`toPageBlockRenderProps`, lines 582-593) and, when `width:"full"` (the common
  preset/effective default), with `w-full` (`pageBlockWidthClass`, lines 391-395).
  A grid item at `width:100%` fills its track, so `justify-self:center` has
  nothing to shrink-center → the block reads as left/full-width.
- **Content alignment** (text inside the block) is *also* driven by the same
  `align` via inline `textAlign: style.align`
  (`toPageBlockLayoutStyle`, lines 507-514). So for text blocks the only visible
  effect of `center` today is centered text inside a full-width frame — not a
  centered block.

Additionally, several block types do not honor `align` at all in the UI/render
(image / video / gallery / form / collection / embed), so "center an image on
its own" is impossible (gap confirmed during discovery).

---

## Required end-state contract

1. `align: center` centers the block box horizontally within its available
   column/track; `align: right` pushes it to the end; `align: left` keeps it at
   the start. Holds for **every** block type, including media blocks.
2. Content/text alignment continues to work (no regression of `text-align`).
3. Backward compatible: unset `align` ⇒ start/left, unset `width` ⇒ current
   behavior; legacy documents render identically except where the author had
   already chosen `center`/`right` (which now actually applies — this is the fix).
4. Same output on admin canvas and public front; responsive overrides
   (`pageResponsiveCss.ts`) honor the same contract per breakpoint.

---

## Sub-Tasks

- [ ] **Reproduce first.** On the canvas + published front, set `align:center`
      on a text block, a button, and an image; record the emitted
      `className`/inline style per case. Confirm the failing layer (frame
      stretch vs grid-vs-flex parent vs Tailwind class availability) before
      editing. Attach findings to the closure.
- [ ] Decouple **block self-alignment** from **content alignment** in the
      renderer so `center`/`right` move the *frame*, not just the text.
- [ ] Make centering robust regardless of the default/`full` width: when
      `align ≠ left`, the frame must not be force-stretched (drop `w-full`,
      resolve to a content/`fit` width) and must center via a grid-safe
      mechanism (`justify-self` and/or `margin-inline:auto`).
- [ ] Ensure `align` is honored (control present + painted) for the media block
      types currently missing it (image/video/gallery and any other visual
      block), so any block can be self-centered.
- [ ] Verify responsive per-breakpoint align overrides still resolve correctly.
- [ ] Decide + document the UX of full-width + center (a 100%-wide block cannot
      be "centered as a box"): either `center` implies non-full width, or the
      panel distinguishes "Align block" from "Align text". Recommended default:
      `align` governs the **block box**; text/content alignment stays available
      via the existing typography/text controls. Confirm with owner in closure.
- [ ] Add renderer regression coverage asserting the emitted layout for each
      `align` × `width` × block-type combination.

---

## Implementation Pseudocode

```ts
// pageRendererV2.tsx — derive an effective width that lets center/end work,
// and centre via a grid-safe mechanism that does not depend on the frame
// already being narrower than its track.

const isSelfAligned = (align?: PageBlockStyle["align"]) =>
  align === "center" || align === "right";

// When the block is self-aligned, never stretch it to the full track.
const effectiveWidthClass = (style?: PageBlockStyle) =>
  isSelfAligned(style?.align)
    ? "w-fit"                      // shrink to content so it can be positioned
    : pageBlockWidthClass(style?.width);

// Self-alignment placement on the grid item (robust in grid; margin-auto
// also degrades gracefully in non-grid parents).
const pageBlockSelfAlignClass = (align?: PageBlockStyle["align"]) => {
  if (align === "center") return "justify-self-center mx-auto";
  if (align === "right")  return "justify-self-end ms-auto";
  return undefined;               // left/unset: default start
};

export const toPageBlockRenderProps = (block: PageBlockV2): PageBlockRenderProps => ({
  className: joinPageRenderClasses(
    "max-w-full",
    effectiveWidthClass(block.style),
    pageBlockSelfAlignClass(block.style?.align),
  ),
  style: toPageBlockStyle(block),   // textAlign stays here (content alignment)
  dataAttributes: { /* unchanged */ },
});
```

Notes / data flow:
- Keep `toPageBlockLayoutStyle.textAlign` for content alignment (text/inline
  children). The visible block-box centering now comes from
  `pageBlockSelfAlignClass` + a non-stretched width.
- If reproduction shows the dynamically-composed `justify-self-*` classes are
  not in the Tailwind build output, add them to the safelist / verify the
  renderer file is in the content glob — `mx-auto`/`ms-auto` is the
  grid-independent fallback either way.
- Apply the same effective-width/self-align resolution in
  `pageResponsiveCss.ts` so tablet/mobile `align` overrides match.
- For media blocks, ensure the `align` control is registered for those target
  types and the rendered visual element (or its frame) receives the self-align
  class.

Regression-test shape:
- `align:center` + `width:full` ⇒ frame is not `w-full`; carries
  `justify-self-center`/`mx-auto`; centered.
- `align:right` ⇒ `justify-self-end`/`ms-auto`.
- `align:left`/unset ⇒ start (unchanged).
- Text content alignment unaffected (existing `text-align` assertions stay
  green).
- An `image` block with `align:center` centers (was impossible before).

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx`
- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts`
- `bun run test:vitest` (responsive CSS + any layout snapshots)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Closure: live `playwright-cli` smoke — center a text block, a button, and an
  image on a draft, publish, confirm front centering.

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (block `align` = block-box self-alignment vs content
  alignment).
- `_docs/_TASKS/TASK-471*.md` (status), `_docs/_CHANGELOG/` on family closure.
