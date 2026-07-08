# TASK-521: Page Motion & Interaction Effects — Section Scroll/Parallax/Reveal, Animated-Icon Block, Hero Mouse-Tilt & Per-Page Effects (Compact Side-Inspector Panel)

# FileName: TASK-521_Page_Motion_And_Interaction_Effects.md

**Priority:** High
**Category:** Admin UI / Content (Pages) / Site Render / Widgets / Schema (JSON model) / Accessibility
**Estimated Effort:** Large
**Dependencies:**
- **TASK-519 (alpha color input)** — the per-page cursor-spotlight color and the animated-icon color are authored with the 519 alpha-capable color control (`hex8`/`rgba()`). The PAGE model already accepts alpha colors at the schema boundary (`readSafeColor`, `pageDocumentV2.ts:1516`), so 521 can PERSIST alpha today; 519 is required only so the ADMIN swatch AUTHORS + round-trips alpha. If 519 has not landed, the color controls fall back to the existing hex control and alpha tokens go through the raw text field (no schema block).
- **TASK-520 (menu scroll-state machine + custom box-shadow validator)** — the front-only scroll-state inline-script pattern and the "color/shadow value validation IS the security boundary" discipline established in 520-01-L02 / 520-04-L02 are the direct precedent this task reuses for the page/section/hero effect runtime.
- TASK-424/425 (`PageSectionStyleV2`, `PageBlockStyleV2`, responsive override machinery), TASK-455 (site shell + `PageDocumentRender` root), TASK-458-03 (`PageDocumentSettingsV2.menuAppearance` — the reference for a present-only additive settings sub-object), the existing widget CSS-motion substrate (`hero.tsx` `HeroMotionPreset`, `section.tsx` `SectionMotion`, `motion-safe:`/`motion-reduce:` guards).

**Status:** ✅ Done
**Closure changelog:** 1234 (`_docs/_CHANGELOG/1234-2026-07-08-task-521-page-motion-effects.md`). Resolved as the then-current next-free at closure (519=1232, 520=1233 landed first; 1229–1231 reserved for 511/517/518).

---

## Overview

The Page Editor v2 model (`core/services/pages/pageDocumentV2.ts`, renderer
`core/services/pages/pageRendererV2.tsx`, editor `core/admin/ui/pages/PageEditor.tsx`)
paints **static** pages: sections and blocks have background/radius/shadow/spacing
and a small per-widget CSS entrance-motion set (`hero.style.motion`,
`section.style.motion` — `HeroMotionPreset`/`SectionMotion`), but there is **no
scroll-driven motion, no interactive hover motion, no animated iconography, and no
per-page ambient effect**, and the per-page settings surface is a full-height
slide-out drawer the owner finds poor. This task adds one cohesive family of
motion/interaction effects, all **present-only, jsonb-only, no-dependency,
reduced-motion-safe**:

- **(A) Section scroll effects** — per-section reveal-on-enter (fade / slide-up)
  and parallax, on the page-section CONTAINER (`PageSectionStyleV2`), authored in
  the section inspector, applied on the FRONT (and preview) only — the builder
  canvas shows content at rest (521-02-L02 stamps the runtime + parallax wrapper
  inside `PageSectionRender`; the canvas renders via `PageSectionContent` /
  `PageAuthoringCanvas.tsx` and never emits the runtime — Hard Invariant 7).
- **(B) Animated-icon block** — a NEW lightweight block/widget built from a
  curated **inline-SVG + CSS-keyframes** set (spin / pulse / bounce / draw), **no
  npm dependency**, CSP-safe, self-hosted.
- **(C) Hero mouse-tilt** — a 3D parallax-on-hover option on `hero.style` (CSS
  `perspective` + a tiny `mousemove` runtime), reduced-motion off.
- **(D) Per-page effects** — an ambient page effect set (cursor-follow spotlight
  on dark backgrounds, …) hanging off `currentData.settings.effects`, AND the
  owner-mandated relocation of page settings out of the full-height drawer into a
  **compact panel in the SAME right side-inspector rail** as section/block
  settings, triggered by a button next to the section-panel icon (reuse the
  imported-but-drawer-only `Settings2`), with a new **Effects** section.

Every effect is **present-only** (zero bytes emitted when unauthored), joins a
**reject-unknown allowlist** with a **round-trip test**, respects
**`prefers-reduced-motion`** (CSS `motion-safe:`/`motion-reduce:` guard AND a
runtime early-return), needs **NO npm dependency** and **NO DB migration** (all
config rides existing jsonb), and does **NOT** bump `PAGE_DOCUMENT_SCHEMA_VERSION`
(`pageDocumentV2.ts:28` stays `2`). Legacy documents parse + render
**byte-identical**.

## Gap analysis (grounded — anchors verified fresh 2026-07-07)

### G-A — section scroll effects (MISSING)

- `PageSectionStyleV2` (`pageDocumentV2.ts:380-387`) = `background`,
  `backgroundType`, `backgroundImage`, `accent`, `radius`, `shadow` — **no
  motion/scrollEffect**. (The per-widget `SectionMotion` on the `section` WIDGET
  — `section.tsx:45` — is a DIFFERENT surface: an entrance animation on the
  section-widget block, not the page-section container.)
- `PageSectionRender` (`pageRendererV2.tsx:2291-2315`) emits
  `<section className={renderProps.sectionClassName}>` (`:2305`) with
  `renderProps.dataAttributes` (`:2306`) from `toPageSectionRenderProps`
  (`:515-530`) — **no motion class, no data-effect attribute** today.
- No scroll observer exists in the page render path — reveal/parallax need a
  tiny front-only runtime (IntersectionObserver for reveal, rAF scroll for
  parallax), guarded by reduced-motion (precedent: the 520 scroll-state script,
  the `window.addEventListener("load", …)` inline script `renderPublicPage.tsx:168`).

### G-B — animated-icon block (MISSING / placeholder)

- `pageBlockTypes` (`pageDocumentV2.ts:50-72`) includes `"icon"`, but that block
  is a **non-functional placeholder**: `pageBlockPropKeys.icon = ["name","label"]`
  (`:629`), renderer `case "icon": return null;` (`pageRendererV2.tsx:1912-1913`),
  registry stub `icon: "icon-runtime-renderer-pending"` (`:775`). There is **no
  animated iconography and no rendered icon block at all**.
- Zero animation libraries in `core/package.json` (lucide-react + Tailwind only).
  Owner decision: animated icons = a curated inline-SVG + CSS-keyframes set (NOT
  Lottie, NO new dependency).
- **Decision (refinement of the suggested decomposition — implement, don't add a
  parallel type):** `pageBlockTypes` feeds EXHAUSTIVE `Record<PageBlockType, …>`
  types (`pageBlockPropKeys` `:591`, `blockOptionCopy`
  `pageEditorOptions.ts:85`), so adding a NEW `animatedIcon` member would force a
  fragile multi-file ATOMIC land (every exhaustive record + palette + capability
  set in one commit) to keep typecheck green. Since the `icon` block is a live
  member that today does nothing (`return null`, `"icon-runtime-renderer-pending"`),
  the clean forward move is to **implement the existing `icon` block as the
  animated-icon block**: extend `pageBlockPropKeys.icon` with present-only
  `animation`/`size`/`color`/`speed`, promote `icon` into `realRuntimeBlockTypes`
  + `editorInsertableBlockTypes` (`:691`/`:715`), drop its
  `pageBlockCapabilityReasons.icon` "pending" entry (`:772-776`), and render it
  with the curated inline-SVG + CSS-keyframes set. This adds NO new
  `pageBlockTypes` member (no exhaustive-record explosion, no cross-file atomic
  hazard), keeps every existing `Record<PageBlockType,…>` entry valid, and turns a
  dead placeholder into a real block. There are no `icon` blocks in any live
  document (it renders null / is non-insertable), so byte-identity is trivially
  preserved for legacy docs.

### G-C — hero mouse-tilt (MISSING)

- `hero.tsx` `HeroData.style.motion?: HeroMotionPreset` (`:133`, enum
  `none|fade-in|slide-up` `:23`) is an ENTRANCE animation only. `motionClassMap`
  (`:444-450`) applies `motion-safe:animate-in … motion-reduce:animate-none`.
- There is **no hover/tilt/mouse-parallax** on the hero media or card. Add a
  present-only tilt option on `hero.style` (CSS `perspective` + a small
  `mousemove` runtime), reduced-motion OFF (no tilt).

### G-D — per-page effects + compact settings panel (MISSING / poor UX)

- Per-page config lives in `PageDocumentSettingsV2` (`pageDocumentV2.ts:346-360`:
  `template`, `showInNav`, `revisionRetention?`, `collectionLink?`,
  `menuAppearance?`) inside `currentData.settings`. The `pages` table
  (`core/db/schema.ts:218-235`) has `currentData`/`publishedData` jsonb + **no
  separate settings column** — a per-page effects config hangs off
  `currentData.settings.effects` (present-only, NO migration). There is **no
  per-page ambient effect** today.
- The live per-page settings surface is a **full-height slide-out drawer**
  (`SettingsSheet`, `PageEditor.tsx:4876-4928`, opened via `setSettingsOpen(true)`
  from a "Page settings" `Settings2` button `:3048-3052`). **Grounded-fact
  correction:** `Settings2` is NOT unused — it is the icon inside that drawer
  trigger; the owner-noted "poor" surface is precisely this full-height
  `SheetContent side="right"` (`:4903-4904`). Section/block settings, by
  contrast, render in a **compact right side-inspector** driven by
  `ToolbarSubpanel` (`PageEditor.tsx:3295`) fed by declarative descriptors
  (`pageUniversalSectionControls`, `pageEditorControlRegistry.ts:212`) rendered
  through `SectionRegistryControlField` (`PageEditor.tsx:3426-3436`). Owner
  decision: **relocate page settings + a new Effects section into a compact panel
  in that SAME rail**, triggered by a button next to the section-panel icon
  (reuse `Settings2`), NOT the full-height drawer.
- Page shell front render: `PageDocumentRender` (`pageRendererV2.tsx:2324-2370`)
  emits `<Root className={rootClassName …} data-page-v2="true">` (`:2361`) — the
  single place to attach a page-level effect wrapper attribute + the
  cursor-spotlight overlay + emit the shared effects runtime once.

## Schema-extension plan (JSON model — NO DDL, NO schemaVersion bump)

All additions are **present-only** (emitted only when authored), join a
**reject-unknown allowlist** (`assertKnownKeys`, `pageDocumentV2.ts:1624`), ship a
**round-trip persistence test**, and are mirrored in the strict
`pageDocumentV2JsonSchema` (`:1342`, `additionalProperties:false`) in lockstep.
Legacy docs without the new keys normalize **byte-unchanged**. **NO migration**
(jsonb). **NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump** (`:28` stays `2`).

**PageSectionStyleV2 (`pageDocumentV2.ts:380`) — section scroll effect (G-A):**

```ts
export type PageSectionStyleV2 = {
  /* …existing background/backgroundType/backgroundImage/accent/radius/shadow… */
  scrollEffect?: PageSectionScrollEffect;   // "none" | "reveal-fade" | "reveal-up" | "parallax"
  parallaxIntensity?: number;               // 0..40 (px of travel); meaningful only for "parallax"
};
export type PageSectionScrollEffect =
  (typeof pageSectionScrollEffects)[number]; // ["none","reveal-fade","reveal-up","parallax"]
```

**PageDocumentSettingsV2 (`pageDocumentV2.ts:346`) — per-page effects (G-D):**

```ts
export type PageDocumentSettingsV2 = {
  /* …template/showInNav/revisionRetention?/collectionLink?/menuAppearance?… */
  effects?: PageEffectsV2;                  // present-only ambient effect config
};
export type PageEffectsV2 = {
  cursorSpotlight?: boolean;                // enable cursor-follow radial spotlight
  spotlightColor?: string;                  // readSafeColor (alpha OK via 519)
  spotlightSize?: number;                   // 120..900 px radius
};
```

**HeroData.style (`hero.tsx:133`) — mouse-tilt (G-C):**

```ts
style?: { /* …existing… */ tilt?: HeroTilt };  // "none" | "subtle" | "strong"
```

**`icon` block (implement the placeholder) — animated-icon block (G-B):**

```ts
// NO change to pageBlockTypes (icon already a member). Extend its prop allowlist:
pageBlockPropKeys.icon = ["name","label","animation","size","color","speed"] as const;
// name: curated-set kebab icon name (existing key, now allowlist-resolved);
// animation: "none"|"spin"|"pulse"|"bounce"|"draw"; size: 16..160 px;
// color: readSafeColor; speed: 400..4000 ms. Present-only additions on the
// existing icon default props { name:"sparkles", label:"" }.
// Capability flip (pageDocumentV2.ts): add "icon" to realRuntimeBlockTypes (:691)
// + editorInsertableBlockTypes (:715); delete pageBlockCapabilityReasons.icon (:774).
```

## Subtask breakdown (single-writer file ownership; strict land order)

| # | Subtask | Sole-writer file(s) | Leaves | Depends on |
|---|---------|---------------------|--------|------------|
| 521-01 | Effects MODEL + shared runtime-effects infra + normalize/reject-unknown | `core/services/pages/pageDocumentV2.ts`; NEW `core/services/pages/pageEffectsRuntime.ts` | L01 section-style model, L02 page-settings-effects model, L03 animated-icon block model, L04 runtime-effects script module, L05 model tests | — (foundation) |
| 521-02 | Section scroll/parallax/reveal — admin descriptor + front render + reveal/parallax binding | `pageEditorControlRegistry.ts` **[`pageUniversalSectionControls` region — seam]**; `pageRendererV2.tsx` **[section region — seam]** | L01 control descriptors, L02 front render + reveal/parallax, L03 tests | 521-01 |
| 521-03 | Hero mouse-tilt | `core/widgets/core/hero.tsx` (disjoint intra-file regions) | L01 model, L02 editor control, L03 render + tilt script, L04 tests | 521-01 |
| 521-04 | Animated-icon block (implement the `icon` block) | NEW `core/services/pages/animatedIconGlyphs.tsx` (curated inline-SVG + CSS-keyframes set); `core/admin/ui/pages/editor/pageEditorOptions.ts` (palette copy enrich); `pageRendererV2.tsx` **[block-content `case "icon"` region — seam]**; `pageEditorControlRegistry.ts` **[`pageBlockControlRegistry.icon` region — seam]** | L01 glyph set + keyframes, L02 renderer `case "icon"`, L03 palette + editor controls, L04 tests | 521-01 |
| 521-05 | Page-settings compact side-inspector panel + per-page effects | `core/admin/ui/pages/PageEditor.tsx` (disjoint intra-file regions); `pageRendererV2.tsx` **[page-root region — seam]** | L01 compact panel relocation, L02 Effects section + persistence, L03 page-shell render + spotlight, L04 tests | 521-01..04 |
| 521-06 | Tests, docs, closure | test files (own) + `_docs/*.md` | — | 521-01..05 |

**Land order (strictly sequential):** 521-01 (model + runtime infra) → 521-02
(section) → 521-03 (hero) → 521-04 (animated-icon) → 521-05 (page settings panel +
per-page effects) → 521-06 (closure). Shared effects MODEL + runtime-infra +
normalize land FIRST; then the section/hero/icon consumers; then the
page-settings panel + per-page effects; then closure.

## Coordination / collision guards

- **`pageRendererV2.tsx` is a DOCUMENTED ADDITIVE SEAM** across THREE subtasks
  editing **disjoint symbol regions** in strict land order (the AGENTS-permitted
  "documented additive seam"; mirrors the way 520-01 split one file across
  disjoint leaf regions):
  - **521-02** edits the SECTION region only — `toPageSectionRenderProps`
    (`:515-530`) + `PageSectionRender` (`:2291-2315`).
  - **521-04** edits the BLOCK-CONTENT region only — the `renderPageBlockContent`
    `case "icon"` (`:1912-1913`, replacing `return null` with the animated-icon
    render) + the top-of-file icon imports (`:2`) if needed.
  - **521-05** edits the PAGE-ROOT region only — `PageDocumentRender`
    (`:2324-2370`).
  These three symbols do not overlap; land order 02 → 04 → 05 guarantees each
  fixer sees the prior region already merged.
  - **Shared IMPORT-ONLY sub-region (top-of-file, `:1-33`).** All three subtasks
    MUST append imports to the top-of-file import block (verified live:
    lucide marks `:2`, the `./pageDocumentV2` import block ending `:33`) — this is
    an explicit APPEND-ONLY additive sub-region every seam consumer may extend, and
    is EXEMPT from the strict symbol-region rule (append new named imports only; NO
    reordering, NO removal, NO edits to existing import lines): **521-02** adds
    `pageSectionScrollEffects` + `PAGE_PARALLAX_INTENSITY_CLAMP` (from
    `./pageDocumentV2`); **521-04** adds the lucide marks it needs (`:2`) +
    `AnimatedIcon`/`ANIMATED_ICON_KEYFRAMES_CSS` (from `./animatedIconGlyphs`) +
    `resolveAnimatedIconName` (from `./pageDocumentV2`); **521-05** adds a new
    `./pageEffectsRuntime` import (`PAGE_EFFECTS_RUNTIME_SOURCE`/
    `PAGE_EFFECTS_RUNTIME_ID`) + `PAGE_SPOTLIGHT_SIZE_CLAMP` (from
    `./pageDocumentV2`). Concurrent appends to the SAME import block are an expected
    additive merge, NOT a reconcile failure.
  Any change OUTSIDE a subtask's declared symbol region (or the import-only
  sub-region) in this file is a reconcile failure.
- **`pageDocumentV2.ts` = 521-01 only** (its five model leaves edit DISJOINT
  symbol regions of the same file — section-style, settings, block-type/propKeys,
  plus the NEW `pageEffectsRuntime.ts` — in strict intra-subtask order). No OTHER
  subtask writes this file; 521-02/03/04/05 IMPORT its exports read-only.
- **`PageEditor.tsx` = 521-05 only** (L01 panel-relocation region + L02
  Effects-section region — disjoint). `hero.tsx` = 521-03 only.
- **`pageEditorControlRegistry.ts` is a DOCUMENTED ADDITIVE SEAM** across TWO
  subtasks editing DISJOINT const regions in strict land order 521-02 → 521-04
  (both `readonly PageEditorControlDefinition[]` arrays live in this one file but
  are disjoint symbols, verified live):
  - **521-02** owns ONLY the `pageUniversalSectionControls` region (`:212`) — the
    section scroll-effect descriptors.
  - **521-04** owns ONLY the `pageBlockControlRegistry.icon` region (`:903`, the
    currently-empty `icon: []` per-type array) — the icon block-control
    descriptors. (Per-type, so they show ONLY on the `icon` block; the universal
    `pageUniversalBlockControls` array `:362` is NOT touched — icon `name`/
    `animation`/`size`/`speed`/`color` are per-type PROPS, not universal style.)
  Its Vitest test file (`tests/vitest/pages/page-editor-control-registry.test.ts`)
  is APPENDED by 521-04 after 521-02's cases already merged. As with
  `pageRendererV2.tsx`, the top-of-file import block here is an APPEND-ONLY additive
  sub-region: both 521-02 and 521-04 add read-only imports from `pageDocumentV2`
  (521-02: `pageSectionScrollEffects`/`PAGE_PARALLAX_INTENSITY_CLAMP`; 521-04:
  `animatedIconNames`/`animatedIconAnimations`/`ANIMATED_ICON_*_CLAMP`), which is
  an expected additive merge, not a reconcile failure. Any write outside a
  subtask's declared const region (or the import-only sub-region) here is a
  reconcile failure.
- **521-04 sole-writer files:** NEW `core/services/pages/animatedIconGlyphs.tsx`
  (curated inline-SVG + CSS-keyframes set) + `core/admin/ui/pages/editor/pageEditorOptions.ts`
  (palette copy) = 521-04 only, PLUS the `pageRendererV2.tsx` `case "icon"`
  block-content seam and the `pageEditorControlRegistry.ts` `pageBlockControlRegistry.icon`
  seam region above. **`core/widgets/registry.ts` and `core/widgets/modulePackMatrix.ts`
  are NOT edited** (there is no `animatedIcon.tsx` widget): the feature implements
  the existing `icon` PAGE block via a renderer `case`, not a new composite widget
  — aligning with 521-06's "likely no `modulePackMatrix` change; verify" note.
- **Shared vocabulary defined once (521-01):** the effect enums
  (`pageSectionScrollEffects`, `HeroTilt`, `animatedIconAnimations`,
  `animatedIconNames`), clamps (`PAGE_PARALLAX_INTENSITY_CLAMP`,
  `PAGE_SPOTLIGHT_*_CLAMP`, `ANIMATED_ICON_*_CLAMP`), the color/number
  normalizers, and the runtime-effects script SOURCE (`pageEffectsRuntime.ts`)
  are owned by 521-01 and imported read-only by all consumers. Any drift between
  subtasks is a reconcile failure.
- **`prefers-reduced-motion` guard is shared law:** every effect ships BOTH a
  CSS `motion-safe:`/`motion-reduce:` guard AND (where a runtime is involved) a
  `matchMedia('(prefers-reduced-motion: reduce)').matches` early-return in the
  runtime IIFE. Reconcile fails if any consumer omits either half.
- rg misdetects `PageEditor.tsx` / `pageRendererV2.tsx` / `pageDocumentV2.ts` /
  `hero.tsx` as binary — use `Read` / `grep -an`, never trust an empty `rg`.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (orchestrator owns
  them). Closure changelog RESOLVED to 1234 (519=1232/520=1233 landed first).

## Security Contract

**No new route, RBAC bucket, method, or endpoint.** All additions ride the
existing validated Page v2 `document` write path (`normalizePageDocument`,
gated by the pages write permission) and the SSR render path. The
attacker-influenceable surfaces are (1) new COLOR strings, (2) the ANIMATED-ICON
NAME, (3) new numeric clamps + enums, and (4) the runtime effect scripts — each
constrained at BOTH the write (normalize) boundary and the render boundary
(defence in depth). **No CSS/HTML injection via effect config is possible:**

1. **Color values (whitelist, no CSS injection).** `spotlightColor`,
   `animatedIcon.color`, hero tilt introduces NO color. All colors run through the
   existing `readSafeColor` (`pageDocumentV2.ts:1516`) at write — the same
   token-backed policy every page color uses (hex/hex8/`rgb[a]()`/`hsl[a]()`/
   `var(--…)`/`transparent`; anything else → fallback). Alpha is first-class. Raw
   stored input never reaches CSS — only validated values, injected as CSS custom
   properties (`--spotlight-color`) or `fill`/`color`, never as raw declarations.
2. **Enums + numeric clamps (no injection surface).** `scrollEffect` and
   `animatedIcon.animation` are `normalizeEnum`-guarded (pageDocumentV2), and
   `parallaxIntensity`, `spotlightSize`, `animatedIcon.size`/`speed` are
   `readNumber`-clamped, at write. **`normalizeEnum` is fail-CLOSED: an invalid
   enum VALUE throws `PageDocumentError` in write mode — it only falls back in read
   mode** (`pageDocumentV2.ts:1554-1566`, matching every existing page enum) — so a
   bogus `scrollEffect`/`animation` REJECTS the whole write (it is NOT silently
   stored/dropped). **Hero `tilt` is the exception: it normalizes fail-SOFT via a
   hero-LOCAL resolver `resolveHeroTilt`** (mirroring `resolveHeroMotionPreset`,
   `hero.tsx:555`, which returns `"none"` for any unrecognized value and never
   throws) — hero.tsx does NOT use pageDocumentV2's `normalizeEnum`; an invalid
   `hero.style.tilt` falls back to `"none"` (omitted, present-only), NOT a
   `PageDocumentError`. `readNumber` clamps out-of-range numbers to the bound
   (fail-soft). Either way these reach CSS only as bounded numbers (`px`/`ms`) or
   class names selected from a fixed map — never string interpolation.
3. **Icon name (allowlist).** The icon block's `name` is validated at write by a
   kebab pattern (`^[a-z0-9-]{1,48}$`) AND resolved at render against the curated
   `animatedIconNames` set (the effective allowlist). An unknown/unresolvable name
   renders the neutral fallback glyph — never interpolated into markup. The inline
   SVGs are STATIC author-supplied literals (no user data in the SVG body).
4. **Runtime effect scripts are STATIC literals (no interpolation).** The
   section reveal/parallax runtime (`pageEffectsRuntime.ts`), the hero tilt
   runtime, and the cursor-spotlight runtime are dependency-free IIFE **string
   literals** that read ALL per-instance config from validated DOM
   data-attributes / CSS custom properties (set from already-normalized values) —
   NO stored/user data is ever interpolated into the script source. Emitted via
   the existing `renderSharedWidgetRuntimeScript` / inline-`<script>` mechanism
   (`runtimeScripts.tsx`, `dangerouslySetInnerHTML` with a static `__html`),
   CSP-nonce compatible, `rAF`/throttled, `passive` listeners, no layout thrash.
   Each runs behind a `prefers-reduced-motion: reduce` early-return.
5. **Allowlist + round-trip (fail-closed READ trap).** Every new key joins its
   reject-unknown allowlist (`assertKnownKeys` list + `pageDocumentV2JsonSchema`
   `additionalProperties:false`) AND ships a persistence round-trip test — a
   forgotten allowlist entry silently degrades every stored doc carrying that key
   to empty on read. No new key ships without its round-trip assertion.

## Hard Invariants

1. **Present-only** — every new field emits ZERO bytes when unauthored; legacy /
   no-effect docs normalize + render **byte-identical**.
2. **`prefers-reduced-motion` respected** — every effect: CSS `motion-safe:`/
   `motion-reduce:` guard AND (where a runtime exists) `matchMedia` early-return.
   No motion for reduce users.
3. **No new npm dependency** — animated icons = curated inline-SVG + CSS
   keyframes; all runtimes are hand-written dependency-free IIFEs
   (`core/package.json` unchanged).
4. **No DB migration / no DDL** — all config in existing jsonb
   (`currentData.settings.effects`, `section.style`, `hero.style`, block props).
5. **No `PAGE_DOCUMENT_SCHEMA_VERSION` bump** (`pageDocumentV2.ts:28` stays `2`).
6. **Reject-unknown + fail-soft** — each new key joins its allowlist + exactly one
   value normalizer + a round-trip test; bad VALUES fail-soft (fallback/omit),
   unknown KEYS reject (`PageDocumentError`).
7. **Runtime scripts static + gated** — emitted ONLY on the front/preview render
   path (`PageDocumentRender`, `pageRendererV2.tsx:2324`), **NOT the builder
   canvas** — the canvas renders sections via `PageSectionContent`/
   `renderPageBlockContent` directly (`PageAuthoringCanvas.tsx:938`), bypassing
   `PageDocumentRender`, so it never receives `data-page-motion` / the effects
   `<script>`. **Preview parity with the front is intended**: `PageDocumentRender`
   is the SHARED front+preview renderer (called from `DefaultRuntimePageShellV2`,
   `pageRuntimeV2.tsx:58`, and `siteShell.tsx`), its signature carries no
   `isPreview`/`mode` flag and `isPreview` (`pageRuntimeV2.tsx:15`) is NOT threaded
   into it, so effects run identically on front and preview (the editor's live
   preview shows the real effect). Effects still emit ONLY when an effect is
   authored; never interpolate stored data; self-contained IIFE.
8. **No new `pageBlockTypes` member** — the animated-icon block IMPLEMENTS the
   existing `icon` block (extends its props, flips its capability, renders it). No
   exhaustive `Record<PageBlockType,…>` gains a key; legacy docs (which never
   contain an `icon` block) stay byte-identical.

## Acceptance Criteria (measured LIVE — owner mandate: ≥5 real-flow scenarios)

Verified against the live admin (`coderso-dev-core-host`,
`http://coderso-a.localhost:5173/admin/`) + the real front (`:3000`) with
`playwright-cli`, light + dark, 0 console errors, screenshots to
`_docs/_workflows/_smoke/`. Assert VISIBLE effects (computed styles / DOM state /
attribute toggles), not acceptance-checklist ticks. **≥5 distinct real-flow
scenarios per area** (deep nesting, override/reset cycles,
every-control-visible-effect, cross-device, publish→front parity), per the
owner smoke mandate:

1. **Section reveal-on-enter.** A section with `style.scrollEffect:"reveal-up"`:
   on the front it starts translated/faded, and once scrolled into view (IO)
   gains its reveal class and animates to rest; a `reveal-fade` section fades in;
   both do NOTHING (visible at rest, no transform) under emulated
   `prefers-reduced-motion: reduce`. Publish → front parity holds.
2. **Section parallax.** `scrollEffect:"parallax"` + `parallaxIntensity:24`:
   on scroll the section's inner content translates within the clamped range
   (computed `transform: translateY(...)` changes with `scrollY`), rAF-smooth, no
   layout shift; reduced-motion → no transform.
3. **Animated-icon block.** Inserting an `icon` block (now insertable) with
   `name:"sparkles"`, `animation:"spin"`, `size:48`, `color:(alpha)`, `speed:1600`
   renders an inline `<svg>` with a CSS-keyframe spin at the authored size/color/
   duration on the front + canvas; `animation:"none"` renders a static glyph;
   reduced-motion pauses the keyframes; an invalid icon name → neutral fallback
   glyph (no broken/injected markup).
4. **Hero mouse-tilt.** `hero.style.tilt:"subtle"`: moving the mouse over the hero
   on the front tilts the hero card/media in 3D (computed `transform` with
   `perspective`/`rotateX`/`rotateY` tracking pointer, clamped); leaving resets;
   reduced-motion or touch/coarse pointer → NO tilt. `tilt:"none"` (or unset) =
   byte-identical to today.
5. **Per-page cursor spotlight + compact panel.** Opening the NEW compact page
   settings panel from the side-inspector button next to the section-panel icon
   (NOT the full-height drawer) shows an **Effects** section; enabling
   `cursorSpotlight` + a `spotlightColor` (alpha) + `spotlightSize:400` makes a
   radial spotlight follow the cursor on the page root on the front (CSS custom
   props `--spotlight-x/y` update on `mousemove`, rAF); reduced-motion / coarse
   pointer → no spotlight. Settings persist through save → reload → publish.
6. **Cross-device + publish→front parity.** Section effects, animated icon, hero
   tilt, and page spotlight authored in the editor match after `publish` on the
   real front at desktop/tablet/mobile (parallax/reveal desktop-and-up feel;
   effects never break mobile layout).
7. **Security negatives.** The FAIL-SOFT inputs are sanitized and stored:
   `spotlightColor:"url(x)"` and icon block `color:"expression(alert(1))"` fall
   back to `var(--primary)` (`readSafeColor`), icon block `name:"../../etc"` falls
   back to `"sparkles"` (`resolveAnimatedIconName`), `parallaxIntensity:99999`
   clamps to `40` (`readNumber`), and **`hero.style.tilt:"spin"` falls back to
   `"none"` (omitted) via the hero-local fail-soft `resolveHeroTilt`** (like
   `resolveHeroMotionPreset`, `hero.tsx:555` — NOT `normalizeEnum`, so it does NOT
   throw) — the stored doc round-trips with the sanitized values. The FAIL-CLOSED
   inputs (pageDocumentV2 `normalizeEnum`) REJECT the write: an invalid enum VALUE
   (`scrollEffect:"drop-table"`, icon `animation:"explode"`) throws
   `PageDocumentError` in write mode, exactly like an unknown effect KEY
   (`settings.effects.glow`, `style.wobble`). No injected value is ever stored or
   reaches CSS/markup.
8. **No-effect byte-identity.** A page with no effects authored produces a
   normalized document and rendered HTML byte-identical to the pre-521 output (no
   script emitted, no data-attribute, no wrapper change).

## Definition of done

All 6 subtasks landed in order; section scroll effects, animated-icon block, hero
tilt, and per-page effects persist, round-trip, reject unknown keys, and fail-soft
on bad values; every effect honors `prefers-reduced-motion` (CSS + runtime); no
npm dependency added, no migration, no schemaVersion bump, no route; page settings
relocated into a compact side-inspector panel with an Effects section; runtime
scripts are static, gated front-only, dependency-free; legacy / no-effect docs
byte-identical; Security Contract satisfied (color whitelist + icon-name allowlist
+ clamps + static scripts at write and render); every gate green (root
`tsc -p tsconfig.json --noEmit`, `bun --cwd core lint:types`, vitest, `bun test`,
`gates:coderso`); ≥5-scenario-per-area Playwright smoke passes light + dark with 0
console errors; closure documented under changelog 1234.
