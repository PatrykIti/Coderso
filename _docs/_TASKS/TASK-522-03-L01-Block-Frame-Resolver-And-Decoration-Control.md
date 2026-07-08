# TASK-522-03-L01: Block-Frame Composition Resolver Wiring + Decoration Control

# FileName: TASK-522-03-L01-Block-Frame-Resolver-And-Decoration-Control.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-03
**Priority:** High
**Category:** Site Render / Admin UI / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Two edits: (1) `pageRendererV2.tsx` block-FRAME region
`renderPageBlockWithFrame` (`:1926`) — call the 522-01-L04
`resolveBlockCompositionAttrs(block.style)` resolver ONCE and stamp its
class/`data-*`/CSS-var + the perspective wrapper + `.cx-glare` on EVERY block
wrapper (this SINGLE edit serves decoration, tilt, hover, glass, layer, marquee —
522-04/05 add NO further frame edit); (2)
`pageEditorControlRegistry.ts` `pageUniversalBlockControls` (`:362`) — append the
`block.decoration.*` control group (DISJOINT id-namespace).

## Grounded anchors

- `renderPageBlockWithFrame` (`pageRendererV2.tsx:1926`) wraps
  `renderPageBlockContent(block, context)` (`:1928`) with the block frame; this is
  where per-block wrapper classes/attrs already attach (align/width/style). VERIFY the
  exact wrapper element + how existing `block.style` classes are applied, and merge
  the composition attrs there.
- `pageUniversalBlockControls: readonly PageEditorControlDefinition[]` (`:362`);
  521-04 did NOT touch this array (icon used per-type `pageBlockControlRegistry`), so
  522 is its first extender. `resolveBlockControls` composes
  `[...universalControls, ...pageBlockControlRegistry[type]]` (`:971`).
- Import (append-only): `resolveBlockCompositionAttrs` (522-01-L04); the composition
  CSS is emitted once by 522-05-L01 (not here).

## Implementation pseudocode

```tsx
// renderPageBlockWithFrame — after computing the existing frame className/style:
const comp = resolveBlockCompositionAttrs(block.style);
// merge comp.dataAttrs + comp.cssVars into the frame wrapper props; if
// comp.perspectiveParent, wrap in an extra <div data-tilt-parent> so the tilt child
// has a perspective ancestor (mirrors reference .hero-showcase>​.tilt-card):
let node = (
  <div className={frameClassName}
       style={{ ...frameStyle, ...comp.cssVars }}
       {...comp.dataAttrs}>
    {comp.glare ? <span className="cx-glare" aria-hidden="true" /> : null}
    {renderPageBlockContent(block, context)}
  </div>
);
if (comp.perspectiveParent) node = <div data-tilt-parent>{node}</div>;
return node;
// PRESENT-ONLY: when block.style has no composition field, comp yields empty
// attrs/vars and perspectiveParent/glare=false ⇒ the wrapper is byte-identical to
// today (no extra div, no glare, no data-*). Guard the extra perspective wrapper +
// glare strictly on the flags so unstyled blocks render exactly as before.
```

Descriptors use the LIVE `control({...})` helper shape
(`pageEditorControlRegistry.ts:152`): `path` is `readonly string[]` (NOT a dotted
string), `input` is from the live union (`select`/`number`/…), enum `options` are a
`readonly string[]` (the enum const — labels ARE the enum strings; no per-option
`{value,label}`), numeric bounds are `clamp:{min,max}` (NOT `min`/`max`), and `panel`/
`target`/`responsive` are REQUIRED. There is NO `showWhen` — delay/duration are always
shown (inert when no decoration motion is set). Decoration applies to ANY block, so it
lives in the universal array. `options: pageBlockDecorationMotions` includes `"none"`
first (the reset — normalize omits it), so no bogus `""` option is needed.

```ts
// pageEditorControlRegistry.ts — append to pageUniversalBlockControls:
control({ id: "block.decoration.motion", panel: "style", target: "block", label: "Decoration motion",
  path: ["style","decoration","motion"], input: "select", responsive: true,
  options: pageBlockDecorationMotions }),   // ["none","float","drift","pulse","orbit","radiate"]
control({ id: "block.decoration.delay", panel: "style", target: "block", label: "Decoration delay",
  path: ["style","decoration","delay"], input: "number", responsive: true,
  clamp: { min: 0, max: 4000 }, unit: "ms" }),
control({ id: "block.decoration.duration", panel: "style", target: "block", label: "Decoration duration",
  path: ["style","decoration","duration"], input: "number", responsive: true,
  clamp: { min: 2000, max: 16000 }, unit: "ms" }),
```

**Note on `data-layer` positioning.** The resolver writes the layered child's position
as `--layer-x`/`--layer-y`/`--layer-z` CSS custom props (plus `data-layer` +
`data-layer-anchor`) into `comp.cssVars`; those only TAKE EFFECT inside a
`data-composition="layered"` ancestor because the 522-01-L04 CSS SCOPES the absolute
rule to `[data-composition="layered"] [data-layer]{position:absolute;left:var(--layer-x)…}`
(NOT an unscoped `[data-layer]`). Outside a layered canvas the child stays in normal
flow — inert/safe.

## Regression-test shape (delegated to 522-03-L02, asserted here)

- A block with `style.decoration.motion:"float"` → the frame wrapper gets
  `data-deco="float"`; `delay`/`duration` → `--deco-delay`/`--deco-duration`; a block
  with `style.tilt:"subtle"` → `data-block-tilt="subtle"` + an outer `data-tilt-parent`
  wrapper + (with `tiltGlare`) a `.cx-glare` child; an UNSTYLED block → NO extra div,
  NO `data-*`, byte-identical wrapper.
- **Lane:** Vitest `tests/vitest/pages/page-renderer-v2.test.tsx` +
  `page-editor-control-registry.test.ts`.

## Hard Invariants

1. ONE frame edit serves all composition fields (522-04/05 add no frame edit).
2. Present-only: unstyled block byte-identical (no perspective wrapper, no glare, no
   data-attr).
3. Decoration enum select maps `"none"` → unset (present-only, normalize omits it —
   no bogus `""` option); keyframe binding gated by reduced-motion in the 522-01-L04
   CSS. Descriptors use the live `control({...})` shape (array `path`, `readonly
   string[]` options, `clamp`, required `panel`/`target`/`responsive`; no
   `showWhen`/`kind`/`min`).
</content>
