# TASK-525-01-L01: Decouple Full-Bleed Background From Content Max-Width (Centered Inner Content Wrapper)

# FileName: TASK-525-01-L01-Decouple-Full-Bleed-Background-From-Content-Max-Width.md

**Parent Task:** TASK-525
**Parent Subtask:** TASK-525-01
**Priority:** High
**Category:** Site Render / Content (Pages)
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

One structural render edit in `core/services/pages/pageRendererV2.tsx`: for a
full-bleed section (today the `"full-width"` variant; also `style.fullBleed` if
525-01-L02 adds the flag), paint the section BACKGROUND/box full-bleed to the
viewport (100vw) while wrapping the CONTENT grid in a CENTERED inner container
capped at `section.layout.maxWidth` (`margin:0 auto`), INDEPENDENT of the bleeding
element. The non-full-width path stays byte-identical. NO model change in THIS leaf
(the flag, if taken, is 525-01-L02); this leaf keys the bleed off the existing
`template.variant === "full-width"` (extend to `|| style.fullBleed` only after
L02 lands).

## Grounded anchors (RE-GREP at implement time — 523 shifts lines)

- **`toPageSectionStyle`** (`pageRendererV2.tsx:376`) — the style object applied to
  the SINGLE content `<div>`; `:404` is
  `maxWidth: template.variant === "full-width" ? "none" : `${section.layout.maxWidth}px``,
  `:405` is `margin:"0 auto"`, and `backgroundColor`/`backgroundImage` at
  `:390-393`. This ONE style object carries background + maxWidth + margin
  together, which is exactly why the full-width variant's `maxWidth:"none"` lets
  content spread with the bleed.
- **`toPageSectionRenderProps`** (`:530`) — builds `sectionClassName`
  (`baseSectionClassName = template.variant === "full-width" ? "w-full" : "w-full
  px-4 py-6"`, `:556`) and `contentClassName` (`"grid w-full" …`, `:559-566`), plus
  `style: toPageSectionStyle(section)` (`:568`).
- **`PageSectionContent`** (`:2485`) — renders the SINGLE `<div
  className={renderProps.contentClassName} style={renderProps.style}
  {...pageSectionContentDataAttributes} …>` (`:2560-2566`) holding background +
  grid + maxWidth.
- **`PageSectionRender`** (`:2611`) — `<section className={
  renderProps.sectionClassName} …>` (`:2647`) wrapping `PageSectionContent`
  directly OR inside `[data-parallax-inner]` (`:2666-2680`).
- Reference structure: `_docs/projekty-domow-wow-site/index.html` —
  `.container{width:min(var(--container),calc(100% - 40px));margin:0 auto}` sits
  INSIDE a full-bleed section (background on the outer, content in `.container`).

## Implementation pseudocode

> **DECIDE the exact structure at implement time against the post-523 tree.** Two
> viable shapes; both keep the non-full-width path byte-identical. Prefer the
> option that leaves the non-full-width DOM untouched.

```tsx
// pageRendererV2.tsx

// (A) SPLIT bleed vs cap: keep the background on the section box; the content grid
//     gets a centered max-width INNER wrapper for the full-bleed case ONLY.
//
// toPageSectionStyle — stop dropping the content cap for full-width. The content
// cap is ALWAYS section.layout.maxWidth; the BLEED is expressed as render
// structure, not maxWidth:"none".
const isFullBleed = template.variant === "full-width"; // + `|| section.style.fullBleed` AFTER 525-01-L02
const GUTTER = "20px"; // reference .container gutter: calc(100% - 40px) == 20px each side
return {
  /* …bg, padding, borderRadius, shadow, gap… */
  // content cap is ALWAYS the authored maxWidth (no more "none") AND keeps a min
  // side gutter below max-width — mirrors the reference `.container`
  // `width:min(var(--container),calc(100% - 40px))` (styles.css:49), so full-bleed
  // content never touches the viewport edges on narrow screens:
  width: `min(${section.layout.maxWidth}px, calc(100% - 2 * ${GUTTER}))`,
  maxWidth: `${section.layout.maxWidth}px`,
  margin: "0 auto",
};
// The FULL-BLEED (100vw) now lives on the OUTER section box, NOT the content div:
//   sectionClassName for full-bleed → "w-full" + a full-bleed utility/inline
//   (e.g. width:100vw with margin-left:calc(50% - 50vw)) so the section paints
//   edge-to-edge while the content div stays centered at maxWidth.
// baseSectionClassName (toPageSectionRenderProps): for full-bleed keep the
//   background-bleed on <section>; the content <div> already caps at maxWidth +
//   margin:auto (the reference .container inside the full-bleed section).

// (B) INNER WRAPPER: keep toPageSectionStyle's background on the current content
//     <div>, but for full-bleed WRAP the grid in an extra centered max-width div:
//   <section class="w-full" style={bleed-bg}>            // full-bleed bg
//     <div class="mx-auto" style={{maxWidth, margin:"0 auto"}}>   // content cap
//       <grid …>{blocks}</grid>
//     </div>
//   </section>
// Only emitted for the full-bleed case (needsContentWrapper); non-full-width
// renders the EXISTING single div unchanged → byte-identical.

// WHICHEVER: verify the parallax wrapper ([data-parallax-inner], :2666) still
// nests correctly (bleed bg outside, content cap inside), and that
// pageSectionContentDataAttributes / data-page-section-layout-mode stay on the
// SAME node the tests/editor query.
```

- **Preserve byte-identity for non-full-width.** When `!isFullBleed`, the DOM
  MUST be identical to the post-523 output — same single content `<div>`, same
  `maxWidth:${section.layout.maxWidth}px`, same attributes, and NO new `width:
  min(…)` gutter literal. Guard both the new wrapper AND the
  `width:min(maxWidth, calc(100% - 2*gutter))` gutter behind the full-bleed
  branch (the gutter is the reference `.container` behavior, which only applies to
  the decoupled full-bleed content wrapper).
- **Minimum side gutter (reference `.container`).** The reference
  `.container{width:min(var(--container),calc(100% - 40px));margin:0 auto}`
  (`styles.css:49`) always keeps a 40px total gutter (20px each side) on viewports
  narrower than the cap. The full-bleed inner content wrapper MUST mirror this so
  content does not touch the screen edges below max-width — the section base
  className is `w-full` with NO horizontal padding (`:556`; the non-full-width base
  is `w-full px-4 py-6`), so the centered inner wrapper needs the
  `width:min(${maxWidth}px, calc(100% - 2 * 20px))` cap (or an equivalent `px-5` /
  `clamp` gutter). Assert the narrow-viewport gutter in the L03 render/live tests.
- **`100vw` bleed literal** (option A) is a FIXED literal (e.g.
  `width:100vw;margin-left:calc(50% - 50vw)` or the project's existing bleed
  helper from `3eac13f9`) — check whether the `3eac13f9` bleed already established
  a bleed utility to reuse rather than inventing a second mechanism.
- Do NOT change `section.layout.maxWidth` clamp/semantics; do NOT touch the grid
  column classes (`pageSectionGridClass`) or alignment classes.

## Security note

Pure render-structure change. The `100vw` bleed, the `margin:0 auto` centering, and
the `min(…, calc(100% - 2 * 20px))` gutter are FIXED literals;
`section.layout.maxWidth` is an already-clamped number
(`pageDocumentV2.ts:2405`, `readNumber` 320..1920) emitted as `${n}px` exactly as
today. No new author-controlled value reaches CSS, no new markup accepting author
strings, no URL, no interpolation. Background sanitization
(`sanitizeAuthoringCssColor` / `sanitizeAuthoringMediaUrl`, `:379-393`) is
unchanged.

## Vitest test lane

- `tests/vitest/pages/page-renderer-v2.test.tsx` — full-bleed structure (bg
  full-bleed; content capped at `section.layout.maxWidth`, centered) + non-full-
  width byte-identity. Authored in 525-01-L03 (which also rebaselines the OLD
  full-width width assertion).

## Regression / breaking-test ownership

- **OWNED breaking-test change (rebaselined in 525-01-L03).** Any existing
  assertion that a `full-width` section's content style has `maxWidth:"none"` (a
  `toPageSectionStyle` / section-width test in `page-renderer-v2.test.tsx`) is now
  WRONG behavior and is UPDATED to the new correct output (content capped at
  `section.layout.maxWidth`; background full-bleed). Grep the test suite for
  `"full-width"` + `maxWidth` before editing render code so the owned assertion is
  found and rebaselined, NOT left to fail as drift.

## Hard Invariants

1. Full-bleed background decoupled from content cap: full-width section box paints
   100vw; content grid centered at `section.layout.maxWidth` (`margin:auto`) with a
   min side gutter (`width:min(${maxWidth}px, calc(100% - 2 * 20px))`) so content
   never touches the viewport edges below max-width — mirrors the reference
   `.container` `calc(100% - 40px)` (`styles.css:49`).
2. Non-full-width path byte-identical to post-523 (no new wrapper/attribute, no new
   `width:min(…)` gutter literal — the gutter is full-bleed-only).
3. No model/schema change in THIS leaf; bleed keyed off `template.variant ===
   "full-width"` (extend to `|| style.fullBleed` only after 525-01-L02).
4. `100vw` + centering are fixed literals; `section.layout.maxWidth` emitted as
   `${n}px` unchanged; no new author-controlled CSS surface.
