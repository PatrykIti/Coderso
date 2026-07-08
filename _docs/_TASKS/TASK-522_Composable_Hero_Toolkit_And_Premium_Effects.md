# TASK-522: Composable Hero Toolkit & Premium Effects — Custom-SVG Block, Floating-Drift Decorations, Tilt-On-Any-Block, Layered Canvas, Glass/Glow + Hover Presets & Ticker

# FileName: TASK-522_Composable_Hero_Toolkit_And_Premium_Effects.md

**Priority:** High
**Category:** Admin UI / Content (Pages) / Site Render / Widgets / Schema (JSON model) / Security / Accessibility
**Estimated Effort:** Large
**Dependencies:**
- **TASK-521 (Page Motion & Interaction Effects) — HARD, LANDS FIRST.** TASK-522
  is implemented AND merged strictly AFTER TASK-521. 522 REUSES 521's landed
  outputs verbatim: the dependency-free runtime module `core/services/pages/pageEffectsRuntime.ts`
  (521-01-L04) + its `prefers-reduced-motion` early-return discipline; the
  hero mouse-tilt POINTERMOVE PRIMITIVE (521-03-L03 — the `rotateX(-y*deg) rotateY(x*deg)`
  math + `matchMedia('(pointer:fine)')` gate that 522-04 GENERALIZES to any block);
  the curated inline-SVG + CSS-keyframes precedent (`animatedIconGlyphs.tsx` +
  `ANIMATED_ICON_KEYFRAMES_CSS`, 521-04-L01 — 522's custom-SVG block is its
  arbitrary-SVG complement, and 522's composition CSS follows the same
  static-string + `@media (prefers-reduced-motion: no-preference)` gating shape);
  the compact page-settings side-inspector + per-page effects wiring (521-05).
  **522 edits DISJOINT regions / NEW block cases of the seam files 521 also
  touches (`pageRendererV2.tsx`, `pageEditorControlRegistry.ts`,
  `pageEffectsRuntime.ts`) and NEVER a region 521 owns** — see Coordination.
- **TASK-519 (alpha color input)** — decoration/glow/glass/preset colors are
  authored with the 519 alpha-capable swatch (`hex8`/`rgba()`); the page model
  already PERSISTS alpha at the schema boundary (`readSafeColor`,
  `pageDocumentV2.ts:1516`), so 522 stores alpha today; 519 is required only so the
  ADMIN swatch AUTHORS + round-trips alpha (else the raw hex control is the fallback).
- TASK-424/425 (`PageSectionStyleV2`, `PageBlockStyleV2`, the responsive-override
  machinery every new style field rides for free — `PageBlockResponsiveOverrideV2.style`,
  `pageDocumentV2.ts:456`; `PageSectionResponsiveOverrideV2.style`, `:470`),
  TASK-455 (`PageDocumentRender` site-shell root), TASK-458-03 (`menuAppearance`
  present-only additive sub-object precedent), the existing widget CSS-motion
  substrate + `motion-safe:`/`motion-reduce:` guards.

**Status:** ⏳ To Do
**Closure changelog:** Assigned at closure as the then-current next-free (grep
`_docs/_CHANGELOG/` highest+1). As of authoring the highest on disk is **1233**
(519=1232, 520=1233; 1229–1231 free; 521 pending), so 522 — landing AFTER
519/520/521 — takes the then-current next-free at ITS closure (do **NOT** hardcode
a colliding number). Do **NOT** edit `_CHANGELOG/*` or `_TASKS/README.md` — the
orchestrator owns those.

---

## Overview

TASK-521 added page/section/hero MOTION (scroll reveal/parallax, an animated-icon
block, hero mouse-tilt, per-page cursor spotlight). It did **not** give the author
the tools to COMPOSE a rich hero like the owner's reference wow-site
(`_docs/projekty-domow-wow-site/`): the reference hero
(`index.html:46-79`) is a **layered glass card** (`.blueprint-card.tilt-card[data-tilt]`)
containing an inline line-drawing `<svg class="house-line">`, three absolutely
positioned **floating badges** (`.floating-chip` — `@keyframes floatChip`), ambient
**drifting orbs** (`.hero-bg-orb` — `@keyframes floatOrb`), a **pulsing ring**
(`.sun-ring` — `@keyframes pulseRing`), and a mini-dashboard — the whole card
**tilting toward the pointer** on hover. The same effect vocabulary recurs across
the reference's OTHER sections: hover **radial-glow reveal** (`.service-card:hover:after`,
`styles.css:77`), hover **lift** (`.project-card:hover{transform:translateY(-6px)}`,
`:79`) + inner **scale** (`.project-card:hover .project-art:after`, `:79`), a
**pulse marker** (`.map-pulse` — `@keyframes mapPulse`, `:79`), and a horizontal
**ticker/marquee** strip (`.ticker` — `@keyframes ticker`, `:76`). Every reference
effect is dependency-free CSS + a tiny `app.js` (`assets/app.js`, 108 lines) and is
disabled under `@media (prefers-reduced-motion:reduce)` (`styles.css:83`).

This task delivers the **composable TOOLKIT** to build that hero (and reuse its
premium look everywhere) inside Page Editor v2 — **not a one-off hero widget**. All
additions are **present-only, jsonb-only, no-dependency, no-migration,
reduced-motion-safe**, reuse 521's runtime, and do **NOT** bump
`PAGE_DOCUMENT_SCHEMA_VERSION` (`pageDocumentV2.ts:28` stays `2`):

1. **Custom-SVG block** (`customSvg`, the ONE new `pageBlockType`) — paste/upload an
   arbitrary SVG that is **sanitized** (server allowlist at write + render), with an
   optional **stroke draw-in** animation (`@keyframes draw{to{stroke-dashoffset:0}}`,
   the reference `.draw-line`).
2. **Floating-drift decoration** — a present-only `block.style.decoration` MOTION
   flag turning ANY block (a badge, an icon, an orb) into a layered decoration with
   one primitive + variants: **float** (`floatChip`), **drift** (`floatOrb`),
   **pulse** (`.sun-ring`/`pulseRing` — scale+opacity), **radiate** (`.map-pulse`/
   `mapPulse` — concentric box-shadow ring), **orbit** — staggered via delay, absolute
   + z-index inside a canvas, reduced-motion OFF.
3. **Tilt-on-ANY-block** — generalize 521-03's hero tilt into a present-only
   `block.style.tilt` usable on any card/block (perspective wrapper + `preserve-3d`
   + 521's pointermove runtime), with an optional **glare/sheen** sweep.
4. **Layered hero/section CANVAS** — a composition CONTAINER (`section.style` /
   layout-block `style.composition:"layered"`) whose children are
   **absolutely positioned + z-indexed per-device** (`block.style.layer`), so a hero
   can be composed from an SVG + badges + cards + orbs like the reference.
5. **Glass/glow presets + HOVER effects** — reusable section/card background
   **surface presets** (`glass`, `glass-grid`, `radial-glow`, `ambient-orbs`) AND
   block **hover-effect presets** (`glow-reveal`, `lift`, `scale`, `lift-glow`) so the
   premium look + interactivity is one click.
6. **Ticker / marquee** — a horizontal auto-scrolling strip (`block.style.marquee`
   on a `group`/row block, `@keyframes ticker`), reduced-motion OFF.

Every effect is **present-only** (zero bytes when unauthored), joins a
**reject-unknown allowlist** with a **round-trip test**, respects
**`prefers-reduced-motion`** (CSS gate AND, where a runtime exists, a `matchMedia`
early-return), needs **NO npm dependency** (hand-rolled SVG sanitizer + inline CSS
keyframes + 521's runtime) and **NO DB migration** (all config on existing jsonb;
the one new block type stores nothing on legacy docs). Legacy documents parse +
render **byte-identical**.

## Gap analysis (grounded — anchors verified fresh 2026-07-08 vs live code)

### G-1 — no custom/arbitrary-SVG block (MISSING)

- `pageBlockTypes` (`pageDocumentV2.ts:50-72`) has 21 members; there is **no
  arbitrary-SVG block**. `embed` (`:64`, props `["html","url","provider"]`,
  `pageBlockPropKeys.embed :621`) renders sandboxed third-party HTML/iframes — a
  DIFFERENT surface (not an inline decorative SVG, no draw-in, sandbox-oriented).
  521-04 implemented the `icon` placeholder as a CURATED set; the owner also wants
  an ARBITRARY paste/upload SVG (the reference `house-line`), which needs its own
  sanitized block. **Decision:** add exactly ONE new `pageBlockType` `"customSvg"`.
  Unlike 521's `icon` reuse, there is no spare placeholder, so this is an
  UNAVOIDABLE type introduction — the FIVE exhaustive (non-Partial)
  `Record<PageBlockType,…>` surfaces MUST all gain a `customSvg` entry in one
  **atomic type-introduction** (522-01-L01) or typecheck breaks: `pageBlockPropKeys`
  (`pageDocumentV2.ts:591`), `pageBlockDefaultProps` (`:825` — ALSO consumed at
  runtime `:2336`/`:3102` + by `blockPropFallback`, so a missing key is a runtime
  crash on insert too), `blockOptionCopy` (`pageEditorOptions.ts:85`),
  `pageBlockControlRegistry` (`pageEditorControlRegistry.ts:654`), and
  `pageBlockRenderDefaults` (`pageBlockRenderDefaults.ts:138` — a file NO other 522
  subtask touches; `tsc` fails TS2741 there the moment `customSvg` joins
  `pageBlockTypes` unless stubbed). `blockOptionCopy` is icon-less (the live
  `BlockOption` type has NO `icon` field). See Coordination.
- Pasted SVG is an **XSS vector** (`<script>`, `on*=`, `javascript:`, `<foreignObject>`,
  external `href`). No SVG sanitizer exists in the page path today → 522-01-L02 adds
  a dependency-free allowlist sanitizer (`svgSanitizer.ts`) applied at write
  (normalize) AND render.

### G-2 — no per-block decoration / float / drift / pulse / orbit (MISSING)

- `PageBlockStyleV2` (`pageDocumentV2.ts:412-448`) has align/width/column/background/
  radius/shadow/border/padding/margin/typography — **no motion/decoration/animation**
  field. The reference `floatChip`/`floatOrb`/`pulseRing`/`mapPulse` keyframes
  (`styles.css:71-79`) have no CMS equivalent. Add present-only
  `style.decoration?: PageBlockDecoration` (`motion` variant + `delay` + `duration`).

### G-3 — hero tilt is hero-ONLY, not reusable on blocks (PARTIAL)

- 521-03 added `hero.style.tilt` on the `hero` WIDGET only (`hero.tsx`). Page BLOCKS
  (`PageBlockStyleV2`) have no tilt. The reference applies `[data-tilt]` to a CARD
  (`.blueprint-card`, `index.html:47`). Add present-only `style.tilt?` on
  `PageBlockStyleV2` + an optional `tiltGlare?` sheen, reusing 521's pointermove
  runtime (do NOT duplicate). **522 does NOT edit `hero.tsx`** — the toolkit lets the
  author BUILD a hero from page blocks; the hero widget keeps 521's tilt untouched.

### G-4 — no layered/absolute composition canvas (MISSING)

- Layout blocks `container`/`columns`/`group` (`layoutBlockTypes`,
  `pageDocumentV2.ts:716`) flow children (flex/grid) — none place children
  **absolutely / layered / z-indexed**. `PageSectionLayoutV2` has no
  composition/layer mode. Add present-only `style.composition?:"layered"` (on section
  style AND layout-block style) + per-child `style.layer?` (x/y/z/anchor,
  per-device via the existing responsive-override channel).

### G-5 — no premium glass/glow surface presets or hover-effect presets (MISSING)

- Sections/blocks paint a single `background` + `shadow` token; there is **no**
  one-click glass gradient / faint grid / radial glow / ambient-orb surface, and
  **no** hover interactivity (the reference `:hover:after` glow-reveal, `:hover`
  lift/scale). Add present-only `style.surfacePreset?` (section + block) +
  `style.hoverEffect?` (block).

### G-6 — no ticker / marquee (MISSING)

- No horizontal auto-scroll strip exists. Add present-only `style.marquee?` on a
  `group`/row block (`@keyframes ticker`), reduced-motion OFF.

### Runtime + emit anchors (verified)

- `renderPageBlockContent` switch (`pageRendererV2.tsx:1747`), `case "icon"` now at
  `:1919` (521-04 replaces its `return null`); the block FRAME wrapper
  `renderPageBlockWithFrame` (`:1926`) is where per-block composition classes/attrs
  attach. `PageSectionRender` (`:2298`) + `PageDocumentRender` (`:2331`,
  `data-page-v2="true"` root `:2367/:2371`) are the section + page-root emit points
  (521-05 emits its runtime here; 522 emits its composition `<style>` + block-tilt
  runtime binding here, additively, after 521). Inline `<script>`/`<style>` emit
  via `renderSharedWidgetRuntimeScript` / `dangerouslySetInnerHTML` static `__html`
  (`core/widgets/runtimeScripts.tsx:20/46`).

## Schema-extension plan (JSON model — NO DDL, NO schemaVersion bump)

All additions are **present-only**, join the **reject-unknown allowlist**
(`assertKnownKeys`, `pageDocumentV2.ts:1624`), ship a **round-trip test**, and are
mirrored in the strict `pageDocumentV2JsonSchema` (`additionalProperties:false`) in
lockstep. Legacy docs normalize **byte-unchanged**. **NO migration** (jsonb). **NO
`PAGE_DOCUMENT_SCHEMA_VERSION` bump** (`:28` stays `2`).

**New block type (G-1):**

```ts
// pageBlockTypes gains ONE member (ATOMIC type-introduction — 522-01-L01):
export const pageBlockTypes = [ /* …21 existing… */, "customSvg" ] as const;
pageBlockPropKeys.customSvg = ["svg","drawIn","drawSpeed","label"] as const;
// svg: sanitized SVG source (allowlist, never raw); drawIn: boolean stroke draw-in;
// drawSpeed: 600..6000 ms; label: a11y title. Add "customSvg" to
// realRuntimeBlockTypes (:691) + editorInsertableBlockTypes (:715). NO capability-
// reason stub (it IS insertable). Every one of the FIVE exhaustive
// Record<PageBlockType,…> (pageBlockPropKeys, pageBlockDefaultProps,
// pageBlockRenderDefaults, blockOptionCopy, pageBlockControlRegistry) gains a customSvg
// entry in this one atomic land:
pageBlockDefaultProps.customSvg = { svg:"", drawIn:false, label:"" };
pageBlockRenderDefaults.customSvg = { /* neutral frame render defaults, mirror `icon` */ };
blockOptionCopy.customSvg = { label:"Custom SVG", description:"Paste a sanitized inline SVG." }; // NO icon field
```

**PageBlockStyleV2 (`pageDocumentV2.ts:412`) — decoration / tilt / layer / hover /
surface / marquee (G-2..G-6, all present-only, all responsive-channel-eligible):**

```ts
export type PageBlockStyleV2 = {
  /* …existing align/width/column/background/radius/shadow/border/padding/typography… */
  decoration?: PageBlockDecoration;   // { motion:"none"|"float"|"drift"|"pulse"|"radiate"|"orbit"; delay?:0..4000ms; duration?:2000..16000ms } ("none"=reset, omitted; "pulse"=.sun-ring scale/opacity, "radiate"=.map-pulse concentric ring)
  tilt?: PageTiltStrength;             // "none"|"subtle"|"strong" (reuses 521 runtime)
  tiltGlare?: boolean;                 // optional sheen sweep on tilt
  layer?: PageBlockLayer;              // { x:-50..150 %; y:-50..150 %; z:0..40; anchor?:PageLayerAnchor } — placement in a layered canvas
  surfacePreset?: PageSurfacePreset;   // "none"|"glass"|"glass-grid"|"radial-glow"|"ambient-orbs"
  hoverEffect?: PageBlockHoverEffect;  // "none"|"glow-reveal"|"lift"|"scale"|"lift-glow"
  marquee?: PageBlockMarquee;          // { speed:8..40 s; direction?:"left"|"right"; seamless?:boolean } — group/row block only
  composition?: PageComposition;       // "flow"|"layered" — layout-block canvas mode
};
```

**PageSectionStyleV2 (`pageDocumentV2.ts:380`) — surface preset + layered canvas
(G-4/G-5):**

```ts
export type PageSectionStyleV2 = {
  /* …existing background/backgroundType/backgroundImage/accent/radius/shadow… */
  surfacePreset?: PageSurfacePreset;   // "none"|"glass"|"glass-grid"|"radial-glow"|"ambient-orbs"
  composition?: PageComposition;       // "flow"|"layered" — section becomes a positioning context
};
```

**Shared vocabulary (owned by 522-01, imported read-only by all consumers):** enums
`pageBlockDecorationMotions`, `pageTiltStrengths`, `pageSurfacePresets`,
`pageBlockHoverEffects`, `pageCompositions`, `pageLayerAnchors`, `pageMarqueeDirections`;
clamps `PAGE_DECORATION_DELAY_CLAMP` (0..4000), `PAGE_DECORATION_DURATION_CLAMP`
(2000..16000), `PAGE_LAYER_X_CLAMP`/`PAGE_LAYER_Y_CLAMP` (-50..150),
`PAGE_LAYER_Z_CLAMP` (0..40), `PAGE_DRAW_SPEED_CLAMP` (600..6000),
`PAGE_MARQUEE_SPEED_CLAMP` (8..40); byte cap `PAGE_CUSTOM_SVG_MAX_BYTES` (24576).

## Subtask breakdown (single-writer file ownership; strict land order)

| # | Subtask | Sole-writer file(s) / owned region | Leaves | Depends on |
|---|---------|-----------------------------------|--------|------------|
| 522-01 | Composition + decoration MODEL + sanitizer + CSS + runtime infra (foundation) | `core/services/pages/pageDocumentV2.ts` (all model + the ATOMIC `customSvg` type-introduction stubs in `pageEditorOptions.ts blockOptionCopy` [icon-less] + `pageEditorControlRegistry.ts pageBlockControlRegistry` [`customSvg:[]`] + `core/services/pages/pageBlockRenderDefaults.ts` [`customSvg` render-defaults stub — sole 522 edit]); NEW `core/services/pages/svgSanitizer.ts`; NEW `core/services/pages/pageCompositionEffects.tsx`; `core/services/pages/pageEffectsRuntime.ts` **[block-tilt+glare APPEND seam — after 521]** | L01 customSvg type+props model (incl. `pageBlockDefaultProps` + `pageBlockRenderDefaults` stubs), L02 SVG sanitizer, L03 block/section style model (decoration[none/float/drift/pulse/radiate/orbit]/tilt/layer/hover/surface/marquee/composition), L04 composition CSS + resolvers, L05 runtime block-tilt+glare, L06 model/sanitizer/CSS/runtime tests | TASK-521 (all) |
| 522-02 | Custom-SVG block — render + editor | `pageRendererV2.tsx` **[block-content `case "customSvg"` region — seam]**; `pageEditorControlRegistry.ts` **[`pageBlockControlRegistry.customSvg` region — seam]**; `pageEditorOptions.ts` **[`blockOptionCopy.customSvg` copy region — seam]** | L01 renderer case (sanitized + draw-in), L02 controls + palette copy, L03 tests (incl. XSS vectors) | 522-01 |
| 522-03 | Floating-drift decoration + block-frame composition application | `pageRendererV2.tsx` **[block-FRAME `renderPageBlockWithFrame` composition-attr region — seam]**; `pageEditorControlRegistry.ts` **[`pageUniversalBlockControls` decoration region — seam]** | L01 block-frame resolver wiring + decoration control, L02 tests | 522-01, 522-02 |
| 522-04 | Tilt-on-any-block (generalize 521-03) | `pageEditorControlRegistry.ts` **[`pageUniversalBlockControls` tilt region — seam]** (render via 522-03 frame resolver; runtime via 522-01-L05) | L01 tilt + glare controls, L02 tests | 522-01, 522-03 |
| 522-05 | Layered canvas + glass/glow + hover + ticker | `pageRendererV2.tsx` **[`PageSectionRender` surface/canvas region + layout-block canvas region + group-block marquee region — seams]**; `pageEditorControlRegistry.ts` **[`pageUniversalSectionControls` surface region + `pageUniversalBlockControls` glass/hover/layer region + `pageBlockControlRegistry` `container`/`columns`/`group` composition+marquee regions — seams]**; `core/services/pages/pageResponsiveCss.ts` **[per-device `--layer-x/y/z` delta seam — 522-05-L02]** | L01 section surface/ambient-orbs render + control, L02 layered-canvas container render + layer controls + per-device responsive-css, L03 block glass/hover/surface controls, L04 marquee/ticker group render + control, L05 tests | 522-01, 522-03, 522-04 |
| 522-06 | Tests, docs, closure | test files (own) + `_docs/*.md` | — | 522-01..05 |

**Land order (strictly sequential):** 522-01 (model + sanitizer + CSS + runtime) →
522-02 (custom-SVG block) → 522-03 (decoration + block-frame resolver) → 522-04
(tilt-on-block) → 522-05 (canvas + glass/glow + hover + ticker) → 522-06 (closure).
**All of 522 lands AFTER all of 521.**

## Coordination / collision guards

- **522 DEPENDS ON 521 and LANDS AFTER IT.** Every 521 seam file 522 also touches is
  edited by 522 in a **disjoint region / NEW symbol case**, temporally after 521 is
  fully merged. 522 NEVER edits a region 521 owns.
- **`pageDocumentV2.ts` = 522-01 only** (its model leaves edit disjoint symbol
  regions — block-type list + propKeys + capability sets, `PageBlockStyleV2`,
  `PageSectionStyleV2`, the shared vocabulary const block, and the normalizers). No
  other 522 subtask writes this file; 522-02..05 import its exports read-only.
- **ATOMIC `customSvg` type-introduction (522-01-L01).** Because
  `pageBlockTypes` feeds EXHAUSTIVE `Record<PageBlockType,…>` in FOUR files,
  522-01-L01 is the SOLE introducer of `customSvg` and, in ONE atomic landing, adds
  the MINIMAL stub entry to every exhaustive record: `pageBlockPropKeys` +
  `pageBlockDefaultProps` (`:825` — `{svg:"",drawIn:false,label:""}`, also prevents a
  runtime undefined-on-insert) + `realRuntimeBlockTypes` + `editorInsertableBlockTypes`
  (`pageDocumentV2.ts`), `blockOptionCopy` (`pageEditorOptions.ts:85` — minimal
  label/description stub, NO `icon` key: `BlockOption` has no `icon` field, so an
  `icon:` is a TS excess-property error), `pageBlockControlRegistry`
  (`pageEditorControlRegistry.ts:654` — `customSvg:[]`), and `pageBlockRenderDefaults`
  (`pageBlockRenderDefaults.ts:138` — a neutral render-defaults stub; added to
  522-01-L01's sole-writer set, else `tsc` TS2741). Re-run `grep -n 'Record<PageBlockType,'`
  + every `switch(block.type)` without a `default` before landing to confirm the
  inventory is complete. This is a documented, unavoidable atomic edit (a NEW enum
  member cannot land half-typed). Subsequent subtasks then ENRICH the `customSvg`-keyed
  regions as
  DISJOINT additive seams: 522-02 fills `blockOptionCopy.customSvg` copy +
  `pageBlockControlRegistry.customSvg` controls. The stub-vs-enrich edits target the
  SAME map KEY region (a documented additive seam), never overlapping lines.
- **`pageRendererV2.tsx` is a DOCUMENTED ADDITIVE SEAM** shared with 521 and across
  522 subtasks — disjoint symbol regions, strict land order, all after 521:
  - **522-02** owns the block-content `case "customSvg"` (a NEW switch case in
    `renderPageBlockContent`, `:1747` — disjoint from 521-04's `case "icon"` `:1919`).
  - **522-03** owns the block-FRAME region `renderPageBlockWithFrame` (`:1926`) —
    ONE edit that calls the 522-01 `resolveBlockCompositionAttrs(style)` resolver to
    stamp decoration/tilt/hover/glass/layer classes + data-attrs on EVERY block
    wrapper. 522-04 (tilt) and 522-05 (hover/glass/layer) add NO further block-frame
    edit — the resolver already reads all those fields; they only add CONTROLS.
  - **522-05** owns the `PageSectionRender` (`:2298`) surface/ambient-orbs/canvas
    attr region (DISJOINT from 521-02's `scrollEffect` attrs on the same symbol —
    additive `data-*`/class, after 521-02), the layout-block canvas render, and the
    `group`-block marquee wrapper.
  - The page-root composition `<style>` + block-tilt runtime emit rides in
    `PageDocumentRender` (`:2331`) ADJACENT to 521-05's runtime emit (additive,
    present-only; emitted only when a 522 effect is authored) — owned by 522-05-L01.
  - The top-of-file import block (`:1-33`) is an APPEND-ONLY additive sub-region
    (new named imports only; no reorder/removal) every seam consumer may extend.
  Any write OUTSIDE a subtask's declared symbol region (or the import-only
  sub-region) is a reconcile failure.
- **`pageEditorControlRegistry.ts` is a DOCUMENTED ADDITIVE SEAM** shared with 521
  and across 522 subtasks — disjoint const regions, after 521:
  - **522-02** owns `pageBlockControlRegistry.customSvg` (the stub added by
    522-01-L01, now enriched) — per-type, shows ONLY on the customSvg block.
  - **522-03/04/05** append to `pageUniversalBlockControls` (`:362`) in DISJOINT
    id-namespaced groups (`block.decoration.*` / `block.tilt.*` /
    `block.surface.*`+`block.hover.*`+`block.layer.*` — these apply to ANY block).
    521-04 did NOT touch this array; 522 is its first extender.
  - **522-05** appends to `pageUniversalSectionControls` (`:212`) a
    `section.surface.*`/`section.composition.*` group DISJOINT from 521-02's
    `section.scrollEffect` group; the layout-only `block.composition.mode` and the
    `group.marquee.*` group go in the PER-TYPE `pageBlockControlRegistry` entries
    (`container`/`columns`/`group` for composition; `group` for marquee) — NOT the
    universal array (there is no `appliesTo` to type-gate a universal control; per-type
    is the live idiom).
  Import-only sub-region here is APPEND-ONLY (read-only imports from
  `pageDocumentV2`). Any write outside a declared const/id region is a reconcile
  failure.
- **CONTROL DESCRIPTOR SHAPE + VISIBILITY (live constraints — binding on every 522
  control leaf).** All descriptors are built with the live `control({...})` /
  `blockPropControl(...)` helpers (`pageEditorControlRegistry.ts:152/175`) to the real
  `PageEditorControlDefinition` (`:103-150`): `path` is a `readonly string[]` (e.g.
  `["style","decoration","motion"]`, NOT a dotted string), `input` is from the union
  `text|number|select|segmented|switch|color|swatch|media|items|facets` (NO
  `textarea`/`toggle`), enum `options` is a `readonly string[]` sourced from the
  522-01-L03 const enums (labels ARE the enum strings — NO per-option `{value,label}`),
  numeric bounds are `clamp:{min,max}` (NOT `min`/`max`), and `panel`/`target`/
  `responsive` are REQUIRED. There is NO value-conditional visibility (`showWhen`) and
  NO type predicate (`appliesTo`) in the registry or shell — so 522 adds NEITHER: every
  control is ALWAYS shown and is a harmless no-op when its parent effect is unset
  (e.g. `decoration.delay` with no motion, `drawSpeed` with no `drawIn`, `marquee.*`
  with no speed). Reset paths use the enum's `"none"`/`"flow"` member (normalize omits
  it), never a bogus `""` option (which would fail `normalizeEnum` + the `readonly
  string[]` type). SVG source uses `input:"text"` (accepts the pasted string; a
  multiline widget is a possible future foundation extension, out of scope).
- **`pageEffectsRuntime.ts` (521-owned) — 522 APPEND seam.** 522-01-L05 appends,
  after 521 is merged, a GENERALIZED block-tilt binding (`[data-block-tilt]`, reusing
  521's exact pointer math + `matchMedia('(pointer:fine)')` + reduced-motion guards)
  and an optional glare-position update, within the same IIFE's already-present
  pointer-fine/reduced-motion gates. 522 does NOT modify 521's hero-tilt binding or
  spotlight binding; it adds a new querySelectorAll block. Reuse, not duplication
  (Hard Invariant 6). If reconcile shows 521's runtime structure differs at
  implement time, 522-01-L05 adapts the binding to 521's actual selector/guard shape
  (verify live).
- **`hero.tsx` is NOT edited by 522** (521-03 owns hero tilt; 522 generalizes to
  page blocks only). **`PageEditor.tsx` is NOT edited by 522** — all authoring rides
  the declarative control-descriptor rail (registry) 521-05 already relocated; 522
  adds descriptors, not panel code.
- **`prefers-reduced-motion` guard is shared law:** every effect ships BOTH a CSS
  gate (`@media (prefers-reduced-motion: no-preference)` around every `@keyframes`
  binding, mirroring 521-04's `ANIMATED_ICON_KEYFRAMES_CSS`) AND, where a runtime is
  involved (block tilt + glare), a `matchMedia('(prefers-reduced-motion: reduce)')`
  early-return. Reconcile fails if any consumer omits either half.
- rg misdetects `PageEditor.tsx` / `pageRendererV2.tsx` / `pageDocumentV2.ts` /
  `hero.tsx` as binary — use `Read` / `grep -an`, never trust an empty `rg`.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (orchestrator owns
  them). Closure changelog = then-current next-free at closure (grep highest+1;
  highest on disk 1233 as of authoring; 522 lands after 519/520/521).

## Security Contract

**No new route, RBAC bucket, method, or endpoint.** All additions ride the existing
validated Page v2 `document` write path (`normalizePageDocument`, gated by the pages
write permission) and the SSR render path. The attacker-influenceable surfaces are
(1) the **pasted custom SVG** (the primary new XSS surface), (2) new COLOR strings,
(3) new numeric clamps + enums, and (4) the runtime effect binding — each constrained
at BOTH the write (normalize) boundary and the render boundary (defence in depth).

1. **Custom SVG (allowlist sanitizer — the core new control).** The `customSvg`
   block's `svg` prop is the one place attacker-authored MARKUP is stored. It is
   sanitized by a dependency-free allowlist sanitizer (`svgSanitizer.ts`, 522-01-L02)
   at BOTH write (`normalizeBlockProps` for `customSvg`) AND render (defence in
   depth before `dangerouslySetInnerHTML`):
   - **Fail-closed tripwires (reject the whole SVG → neutral fallback):** any
     `<script`, `<foreignObject`, `<!ENTITY`/`<!DOCTYPE` (XXE), `on\w+=` event
     attribute, `javascript:`/`vbscript:`/`data:text/html` URL, `expression(`/
     `behavior:`/`-moz-binding` in style, `url(` referencing a non-`#` target,
     `<use>`/`href`/`xlink:href` whose value is NOT a local `#fragment`, or bytes >
     `PAGE_CUSTOM_SVG_MAX_BYTES`.
   - **Allowlist filter (prefer allowlist over denylist):** only allowlisted SVG
     tags (`svg,g,defs,path,rect,circle,ellipse,line,polyline,polygon,text,tspan,
     linearGradient,radialGradient,stop,clipPath,mask,pattern,use[local],symbol,
     title,desc,marker,filter,feGaussianBlur,feOffset,feMerge,feMergeNode,
     feColorMatrix,feBlend,feFlood,feComposite`) and allowlisted attributes
     (geometry + presentation + `class,id,transform,viewBox,preserveAspectRatio` +
     `href`/`xlink:href` restricted to `#…`; `style` re-parsed to drop `expression`/
     `url(javascript…)`/`behavior`) survive; everything else is dropped. Unknown
     tag/attr ⇒ dropped (allowlist), NOT stored raw.
   - **Icon/glyph names stay allowlisted** (521's `resolveAnimatedIconName`
     `hasOwnProperty`/`Set` — never a bare bracket lookup on a prototype-carrying
     map); this task adds no bracket-lookup glyph resolution.
   - Result: no `<script>`, no event handler, no external/JS URL, no XXE ever reaches
     the DOM; an SVG failing a tripwire renders a neutral placeholder, never partial
     injected markup.
   - The allowlist attr-walk is the TRUE security boundary (the tripwires are advisory
     defence-in-depth); the corpus therefore includes mXSS / parser-differential
     vectors (comments, CDATA, unbalanced-quote desync, slash-separated handlers,
     nested/duplicate `<svg>`, entity-encoded) — 522-01-L06 + 522-02-L03. The sanitizer
     is ISOMORPHIC (byte cap via `TextEncoder`, never `Buffer`) because it also runs at
     render inside `renderPageBlockContent`, which the CLIENT builder canvas drives
     (Hard Invariant 8) — a `Buffer.byteLength` would `ReferenceError` in the browser.
2. **Color values (whitelist, no CSS injection).** decoration/glow/glass/preset
   colors run through the existing `readSafeColor` (`pageDocumentV2.ts:1516`) at
   write (hex/hex8/`rgb[a]()`/`hsl[a]()`/`var(--…)`/`transparent`; else fallback).
   Raw stored input never reaches CSS — only validated values, injected as CSS
   custom properties or class-selected tokens, never raw declarations.
3. **Enums + numeric clamps (no injection surface).** `decoration.motion`,
   `tilt`, `surfacePreset`, `hoverEffect`, `composition`, `marquee.direction`,
   `layer.anchor` are `normalizeEnum`-guarded (fail-CLOSED: an invalid enum VALUE
   throws `PageDocumentError` in write mode, `pageDocumentV2.ts:1554-1566`, matching
   every existing page enum — so a bogus value REJECTS the write). `delay`,
   `duration`, `drawSpeed`, `layer.x/y/z`, `marquee.speed` are `readNumber`-clamped
   (fail-soft). Either way these reach CSS only as bounded numbers (`px`/`%`/`ms`/`s`)
   or class names from a fixed map — never string interpolation.
4. **Runtime binding is a STATIC literal (no interpolation).** The generalized
   block-tilt + glare binding is a dependency-free string appended to 521's
   `pageEffectsRuntime.ts`; it reads ALL per-instance config from validated DOM
   `data-*`/CSS custom properties, NEVER from interpolated stored data. Emitted via
   the existing `dangerouslySetInnerHTML` static-`__html` mechanism, CSP-nonce
   compatible, `rAF`/throttled, `passive`, behind `matchMedia` gates.
5. **Allowlist + round-trip (fail-closed READ trap).** Every new key joins its
   reject-unknown allowlist (`assertKnownKeys` + `pageDocumentV2JsonSchema`
   `additionalProperties:false`) AND ships a persistence round-trip test — a
   forgotten allowlist entry silently degrades every stored doc carrying that key to
   empty on read. No new key ships without its round-trip assertion. The customSvg
   block ALSO ships XSS sanitization test vectors (522-02-L03, 522-01-L06).

## Hard Invariants

1. **Present-only** — every new field emits ZERO bytes when unauthored; legacy /
   no-effect docs normalize + render **byte-identical**. The one new `customSvg`
   block type never appears in a legacy doc.
2. **`prefers-reduced-motion` respected** — every effect: CSS gate
   (`@media (prefers-reduced-motion: no-preference)` around every keyframe binding)
   AND (block tilt/glare) a `matchMedia` runtime early-return. No motion for reduce
   users; layered/glass/hover STATIC styling still applies (only the ANIMATION stops).
3. **No new npm dependency** — SVG sanitizer is a hand-rolled allowlist tokenizer;
   all effects are inline CSS keyframes; the runtime is 521's dependency-free IIFE
   (`core/package.json` unchanged).
4. **No DB migration / no DDL** — all config on existing jsonb (`block.style`,
   `section.style`, block props); the new block type stores nothing on legacy docs.
5. **No `PAGE_DOCUMENT_SCHEMA_VERSION` bump** (`pageDocumentV2.ts:28` stays `2`).
6. **Reuse 521's runtime + tilt primitive** — 522 EXTENDS `pageEffectsRuntime.ts`
   (block-tilt generalization + glare) rather than shipping a second runtime module;
   it reuses 521's pointer math + guards. No duplicate spotlight/parallax logic.
7. **Reject-unknown + fail-soft** — each new key joins its allowlist + exactly one
   value normalizer + a round-trip test; bad VALUES fail-soft (clamp/fallback/omit
   for numbers/colors/SVG), unknown enum VALUES + unknown KEYS reject
   (`PageDocumentError`).
8. **Runtime/style static + gated front-only** — the composition `<style>` + tilt
   runtime emit ONLY on the front/preview render path (`PageDocumentRender`
   `:2331`), NOT the builder canvas (`PageAuthoringCanvas` renders via
   `renderPageBlockContent` directly, bypassing `PageDocumentRender`); present-only;
   never interpolate stored data; self-contained. (Preview parity with front is
   intended, per 521.)
9. **ONE new `pageBlockType`** — only `customSvg` is added; the exhaustive
   `Record<PageBlockType,…>` surfaces gain exactly one entry each in the atomic
   type-introduction; all decoration/tilt/layer/hover/surface/marquee are STYLE
   fields (no further block types).

## Acceptance Criteria (measured LIVE vs the reference — ≥5 real-flow scenarios per area)

Verified against the live admin (`coderso-dev-core-host`,
`http://coderso-a.localhost:5173/admin/`) + real front (`:3000`) with
`playwright-cli`, light + dark, 0 console errors, screenshots to
`_docs/_workflows/_smoke/`. Assert VISIBLE effects (computed styles / DOM state /
attribute toggles), compared side-by-side to the reference wow-site
(`_docs/projekty-domow-wow-site/index.html` hero). **≥5 distinct real-flow
scenarios per area** (deep nesting, override/reset cycles,
every-control-visible-effect, cross-device, publish→front parity, reduced-motion).

1. **Custom-SVG block.** Inserting a `customSvg` block and pasting the reference
   `house-line` SVG renders a sanitized inline `<svg>` on front + canvas; enabling
   `drawIn` at `drawSpeed:2400` animates the stroke (computed
   `stroke-dashoffset`→0, like `.draw-line`); pasting an SVG containing `<script>` /
   `onload=` / `<foreignObject>` / `href="javascript:…"` renders the NEUTRAL
   fallback with NONE of those tokens in the DOM; reduced-motion → static drawn SVG.
2. **Floating-drift decoration.** A badge block with
   `style.decoration.motion:"float"` floats (`@keyframes` translateY, like
   `.floating-chip`); `"drift"` translates+scales (like `.hero-bg-orb`); `"pulse"`
   scales/opacity-pulses (like `.sun-ring`/`pulseRing`); `"radiate"` emits an expanding
   concentric box-shadow ring (like `.map-pulse`/`mapPulse` map-marker); `"orbit"`
   rotates; a `delay` staggers two decorations; reduced-motion → all static.
3. **Tilt-on-any-block.** A card block with `style.tilt:"subtle"` tilts toward the
   pointer on the front (computed `transform` with `rotateX`/`rotateY` tracking the
   cursor, clamped, resets on leave — SAME behaviour as the reference
   `.blueprint-card[data-tilt]`); `tiltGlare:true` sweeps a sheen; touch/coarse
   pointer or reduced-motion → NO tilt; `tilt:"none"`/unset = byte-identical.
4. **Layered canvas.** A section (or container) with `style.composition:"layered"`
   positions children absolutely by each child's `style.layer` (x/y/z), z-index
   stacking correct, per-device offsets applied (tablet/mobile), so an SVG + 3
   badges + a tilt card + orbs compose a hero like the reference; `"flow"`/unset =
   the normal flex/grid flow (byte-identical).
5. **Glass/glow + hover presets.** A card with `style.surfacePreset:"glass"` paints
   the glass gradient + border + `backdrop-filter` (like `.service-card`);
   `"radial-glow"`/`"ambient-orbs"` add the glow/orbs; `hoverEffect:"glow-reveal"`
   reveals a radial glow on hover (like `.service-card:hover:after`); `"lift"`
   translateY(-6px) (like `.project-card:hover`); `"scale"` scales inner;
   `"lift-glow"` both; reduced-motion keeps the static glass but drops the hover
   TRANSITION.
6. **Ticker / marquee.** A `group` block with `style.marquee.speed:18`,
   `seamless:true` auto-scrolls its children horizontally (`@keyframes ticker`, like
   `.ticker`), seamless loop via a duplicated track; reduced-motion → static row.
7. **Cross-device + publish→front parity.** Every effect authored in the editor
   matches after `publish` on the real front at desktop/tablet/mobile; layered/tilt
   never break mobile layout (layered canvas collapses sanely, `.floating-chip`-style
   decorations hide/simplify on mobile per the responsive overrides).
8. **Security negatives.** `customSvg.svg` with any tripwire token → neutral
   fallback (nothing injected); `decoration.motion:"explode"` / `tilt:"spin"` /
   `surfacePreset:"drop-table"` / `hoverEffect:"hack"` throw `PageDocumentError` in
   write mode (fail-closed enums, like an unknown key `style.wobble`);
   `layer.z:99999` clamps to 40, `marquee.speed:0.1` clamps to 8,
   `decoration.color:"expression(alert(1))"` → `readSafeColor` fallback — the stored
   doc round-trips with sanitized values.
9. **No-effect byte-identity.** A page with none of the new fields authored produces
   a normalized document and rendered HTML byte-identical to the post-521 output (no
   `<style>`/runtime emitted, no data-attribute, no wrapper change).

## Definition of done

All 6 subtasks landed in order, AFTER 521; the custom-SVG block (sanitized +
draw-in), floating-drift decoration, tilt-on-any-block, layered canvas, glass/glow +
hover presets, and ticker persist, round-trip, reject unknown keys, and fail-soft on
bad values; the SVG sanitizer strips every XSS vector at write + render (allowlist);
every effect honors `prefers-reduced-motion` (CSS + runtime); no npm dependency
added, no migration, no schemaVersion bump, no route; ONE new `pageBlockType`; 522
reuses 521's runtime + tilt primitive (no duplicate runtime); `hero.tsx` /
`PageEditor.tsx` untouched; legacy / no-effect docs byte-identical; Security Contract
satisfied (SVG allowlist + color whitelist + clamps + static runtime at write and
render); every gate green (root `tsc -p tsconfig.json --noEmit`, `bun --cwd core
lint:types`, vitest, `bun test`, `gates:coderso`); ≥5-scenario-per-area Playwright
smoke passes light + dark with 0 console errors measured side-by-side vs the
reference; closure documented under the then-current next-free changelog (grep
`_docs/_CHANGELOG/` highest+1; highest on disk 1233 as of authoring, 522 after
519/520/521).
</content>
</invoke>
