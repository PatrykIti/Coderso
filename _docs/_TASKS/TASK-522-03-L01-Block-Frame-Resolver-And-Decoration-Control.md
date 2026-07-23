# TASK-522-03-L01: Block-Frame Composition Resolver Wiring + Decoration Control

# FileName: TASK-522-03-L01-Block-Frame-Resolver-And-Decoration-Control.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-03
**Priority:** High
**Category:** Site Render / Admin UI / Accessibility
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Executable leaf. Two edits in `pageRendererV2.tsx` (the SAME logical frame seam, two
adjacent functions) + one control edit:
(1a) **`toPageBlockRenderProps` (`:748`)** — the SOLE builder of the block frame's
`className`/`style`/`dataAttributes` (the object that carries `data-block-id` and is
consumed by BOTH the front `PageBlockFrame` (`:2039`) AND the admin canvas's
`renderBlockFrame` callback, `PageAuthoringCanvas.tsx:1038-1063`). Merge the **frame-level**
composition attrs (layer positioning `data-layer`/`data-layer-anchor`/`--layer-x/y/z`,
surface/glow `data-surface`/`--surface-glow`, marquee, non-transform hover, and
`data-tilt-parent` perspective) into the returned record so they ride the REAL
`[data-block-id]` frame on BOTH render paths (this is the element `pageResponsiveCss`
targets for per-device `--layer-*`, finding 4).
(1b) **`renderPageBlockWithFrame` (`:2009`)** — a pure DELEGATOR (calls
`renderPageBlockContent` once, then dispatches to `context.renderBlockFrame` OR
`<PageBlockFrame>`). Wrap the rendered `content` in an INNER effect wrapper carrying the
TRANSFORM-writing effects (`data-block-tilt`/`data-deco`/transform `data-hover`) + `.cx-glare`
+ block ambient-orb spans, THEN hand the wrapped content to the EXISTING two branches
UNCHANGED (preserving the canvas selection/toolbar chrome — do NOT replace the
`context.renderBlockFrame` branch with a self-built div).
(2) `pageEditorControlRegistry.ts` `pageUniversalBlockControls` (`:362`) — append the
`block.decoration.*` control group (DISJOINT id-namespace).

This single-writer seam (both frame functions) serves decoration, tilt, hover, glass,
layer, marquee — 522-04/05 add NO further frame edit.

## Grounded anchors

- **`toPageBlockRenderProps` (`pageRendererV2.tsx:748`)** builds
  `{ className: join(width/align classes), style: toPageBlockStyle(block), dataAttributes:
  { "data-page-block", [PAGE_BLOCK_ID_ATTRIBUTE]: block.id } }`. It is the ONE feed point
  for BOTH paths: front `PageBlockFrame` (`:2039`) calls it and renders
  `<div className style {...dataAttributes}>`; the canvas `renderBlockFrame` callback
  (`PageAuthoringCanvas.tsx:1041,1056,1062-1063`) spreads `renderProps.className/style/
  dataAttributes` onto its OWN selection-chrome div. Merging composition attrs HERE lands
  them on the real frame on both paths (added to this leaf's sole-writer region).
- **`renderPageBlockWithFrame` (`:2009`)** is a DELEGATOR: `content =
  renderPageBlockContent(block, context)` (`:2011`); `renderProps = toPageBlockRenderProps(block)`
  (`:2012`); if `context.renderBlockFrame` → `<FragmentLike>{context.renderBlockFrame({block,
  content, renderProps, …})}</FragmentLike>` (`:2013-2027`); else `<PageBlockFrame key block>
  {content}</PageBlockFrame>` (`:2029`). It does NOT build the styled wrapper itself — so the
  INNER effect wrapper is inserted around `content` here, and the frame attrs ride
  `toPageBlockRenderProps`.
- `PAGE_BLOCK_ID_ATTRIBUTE = "data-block-id"` (`pageResponsiveCss.ts:67`); per-device
  block CSS targets `blockSelector(id) = [data-block-id="…"]` (`:155`, `:660`) — i.e. the
  frame built by `toPageBlockRenderProps`. Layer positioning MUST ride that element so the
  522-05-L02 per-device `--layer-*` deltas reach it (finding 4).
- `pageUniversalBlockControls: readonly PageEditorControlDefinition[]` (`:362`);
  521-04 did NOT touch this array (icon used per-type `pageBlockControlRegistry`), so
  522 is its first extender. `resolveBlockControls` composes
  `[...universalControls, ...pageBlockControlRegistry[type]]` (`:971`).
- Import (append-only): `resolveBlockCompositionAttrs` (522-01-L04); the composition
  CSS is emitted once by 522-05-L01 (not here).

## Implementation pseudocode

```tsx
// ── Helper (this leaf) — split the L04 resolver output into FRAME-level attrs (ride the
//    real [data-block-id] frame via toPageBlockRenderProps) vs INNER effect-wrapper attrs
//    (a child node that animates its OWN transform). Pure; present-only (empty in→empty out).
//
// WHY the split (fixes the anchor-transform clobber + finding 4 per-device layer):
//  - The layer anchor CSS `[data-composition="layered"] [data-layer-anchor]{transform:
//    translate(...)}` writes `transform` on the layered child. EVERY transform-writing
//    effect ALSO writes transform on its node: tilt runtime (rotateX/Y on [data-block-tilt]),
//    decoration keyframes (cx-float/drift/pulse/orbit on [data-deco]), hover lift/scale
//    ([data-hover]). If both land on ONE node, the effect transform OVERWRITES the anchor
//    translate — the reference `.floating-chip` (decoration:"float" + layer{anchor}) loses
//    its corner offset.
//  - pageResponsiveCss emits per-device `--layer-x/y/z` on `[data-block-id]` (the FRAME).
//    CSS custom props inherit DOWNWARD, so the layer positioning MUST live on the frame (or
//    a descendant) — NEVER on an ancestor wrapper (an ancestor never receives a var set on
//    the frame). FIX: keep layer positioning + anchor ON THE FRAME (data-block-id) and move
//    the transform-writing EFFECT to an INNER child. Frame transform = anchor translate;
//    inner transform = effect. No clash; per-device --layer-* reaches the frame directly.
function splitBlockComposition(style?: PageBlockStyleV2) {
  const comp = resolveBlockCompositionAttrs(style);   // L04: {dataAttrs, cssVars, perspectiveParent, glare, ambientOrbs}
  const TRANSFORM_DECOS  = new Set(["float","drift","pulse","orbit"]); // NOT "radiate" (box-shadow)
  const TRANSFORM_HOVERS = new Set(["lift","lift-glow","scale"]);      // glow-reveal = opacity (frame ok)
  const deco  = comp.dataAttrs["data-deco"];
  const hover = comp.dataAttrs["data-hover"];
  const effectToInner = new Set<string>();            // attr keys that must ride the inner node
  if (comp.perspectiveParent) effectToInner.add("data-block-tilt");          // tilt (perspective→frame)
  if (deco && TRANSFORM_DECOS.has(deco)) effectToInner.add("data-deco");      // transform decoration
  if (hover && TRANSFORM_HOVERS.has(hover)) effectToInner.add("data-hover");  // transform hover
  const INNER_VAR_KEYS = ["--deco-delay","--deco-duration"];                  // effect timing vars
  const frameAttrs: Record<string,string> = {}; const frameVars: Record<string,string> = {};
  const innerAttrs: Record<string,string> = {}; const innerVars: Record<string,string> = {};
  for (const [k,v] of Object.entries(comp.dataAttrs)) (effectToInner.has(k) ? innerAttrs : frameAttrs)[k] = v;
  for (const [k,v] of Object.entries(comp.cssVars))   (INNER_VAR_KEYS.includes(k) ? innerVars : frameVars)[k] = v;
  // tilt needs a perspective PARENT: the frame is the parent of the inner tilt node.
  if (comp.perspectiveParent) frameAttrs["data-tilt-parent"] = "";
  const needsInner = effectToInner.size > 0 || comp.glare || comp.ambientOrbs;
  return { frameAttrs, frameVars, innerAttrs, innerVars, needsInner,
           glare: comp.glare, ambientOrbs: comp.ambientOrbs };
}

// ── (1a) toPageBlockRenderProps (:748) — merge the FRAME-level composition attrs so BOTH
//    the front PageBlockFrame and the canvas renderBlockFrame callback carry them on the
//    real [data-block-id] element (present-only: empty when unstyled → byte-identical):
export const toPageBlockRenderProps = (block: PageBlockV2): PageBlockRenderProps => {
  const s = splitBlockComposition(block.style);
  return {
    className: joinPageRenderClasses("max-w-full",
      pageBlockEffectiveWidthClass(block.style), pageBlockAlignmentClass(block.style?.align)),
    style: { ...toPageBlockStyle(block), ...s.frameVars },
    dataAttributes: { "data-page-block": block.type, [PAGE_BLOCK_ID_ATTRIBUTE]: block.id, ...s.frameAttrs },
  };
};

// ── (1b) renderPageBlockWithFrame (:2009) — wrap `content` in the INNER effect wrapper,
//    then hand it to the EXISTING two branches UNCHANGED (canvas chrome preserved):
const renderPageBlockWithFrame = (block: PageBlockV2, context: PageBlockRenderContext) => {
  if (!context.includeHiddenBlocks && !block.visibility.visible) return null;
  const s = splitBlockComposition(block.style);
  let content = renderPageBlockContent(block, context);
  if (s.needsInner) {
    // ONE inner wrapper carrying the transform-writing effect attrs + glare + orbs. It is a
    // DESCENDANT of the frame, so the frame's --layer-* (incl. per-device) inherit down and
    // the frame's anchor translate is isolated from this node's effect transform.
    content = (
      <div style={s.innerVars} {...s.innerAttrs}>
        {s.glare ? <span className="cx-glare" aria-hidden="true" /> : null}
        {s.ambientOrbs ? (<>
          {/* block ambient-orbs needs REAL child spans (glass/grid/glow self-paint via
             ::before/::after; orbs do not) — mirrors the section emit (522-05-L01). */}
          <span className="cx-orb cx-orb-a" aria-hidden="true" data-deco="drift" />
          <span className="cx-orb cx-orb-b" aria-hidden="true" data-deco="drift" style={{ ['--deco-delay']:'1500ms' }} />
        </>) : null}
        {content}
      </div>
    );
  }
  const renderProps = toPageBlockRenderProps(block);   // now carries the FRAME composition attrs
  if (context.renderBlockFrame) {
    return (
      <FragmentLike key={block.id}>
        {context.renderBlockFrame({ block, content, renderProps, blockPath: context.blockPath,
          depth: context.depth, slotKey: context.slotKey, parentBlock: context.parentBlock })}
      </FragmentLike>
    );
  }
  return <PageBlockFrame key={block.id} block={block}>{content}</PageBlockFrame>;
};
// PRESENT-ONLY: no composition field ⇒ splitBlockComposition yields empty frame/inner
// maps + needsInner=false ⇒ toPageBlockRenderProps output is byte-identical to today AND
// no inner wrapper is added — both render paths unchanged. The inner wrapper appears ONLY
// when a transform-writing effect / glare / orbs is authored.
// NOTE: PageBlockFrame (:2039) rebuilds its props via toPageBlockRenderProps(block), so it
// picks up the frame composition attrs automatically — no separate edit to PageBlockFrame.
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
**`responsive:false`** on ALL decoration controls: decoration is stamped as a base-only
`data-deco` class (`pageResponsiveCss.ts` cannot express a per-breakpoint class/animation
delta against the inline base — verified), so a per-device decoration override would be a
silent no-op; do NOT offer it (finding-6 fix; matches parent Acceptance #7). Per-device
"hide the badge" uses the existing per-device block visibility.

```ts
// pageEditorControlRegistry.ts — append to pageUniversalBlockControls:
control({ id: "block.decoration.motion", panel: "style", target: "block", label: "Decoration motion",
  path: ["style","decoration","motion"], input: "select", responsive: false,
  options: pageBlockDecorationMotions }),   // ["none","float","drift","pulse","orbit","radiate"]
control({ id: "block.decoration.delay", panel: "style", target: "block", label: "Decoration delay",
  path: ["style","decoration","delay"], input: "number", responsive: false,
  clamp: { min: 0, max: 4000 }, unit: "ms" }),
control({ id: "block.decoration.duration", panel: "style", target: "block", label: "Decoration duration",
  path: ["style","decoration","duration"], input: "number", responsive: false,
  clamp: { min: 2000, max: 16000 }, unit: "ms" }),
```

**Note on `data-layer` positioning (finding 4 contract — stated identically in
522-05-L02).** The layer positioning (`data-layer` + `data-layer-anchor` +
`--layer-x/y/z`) rides the **FRAME** (`[data-block-id]`, via `toPageBlockRenderProps`) —
NOT an outer wrapper. This is deliberate: `pageResponsiveCss` (522-05-L02) emits the
per-device `--layer-x/y/z` overrides on `blockSelector(id) = [data-block-id]`
(`pageResponsiveCss.ts:660`), and CSS custom props inherit DOWNWARD, so the consuming
`[data-composition="layered"] [data-layer]{left:var(--layer-x)…}` rule must be on the
frame itself or a descendant — an ancestor wrapper would NEVER receive the frame's var.
The transform-writing EFFECT is what moves to the INNER descendant instead, so the frame's
anchor translate and the inner effect transform never collide. Those rules only TAKE EFFECT
inside a `data-composition="layered"` ancestor (the 522-01-L04 CSS SCOPES the absolute rule
to `[data-composition="layered"] [data-layer]`, NOT an unscoped `[data-layer]`); outside a
layered canvas the child stays in normal flow — inert/safe.

## Regression-test shape (delegated to 522-03-L02, asserted here)

- Both render paths carry the frame attrs (assert via `toPageBlockRenderProps`): a
  `data-surface:"glass"` block → `renderProps.dataAttributes["data-surface"]==="glass"`;
  the front `PageBlockFrame` output AND a canvas-mode render (`context.renderBlockFrame`
  provided) both stamp it on the `[data-block-id]` element (canvas chrome preserved).
- A block with `style.decoration.motion:"float"` → the INNER effect wrapper gets
  `data-deco="float"`; `delay`/`duration` → `--deco-delay`/`--deco-duration` on the inner
  wrapper; a block with `style.tilt:"subtle"` → `data-block-tilt="subtle"` on the inner
  wrapper + `data-tilt-parent` on the frame + (with `tiltGlare`) a `.cx-glare` inner child;
  an UNSTYLED block → NO inner div, NO `data-*`, `toPageBlockRenderProps` byte-identical to
  today.
- A block with `style.surfacePreset:"ambient-orbs"` → the FRAME carries
  `data-surface="ambient-orbs"` AND the inner wrapper renders two aria-hidden `.cx-orb`/
  `.cx-orb-a`/`.cx-orb-b` child spans (`data-deco="drift"`) before the content (parent
  Acceptance #5); a `"glass"`/`"radial-glow"` surface → `data-surface` on the frame only,
  NO orb spans, NO inner wrapper (glass/glow self-paint via the frame's ::before/::after).
- **Layer-on-frame / effect-on-inner separation (finding 4):** a block that is an
  anchored layered child (`style.layer:{x,y,anchor:"bottom-right"}`) AND carries ANY
  transform-writing effect keeps `data-layer` + `data-layer-anchor="bottom-right"` +
  `--layer-x/y` on the **FRAME** (`[data-block-id]`, via `toPageBlockRenderProps`) while the
  effect attr rides the **INNER** node — assert all THREE flows: (a) tilt
  (`style.tilt:"subtle"`) → frame has the layer attrs + `data-tilt-parent`, inner has
  `data-block-tilt`; (b) **decoration (`style.decoration.motion:"float"`) → frame has the
  layer attrs (NO `data-tilt-parent`), inner has `data-deco="float"`** (the reference
  floating-badge flow — the primary owner-intent case); (c) hover-lift
  (`style.hoverEffect:"lift"`) → frame has the layer attrs, inner has `data-hover="lift"`.
  Assert the frame carries `--layer-x/y` (so the 522-05-L02 per-device `[data-block-id]`
  override reaches it). Also: a `radiate` decoration + anchor keeps `data-deco="radiate"`
  on the frame with NO inner wrapper (box-shadow, not transform → no clash), a layer-only
  block (no transform effect) keeps everything on the frame (no inner wrapper), and an
  effect-only block (no layer) → frame + inner effect wrapper (no layer attrs).
- **Lane:** Vitest `tests/vitest/pages/page-renderer-v2.test.tsx` +
  `page-editor-control-registry.test.ts`.

## Hard Invariants

1. ONE composition seam (two adjacent frame functions, no third writer) serves all
   composition fields: **`toPageBlockRenderProps` (`:748`)** merges the FRAME-level attrs
   (layer positioning + anchor, surface/glow, marquee, `data-tilt-parent`, non-transform
   hover) so they ride the real `[data-block-id]` frame on BOTH the front `PageBlockFrame`
   and the canvas `renderBlockFrame` paths; **`renderPageBlockWithFrame` (`:2009`)** wraps
   `content` in ONE inner effect wrapper (transform-writing effects + glare + orbs) and
   hands it to the EXISTING two branches UNCHANGED (canvas selection/toolbar chrome
   preserved — NOT replaced by a self-built div). 522-04/05 add no frame edit. The
   frame-vs-inner split (transform-writing effect → inner descendant, layer positioning →
   frame) is owned HERE.
2. Present-only: unstyled block → `toPageBlockRenderProps` byte-identical to today AND no
   inner wrapper (no glare, no orbs, no data-attr) on either path.
4. Layer positioning (`data-layer`/`data-layer-anchor`/`--layer-*`) rides the FRAME
   (`[data-block-id]`), never an ancestor wrapper — so the 522-05-L02 per-device `--layer-*`
   deltas (emitted on `[data-block-id]`) inherit DOWN to the consuming `[data-composition]
   [data-layer]` rule (finding 4). The transform-writing effect moves to an INNER descendant
   so the frame's anchor translate and the inner effect transform never collide;
   `data-deco="radiate"` (box-shadow) stays on the frame (no clash, no inner wrapper).
5. `surfacePreset:"ambient-orbs"` on a block emits 2 aria-hidden `.cx-orb` spans in the
   inner wrapper (no inert empty surface).
3. Decoration enum select maps `"none"` → unset (present-only, normalize omits it —
   no bogus `""` option); keyframe binding gated by reduced-motion in the 522-01-L04
   CSS. Descriptors use the live `control({...})` shape (array `path`, `readonly
   string[]` options, `clamp`, required `panel`/`target`/`responsive`; no
   `showWhen`/`kind`/`min`).
</content>
