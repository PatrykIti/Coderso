# TASK-524-01-L01: Anchor Self-Offset via the CSS `translate:` Property

# FileName: TASK-524-01-L01-Anchor-Translate-Property-CSS.md

**Parent Task:** TASK-524
**Parent Subtask:** TASK-524-01
**Priority:** High
**Category:** Site Render
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

One edit in `core/services/pages/pageCompositionEffects.tsx`: switch the nine
`PAGE_COMPOSITION_EFFECTS_CSS` `[data-layer-anchor="…"]` rules from
`transform:translate(…)` to the independent CSS **`translate:` PROPERTY**. This
frees the anchor self-offset from the `transform` channel so it COMPOSES with a
`transform`-based effect (decoration/hover) on the SAME node — the enabling change
for 524-01-L02's co-location.

## Grounded anchors

- **`core/services/pages/pageCompositionEffects.tsx`
  `PAGE_COMPOSITION_EFFECTS_CSS`** (`export const … = \`` at `:25`) — the nine
  anchor rules, VERIFIED (RE-GREP post-523; the string may have shifted):
  ```css
  [data-layer-anchor="top-left"]{transform:translate(0,0)}       /* :41 */
  [data-layer-anchor="top"]{transform:translate(-50%,0)}         /* :42 */
  [data-layer-anchor="top-right"]{transform:translate(-100%,0)}  /* :43 */
  [data-layer-anchor="left"]{transform:translate(0,-50%)}        /* :44 */
  [data-layer-anchor="center"]{transform:translate(-50%,-50%)}   /* :45 */
  [data-layer-anchor="right"]{transform:translate(-100%,-50%)}   /* :46 */
  [data-layer-anchor="bottom-left"]{transform:translate(0,-100%)}   /* :47 */
  [data-layer-anchor="bottom"]{transform:translate(-50%,-100%)}     /* :48 */
  [data-layer-anchor="bottom-right"]{transform:translate(-100%,-100%)} /* :49 */
  ```
- The `translate` CSS property takes two length/percentage values `x y` (percentages
  resolve against the box's own size, IDENTICAL semantics to `transform:translate(x,y)`
  for the anchor self-offset). `translate` and `transform` are SEPARATE composited
  properties — an effect `transform` (float/lift keyframe or tilt runtime) on the same
  node no longer overwrites the anchor offset.
- These rules are UNSCOPED single-attribute selectors (the scoping to a layered
  canvas is done elsewhere by `[data-composition="layered"] [data-layer]{position:absolute;
  left:var(--layer-x)…}`); the anchor rule only applies the self-offset. Confirm at
  implement time that no other rule in the string writes `transform` on
  `[data-layer-anchor]` (there is none — verified).

## Implementation pseudocode

```css
/* pageCompositionEffects.tsx — PAGE_COMPOSITION_EFFECTS_CSS: replace `transform:translate(x,y)`
   with the `translate:x y` PROPERTY (space-separated, NO comma) on all nine anchor rules.
   Offset values are IDENTICAL; only the CSS property changes. */
[data-layer-anchor="top-left"]{translate:0 0}
[data-layer-anchor="top"]{translate:-50% 0}
[data-layer-anchor="top-right"]{translate:-100% 0}
[data-layer-anchor="left"]{translate:0 -50%}
[data-layer-anchor="center"]{translate:-50% -50%}
[data-layer-anchor="right"]{translate:-100% -50%}
[data-layer-anchor="bottom-left"]{translate:0 -100%}
[data-layer-anchor="bottom"]{translate:-50% -100%}
[data-layer-anchor="bottom-right"]{translate:-100% -100%}
```

- NOTE the syntax difference: `transform:translate(-50%,0)` (comma, inside
  `translate()`) becomes `translate:-50% 0` (space-separated, the `translate`
  property's own grammar). A single value means `y=0` but keep both for clarity.
- NO other line in `PAGE_COMPOSITION_EFFECTS_CSS` changes. The `@keyframes`, the
  `@media (prefers-reduced-motion: no-preference)` gates, the `[data-surface]`/
  `[data-deco]`/`[data-hover]`/`.cx-orb` rules are UNTOUCHED.

## Security note

No attacker-influenceable surface: the nine selectors + fixed offset literals are a
STATIC string with no interpolation, no author value, no new attribute. Colors are
untouched (still `--surface-glow`/etc. fallbacks). Pure CSS-property rename on fixed
offsets.

**Browser-support note (qualifies "no new surface"):** the individual `translate:`
property is a CSS Transforms L2 feature that is NEWER than the universally-supported
`transform:translate()` — baseline Chrome/Edge 104, Firefox 72, Safari 14.1 (shipped
2020–2022), and universally available on the 2026 evergreen baseline this project
targets. So "no new surface" is accurate for the attacker/injection lens (still a
static string, no author value), but the swap DOES adopt a newer (broadly-supported)
CSS capability — it is not a byte-level no-op on older engines. This property choice
is a deliberate composition enabler (frees the anchor self-offset from the `transform`
channel), NOT a support regression on the target baseline. Note the reference site
(`_docs/projekty-domow-wow-site/assets/styles.css`) floats its `.floating-chip` via
the wider-support `transform:translateY` form; 524 uses the individual property
specifically so the anchor offset composes with an effect `transform` on ONE node.

## Vitest test lane

- `tests/vitest/pages/page-composition-effects.test.ts` — assert
  `PAGE_COMPOSITION_EFFECTS_CSS` contains `[data-layer-anchor="bottom-right"]{translate:-100% -100%}`
  (and a couple of the others) and NO longer contains
  `[data-layer-anchor="…"]{transform:translate(`. (The behavioral co-location
  assertions live in 524-01-L03.)

## Regression / breaking-test ownership

- Any existing string-match test in `page-composition-effects.test.ts` asserting
  the OLD `transform:translate(…)` anchor form is a DECLARED breaking rebaseline
  owned by 524-01-L03 (updated to the `translate:` form), NOT drift. If none exist,
  L03 adds the new assertion.

## Hard Invariants

1. Only the nine `[data-layer-anchor]` rules change; every other byte of
   `PAGE_COMPOSITION_EFFECTS_CSS` is identical.
2. Offset values are unchanged (`0`/`-50%`/`-100%`) — visual anchor position is
   pixel-identical; only the composited PROPERTY differs so it composes with a
   sibling `transform`.
3. No animation/reduced-motion change (anchor rules are static offsets).
</content>
