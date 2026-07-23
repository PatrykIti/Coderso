# TASK-522-05-L02: Layered-Canvas Container Render + Layer Position Controls

# FileName: TASK-522-05-L02-Layered-Canvas-Container-And-Layer-Controls.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-05
**Priority:** High
**Category:** Site Render / Admin UI
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Executable leaf. Makes a layout block (`container`/`columns`/`group`) with
`style.composition:"layered"` a positioning context whose children are absolutely
placed by each child's `style.layer` (x/y/z/anchor). Edits: `pageRendererV2.tsx` the
layout-block render region (where `container`/`columns`/`group` children are laid
out) — apply `data-composition="layered"` + let children's `data-layer` +
`--layer-x/y/z` custom props (already emitted by the 522-03 frame resolver) take
effect; `pageEditorControlRegistry.ts` — append the `block.layer.*` group to
`pageUniversalBlockControls` + a `block.composition` control to the per-type
`pageBlockControlRegistry` entries for `container`/`columns`/`group` (DISJOINT
id-namespace; no `appliesTo` exists); `core/services/pages/pageResponsiveCss.ts` —
per-device `--layer-x/y/z` `!important` deltas (owned seam — see Per-device).

## Grounded anchors

- Layout blocks `container`/`columns`/`group` in `layoutBlockTypes`
  (`pageDocumentV2.ts:716`). Their render is ONE shared function
  `renderPageLayoutBlockContent(block, context)` (`pageRendererV2.tsx:1688`) — NOT
  per-type `renderContainerBlock`/`renderColumnsBlock`/`renderGroupBlock` functions and
  NOT a `children` array. It reads active slots via `getPageBlockActiveSlotKeys(block)`
  (`:1692`) and renders each slot's children with `renderPageBlockList(block.slots?.
  [slotKey] ?? [], {…context})` (`:1713`/`:1753`/`:1772`) wrapped by
  `renderSlotWrapper({block, slotKey, className, children})` (`:1665`). Branches:
  `columns` grid (`:1695`), `group` flex (`:1742`), default/`container` (`:1768`). So
  this leaf branches INSIDE `renderPageLayoutBlockContent` and overrides the flow
  (flex/grid) `renderSlotWrapper` className — there is no `children.map`.
- The 522-03 frame resolver already emits `data-layer` + `--layer-x/y/z` custom props
  on each child; 522-01-L04 CSS sets `[data-composition="layered"]{position:relative}`
  + the SCOPED `[data-composition="layered"] [data-layer]{position:absolute;left:var(--layer-x)…}`.
  So this leaf mostly ensures the PARENT gets `data-composition="layered"` (via the
  block-frame resolver on the layout block's own style — already handled) and that the
  layout render does NOT force a flow layout that fights absolute children (e.g. skip
  the grid/flex track styles when layered).
- `pageUniversalBlockControls` (`:362`); per-type `pageBlockControlRegistry` (`:654`);
  `resolveBlockControls` (`:971`). `pageResponsiveCss.ts` block-style override branch
  (`:469-497`, `mergedStyle`-driven declarations).

## Implementation pseudocode

```tsx
// EDIT renderPageLayoutBlockContent (pageRendererV2.tsx:1688). Add a layered branch at
// the TOP — BEFORE the columns/group/default flow branches — so a layered layout block
// renders its slot children through a plain (NON flex/grid) slot wrapper, letting each
// [data-layer] child position absolutely. Children come from block.slots (there is NO
// `children` array), rendered via renderPageBlockList exactly like the flow branches.
const slotKeys = getPageBlockActiveSlotKeys(block);      // :1692 (already at top)
if (slotKeys.length === 0) return null;

const layered = block.style?.composition === "layered";
if (layered) {
  // NOTE the positioning context is the block-FRAME wrapper: 522-03's resolver stamps
  // data-composition="layered" on it and 522-01-L04 CSS gives it position:relative +
  // scopes [data-composition="layered"] [data-layer]{position:absolute;left:var(--layer-x)…}.
  // Here we ONLY swap the flow track className for a plain layered pass-through (a min-
  // height so an all-absolute canvas still has size) and render the SAME slot lists.
  return (
    <div className="cx-layered-canvas" data-page-layout-block={block.type}>
      {slotKeys.map((slotKey) =>
        renderSlotWrapper({
          block,
          slotKey,
          className: "cx-layered-slot",          // NOT flex/grid — plain block so children
                                                 // absolutely position vs the framed ancestor
          children: renderPageBlockList(block.slots?.[slotKey] ?? [], {
            parentPath: context.blockPath,
            depth: context.depth + 1,
            includeHiddenBlocks: context.includeHiddenBlocks,
            renderBlockFrame: context.renderBlockFrame,
            renderInlineText: context.renderInlineText,
            renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
            runtimeDataByBlockId: context.runtimeDataByBlockId,
            layoutMode: context.layoutMode,
            slotKey,
            parentBlock: block,
          }),
        })
      )}
    </div>
  );
}
// else: fall through to the existing columns (:1695) / group (:1742) / default (:1768)
// flow branches, UNCHANGED. (`.cx-layered-canvas`/`.cx-layered-slot` base rules —
// min-height + position pass-through — are authored in 522-01-L04, its sole-writer file.)
```

The live registry has NO `appliesTo` field and universal controls are NOT type-gated,
so the layout-only `block.composition.mode` control CANNOT live in the universal array
with a predicate. Instead it goes in the per-type `pageBlockControlRegistry` entries
for the layout blocks (`container`/`columns`/`group`), the live idiom for type-scoped
controls. The `layer.*` controls stay UNIVERSAL — any block can be a layered child.
All descriptors use the live `control({...})` shape (array `path`, `readonly string[]`
options, `clamp`, required `panel`/`target`/`responsive`; NO `kind`/`min`/`appliesTo`).

```ts
// pageBlockControlRegistry — add block.composition.mode to EACH layout type entry
// (container/columns/group), NOT the universal array (no appliesTo exists):
//   container: [ ...existing, layoutCompositionControl("container") ],
//   columns:   [ ...existing, layoutCompositionControl("columns") ],
//   group:     [ ...existing, layoutCompositionControl("group") ],
// where layoutCompositionControl(type) =
control({ id:`block.${type}.composition.mode`, panel:"layout", target:"block", label:"Composition",
  path:["style","composition"], input:"select", responsive:false, options:pageCompositions }),
  // pageCompositions = ["flow","layered"] ("flow" is the reset). responsive:false —
  // composition is a base-only data-attr (no per-breakpoint CSS-expressible delta).

// pageUniversalBlockControls — append the layer group (any block can be a layered child).
// ONLY the NUMERIC offsets x/y/z are responsive:true (they emit per-breakpoint --layer-*
// custom-prop deltas via the pageResponsiveCss seam below — the ONE effect field that
// genuinely varies per device). anchor is a base-only data-attr → responsive:false.
control({ id:"block.layer.x", panel:"layout", target:"block", label:"Layer X",
  path:["style","layer","x"], input:"number", responsive:true, clamp:{min:-50,max:150}, unit:"%" }),
control({ id:"block.layer.y", panel:"layout", target:"block", label:"Layer Y",
  path:["style","layer","y"], input:"number", responsive:true, clamp:{min:-50,max:150}, unit:"%" }),
control({ id:"block.layer.z", panel:"layout", target:"block", label:"Layer Z (stack)",
  path:["style","layer","z"], input:"number", responsive:true, clamp:{min:0,max:40}, unit:"" }),
control({ id:"block.layer.anchor", panel:"layout", target:"block", label:"Layer anchor",
  path:["style","layer","anchor"], input:"select", responsive:false, options:pageLayerAnchors }),
// layer controls are meaningful only for a child inside a layered parent; inert
// otherwise. Only x/y/z route per-breakpoint offsets (see Per-device); anchor/composition
// are base-only.
```

**Per-device (owned seam: `core/services/pages/pageResponsiveCss.ts`).** `layer.x/y/z`
ride `PageBlockResponsiveOverrideV2.style` (`pageDocumentV2.ts:523-535`), but the delivery
channel must emit them: the 522-01-L04 frame resolver emits the BASE position as
`--layer-x`/`--layer-y`/`--layer-z` custom props (consumed by
`[data-composition="layered"] [data-layer]{left:var(--layer-x)…}`), and
`pageResponsiveCss.ts` — ADDED to this leaf's sole-writer set — is taught to emit
`!important` tablet/mobile deltas that RETARGET those custom props from the merged
block-style override (`mergedStyle.layer.x/y/z`, mirroring the existing
`mergedStyle`-driven declarations, re-grep the `mergedStyle` block-override branch):

> **Finding-4 contract (stated identically in 522-03-L01).** `pageResponsiveCss` emits
> these `--layer-*` deltas on `blockSelector(id) = [data-block-id]` (`pageResponsiveCss.ts:660`).
> 522-03-L01 therefore keeps `data-layer` + `data-layer-anchor` + the BASE `--layer-*` on
> that SAME `[data-block-id]` FRAME (via `toPageBlockRenderProps`), and moves only the
> transform-writing EFFECT (tilt/float·drift·pulse·orbit/lift·scale) to an INNER descendant.
> Because the frame IS the element the media-query targets AND the element that consumes the
> var (`[data-composition="layered"] [data-layer]{left:var(--layer-x)…}`), the per-device
> reposition reaches it directly — including for an ANIMATED, anchored floating badge
> (`decoration:"float"` + `layer{anchor}`), the primary owner-intent case that a
> layer-on-an-outer-wrapper design would silently break (CSS custom props inherit DOWN, so a
> var on the frame never reaches an ancestor wrapper).
```ts
// pageResponsiveCss.ts — in the block-style override branch, when mergedStyle.layer:
if (mergedStyle.layer?.x != null) frame.push({ property:"--layer-x", value:`${mergedStyle.layer.x}%` });
if (mergedStyle.layer?.y != null) frame.push({ property:"--layer-y", value:`${mergedStyle.layer.y}%` });
if (mergedStyle.layer?.z != null) frame.push({ property:"--layer-z", value:String(mergedStyle.layer.z) });
// (declarations already carry !important, beating the inline base custom props.)
```
This is the ONLY 522 edit to `pageResponsiveCss.ts` (declared in the parent subtask
table). It keeps the parent's Acceptance #4/#7 per-device promise honest rather than
silently delivering device-uniform placement.

## Regression-test shape (delegated to 522-05-L05, asserted here)

- A `container` block with `style.composition:"layered"` containing two children with
  `style.layer` (different x/y/z) → the parent has `data-composition="layered"`, each
  child frame has `data-layer` + `--layer-x/y/z` (+ `data-layer-anchor` when set); a
  `"flow"`/unset container → normal flow (byte-identical). `block.composition.mode`
  lives on the per-type `container`/`columns`/`group` registries (not universal);
  `block.layer.*` on the universal array.
- **Per-device (pageResponsiveCss):** a child with a `responsive.tablet.style.layer.x`
  override emits a tablet media-query `--layer-x` `!important` delta on `[data-block-id]`;
  the L05 responsive test asserts the emitted CSS targets `[data-block-id]` — the SAME
  element that carries `data-layer` + the base `--layer-x` (finding 4), including for a
  child that ALSO has `decoration:"float"` (the animated anchored-badge case), so the
  per-device reposition is not a silent no-op.
- **Lane:** Vitest `tests/vitest/pages/page-renderer-v2.test.tsx` +
  `page-editor-control-registry.test.ts` + `page-responsive-css.test.ts` (if present).

## Hard Invariants

1. `composition:"flow"`/unset = normal flow (byte-identical).
2. Layer positioning only inside a layered parent (SCOPED `[data-composition="layered"]
   [data-layer]`; inert otherwise).
3. Per-device DELIVERED via `pageResponsiveCss.ts` `--layer-x/y/z` `!important` deltas
   (owned seam) — NOT device-uniform.
4. Descriptors use the live `control({...})` shape; `composition.mode` is per-type
   (no `appliesTo`).
</content>
