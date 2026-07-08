# TASK-523-02: Occlusion-Proof Cursor Spotlight (CSS overlay layering + mix-blend-mode)

# FileName: TASK-523-02-Occlusion-Proof-Cursor-Spotlight.md

**Parent Task:** TASK-523
**Priority:** High
**Category:** Site Render / Accessibility
**Estimated Effort:** Small
**Status:** ✅ Done
**Depends on:** TASK-523-01 (lands first; edits the SAME `pageRendererV2.tsx` render
region — 523-01-L02 owns `rootStyle`/`<Root>`, 523-02 owns the DISJOINT
`PAGE_SPOTLIGHT_CSS` + spotlight overlay `<div>`), TASK-521-05-L03 (the spotlight
overlay + `PAGE_SPOTLIGHT_CSS` this leaf fixes).

---

## Scope

Fix the 521 cursor-spotlight so it is VISIBLE over opaque section backgrounds
(today `z-0` paints it BEHIND them, so it only shows through translucent SVG/glass).
Raise the overlay above the opaque section backgrounds and blend it additively
(`mix-blend-mode: screen`) so it ADDS light without hiding content or blocking
clicks (`pointer-events: none` stays). Split the overlay's static positioning into a
NON-gated base rule (position/inset/z-index/mix-blend-mode/pointer-events) while
keeping the moving radial-gradient inside the `@media (prefers-reduced-motion:
no-preference)` gate — so reduced-motion users get a correctly-layered but MOTIONLESS
overlay. No model change, no new key, no migration, no dependency.

**Single-writer:** `pageRendererV2.tsx` — 523-02-L01 owns `PAGE_SPOTLIGHT_CSS`
(`:2700`) + the spotlight overlay `<div>` (`:2879`). Disjoint from 523-01-L02's
`rootStyle`/`<Root>` region (`:2847-2861`). 523-02 rebases onto 523-01.

## Leaves

| Leaf | Title | File / region |
|------|-------|---------------|
| TASK-523-02-L01 | CSS + overlay occlusion fix | `pageRendererV2.tsx` — `PAGE_SPOTLIGHT_CSS` (`:2700`) split into a non-gated base rule + a reduced-motion-gated gradient rule; overlay `<div>` (`:2879`) className + a stable `data-page-spotlight-overlay` marker |
| TASK-523-02-L02 | Tests | Vitest — `tests/vitest/pages/page-renderer-v2.test.tsx` (mix-blend-mode:screen + raised z-index + pointer-events-none + reduced-motion gate + spotlight-off byte-identity) |

**Land order:** L01 → L02.

## Coordination

- `pageRendererV2.tsx` — 523-02-L01 owns `PAGE_SPOTLIGHT_CSS` (`:2700`) and the
  overlay `<div>` (`:2879`) ONLY. Do NOT touch `rootStyle`/`<Root>` (523-01-L02) or
  the composition emit (522-05).
- The overlay keeps its stable `data-page-spotlight-overlay` selector hook so
  `PAGE_SPOTLIGHT_CSS` targets it; add an overlay `className` that expresses the
  raised layering + blend (or ship it inside the non-gated base rule — L01 grounds
  the exact split).

## Hard Invariants

1. The spotlight overlay renders ABOVE opaque section backgrounds (raised z-index)
   and blends additively (`mix-blend-mode: screen`) — it ADDS light, never hides
   content.
2. `pointer-events: none` stays — the overlay never blocks clicks.
3. The static positioning (position/inset/z-index/mix-blend-mode/pointer-events) is a
   NON-gated base rule; the moving radial-gradient background stays inside `@media
   (prefers-reduced-motion: no-preference)` — reduce users get a correctly-layered
   MOTIONLESS overlay (no gradient), nothing breaks.
4. Present-only / byte-identity: `cursorSpotlight` OFF ⇒ NO overlay, NO `<style
   data-page-spotlight-css>`, no change to the `<Root>` — byte-identical vs post-522.
5. No model change, no new settings key, no migration, no dependency.

## Definition of done

The cursor spotlight is visible over opaque section backgrounds (raised z-index +
`mix-blend-mode:screen`), click-through (`pointer-events:none`), and moves only for
reduced-motion:no-preference users (gradient still gated; base layering ungated); a
spotlight-off page is byte-identical; tests + gates green.
