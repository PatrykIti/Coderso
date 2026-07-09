# TASK-534: Declarative Interactivity — Tabs/Segmented Switcher Block + Filterable Gallery + Interaction Polish (Noise Overlay / Scroll-Hint / Magnetic Button) — absorbs TASK-527

# FileName: TASK-534_Declarative_Interactivity_Tabs_Switcher_Filter_And_Polish.md

**Priority:** High
**Category:** Admin UI / Content (Pages) / Site Render / Widgets / Schema (JSON model) / Accessibility / Security
**Estimated Effort:** Large
**Dependencies:**
- **TASK-521 (page motion & interaction effects)** — the direct precedent and the
  substrate this task rides. 521 created the single dependency-free front-only
  runtime `core/services/pages/pageEffectsRuntime.ts`
  (`PAGE_EFFECTS_RUNTIME_SOURCE` / `PAGE_EFFECTS_RUNTIME_ID`), the ONE emit of it
  in `PageDocumentRender` (`pageRendererV2.tsx:3100-3105`, gated by `anyMotion`),
  the reduced-motion-first-statement + `try/catch` + `passive`/rAF discipline, and
  the `data-page-motion` root marker (`:3056`). ALL 534 runtime additions
  (switcher toggle, filter show/hide, magnetic-button hover) ride the SAME single
  `<script>` emit — never a second one (a second emit would double-run
  reveal/parallax/spotlight). 521 also established the animated-icon block as the
  precedent for turning a `pageBlockTypes` member into a real runtime renderer,
  and `customSvg` (TASK-522-01-L01) is the precedent for ADDING a brand-new
  `pageBlockTypes` member (the switcher block follows customSvg exactly).
- **TASK-522 (composable-hero toolkit)** — the `[data-block-tilt]` block-tilt
  binding already living INSIDE `PAGE_EFFECTS_RUNTIME_SOURCE` (`:97-120`) is the
  precedent for the magnetic-button runtime: a NEW top-level clause in the same
  IIFE, its own `pointer:fine` gate, reduced-motion inherited from the single
  first-statement early-return. `PageBlockStyleV2` present-only style fields
  (`decoration`/`tilt`/`surfacePreset`/…) are the precedent for the new
  `magnetic` block-style flag; `usesCompositionTilt` OR-widening `anyMotion`
  (`:3013-3014`) is the precedent for OR-widening `anyMotion` with the new
  runtime-bearing surfaces.
- **TASK-519 (alpha color input)** — the noise-overlay tint (if colored) and any
  new color author with the 519 alpha-capable swatch; all colors persist through
  `sanitizeAuthoringCssColor` at the write boundary regardless.
- TASK-424/425 (`PageSectionStyleV2`, `PageBlockStyleV2`, responsive override
  machinery), TASK-455 (`PageDocumentRender` root shell), TASK-459-02 (the
  `filters` block as the precedent for a data-driven per-type block with its own
  runtime + per-type controls).

**Absorbs:** **TASK-527** (previously-queued, NOT authored) — the tabs/switcher
declarative primitive that was slated for 527 is delivered here as subtask 534-01.
No separate TASK-527 file is created; this contract is its sole home.

**Status:** ⏳ To Do
**Closure changelog:** RESOLVE at closure by grepping next-free
(`_docs/_CHANGELOG/`) — `1242` is the last used (TASK-530); `531`–`534` take
`1243+`, so 534 lands at the next-free after 531/532/533 (do NOT hard-code; the
orchestrator owns `_docs/_CHANGELOG/*` and `_docs/_TASKS/README.md`).

---

## Overview

This is **Bundle D** of the page-toolkit fidelity program that closes the gaps
catalogued in `_TMP-cms-ograniczenia.md` (the owner's 7-agent report) while
reproducing the prototype `_docs/projekty-domow-wow-site`. The report's §1 first
hard limit — **"Brak jakiejkolwiek interaktywności JS"** (the page document is
STATIC, `app.js` behaviour cannot be reproduced) — and §4.9 ("lekka
interaktywność (tabs/switcher, filtr) jako prymityw deklaratywny") are this
bundle's charter. It adds a **cohesive family of DECLARATIVE interactivity**, all
riding the ONE existing `pageEffectsRuntime` `<script>`, present-only,
reduced-motion-gated, dependency-free, CSP-safe:

- **(A) Segmented SWITCHER / TABS block (absorbs 527)** — a NEW `pageBlockTypes`
  member `"switcher"` (added exactly like `customSvg`, TASK-522-01-L01) with N
  labelled **panels** (child blocks in per-panel slots `panel:1..panel:6`). The
  runtime toggles the active panel on tab click, reproducing the prototype's
  barn/villa/eco `styleData` swap (`app.js:54-86`). It is a proper
  **`role="tablist"`** with `aria-selected`, roving `tabindex`, arrow-key
  navigation, and reduced-motion-safe crossfade — the report's
  "🔴 semantyka `role=tablist`/aria — brak" (§ Panel "wybierz klimat") is closed.
- **(B) FILTERABLE gallery/portfolio** — a present-only `filterable` flag +
  authored `filterCategories` on the `gallery` block (report §4.9 / §1
  "filtr portfolio po `data-category`"): the renderer emits declarative filter
  **chips** (`role="tablist"`) above the grid and stamps each item with
  `data-category`; the runtime show/hides items on chip click, exactly like
  `app.js:88-100` (`.is-hidden` toggle by `data-category` includes). Reduced-motion
  → instant show/hide (no fade).
- **(C) POLISH** — three small fidelity fillers from §1 / § per-section:
  - **Noise/grain texture overlay** — a present-only page/section option
    (`PageEffectsV2.noiseOverlay` for the page root; `PageSectionStyleV2.noiseOverlay`
    for a section) painting a static self-generated grain layer (data-URI SVG
    turbulence, NO asset, NO npm dep). PRESENT-ONLY, STATIC (renders identically
    under reduced-motion — it does not animate).
  - **Hero scroll-hint indicator block** — a NEW `pageBlockTypes` member
    `"scrollHint"` (a tiny self-contained block: animated dot / chevron, the
    prototype's `scrollDot` keyframe, § Hero "🔴 scroll-hint (animowana kropka) —
    brak odpowiadającego bloku"). CSS-keyframe only (no runtime), reduced-motion
    pauses the bob.
  - **Magnetic button hover** — a present-only `magnetic` flag on
    `PageBlockStyleV2` (report §1 "`.button.magnetic` (przyciąganie do kursora)").
    The runtime attracts the element toward the pointer (`app.js` `.magnetic`
    math), a NEW top-level clause in `PAGE_EFFECTS_RUNTIME_SOURCE`,
    `pointer:fine` + reduced-motion gated, transforms only.

Every addition is **present-only** (zero bytes emitted when unauthored ⇒
byte-identical to the post-530 document + HTML), joins a **reject-unknown
allowlist** (`assertKnownKeys` + `additionalProperties:false`) with a
**round-trip test**, uses colors **ONLY via `sanitizeAuthoringCssColor` /
`sanitizeAuthoringCssBackground`**, needs **NO npm dependency**, **NO DB
migration**, and does **NOT** bump `PAGE_DOCUMENT_SCHEMA_VERSION`
(`pageDocumentV2.ts:29` stays `2`). Legacy / no-interactivity documents parse +
render **byte-identical**.

## Gap analysis (grounded — anchors verified fresh against HEAD)

### G-A — declarative tabs / segmented switcher (MISSING)

- `pageBlockTypes` (`pageDocumentV2.ts:51-76`) has NO tabs/switcher member. The
  report (§ Panel "wybierz klimat") had to ship the barn/villa/eco switcher as a
  STATIC "barn" state with non-clickable badge pills — no live toggle, no
  `role=tablist`, no aria. The prototype behaviour is `app.js:72-86`
  (`[data-style]` click swaps label/copy/class).
- **Decision — ADD a new `pageBlockTypes` member `"switcher"`** (NOT re-use an
  existing block). `customSvg` (TASK-522-01-L01, `:75`) is the exact precedent for
  a clean single-commit `pageBlockTypes` extension: add the member to
  `pageBlockTypes` `:51`, `pageBlockPropKeys` `:828`, `pageBlockDefaultProps`
  `:1079`, `realRuntimeBlockTypes` `:930`, `editorInsertableBlockTypes` `:962`,
  `blockOptionCopy` (`pageEditorOptions.ts:85`), a renderer `case`
  (`pageRendererV2.tsx`), and per-type controls
  (`pageEditorControlRegistry.ts` `pageBlockControlRegistry`). Because every
  `Record<PageBlockType,…>` is exhaustive, the member + all its records — INCLUDING
  `blockOptionCopy` (`pageEditorOptions.ts:85`) — land in ONE atomic model leaf
  (534-01-L01) to keep typecheck green — the documented customSvg pattern
  (TASK-522-01-L01 updated `blockOptionCopy` in that SAME atomic land). This INCLUDES
  three exhaustive maps outside `pageDocumentV2.ts` that the contract must own (grounded
  2026-07-09): `pageBlockRenderDefaults.ts:138`
  (`Record<PageBlockType, PageBlockRenderDefaults>`, add `switcher`/`scrollHint`
  `{ ...frameRenderDefaults }` like `customSvg:194`); the admin palette-copy map
  `pageEditorOptions.ts:85` (`blockOptionCopy: Record<PageBlockType,
  Omit<BlockOption,"type">>`, non-Partial exhaustive, `customSvg:110` — add both entries +
  the `Layers`/`ChevronsDown` `lucide-react` imports, in 534-01-L01 NOT 534-04, since it
  breaks root `tsc` the moment 534-01 lands); and the test-tree map
  `tests/vitest/ui/page-editor-v2-flow.test.tsx:731` (`pageEditorBlockLabels:
  Record<PageBlockType, string>`, add both labels) — the last is outside
  `tests/vitest/pages/*`, so only root `tsc -p tsconfig.json --noEmit` catches it. The switcher's PANELS are child blocks in NEW per-panel slot
  keys `panel:1..panel:6` (extending `pageBlockSlotKeys` `:169-175`, the
  `children`/`column:1..4` precedent), so a panel can hold arbitrary blocks.

### G-B — filterable gallery / portfolio (MISSING)

- The `gallery` block (`pageBlockPropKeys.gallery = ["items","layout"]` `:845`;
  renderer `renderGallery` via `case "gallery"` `:2243-2244`) has NO filter
  capability. The report (§4.9 #9, §1 "filtr portfolio po `data-category`") flags
  this: the prototype `app.js:88-100` filters `.portfolio-item[data-category]`
  by chip.
- **Decision — extend the EXISTING `gallery` block** (present-only, no new block
  type): add `filterable?: boolean` + `filterCategories?: string[]` to
  `pageBlockPropKeys.gallery`, and a per-item `category?: string` inside the
  existing `items` array. When `filterable` is on, the renderer emits the chip bar
  + `data-category` on items; the runtime binds show/hide. Unset ⇒ the gallery
  renders byte-identically to today.

### G-C — interaction polish (MISSING)

- **Noise/grain overlay:** no page/section grain option exists
  (`PageEffectsV2` `:510-514` = spotlight only; `PageSectionStyleV2` `:534-571`
  has no texture). The prototype's blueprint-grid / grain washes (§ Hero, §
  Proces) were dropped. Add a present-only STATIC self-generated SVG-turbulence
  overlay flag on BOTH surfaces.
- **Scroll-hint block:** no block renders the animated scroll-hint dot (§ Hero
  "🔴 scroll-hint … brak odpowiadającego bloku"). Add a new `pageBlockTypes`
  member `"scrollHint"` (customSvg pattern), CSS-keyframe-only (no runtime).
- **Magnetic button:** `PageBlockStyleV2` (`:596-672`) has `tilt`/`decoration`
  but no `magnetic` (report §1 "`.button.magnetic`"). Add a present-only
  `magnetic?: boolean` block-style flag; a NEW clause in
  `PAGE_EFFECTS_RUNTIME_SOURCE` (like the 522 `[data-block-tilt]` clause `:97-120`)
  attracts the element to the pointer, `pointer:fine` + reduced-motion gated.

## Schema-extension plan (JSON model — NO DDL, NO schemaVersion bump)

All additions are **present-only** (emitted only when authored), join a
**reject-unknown allowlist** (`assertKnownKeys`, `pageDocumentV2.ts:2013`) mirrored
in the strict JSON schema (`additionalProperties:false`), and ship a **round-trip
persistence test**. Legacy docs without the new keys normalize **byte-unchanged**.
**NO migration** (jsonb). **NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump** (`:29` = `2`).

> **TASK-534 shared-region marker.** Every additive edit to a shared file is
> wrapped in a clearly-labelled `// ── TASK-534 … ──` comment region (disjoint
> from 531/532/533 regions) so parallel-worktree bundles merge additively. The
> distinct new fields this bundle owns:
> - **`PageBlockStyleV2` (`:596`):** `magnetic?: boolean` (present-only).
> - **`PageSectionStyleV2` (`:534`):** `noiseOverlay?: boolean` (present-only).
> - **`PageEffectsV2` (`:510`):** `noiseOverlay?: boolean` (present-only).
> - **`pageBlockTypes` (`:51`):** `"switcher"`, `"scrollHint"` (two new members).
> - **`pageBlockSlotKeys` (`:169`):** `"panel:1".."panel:6"` (six new slot keys).
> - **`pageBlockPropKeys.gallery` (`:845`):** `+"filterable"`, `+"filterCategories"`
>   (+ per-item `category`); **`.switcher`**, **`.scrollHint`** (new entries).
> - **`pageBlockStyleKeys` (`:746`):** `+"magnetic"` (the sole new universal
>   block-style key — kept in the labelled 534 region).

**`pageBlockTypes` (`pageDocumentV2.ts:51`) — two new members (customSvg pattern):**

```ts
export const pageBlockTypes = [
  /* …existing… "customSvg", */
  // ── TASK-534 ── declarative interactivity primitives.
  "switcher",    // segmented tabs; N panels in slots panel:1..panel:6 (absorbs 527)
  "scrollHint",  // hero scroll-hint indicator (CSS-keyframe dot/chevron, no runtime)
] as const;
```

**`pageBlockSlotKeys` (`:169`) — six panel slots:**

```ts
export const pageBlockSlotKeys = [
  "children","column:1","column:2","column:3","column:4",
  // ── TASK-534 ── switcher panel slots (one child-block tree per tab).
  "panel:1","panel:2","panel:3","panel:4","panel:5","panel:6",
] as const;
```

**Block props (`pageBlockPropKeys` `:828` + `pageBlockDefaultProps` `:1079`):**

```ts
switcher:   ["tabs","activeIndex","variant"],   // tabs: [{label}], activeIndex 0..N-1, variant pill|underline
scrollHint: ["label","glyph"],                  // glyph: "dot"|"chevron"; label optional a11y text
gallery:    [/* …existing "items","layout"… */ "filterable","filterCategories"],
//   gallery item shape gains optional { category?: string } (per-item, existing items array)
```

**`PageBlockStyleV2` (`:596`) — magnetic (G-C):**

```ts
// ── TASK-534 ── present-only magnetic-hover flag (runtime pointer-attract).
magnetic?: boolean;   // omitted when false/unset; joins pageBlockStyleKeys allowlist
```

**`PageSectionStyleV2` (`:534`) + `PageEffectsV2` (`:510`) — noise overlay (G-C):**

```ts
// ── TASK-534 ── present-only static grain overlay (self-generated SVG turbulence).
noiseOverlay?: boolean;   // on PageSectionStyleV2 (section) AND PageEffectsV2 (page root)
```

## Subtask breakdown (single-writer file ownership; strict land order)

| # | Subtask | Sole-writer file(s) | Leaves | Depends on |
|---|---------|---------------------|--------|------------|
| 534-01 | MODEL: switcher + scrollHint block types, panel slots, gallery filter props, magnetic/noiseOverlay style keys, normalize + reject-unknown + JSON schema + runtime clauses | `core/services/pages/pageDocumentV2.ts`; `core/services/pages/pageEffectsRuntime.ts` **[TASK-534 clause region — seam]**; `core/services/pages/pageBlockRenderDefaults.ts` (exhaustive-record entries); `core/admin/ui/pages/editor/pageEditorOptions.ts` **`blockOptionCopy` palette-copy entries ONLY** (non-Partial exhaustive `Record<PageBlockType,…>` — must land atomically here to keep root `tsc` green); `tests/vitest/ui/page-editor-v2-flow.test.tsx` `pageEditorBlockLabels` map | L01 block-type + slots + props model (+ ALL exhaustive `Record<PageBlockType,…>` maps atomically, incl. `blockOptionCopy`), L02 magnetic/noiseOverlay style-key model, L03 runtime switcher/filter/magnetic clauses, L04 model + runtime tests | — (foundation) |
| 534-02 | Switcher + scrollHint RENDER + gallery-filter render + noise overlay emit | `core/services/pages/pageRendererV2.tsx` **[block-content + page-root regions — seam]**; NEW `core/services/pages/pageInteractivityGlyphs.tsx` (scroll-hint SVG + keyframe CSS) | L01 switcher renderer case, L02 gallery-filter render, L03 scrollHint renderer + noise overlay emit, L04 render tests | 534-01 |
| 534-03 | Composition CSS (switcher/filter/magnetic/noise) + resolvers | `core/services/pages/pageCompositionEffects.tsx` **[TASK-534 region — seam]** | L01 interactivity CSS + `usesInteractivity` resolver, L02 CSS tests | 534-01 |
| 534-04 | Editor CONTROLS: switcher tabs editor, gallery filter controls, scrollHint controls, magnetic/noise toggles | `pageEditorControlRegistry.ts` **[TASK-534 regions — seam]**; `pageEditorControlUiModel.ts` **[TASK-534 region — seam]**; NEW `core/admin/ui/pages/editorControls/*` if needed. (NOTE: `pageEditorOptions.ts` `blockOptionCopy` palette copy is OWNED BY 534-01-L01, NOT here — the exhaustive-record atomic-land requirement.) | L01 switcher tabs control + UI kind, L02 gallery filter controls, L03 scrollHint + magnetic + noise toggles, L04 control tests | 534-01 |
| 534-05 | Behavioral runtime tests + docs + closure | test files (own) + `_docs/*.md` | L01 behavioral runtime tests (IIFE exec + click/scroll/pointer), L02 docs + closure | 534-01..04 |

**Land order (strictly sequential):** 534-01 (model + runtime clauses) → 534-02
(render) → 534-03 (composition CSS) → 534-04 (controls) → 534-05 (behavioral tests
+ closure). The shared vocabulary + runtime clauses land FIRST; then render, CSS,
controls; then behavioral tests + closure.

## Coordination / collision guards

> **Cross-bundle RECONCILE (531/532/533/534), 2026-07-09 — PASS.** No two bundles add
> the same field name, control id, or CSS token with a different meaning (verified:
> 534 `magnetic`/`noiseOverlay`/`switcher`/`scrollHint`/`filterable`/`filterCategories`
> + `SWITCHER_MAX_PANELS`/`GALLERY_*` vs 531 `glow`, 532
> `fontSizeCustom`/`textTransform`, 533 `colSpan`/`rowSpan`/`columnTemplate`/`border` —
> all distinct). 534 is the ONLY bundle touching `pageBlockTypes`/`pageBlockPropKeys`/
> insertable-block arrays, the `anyMotion` predicate (`pageRendererV2.tsx:3014`, append-
> only OR-widen), the `PAGE_EFFECTS_RUNTIME_SOURCE` clause fence, `gallery` filter props,
> and `pageCompositionEffects.tsx` `PAGE_INTERACTIVITY_CSS` — so NONE of those seams
> collide with 531/532/533. 534 correctly does NOT touch `pageAuthoringSanitizers.ts`
> (531's sole multi-layer surface). Canonical region sigil confirmed **`// ── TASK-53x ──`**
> (534 already uses it). Append-anchor rule (all four bundles): append each new entry on
> its OWN line inside the labelled region; never rewrite a closing `] as const;` line, a
> function `return` line, or a schema object's closing brace — keeps three-way merges
> additive.

- **Cross-bundle additive discipline (531/532/533/534 share five files).** Each of
  the five SHARED SEAM files (`pageDocumentV2.ts`, `pageRendererV2.tsx`,
  `pageCompositionEffects.tsx`, `pageEditorControlRegistry.ts`,
  `pageEditorControlUiModel.ts`, plus `pageAuthoringSanitizers.ts` owned by 531)
  is edited by multiple bundles in DISJOINT, clearly-labelled `// ── TASK-534 … ──`
  regions. 534 confines EVERY shared-file edit to a labelled 534 region (never
  reorders or edits another bundle's region); this is the AGENTS-permitted
  "documented additive seam". Any 534 write outside a labelled 534 region (or the
  append-only import block) is a reconcile failure. **534 does NOT touch
  `pageAuthoringSanitizers.ts`** (no gradient/multi-layer work — that is 531).
- **`pageDocumentV2.ts` = 534-01 only** (its model leaves edit DISJOINT symbol
  regions: the `pageBlockTypes`/`pageBlockSlotKeys`/`pageBlockPropKeys`/
  `pageBlockDefaultProps`/capability-set region in L01, the
  `PageBlockStyleV2`/`pageBlockStyleKeys`/`PageSectionStyleV2`/`PageEffectsV2`
  style-key region in L02, all in strict intra-subtask order). No OTHER 534 subtask
  writes this file; 534-02/03/04 IMPORT its exports read-only.
- **`pageEffectsRuntime.ts` — add NEW clauses at TWO placements (SPLIT for a11y).**
  534-01-L03 adds the switcher, filter and magnetic clauses inside
  `PAGE_EFFECTS_RUNTIME_SOURCE`. The reduced-motion first statement
  `if(RM&&RM.matches)return;` (`:53`) is an UNCONDITIONAL whole-IIFE return, so anything
  below it is skipped for reduce users. Because the switcher + gallery-filter are
  INTERACTION TOGGLES that MUST work for reduce users (Hard Invariant #2/#9), they are
  placed BETWEEN `try{` (`:51`) and the early-return (`:53`), inside a
  `// ── TASK-534 ── switcher + gallery filter` fence; they do no motion (the crossfade is
  CSS `motion-safe:`-guarded, 534-03). The MAGNETIC clause (motion) is appended AFTER the
  existing 522 `[data-block-tilt]` clause (`:97-120`) and BEFORE `}catch(e){}` (`:121`),
  inside a `// ── TASK-534 ── magnetic` fence, so it INHERITS the reduced-motion
  early-return and opens its own `pointer:fine` gate. It NEVER interpolates stored data
  (all config from validated `data-*`). No second `<script>` is ever emitted — the ONE
  emit in `PageDocumentRender` (`pageRendererV2.tsx:3100`) carries every clause.
- **`pageRendererV2.tsx` is a DOCUMENTED ADDITIVE SEAM** across 534-02 leaves
  editing DISJOINT symbol regions:
  - **534-02-L01** — the `renderPageBlockContent` switch: NEW `case "switcher"`
    (near the existing `case "icon"` `:2254` / `case "customSvg"`), emitting the
    tablist + panels + `data-switcher` contract.
  - **534-02-L02** — `renderGallery` (the `case "gallery"` target `:2243-2244`):
    filter chips + `data-category` when `props.filterable`; PLUS the render-side gallery
    item structure — `PageGalleryItem` type (`:1336`, add `category?`) and `toGalleryItem`
    (`:1356`, re-sanitize + pass `category`) — because that mapper drops unknown keys, so
    `item.category` would be a typecheck error / silently stripped otherwise. This render
    item shape is SEPARATE from the model item shape (534-01-L01); both carry the field.
  - **534-02-L03** — NEW `case "scrollHint"` + the PAGE-ROOT region of
    `PageDocumentRender` (`:3051-3106`): OR-widen `anyMotion` with the new
    runtime-bearing surfaces (`usesInteractivity(document)` from 534-03) and emit
    the present-only noise-overlay `<style>` + overlay node (page root). Section
    noise overlay is emitted inside `PageSectionRender` (disjoint from the block
    switch). The single effects `<script>` emit (`:3100`) is UNCHANGED except its
    `anyMotion` predicate is OR-widened (append-only boolean).
  Append-only shared IMPORT block (`:1-50`): 534-02 adds
  `SCROLL_HINT_GLYPHS`/`INTERACTIVITY_KEYFRAMES_CSS` (from
  `./pageInteractivityGlyphs`), `PAGE_INTERACTIVITY_CSS`/`usesInteractivity` (from
  `./pageCompositionEffects`) — append-only, no reorder. Any write outside a
  leaf's declared symbol region here is a reconcile failure.
- **`pageEditorControlRegistry.ts` is a DOCUMENTED ADDITIVE SEAM** — 534-04 owns
  ONLY the new `pageBlockControlRegistry.switcher` / `.scrollHint` per-type entries
  (`:947`, currently absent) + the gallery per-type region + the SINGLE new
  universal `block.style.magnetic` toggle appended to `pageUniversalBlockControls`
  (`:449`, one line in the labelled 534 region) + the section `noiseOverlay` toggle
  in `pageUniversalSectionControls`. Disjoint from 531/532/533 regions.
- **`pageEditorControlUiModel.ts`** — 534-04 adds a NEW control kind ONLY if the
  switcher tabs editor cannot be expressed by an existing kind (`listItems` `:79`
  is the nearest precedent for an add/remove/reorder label list). If a new
  `{ kind: "tabsEditor" }` is needed it lives in a labelled 534 region of the
  `PageEditorControlUiModel` union (`:69-86`); otherwise reuse `listItems`.
- **NEW sole-writer files (534 only):** `core/services/pages/pageInteractivityGlyphs.tsx`
  (scroll-hint inline SVG + `@keyframes` CSS, static literals — mirrors
  `animatedIconGlyphs.tsx`), owned by 534-02.
- **`prefers-reduced-motion` guard is shared law** (parent 521 invariant): every
  MOTION runtime clause inherits the single first-statement `matchMedia` early-return
  (`:53`), so it sits BELOW it (magnetic, tilt, parallax, reveal, spotlight); the
  INTERACTION-TOGGLE clauses (switcher, gallery filter) sit ABOVE the early-return so
  they still run for reduce users, and their VISUAL transition is CSS
  `motion-safe:`/`motion-reduce:`-guarded instead (switcher crossfade, scroll-hint bob,
  filter fade, magnetic transition). Reconcile fails if
  any surface omits a guard.
- rg misdetects `PageEditor.tsx` / `pageRendererV2.tsx` / `pageDocumentV2.ts` as
  binary — use `Read` / `grep -an`, never trust an empty `rg`.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (orchestrator owns
  them). Closure changelog RESOLVED to next-free at closure (`1243+`).

## Security Contract

**No new route, RBAC bucket, method, or endpoint.** All additions ride the
existing validated Page v2 `document` write path (`normalizePageDocument`, gated by
the pages write permission) and the SSR render path. The attacker-influenceable
surfaces are (1) new ENUMS + BOOLEAN flags, (2) the switcher TAB LABELS + gallery
FILTER CATEGORY strings (free text), (3) the scroll-hint LABEL, and (4) the new
runtime clauses — each constrained at BOTH the write (normalize) and render
boundary (defence in depth). **No CSS/HTML injection via interactivity config is
possible:**

1. **Enums + booleans (no injection surface).** `switcher.variant`
   (`pill|underline`), `scrollHint.glyph` (`dot|chevron`) are `normalizeEnum`-guarded
   (fail-CLOSED in write mode: a bogus VALUE throws `PageDocumentError`, matching
   every existing page enum — `normalizeEnum` at `pageDocumentV2.ts:1943-1955`, NOT
   `:1554` which is a responsive-override schema builder); `magnetic`,
   `noiseOverlay`, `gallery.filterable` are `readBoolean`-coerced; `switcher.activeIndex`
   is `readNumber(value, 0, 0, SWITCHER_MAX_PANELS-1)`-clamped (four-arg form). Booleans/enums reach CSS/markup ONLY as
   class names selected from a fixed map or as `data-*` toggle values — never string
   interpolation.
2. **Free-text labels/categories (escaped as text nodes only).** Switcher tab
   labels, the scroll-hint label, and gallery filter category strings are TEXT: at
   write they are length-clamped + `assertKnownKeys`-scoped strings (React renders
   them as escaped text nodes, never `dangerouslySetInnerHTML`). Category values
   used in the `data-category` ATTRIBUTE and the runtime filter are additionally
   sanitized to a SINGLE-TOKEN kebab/word pattern (`^[\w-]{1,48}$` — NO space; a category
   is one token, and `data-category` holds a space-separated SET of such tokens matching
   the runtime `cat.split(" ")`) at write and re-validated per token at render; an
   out-of-pattern token is dropped (fail-soft), so the `data-category` attribute value is
   always a bounded space-joined token set — never a `"` breakout. The runtime reads the
   attribute via `getAttribute` + `split(" ").indexOf` (no `innerHTML`, no `eval`).
3. **Colors (whitelist).** The noise overlay is a STATIC self-generated SVG
   turbulence data-URI with NO author color by default. If a tint is exposed, it
   runs through `sanitizeAuthoringCssColor` at write AND is re-sanitized at render
   (defence-in-depth), injected only as a CSS custom property — never a raw
   declaration. NO `sanitizeAuthoringCssBackground` multi-layer relaxation here
   (that is 531).
4. **Runtime clauses are STATIC literals (no interpolation).** The switcher-toggle,
   gallery-filter, and magnetic clauses appended to `PAGE_EFFECTS_RUNTIME_SOURCE`
   are dependency-free string literals reading ALL per-instance config from
   validated DOM `data-*` attributes — NO stored/user data is interpolated into the
   source. Emitted via the ONE existing `<script data-coderso-runtime-script>` emit
   (`pageRendererV2.tsx:3100`, static `__html`), CSP-nonce compatible, rAF/throttled
   where a pointer loop is involved (magnetic), `passive` listeners, `try/catch`
   guard, transforms only. Each pointer-MOTION clause (magnetic) is placed AFTER the
   reduced-motion early-return (so it is suppressed for reduce) + opens its own
   `pointer:fine` gate. The click/keyboard TOGGLE clauses (switcher, filter) are placed
   BEFORE the early-return so they run for ALL users (they are interaction, not motion);
   their VISUAL transition is CSS `motion-safe:`-guarded. (The early-return at `:53` is an
   unconditional whole-IIFE return, so toggles that must work for reduce users cannot sit
   below it — see 534-01-L03.)
5. **Allowlist + round-trip (fail-closed READ trap).** Every new key joins its
   reject-unknown allowlist (`assertKnownKeys` list + JSON schema
   `additionalProperties:false`) AND ships a persistence round-trip test — a
   forgotten allowlist entry silently degrades every stored doc carrying that key to
   empty on read. No new key ships without its round-trip assertion. The two new
   `pageBlockTypes` members carry no legacy documents (nothing authored them yet),
   so byte-identity for legacy docs is trivially preserved.

## Hard Invariants

1. **Present-only** — every new field/member emits ZERO bytes when unauthored;
   legacy / no-interactivity docs normalize + render **byte-identical**.
2. **`prefers-reduced-motion` respected** — every VISUAL transition ships a CSS
   `motion-safe:`/`motion-reduce:` guard; every pointer-MOTION runtime clause (magnetic)
   sits BELOW the single `matchMedia` first-statement early-return (`:53`, an unconditional
   whole-IIFE return) so it is suppressed for reduce. Click/keyboard TOGGLE logic
   (switcher, filter) is placed ABOVE the early-return so it still works for reduce users
   (accessibility); only its animation is suppressed (via the CSS guard). Placing the
   toggles below the early-return would break them for reduce users and is forbidden.
3. **No new npm dependency** — scroll-hint glyph + noise overlay are self-generated
   inline SVG + CSS keyframes; every runtime clause is a hand-written
   dependency-free IIFE clause in the ONE existing script (`core/package.json`
   unchanged).
4. **No DB migration / no DDL** — all config in existing jsonb (block props/style,
   `section.style`, `currentData.settings.effects`).
5. **No `PAGE_DOCUMENT_SCHEMA_VERSION` bump** (`pageDocumentV2.ts:29` stays `2`).
6. **Reject-unknown + fail-soft** — each new key joins its allowlist + exactly one
   value normalizer + a round-trip test; bad VALUES fail-soft (enum→throw in write
   mode / clamp / drop), unknown KEYS reject (`PageDocumentError`).
7. **ONE runtime `<script>` emit** — all new runtime clauses ride the single
   `PAGE_EFFECTS_RUNTIME_SOURCE` emit in `PageDocumentRender`
   (`pageRendererV2.tsx:3100`), front/preview only, NEVER the builder canvas
   (`PageAuthoringCanvas` bypasses `PageDocumentRender`), and NEVER a second
   `<script>`. The `anyMotion`/emit predicate is OR-widened (append-only) with the
   new interactivity surfaces.
8. **New `pageBlockTypes` members follow the customSvg pattern** — `"switcher"` and
   `"scrollHint"` land with ALL their exhaustive `Record<PageBlockType,…>` entries
   in ONE atomic model leaf (534-01-L01), INCLUDING `pageBlockRenderDefaults.ts:138`
   and the `tests/vitest/ui/page-editor-v2-flow.test.tsx:731` `pageEditorBlockLabels`
   map; no partial cross-file land that would break typecheck. Verify with root
   `tsc -p tsconfig.json --noEmit` (covers `tests/`), not just `bun --cwd core
   lint:types`.
9. **Accessibility** — the switcher is a real `role="tablist"` (arrow-key roving
   tabindex, `aria-selected`, `aria-controls`/`aria-labelledby` panel wiring); the
   filter chips are keyboard-operable; scroll-hint is `aria-hidden` decoration with
   an optional label.

## Acceptance Criteria (measured LIVE — owner mandate: ≥5 real-flow scenarios)

Verified against the live admin (`coderso-dev-core-host`,
`http://coderso-a.localhost:5173/admin/`) + the real front (`:3000`) with
`playwright-cli`, light + dark, 0 console errors, screenshots to
`_docs/_workflows/_smoke/`. Assert VISIBLE behaviour (DOM state / attribute toggles
/ computed styles / focus), not acceptance-checklist ticks. **≥5 distinct
real-flow scenarios**, reproducing the prototype `_docs/projekty-domow-wow-site`:

1. **Segmented switcher (tabs).** Insert a `switcher` block with 3 tabs
   (barn/villa/eco) and a child block in each `panel:1..3` slot: on the front the
   first panel shows, its tab has `aria-selected="true"` + `tabindex="0"`; clicking
   the "villa" tab hides panel 1, shows panel 2, moves `aria-selected`; ArrowRight
   moves selection with roving tabindex; reduced-motion → instant swap (no
   crossfade), toggle STILL works. Publish → front parity. Reproduces
   `app.js:72-86`.
2. **Filterable gallery.** A `gallery` with `filterable:true` +
   `filterCategories:["modern","eco"]` + items tagged `category`: the front shows an
   "All / Modern / Eco" chip bar (`role="tablist"`); clicking "Eco" hides
   non-eco items (`data-category` includes match, `.is-hidden`), "All" restores;
   reduced-motion → instant show/hide. Reproduces `app.js:88-100`.
3. **Magnetic button.** A button block with `style.magnetic:true`: on the front,
   moving the pointer over it translates it toward the cursor (computed `transform`
   tracks pointer, clamped), leaving resets; touch/coarse-pointer or reduced-motion
   → NO magnet (static). `magnetic` unset = byte-identical.
4. **Noise overlay + scroll-hint.** A section with `style.noiseOverlay:true` (and a
   page with `settings.effects.noiseOverlay:true`) paints a static grain layer over
   the surface (a `[data-noise-overlay]` node with the SVG-turbulence background),
   present under reduced-motion (static). A `scrollHint` block renders an
   `aria-hidden` animated dot that bobs (CSS keyframe), paused under reduced-motion.
   Reproduces § Hero scroll-hint + grain washes.
5. **Cross-device + publish→front parity.** Switcher, filter, magnetic, noise and
   scroll-hint authored in the editor match after `publish` on the real front at
   desktop/tablet/mobile (tablist wraps/scrolls on mobile; magnetic off on touch;
   effects never break mobile layout). The editor live PREVIEW shows the real
   interactivity (shared `PageDocumentRender`).
6. **Security negatives.** `switcher.variant:"drop-table"` and
   `scrollHint.glyph:"explode"` throw `PageDocumentError` on write (fail-closed
   `normalizeEnum`); a gallery filter category `"a\";b{}"` is dropped to nothing
   (fail-soft kebab sanitize) so `data-category` never breaks out; a switcher tab
   `label:"<img onerror=…>"` renders as escaped TEXT (no execution); unknown key
   `style.wobble`/`switcher.evil` throws `PageDocumentError`. No injected value ever
   reaches CSS/markup.
7. **No-interactivity byte-identity.** A page with no switcher/filter/magnetic/
   noise/scroll-hint produces a normalized document and rendered HTML
   byte-identical to the post-530 output (no script clause reached — `anyMotion`
   stays false unless a runtime-bearing surface is authored, no data-attribute, no
   overlay node, no extra CSS `<style>`).

## Definition of done

All 5 subtasks landed in order; the segmented switcher (absorbing 527), filterable
gallery, magnetic button, noise overlay and scroll-hint block persist, round-trip,
reject unknown keys, and fail-soft/closed on bad values; the switcher is a real
`role="tablist"` (keyboard + aria); every visual transition honors
`prefers-reduced-motion` (CSS + the single runtime early-return); ALL runtime
clauses ride the ONE existing `pageEffectsRuntime` `<script>` (no second emit, no
npm dependency, no migration, no schemaVersion bump, no route); colors only via
`sanitizeAuthoringCssColor`/`sanitizeAuthoringCssBackground`; legacy /
no-interactivity docs byte-identical; Security Contract satisfied (enum/boolean +
text-escape + kebab-category allowlist + static runtime at write and render); every
gate green (root `tsc -p tsconfig.json --noEmit`, `bun --cwd core lint:types`,
vitest, `bun test`, `gates:coderso`); ≥5-scenario Playwright smoke passes light +
dark with 0 console errors reproducing `_docs/projekty-domow-wow-site`; closure
documented under the changelog number resolved at closure (`1243+`).
