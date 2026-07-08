# TASK-524-01-L02: `splitBlockComposition` Co-location (Surface + Transform Effect on One Node)

# FileName: TASK-524-01-L02-SplitBlockComposition-Co-location.md

**Parent Task:** TASK-524
**Parent Subtask:** TASK-524-01
**Priority:** High
**Category:** Site Render / Accessibility
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

One edit in `core/services/pages/pageRendererV2.tsx`: rework `splitBlockComposition`
so a transform-DECORATION (`float`/`drift`/`pulse`/`orbit`) and a transform-HOVER
(`lift`/`lift-glow`/`scale`) stay on the FRAME (the same node as `data-surface` +
`data-layer`), NOT the inner wrapper. Because 524-01-L01 moved the anchor self-offset
onto the free `translate:` property, the anchor no longer needs the `transform`
channel, so the effect `transform` can live on the same node without clobbering it —
the glass surface animates WITH the effect. TILT is the ONE exception: it still
rides the inner node because it needs a perspective PARENT (the frame supplies
`data-tilt-parent`).

## Grounded anchors

- **`pageRendererV2.tsx` `splitBlockComposition` (~`:774`, post-522 — RE-GREP
  post-523).** Current shape (verified from 522-03-L01):
  ```ts
  function splitBlockComposition(style?: PageBlockStyleV2) {
    const comp = resolveBlockCompositionAttrs(style);
    const TRANSFORM_DECOS  = new Set(["float","drift","pulse","orbit"]);   // NOT "radiate"
    const TRANSFORM_HOVERS = new Set(["lift","lift-glow","scale"]);        // glow-reveal = opacity
    const deco  = comp.dataAttrs["data-deco"];
    const hover = comp.dataAttrs["data-hover"];
    const effectToInner = new Set<string>();
    if (comp.perspectiveParent) effectToInner.add("data-block-tilt");
    if (deco && TRANSFORM_DECOS.has(deco)) effectToInner.add("data-deco");     // ← moves to frame in 524
    if (hover && TRANSFORM_HOVERS.has(hover)) effectToInner.add("data-hover"); // ← moves to frame in 524
    const INNER_VAR_KEYS = ["--deco-delay","--deco-duration"];                 // ← move to frame in 524
    // …frame/inner split loops; frameAttrs["data-tilt-parent"] if perspectiveParent…
    const needsInner = effectToInner.size > 0 || comp.glare || comp.ambientOrbs;
    return { frameAttrs, frameVars, innerAttrs, innerVars, needsInner, glare, ambientOrbs };
  }
  ```
- `resolveBlockCompositionAttrs` (`pageCompositionEffects.tsx:124`) is UNCHANGED by
  this leaf — it still returns the same `dataAttrs`/`cssVars`/`perspectiveParent`/
  `glare`/`ambientOrbs`. Only the frame-vs-inner ROUTING changes here.
- `renderPageBlockWithFrame` (`:2009`) consumes `needsInner`/`innerAttrs`/`innerVars`/
  `glare`/`ambientOrbs` to build the inner wrapper; `toPageBlockRenderProps` (`:748`)
  consumes `frameAttrs`/`frameVars`. Both stay structurally the same — the inner
  wrapper simply stops carrying decoration/hover and (when no tilt/glare/orbs) is not
  emitted at all.

## Implementation pseudocode

```ts
// pageRendererV2.tsx — splitBlockComposition (co-locate surface + transform effect):
function splitBlockComposition(style?: PageBlockStyleV2) {
  const comp = resolveBlockCompositionAttrs(style);
  // AFTER 524-01-L01 the anchor self-offset rides `translate:` (a separate composited
  // property), so a transform-writing DECORATION/HOVER can live on the SAME node as the
  // anchor + surface WITHOUT clobbering the offset. => keep deco + hover on the FRAME.
  // TILT is the SOLE inner effect: it needs a perspective PARENT (the frame is that parent,
  // stamped with data-tilt-parent), so the tilt node must be a DESCENDANT.
  const effectToInner = new Set<string>();
  if (comp.perspectiveParent) effectToInner.add("data-block-tilt");   // tilt ONLY → inner
  // (REMOVED: data-deco / data-hover no longer forced to inner — they now stay on the frame)

  // Decoration timing vars now ride the FRAME too (the decoration attr is on the frame):
  // remove --deco-delay/--deco-duration from INNER_VAR_KEYS so they seed the frame element
  // that carries data-deco. (Empty set → all cssVars go to the frame.)
  const INNER_VAR_KEYS: string[] = [];   // was ["--deco-delay","--deco-duration"]

  const frameAttrs: Record<string,string> = {}; const frameVars: Record<string,string> = {};
  const innerAttrs: Record<string,string> = {}; const innerVars: Record<string,string> = {};
  for (const [k,v] of Object.entries(comp.dataAttrs)) (effectToInner.has(k) ? innerAttrs : frameAttrs)[k] = v;
  for (const [k,v] of Object.entries(comp.cssVars))   (INNER_VAR_KEYS.includes(k) ? innerVars : frameVars)[k] = v;

  // tilt still needs its perspective parent on the frame:
  if (comp.perspectiveParent) frameAttrs["data-tilt-parent"] = "";

  // inner wrapper is now needed ONLY for tilt (perspective descendant), glare, or ambient orbs —
  // NOT for a plain decoration/hover glass card (which stays a single node).
  const needsInner = effectToInner.size > 0 || comp.glare || comp.ambientOrbs;
  return { frameAttrs, frameVars, innerAttrs, innerVars, needsInner,
           glare: comp.glare, ambientOrbs: comp.ambientOrbs };
}
// RESULT: a block with data-surface="glass" + data-deco="float" → BOTH on the frame; the
// frame's `translate:` anchor offset + `transform` float keyframe compose; glass animates.
// A tilt block → tilt on the inner node (perspective parent = frame). radiate (box-shadow)
// was always frame-side (never in effectToInner) — unchanged. Present-only unchanged: an
// unstyled block yields empty maps + needsInner=false → byte-identical.
```

- The frame-vs-inner SPLIT MACHINERY (the two loops, the `frameAttrs`/`innerAttrs`
  records, the `renderPageBlockWithFrame` inner-wrapper insertion) is PRESERVED — only
  the ROUTING sets change (`effectToInner` drops deco/hover; `INNER_VAR_KEYS` empties).
  Do NOT delete the inner-wrapper path (tilt/glare/orbs still use it).
- `renderPageBlockWithFrame` (`:2009`) needs NO edit: it already renders the inner
  wrapper only when `needsInner`, and now `needsInner` is false for a plain
  decoration/hover glass card, so that card is a single node automatically.

## Security note

No attacker-influenceable surface: this leaf only reroutes already-resolved,
already-sanitized `data-*`/CSS-var attrs between two DOM nodes. No new value, no
interpolation, no color path change (colors are 524-02). Present-only preserved.

## Vitest test lane

- `tests/vitest/pages/page-renderer-v2.test.tsx` — the co-location behavioral
  assertions are authored in 524-01-L03 (they belong to the owned test rebaseline):
  a glass+float block → `data-surface` and `data-deco` on the SAME node; a tilt block
  → `data-block-tilt` on the inner node + `data-tilt-parent` on the frame.

## Regression / breaking-test ownership

- 522's placement tests in `page-renderer-v2.test.tsx` assert deco/hover on the INNER
  wrapper alongside a `data-surface` frame. This leaf's routing change makes those
  assertions FALSE — they are a DECLARED breaking rebaseline OWNED by 524-01-L03 (not
  drift, no weakened assertion). Do not silently pass them; L03 rewrites them to the
  new placement.
- The tilt-inner + `data-tilt-parent`-frame + orbs + radiate-on-frame assertions are
  UNCHANGED (this leaf preserves them) — they must still pass.

## Hard Invariants

1. Transform decoration/hover co-locate with `data-surface` on the FRAME (one node);
   tilt stays inner (perspective parent). radiate stays frame (box-shadow, unchanged).
2. Present-only: unstyled block → empty frame/inner maps, `needsInner=false`, no inner
   wrapper — byte-identical on both render paths.
3. The inner-wrapper machinery is preserved (tilt/glare/orbs still use it) — only the
   `effectToInner` / `INNER_VAR_KEYS` routing changes.
4. Decoration timing vars (`--deco-delay`/`--deco-duration`) now seed the frame node
   that carries `data-deco` (so the keyframe binding reads them).
</content>
