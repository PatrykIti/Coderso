# TASK-539-04-L01: Separate Layer, Reveal, Hover, Tilt, and Magnetic Wrappers

# FileName: TASK-539-04-L01-Separate-Layer-Reveal-Hover-Tilt-And-Magnetic-Wrappers.md

**Parent Subtask:** TASK-539-04
**Priority:** High
**Category:** Pages / Composition CSS / Interaction Contract
**Estimated Effort:** Large
**Dependencies:** TASK-539-04
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Scope and ownership

Sole source writer: `core/services/pages/pageCompositionEffects.tsx`. This leaf also
owns compatibility-expectation updates required before its source gate in
`tests/vitest/pages/page-composition-effects.test.ts` and
`tests/vitest/pages/task-534-interactivity-css.test.ts`. The existing
collision is documented around `:91-117,142-214`; marquee is around `:62-65,96-105`
and magnetic detection around `:286-300`.

The historical filename says wrappers, but the executable contract is the lower-DOM,
present-only composed-variable design below. Do not add unconditional wrapper markup;
the renderer retains only its already-required tilt/layer wrapper and consumes these
variables.

## Implementation Pseudocode

Export one readonly variable-name map and one fixed transform-chain declaration:

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

export const PAGE_BLOCK_GRID_ITEM_ATTRIBUTE =
  "data-page-block-grid-item" as const;
export const PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE =
  "data-page-transform-host" as const;
export const PAGE_BLOCK_TRANSFORM_HOST_SELECTOR =
  '[data-page-transform-host],[data-page-effect^="reveal"] [data-page-block]' as const;
export const PAGE_LAYER_WIDTH_ATTRIBUTE = "data-layer-width" as const;
```

The two selector arms are deliberate. The attribute arm covers block-owned transform
effects; the reveal-descendant arm covers a block inside a section-authored reveal,
because `resolveBlockCompositionAttrs` receives block style and cannot infer the
section's reveal state. Both arms consume the same fixed chain. Consumers import this
selector constant and must not duplicate either literal.

The composed transform order is fixed:

```text
translateY(revealY)
translate(decorationX, decorationY) rotate(decorationRotate) scale(decorationScale)
translateY(hoverY) scale(hoverScale)
rotateX(tiltX) rotateY(tiltY)
translate(magneticX, magneticY)
```

Defaults are `0px`, `0deg`, and scale `1`. Register typed custom properties needed
for smooth keyframe/transition interpolation. Transform-bearing declarations in
decoration keyframes animate only decoration transform variables; transform-bearing
hover declarations use only hover transform variables. Existing non-transform visual
channels such as opacity, filter, and box-shadow remain owned by their effects and must
not be removed. TASK-539-05 changes reveal
CSS to `revealY`; TASK-539-07 changes tilt/magnetic runtime to their variables.
No code after this leaf may assign `style.transform` for those effects. The exported
transform-host and layer-width names are the only selector spellings used by CSS and
renderer. The exported grid-item attribute is a fixed shared selector seam (its value
is the normalized block id) consumed by TASK-539-05 and TASK-539-06; neither consumer
may duplicate any of these strings.

Keep layer anchor placement on the independent `translate` property already used by
`[data-layer-anchor]`. Add fixed CSS for the renderer's present-only
`PAGE_LAYER_WIDTH_ATTRIBUTE="full|auto"`: full stretches to `width:100%`; auto remains bounded
by its containing canvas and must not overflow.

`resolveBlockCompositionAttrs` must:

```ts
if (style?.magnetic === true) dataAttrs["data-magnetic"] = "";
if any block-owned transform effect is active, stamp PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE;
return only safe enum/clamped variable values;
```

Do not stamp `data-magnetic` for false/unset. A section-reveal-only block does not gain
a redundant host attribute; it joins composition through the second selector arm.

Replace marquee selectors with the exact DOM contract:

```text
.cx-marquee-viewport > .cx-marquee-rail > .cx-marquee-segment
```

The viewport hides overflow, the rail is one `display:flex; flex-wrap:nowrap;
width:max-content` animation owner, and each segment is nonshrinking/nowrap. Direction
and speed remain the existing safe attributes/variables. Remove the obsolete
independently animated `.cx-marquee-track` rule.

Every `::before`/`::after` glow overlay for lift/glow-reveal gets
`pointer-events:none`; do not disable pointer events on the interactive content.

## Compatibility and errors

- Static CSS is capability-gated as today; no-effect markup stays byte-identical.
- Existing data attributes remain unless replaced by the explicitly pinned marquee
  structure. Reduced-motion CSS resets variables to neutral values.
- There is no runtime error path in this pure resolver; unknown enums remain omitted.

## Gate test ownership and validation

Update the two named suites' stale marquee/direct-transform expectations before this
source gate. TASK-539-04-L02 owns additive cross-effect cases afterward and must not
re-baseline these compatibility changes.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-composition-effects.test.ts tests/vitest/pages/task-534-interactivity-css.test.ts
git diff --check
```

Rerun any named failing test file once in isolation before classifying the failure.
