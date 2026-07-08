# TASK-524-01: Co-locate Surface With Its Transform Effect (Anchor→`translate` Property; Single-Node Surface+Effect)

# FileName: TASK-524-01-Colocate-Surface-With-Transform-Effect.md

**Parent Task:** TASK-524
**Priority:** High
**Category:** Site Render / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Depends on:** TASK-522 (landed), TASK-523 (branch-point — 524 branches from the
post-523 HEAD; re-grep anchors post-523).

---

## Scope

The "glass floats with content" fix. Two source edits + one owned test rebaseline:
(1) `pageCompositionEffects.tsx` — switch the nine
`PAGE_COMPOSITION_EFFECTS_CSS` `[data-layer-anchor="…"]` rules from
`transform:translate(…)` to the independent CSS **`translate:` PROPERTY**, so the
anchor self-offset COMPOSES with a `transform`-based effect on ONE node.
(2) `pageRendererV2.tsx` — rework `splitBlockComposition` so a transform-DECORATION
(`float`/`drift`/`pulse`/`orbit`) + transform-HOVER (`lift`/`lift-glow`/`scale`) +
`data-surface` all stay on the SAME node (the frame). TILT keeps its inner node
(needs a perspective parent). (3) Update 522's placement tests to the new correct
placement (OWNED breaking change) + add a "glass+float move together" test.

This subtask does NOT add any model/schema/control — it is purely the co-location
of already-resolved attrs. 524-02 (independent tint) lands after it.

## Leaves

- **524-01-L01** — anchor→`translate`-property CSS
  (`pageCompositionEffects.tsx` `PAGE_COMPOSITION_EFFECTS_CSS`).
- **524-01-L02** — `splitBlockComposition` co-location
  (`pageRendererV2.tsx`).
- **524-01-L03** — update placement tests (owned breaking rebaseline) + new
  "glass+float move together" render test.

## Hard Invariants (subtask)

1. The anchor rules become STATIC `translate:` offsets (no animation) — motion
   behavior + reduced-motion gates unchanged.
2. Surface + transform decoration/hover co-locate on ONE node (the frame); the
   anchor self-offset rides the free `translate:` property so it never clobbers
   the effect `transform`, and vice-versa.
3. Tilt still rides an inner node under a `data-tilt-parent` frame (perspective
   parent needed) — tilt + decoration on one block is a documented edge, not
   regressed.
4. Present-only: an unstyled block → `splitBlockComposition` byte-identical (no
   attrs, no inner wrapper) on both render paths.
5. 522's placement assertions are rebaselined to the new placement (declared
   breaking-test change, no weakened behavior assertion).

## Definition of done

A glass block with a float/drift/pulse/orbit decoration or a lift/scale hover
animates the WHOLE glass surface (surface + effect on one node); anchored
`.floating-chip`-style blocks keep their corner offset via the `translate:`
property while floating via `transform`; tilt combos unchanged; 522 placement
tests rebaselined + a "glass+float move together" test added; gates green;
unstyled blocks byte-identical.
</content>
