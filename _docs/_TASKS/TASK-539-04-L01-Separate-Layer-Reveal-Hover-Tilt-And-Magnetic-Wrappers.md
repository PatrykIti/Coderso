# TASK-539-04-L01: Separate Layer, Reveal, Hover, Tilt, and Magnetic Wrappers

# FileName: TASK-539-04-L01-Separate-Layer-Reveal-Hover-Tilt-And-Magnetic-Wrappers.md

**Parent Subtask:** TASK-539-04
**Priority:** High
**Category:** Pages / Composition CSS / Interaction Contract
**Estimated Effort:** Large
**Dependencies:** TASK-539-03-L04
**Status:** ✅ Done
**Completed:** 2026-08-20
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Sole ownership

Write only:

- `core/services/pages/pageCompositionEffects.tsx`
- compatibility/changed-behavior expectations in
  `tests/vitest/pages/page-composition-effects.test.ts` and
  `tests/vitest/pages/task-534-interactivity-css.test.ts`

Ground by symbols `PAGE_COMPOSITION_EFFECTS_CSS`,
`PAGE_INTERACTIVITY_CSS`, `resolveBlockCompositionAttrs`, and
`resolveSectionCompositionAttrs`, not historical line numbers. Baselines are
332/407/72 lines; every touched file must remain `<=1000`.

Do not export/own any grid-placement symbol. The historical filename is retained, but
no unconditional wrapper is added.

## Implementation Pseudocode

Export one vocabulary and one selector:

```ts
export const PAGE_BLOCK_TRANSFORM_VARIABLES = {
  revealY: "--cx-reveal-y",
  decorationX: "--cx-decoration-x",
  decorationY: "--cx-decoration-y",
  decorationRotate: "--cx-decoration-rotate",
  decorationScale: "--cx-decoration-scale",
  hoverY: "--cx-hover-y",
  hoverScale: "--cx-hover-scale",
  tiltX: "--cx-tilt-x",
  tiltY: "--cx-tilt-y",
  magneticX: "--cx-magnetic-x",
  magneticY: "--cx-magnetic-y",
} as const;

export const PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE =
  "data-page-transform-host" as const;
export const PAGE_BLOCK_TRANSFORM_HOST_SELECTOR =
  "[data-page-transform-host]" as const;
export const PAGE_LAYER_WIDTH_ATTRIBUTE = "data-layer-width" as const;
export const PAGE_MARQUEE_REPLICA_ATTRIBUTE =
  "data-page-marquee-replica" as const;
export const PAGE_MARQUEE_REPLICA_SELECTOR =
  "[data-page-marquee-replica]" as const;
```

The exact host formula is:

```text
translateY(revealY)
translate(decorationX, decorationY) rotate(decorationRotate) scale(decorationScale)
translateY(hoverY) scale(hoverScale)
rotateX(tiltX) rotateY(tiltY)
translate(magneticX, magneticY)
```

Use neutral fallbacks `0px`, `0deg`, and `1`. The map contains exactly eleven keys:
one reveal, four decoration, two hover, two tilt, and two magnetic variables.
Every transform-bearing decoration keyframe writes only the decoration variables:
`float` animates decoration Y, `drift` animates decoration X/Y/scale, `pulse`
animates decoration scale, and `orbit` animates decoration rotate. `radiate` keeps
its existing box-shadow animation and does not acquire a transform. Hover
declarations write only hover variables; tilt/magnetic runtime consumers later write
only their variables. Ambient-orb drift uses the same decoration channel and host
formula rather than a separate whole-transform animation. Preserve independent
opacity/filter/box-shadow channels and register typed properties needed for
interpolation.

`resolveBlockCompositionAttrs` stamps `data-magnetic=""` only for `true` and stamps
the transform host only when a block-owned transform effect is active. It returns
only safe present values. Section reveal and ambient-orb DOM context are unknown here:
TASK-539-05 stamps the same host on those actual elements. Do not invent a descendant
selector arm.

Keep layer anchors on `translate`. Retain present-only full/auto layer-width CSS.

Marquee CSS is exactly
`.cx-marquee-viewport > .cx-marquee-rail > .cx-marquee-segment`: viewport clips,
one flex nowrap `width:max-content` rail animates, and segments are nonshrinking.
Two equal segments form an approved seamless track; the same CSS remains valid for
the one-segment safety fallback. Remove `.cx-marquee-track`.
Direction/speed/reduced-motion remain. The two fixed replica constants above are
structural/runtime vocabulary only: this leaf owns and exports their exact bytes,
TASK-539-05 stamps the attribute only on a replica-safe second segment, and
TASK-539-07 imports the selector before binding any candidate.

Every lift/glow-reveal `::before`/`::after` overlay gets `pointer-events:none`; hosts
remain interactive.

## Compatibility and handoff

No-effect resolver/CSS emission stays present-only. L01 proves only the pure CSS/
resolver and fixed replica-vocabulary contract; it does not claim renderer stamping,
runtime movement, or clone behavior before TASK-539-05/07.

## Validation and line receipt

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- \
  tests/vitest/pages/page-composition-effects.test.ts \
  tests/vitest/pages/task-534-interactivity-css.test.ts
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
wc -l core/services/pages/pageCompositionEffects.tsx \
  tests/vitest/pages/page-composition-effects.test.ts \
  tests/vitest/pages/task-534-interactivity-css.test.ts
git diff --check
```

Every receipt must be `<=1000`; rerun a named failure alone.
