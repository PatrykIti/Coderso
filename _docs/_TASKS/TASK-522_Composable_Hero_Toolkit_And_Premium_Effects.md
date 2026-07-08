# TASK-522: Composable Hero Toolkit & Premium Effects — Custom-SVG Block, Floating-Drift Decorations, Tilt-On-Any-Block, Layered Canvas, Glass/Glow + Hover Presets & Ticker

# FileName: TASK-522_Composable_Hero_Toolkit_And_Premium_Effects.md

**Priority:** High
**Category:** Admin UI / Content (Pages) / Site Render / Widgets / Schema (JSON model) / Security / Accessibility
**Estimated Effort:** Large
**Dependencies:**
- **TASK-521 (Page Motion & Interaction Effects) — HARD, LANDS FIRST.** TASK-522
  is implemented AND merged strictly AFTER TASK-521. 522 REUSES 521's landed
  outputs verbatim: the dependency-free runtime module `core/services/pages/pageEffectsRuntime.ts`
  (521-01-L04) + its `prefers-reduced-motion` early-return discipline (the ONE
  reusable in-module guard — verified `pageEffectsRuntime.ts:53`); the
  hero mouse-tilt POINTERMOVE PATTERN whose math 522-04 REPRODUCES for any block.
  **Grounding correction:** the hero-tilt primitive does NOT live in
  `pageEffectsRuntime.ts` — that module's own header states *"Hero tilt has its OWN
  small script in 521-03 — this module does NOT handle hero"* and its IIFE holds only
  reveal/parallax/spotlight. The tilt math (`px/py` offset −0.5..0.5 →
  `ry=px*max*2; rx=-py*max*2` → `rotateX(rx) rotateY(ry)`, `matchMedia('(pointer:fine)')`
  + reduced-motion returns) is a SEPARATE `HERO_TILT_SCRIPT` IIFE in
  `core/widgets/core/hero.tsx:1311-1325`, id `"hero-tilt"`, selector `[data-hero-tilt]`.
  Since 522 does NOT edit/import `hero.tsx`, 522-04's block tilt COPIES that ~4-line math
  into a fresh self-gated `[data-block-tilt]` binding in `pageEffectsRuntime.ts` — a
  small documented duplication (see Hard Invariant 6, softened). The runtime module also
  has NO module-wide `pointer:fine` gate (its only one wraps the spotlight, gated on
  `[data-page-spotlight]` existing — `:84`), so the new binding opens its OWN
  `matchMedia('(pointer:fine)')`.
  522 also reuses the curated inline-SVG + CSS-keyframes precedent (`animatedIconGlyphs.tsx` +
  `ANIMATED_ICON_KEYFRAMES_CSS`, 521-04-L01 — 522's custom-SVG block is its
  arbitrary-SVG complement, and 522's composition CSS follows the same
  static-string + `@media (prefers-reduced-motion: no-preference)` gating shape);
  the compact page-settings side-inspector + per-page effects wiring (521-05).
  **522 edits DISJOINT regions / NEW block cases of the seam files 521 also
  touches (`pageRendererV2.tsx`, `pageEditorControlRegistry.ts`,
  `pageEffectsRuntime.ts`) and NEVER a region 521 owns — with ONE explicit,
  documented co-edit carve-out: the `PageDocumentRender` single runtime-`<script>`
  EMIT PREDICATE (521-05-L03).** Because the 522 block-tilt binding is appended into
  the SAME `PAGE_EFFECTS_RUNTIME_SOURCE` string 521-05 already emits once, 522-05-L01
  OR-widens that predicate in place (rather than double-emitting a second `<script>`).
  This is the sole 521-owned region 522 mutates; see Coordination.
- **TASK-519 (alpha color input)** — decoration/glow/glass/preset colors are
  authored with the 519 alpha-capable swatch (`hex8`/`rgba()`); the page model
  already PERSISTS alpha at the schema boundary (`readSafeColor`,
  `pageDocumentV2.ts:1643`), so 522 stores alpha today; 519 is required only so the
  ADMIN swatch AUTHORS + round-trips alpha (else the raw hex control is the fallback).
- TASK-424/425 (`PageSectionStyleV2`, `PageBlockStyleV2`, the responsive-override
  machinery every new style field rides for free — `PageBlockResponsiveOverrideV2.style`,
  `pageDocumentV2.ts:523-535`; `PageSectionResponsiveOverrideV2.style`, `:539-555`),
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

## Gap analysis (grounded — SYMBOL names are authoritative; RE-GREP line anchors at implement time)

> **Anchor note (post-521):** TASK-521 has ALREADY landed on this branch
> (`pageEffectsRuntime.ts`/`animatedIconGlyphs.tsx` present) and SHIFTED every
> `pageDocumentV2.ts`/`pageRendererV2.tsx` line by ~40-130 lines. The line numbers
> below are the post-521 actuals as re-grepped 2026-07-08, but the **grep-able SYMBOL
> names are the contract** — re-grep (`grep -an`) at implement time and trust the symbol,
> not the number.

### G-1 — no custom/arbitrary-SVG block (MISSING)

- `pageBlockTypes` (`pageDocumentV2.ts:50-72`) has 21 members; there is **no
  arbitrary-SVG block**. `embed` (`:64`, props `["html","url","provider"]`,
  `pageBlockPropKeys.embed :694`) renders sandboxed third-party HTML/iframes — a
  DIFFERENT surface (not an inline decorative SVG, no draw-in, sandbox-oriented).
  521-04 implemented the `icon` placeholder as a CURATED set; the owner also wants
  an ARBITRARY paste/upload SVG (the reference `house-line`), which needs its own
  sanitized block. **Decision:** add exactly ONE new `pageBlockType` `"customSvg"`.
  Unlike 521's `icon` reuse, there is no spare placeholder, so this is an
  UNAVOIDABLE type introduction — the FIVE exhaustive (non-Partial)
  `Record<PageBlockType,…>` surfaces MUST all gain a `customSvg` entry in one
  **atomic type-introduction** (522-01-L01) or typecheck breaks: `pageBlockPropKeys`
  (`pageDocumentV2.ts:660`), `pageBlockDefaultProps` (`:901` — ALSO consumed at
  runtime (`normalizeBlockProps` `:2523-2527`) + by `blockPropFallback`, so a missing key is a runtime
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

- `PageBlockStyleV2` (`pageDocumentV2.ts:481-521`) has align/width/column/background/
  radius/shadow/border/padding/margin/typography — **no motion/decoration/animation**
  field. The reference `floatChip`/`floatOrb`/`pulseRing`/`mapPulse` keyframes
  (`styles.css:71-79`) have no CMS equivalent. Add present-only
  `style.decoration?: PageBlockDecoration` (`motion` variant + `delay` + `duration`).

### G-3 — hero tilt is hero-ONLY, not reusable on blocks (PARTIAL)

- 521-03 added `hero.style.tilt` on the `hero` WIDGET only (`hero.tsx`), whose tilt
  pointermove primitive lives in a SEPARATE `HERO_TILT_SCRIPT` IIFE INSIDE `hero.tsx`
  (`:1311-1325`) — NOT in the shared `pageEffectsRuntime.ts` module. Page BLOCKS
  (`PageBlockStyleV2`) have no tilt. The reference applies `[data-tilt]` to a CARD
  (`.blueprint-card`, `index.html:47`). Add present-only `style.tilt?` on
  `PageBlockStyleV2` + an optional `tiltGlare?` sheen. **522 does NOT edit or import
  `hero.tsx`**, so it cannot call the hero primitive — 522-01-L05 REPRODUCES the ~4-line
  pointer math in a new self-gated `[data-block-tilt]` binding appended to the shared
  runtime module (a small documented duplication, see Hard Invariant 6; NOT a claimed
  reuse of an in-module primitive). The hero widget keeps 521's tilt untouched.

### G-4 — no layered/absolute composition canvas (MISSING)

- Layout blocks `container`/`columns`/`group` (`layoutBlockTypes`,
  `pageDocumentV2.ts:716`) flow children (flex/grid) — none place children
  **absolutely / layered / z-indexed**. `PageSectionLayoutV2` has no
  composition/layer mode. Add present-only `style.composition?:"layered"` (on section
  style AND layout-block style) + per-child `style.layer?` (x/y/z/anchor). Only the
  NUMERIC `layer.x/y/z` offsets vary per device — delivered by a dedicated `--layer-x/y/z`
  per-breakpoint delta emit in `pageResponsiveCss.ts` (522-05-L02); `anchor` and every
  data-attr effect are BASE-ONLY (see G-3/G-5 note + 522-01-L03: `pageResponsiveCss.ts`
  cannot express class/attr deltas against the inline base).

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

- `renderPageBlockContent` switch (`pageRendererV2.tsx:1787`), `case "icon"` now at
  `:1959` (521-04 replaces its `return null`). The single point that builds the
  per-block frame's `className`/`style`/`dataAttributes` (carrying `data-block-id`) is
  **`toPageBlockRenderProps` (`:748`)** — it feeds BOTH the front `PageBlockFrame`
  (`:2039`) AND the admin canvas's `renderBlockFrame` callback
  (`PageAuthoringCanvas.tsx:1038-1063`, which spreads `renderProps.className/style/dataAttributes`).
  `renderPageBlockWithFrame` (`:2009`) is a pure DELEGATOR (calls `renderPageBlockContent`
  once at `:2011`, then dispatches to `context.renderBlockFrame` or falls back to
  `<PageBlockFrame>`), NOT the element that stamps the styled wrapper — so per-block
  composition attrs merge in `toPageBlockRenderProps` (see 522-03-L01 + Hard Invariant 1).
  `PageSectionRender` (`:2381`) + `PageDocumentRender` (`:2459`,
  `data-page-v2="true"` root `:2488/:2527`) are the section + page-root emit points
  (521-05 emits its runtime here; 522 emits its composition `<style>` + block-tilt
  runtime binding here, additively, after 521). Inline `<script>`/`<style>` emit
  via `renderSharedWidgetRuntimeScript` / `dangerouslySetInnerHTML` static `__html`
  (`core/widgets/runtimeScripts.tsx:20/46`).

## Schema-extension plan (JSON model — NO DDL, NO schemaVersion bump)

All additions are **present-only**, join the **reject-unknown allowlist**
(`assertKnownKeys`, `pageDocumentV2.ts:1751`), ship a **round-trip test**, and are
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
// realRuntimeBlockTypes (:760) + editorInsertableBlockTypes (:788). NO capability-
// reason stub (it IS insertable). Every one of the FIVE exhaustive
// Record<PageBlockType,…> (pageBlockPropKeys, pageBlockDefaultProps,
// pageBlockRenderDefaults, blockOptionCopy, pageBlockControlRegistry) gains a customSvg
// entry in this one atomic land:
pageBlockDefaultProps.customSvg = { svg:"", drawIn:false, label:"" };
pageBlockRenderDefaults.customSvg = { /* neutral frame render defaults, mirror `icon` */ };
blockOptionCopy.customSvg = { label:"Custom SVG", description:"Paste a sanitized inline SVG." }; // NO icon field
```

**PageBlockStyleV2 (`pageDocumentV2.ts:481`) — decoration / tilt / layer / hover /
surface / marquee (G-2..G-6, all present-only). The model accepts all of these under
the responsive-override channel, but only NUMERIC `layer.x/y/z` actually RENDER per
device (via the 522-05-L02 `--layer-*` seam); the data-attr/class effects are base-only
and their controls are authored `responsive:false` (see 522-01-L03 / Acceptance #7):**

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

**PageSectionStyleV2 (`pageDocumentV2.ts:440`) — surface preset + layered canvas
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
| 522-03 | Floating-drift decoration + block-frame composition application | `pageRendererV2.tsx` **[`toPageBlockRenderProps` composition-attr MERGE region (`:748`) + `renderPageBlockWithFrame` outer-wrapper/child-span region (`:2009`) — seams]**; `pageEditorControlRegistry.ts` **[`pageUniversalBlockControls` decoration region — seam]** | L01 block-frame resolver wiring + decoration control, L02 tests | 522-01, 522-02 |
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
  `pageBlockDefaultProps` (`:901` — `{svg:"",drawIn:false,label:""}`, also prevents a
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
    `renderPageBlockContent`, `:1787` — disjoint from 521-04's `case "icon"` `:1959`).
  - **522-03** owns the block-frame composition-attr merge in **`toPageBlockRenderProps`
    (`:748`)** — the SOLE builder of the front-wrapper `className`/`style`/`dataAttributes`
    (with `data-block-id`) that BOTH the front `PageBlockFrame` (`:2039`) AND the admin
    canvas `renderBlockFrame` callback (`PageAuthoringCanvas.tsx:1038-1063`) consume.
    ONE edit merges the FRAME-level portion of the 522-01 `resolveBlockCompositionAttrs(style)`
    output (layer positioning + anchor, surface/glow, marquee, `data-tilt-parent`) into that
    returned record, so those attrs land on the REAL frame (the element `pageResponsiveCss`
    targets via `[data-block-id]`, so per-device `--layer-*` reaches it) on both paths. The
    TRANSFORM-writing effects (tilt/float·drift·pulse·orbit/lift·scale) + `.cx-glare`/orb child
    spans ride an INNER effect wrapper that `renderPageBlockWithFrame` (`:2009`) inserts around
    the rendered `content` BEFORE handing it to the delegated frame branches UNCHANGED (canvas
    chrome preserved; NOT a self-built replacement div). Layer stays on the frame, effect on the
    inner descendant, so the frame's anchor translate and the inner effect transform never
    collide. 522-04 (tilt) and 522-05 (hover/glass/layer) add
    NO further frame edit — the resolver already reads all those fields; they only add CONTROLS.
  - **522-05** owns the `PageSectionRender` (`:2381`) surface/ambient-orbs/canvas
    attr region (DISJOINT from 521-02's `scrollEffect` attrs on the same symbol —
    additive `data-*`/class, after 521-02), the layout-block canvas render, and the
    `group`-block marquee wrapper.
  - The page-root composition `<style>` + block-tilt runtime emit rides in
    `PageDocumentRender` (`:2459`) ADJACENT to 521-05's runtime emit (additive,
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
- **`pageEffectsRuntime.ts` (521-owned) — 522 APPEND seam (DISJOINT top-level block).**
  522-01-L05 appends, after 521 is merged, a SELF-CONTAINED block-tilt binding
  (`[data-block-tilt]`) + optional glare-position update. **Grounded to the LANDED
  shape (verified):** the module is a joined ES5 string array
  (`[ "(function(){", … ].join("")`) with (a) a global reduced-motion early-return
  `if(RM&&RM.matches)return;` at `:53` — the ONLY guard the append reuses; (b) NO hero
  tilt (its own header says so); (c) NO module-wide `pointer:fine` gate — the only one
  wraps the spotlight and is additionally gated on `sp = [data-page-spotlight]` existing
  (`:84`). Therefore the append is a NEW top-level `querySelectorAll("[data-block-tilt]")`
  block placed AFTER the spotlight block (NOT nested inside the `sp`-gated block — nesting
  there would make block-tilt silently dead on any spotlight-less page), authored as ES5
  `var`/`function` array fragments, opening its OWN `matchMedia('(pointer:fine)')` gate
  (a second `pointer:fine` gate is fine; only a second reduced-motion open is avoided).
  The ~4-line pointer math is a small DOCUMENTED DUPLICATION of `hero.tsx`'s
  `HERO_TILT_SCRIPT` (which 522 cannot import), NOT a claimed reuse of an in-module
  primitive — see Hard Invariant 6. 522 does NOT modify 521's spotlight/reveal/parallax
  bindings. This is the primary framing (the earlier "adapt to 521's actual shape" hedge
  is now the concrete plan); still re-verify the landed file at implement time.
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
   - **Fail-closed PRE-PASS (before the walk):** strip (or, on presence, reject the
     whole SVG) `<!--…-->` HTML comments and `<![CDATA[…]]>` sections — the tag-regex
     `/<(\/?)([a-zA-Z][\w:-]*)…>/g` cannot match these, so left in place they would
     survive VERBATIM into the output guarded only by advisory tripwires; the reference
     `house-line` contains neither, so removing them is loss-free.
   - **Fail-closed tripwires (reject the whole SVG → neutral fallback):** any
     `<script`, `<foreignObject`, `<!ENTITY`/`<!DOCTYPE` (XXE), `on\w+=` event
     attribute, `javascript:`/`vbscript:`/`data:text/html` URL, `expression(`/
     `behavior:`/`-moz-binding` in style, `url(` referencing a non-`#` target,
     `<use>`/`href`/`xlink:href` whose value is NOT a local `#fragment`, or bytes >
     `PAGE_CUSTOM_SVG_MAX_BYTES`.
   - **Fail-closed POST-WALK residual check:** after the allowlist walk, `return ""`
     (neutral fallback) if `out` still contains any residual raw `<` that is not a
     re-emitted allowlisted tag, or an unbalanced quote — so no un-walked markup
     (dropped-tag TEXT content, quote-desync fragments) ever survives to the DOM.
   - **Allowlist filter (prefer allowlist over denylist):** only allowlisted SVG
     tags (`svg,g,defs,path,rect,circle,ellipse,line,polyline,polygon,text,tspan,
     linearGradient,radialGradient,stop,clipPath,mask,pattern,use[local],symbol,
     title,desc,marker,filter,feGaussianBlur,feOffset,feMerge,feMergeNode,
     feColorMatrix,feBlend,feFlood,feComposite`) and allowlisted attributes
     (geometry + presentation + `class,id,transform,viewBox,preserveAspectRatio` +
     `href`/`xlink:href` restricted to `#…`, `xmlns`/`xmlns:xlink` restricted to the
     SVG/xlink namespace VALUES only [non-SVG namespace ⇒ SVG rejected]) survive;
     everything else is dropped. The `style` attribute is NOT allowlisted — it is
     DROPPED by the attr-walk (no raw author CSS reaches the DOM, closing the
     `position:fixed` layout-escape/clickjacking class at the source per §2; the
     `expression`/`url(javascript…)`/`behavior` tripwires remain as defence-in-depth).
     Unknown tag/attr ⇒ dropped (allowlist), NOT stored raw.
   - **Icon/glyph names stay allowlisted** (521's `resolveAnimatedIconName`
     `hasOwnProperty`/`Set` — never a bare bracket lookup on a prototype-carrying
     map); this task adds no bracket-lookup glyph resolution.
   - Result: no `<script>`, no event handler, no external/JS URL, no XXE ever reaches
     the DOM; an SVG failing a tripwire renders a neutral placeholder, never partial
     injected markup.
   - With the fail-closed pre-pass (comments/CDATA) + post-walk residual-`<`/unbalanced-quote
     check in place, the allowlist attr-walk IS the security boundary for all markup the
     tag-regex can match, and the pre/post fail-closed passes cover exactly the constructs
     the regex CANNOT match (comments, CDATA, dropped-tag TEXT, quote-desync) — the
     tripwires then remain advisory defence-in-depth rather than the sole boundary for any
     path. The corpus therefore includes mXSS / parser-differential vectors (comments,
     CDATA, unbalanced-quote desync, slash-separated handlers, nested/duplicate `<svg>`,
     entity-encoded), each asserting a fail-CLOSED outcome (`=== ""` or a stripped `<svg>`
     carrying no live ref) — 522-01-L06 + 522-02-L03. The sanitizer
     is ISOMORPHIC (byte cap via `TextEncoder`, never `Buffer`) because it also runs at
     render inside `renderPageBlockContent`, which the CLIENT builder canvas drives
     (Hard Invariant 8) — a `Buffer.byteLength` would `ReferenceError` in the browser.
2. **Color values (whitelist, no CSS injection).** decoration/glow/glass/preset
   colors run through the existing `readSafeColor` (`pageDocumentV2.ts:1643`) at
   write (hex/hex8/`rgb[a]()`/`hsl[a]()`/`var(--…)`/`transparent`; else fallback).
   Raw stored input never reaches CSS — only validated values, injected as CSS
   custom properties or class-selected tokens, never raw declarations. Author-controlled
   surface/glow retint is DELIVERED (not merely promised) — with a SPLIT color source
   because `PageBlockStyleV2` has NO `accent` field (accent is section-only,
   `pageDocumentV2.ts:444`): **sections** thread their real `readSafeColor`-validated
   `style.accent` via `resolveSectionCompositionAttrs`; **blocks** thread their
   `readOptionalSafeBackground`-validated `style.background` via
   `resolveBlockCompositionAttrs`, but ONLY when it is a plain color (a gradient/url
   background is left out — threading a gradient into `radial-gradient(circle,<glow>,…)`
   is invalid CSS). Both feed `--surface-glow` (+ `--deco-ring`/`--orb-color`) which the
   glass/orb/grid/radiate/pulse CSS consumes with the reference aqua/violet values as
   FALLBACKS (522-01-L04, asserted by 522-01-L06/522-05-L05). Reading `style.background`
   (not a nonexistent `style.accent`) on a block also keeps `lint:types`/root `tsc` green.
   A glass block that also sets `style.background` keeps the glass gradient because the
   preset paints via `background-image` on the attribute selector, not a bare `background`
   shorthand an inline `background` would override.
3. **Enums + numeric clamps (no injection surface).** `decoration.motion`,
   `tilt`, `surfacePreset`, `hoverEffect`, `composition`, `marquee.direction`,
   `layer.anchor` are `normalizeEnum`-guarded (fail-CLOSED: an invalid enum VALUE
   throws `PageDocumentError` in write mode, `normalizeEnum` `pageDocumentV2.ts:1681`, matching
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
6. **Extend 521's runtime module; reproduce (not import) the tilt math** — 522
   EXTENDS `pageEffectsRuntime.ts` (a new `[data-block-tilt]` binding + glare) rather
   than shipping a second runtime module, and reuses that module's global
   reduced-motion early-return (`:53`). It does NOT duplicate the spotlight/parallax
   logic. **Explicit carve-out:** the ~4-line pointer-tilt math is COPIED from
   `hero.tsx`'s `HERO_TILT_SCRIPT` (521-03) because that primitive lives in `hero.tsx`
   — a file 522 does not edit or import — so it is genuinely unreusable from the runtime
   module. This is an accepted, documented, minimal duplication (option (a) in
   522-01-L05). A future 521-03 co-edit could hoist the math into a shared exported
   helper for true reuse; that refactor is OUT of 522's scope. The new binding opens its
   OWN `matchMedia('(pointer:fine)')` gate (the module has no reusable module-wide
   pointer-fine gate).
7. **Reject-unknown + fail-soft** — each new key joins its allowlist + exactly one
   value normalizer + a round-trip test; bad VALUES fail-soft (clamp/fallback/omit
   for numbers/colors/SVG), unknown enum VALUES + unknown KEYS reject
   (`PageDocumentError`).
8. **Runtime/style static + gated front-only** — the composition `<style>` + tilt
   runtime emit ONLY on the front/preview render path (`PageDocumentRender`
   `:2459`), NOT the builder canvas (`PageAuthoringCanvas` renders via
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
   never break mobile layout (layered canvas collapses sanely). **Per-device scope is
   BOUNDED and honest (see 522-01-L03 / 522-05-L02):** only the NUMERIC layer offsets
   (`layer.x/y/z`) vary per device — `pageResponsiveCss.ts` emits per-property CSS
   declarations only; class/data-attr effect deltas at a breakpoint are NOT
   CSS-expressible against the inline base. So on mobile a `.floating-chip`-style
   decoration is HIDDEN via the existing per-device block visibility (`display:none`) —
   NOT "simplified" (e.g. kept-but-animation-off); `decoration.motion`/`surfacePreset`/
   `hoverEffect`/`tilt`/`composition`/`marquee` are BASE-ONLY (identical on every
   breakpoint) and their controls are `responsive:false`. "Keep the badge, drop only its
   animation on mobile" is explicitly OUT of scope this task.
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
EXTENDS 521's single runtime module (reproducing the ~4-line tilt math from
`hero.tsx`'s unimportable `HERO_TILT_SCRIPT` — a documented minimal duplication, not a
second runtime module); `hero.tsx` /
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
