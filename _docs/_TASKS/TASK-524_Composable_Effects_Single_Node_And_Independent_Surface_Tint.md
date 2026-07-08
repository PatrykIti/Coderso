# TASK-524: Composable Effects — Single-Node Surface+Transform Co-location & Independent Surface Tint

# FileName: TASK-524_Composable_Effects_Single_Node_And_Independent_Surface_Tint.md

**Priority:** High
**Category:** Site Render / Content (Pages) / Admin UI / Schema (JSON model) / Security / Accessibility
**Estimated Effort:** Medium
**Dependencies:**
- **TASK-522 (Composable Hero Toolkit & Premium Effects) — HARD, LANDS FIRST.**
  524 is a direct FOLLOW-UP fix to 522: it edits the same 522-owned regions
  (`splitBlockComposition` + the block-frame seam in
  `core/services/pages/pageRendererV2.tsx`, the composition CSS + block resolver
  in `core/services/pages/pageCompositionEffects.tsx`, `PageBlockStyleV2` +
  its allowlist/schema/normalize in `core/services/pages/pageDocumentV2.ts`, and
  `pageUniversalBlockControls` in `core/services/pages/pageEditorControlRegistry.ts`).
  All of 522 is merged before 524 starts. 524 REUSES 522's landed vocabulary
  verbatim (`resolveBlockCompositionAttrs`, `PAGE_COMPOSITION_EFFECTS_CSS`, the
  `data-layer-anchor`/`data-surface`/`data-deco` attribute contract, the
  `pageSurfacePresets`/`pageBlockDecorationMotions` enums).
- **TASK-523 (spotlight fix) — HARD, BRANCH-POINT DEPENDENCY.** 524's worktree
  `feature/task-524` is cut from **`feature/tasks-fixes` HEAD *after* TASK-523
  merges**, NOT from the current HEAD. 523's spotlight fix edits the SAME
  `pageRendererV2.tsx` runtime-emit / composition region and the SAME
  `pageCompositionEffects.tsx` CSS string that 524-01 rewrites, so 524 MUST
  branch from the post-523 HEAD to build on (not clobber) 523's landed changes.
  Re-grep every anchor against the post-523 on-disk state at implement time —
  523 will have shifted line numbers in both files. If 523 has NOT yet merged
  when 524 is scheduled, 524 BLOCKS on it (do not start 524-01 against a pre-523
  tree). This dependency is a land-order/branch-point constraint only; 524 owns
  DISJOINT symbol regions from 523 (523 = spotlight runtime; 524 =
  anchor-translate property + surface tint) and never edits a 523-owned line.
- **TASK-519 (alpha color input)** — the new `surfaceTint` is authored with the
  519 alpha-capable swatch and persists alpha at the schema boundary
  (`sanitizeAuthoringCssColor`, `hex8`/`rgba()`). 519 is required only so the
  ADMIN swatch AUTHORS + round-trips alpha; the raw hex control is the fallback.

**Status:** ✅ Done
**Closure changelog:** 1237 (2026-07-08). Assigned at closure as the then-current next-free (grep
`_docs/_CHANGELOG/` highest+1). Do **NOT** hardcode a colliding number and do
**NOT** edit `_CHANGELOG/*` or `_TASKS/README.md` — the orchestrator owns those.

---

## Overview

TASK-522 delivered the composable-hero toolkit (custom-SVG block,
floating-drift decorations, tilt-on-any-block, layered canvas, glass/glow +
hover presets, ticker). Live use surfaced TWO defects that make the premium
"glass card with a floating badge" composition — the reference wow-site hero
(`_docs/projekty-domow-wow-site/index.html:46-79`) — impossible to reproduce
faithfully:

1. **"Only the text floats, not the glass."** When a single block carries BOTH a
   `data-surface` glass/glow AND a transform-writing decoration (`float`/`drift`/
   `pulse`/`orbit`) or hover (`lift`/`scale`), 522's `splitBlockComposition`
   (`pageRendererV2.tsx`) deliberately routes the transform effect onto an INNER
   wrapper while the surface stays on the FRAME — because the layer-anchor CSS
   writes `transform: translate(…)` on the frame and a second `transform` on the
   same node would clash. CONSEQUENCE: the glass surface renders STATIC while only
   the inner content animates. The two are on different nodes, so they cannot move
   together. The reference does exactly the opposite: `.floating-chip` is
   `position:absolute` + `left/top` for its corner offset and `@keyframes floatChip`
   animating `transform:translateY` — anchor via POSITION, float via TRANSFORM, on
   ONE element.

2. **"Each chip a different glass tint; one green, one none."** 522's
   `resolveBlockCompositionAttrs` (`pageCompositionEffects.tsx`) seeds
   `--surface-glow`/`--deco-ring`/`--orb-color` from the block's PLAIN-color
   `style.background` (`glow = bg && !isGradientOrUrl(bg) ? bg : undefined`). So a
   row of chips whose backgrounds differ (`#8ee8ff` vs `#adffd8` vs none) get
   inconsistent glass tints and there is NO way to set the glass tint
   INDEPENDENTLY of the block background.

524 fixes both, present-only, jsonb-only, **NO migration, NO `PAGE_DOCUMENT_SCHEMA_VERSION`
bump (`pageDocumentV2.ts:29` stays `2`), NO npm dependency**:

- **524-01 — Co-locate surface with its transform effect ("glass floats with
  content").** Switch the `[data-layer-anchor]` self-offset in
  `PAGE_COMPOSITION_EFFECTS_CSS` from `transform: translate()` to the independent
  CSS **`translate:` PROPERTY**. The `translate` property and `transform` are
  SEPARATE composited properties, so the anchor self-offset then COMPOSES with a
  `transform`-based effect on the SAME node. Rework `splitBlockComposition` so a
  transform-decoration + transform-hover + `data-surface` all stay on the SAME node
  (the frame) with the anchor self-offset on the free `translate:` property. TILT
  keeps its inner node (it needs a perspective parent). This is an **OWNED breaking
  change** to 522's placement tests — those assertions are updated to the new
  (correct) placement, NOT treated as drift.
- **524-02 — Independent surface tint.** Add a present-only `PageBlockStyleV2
  surfaceTint?: string` (`sanitizeAuthoringCssColor`, alpha-capable) that seeds
  `--surface-glow`/`--deco-ring`/`--orb-color` in `resolveBlockCompositionAttrs`
  INSTEAD OF the background-derived value; the plain-color background stays a
  FALLBACK only when no `surfaceTint` is authored. Add a "Surface tint" control to
  `pageUniversalBlockControls` mirroring an existing alpha color control.

Every change is **present-only** (zero bytes when unauthored — legacy / no-effect
docs normalize + render byte-identical), colors flow ONLY through
`sanitizeAuthoringCssColor` at write + render, reduced-motion gates are unchanged,
reject-unknown allowlist + JSON schema + normalizer move in lockstep.

## Root-cause grounding (verified on `feature/tasks-fixes` PRE-523; RE-GREP anchors post-523 is MANDATORY)

> **Anchor note — grounding was done PRE-523; re-grep is MANDATORY, not advisory.**
> This grounding was verified against the CURRENT `feature/tasks-fixes` HEAD, where
> **TASK-523 has NOT yet merged**. On that tree every anchor below matches the live
> source 1:1 today. But 524 MUST branch from the POST-523 HEAD (see Dependencies),
> and 523 edits the SAME `pageRendererV2.tsx` runtime-emit/composition region and
> the SAME `pageCompositionEffects.tsx` CSS string, so 523 WILL shift these line
> numbers (and possibly the exact CSS-string neighbourhood and the four flip-test
> line numbers). The SYMBOL names are the contract — trust the symbol, not the
> number. `rg` misdetects `pageRendererV2.tsx` / `pageDocumentV2.ts` as binary —
> use `Read` / `grep -an`, never trust an empty `rg`.
>
> **At implement time, BEFORE touching either file, re-run against the post-523
> on-disk tree and re-confirm the regression inventory (a stale grep could miss a
> 523-introduced test that also asserts these attrs, or clobber a 523-owned line):**
>
> ```
> grep -an 'data-layer-anchor' core/services/pages/pageCompositionEffects.tsx
> grep -anE 'effectToInner|INNER_VAR_KEYS|perspectiveParent|data-tilt-parent' core/services/pages/pageRendererV2.tsx
> grep -anE 'frameAttrs\(.*\)\["data-(deco|hover)"\]\)\.toBeUndefined\(\)|frameVars\(.*\)\["--deco-[^"]*"\]\)\.toBeUndefined\(\)' tests/vitest/pages/page-renderer-v2.test.tsx
> ```
>
> The last grep enumerates the **flip signature** (an attr/var asserted
> `toBeUndefined()` on the FRAME because 522 routed it to the inner node) — these
> are the four symbol-named placement tests **A/B/F/C** that 524-01-L03 OWNS and
> rebaselines. Trust those four symbol-named tests, NOT the pre-523 `L327x` line
> numbers. Also confirm 523 added **no new placement test** asserting `data-deco`/
> `data-hover` (or `--deco-*`) on the inner node; if it did, that test joins the
> 524-01-L03 owned rebaseline inventory.

### RC-1 — surface + transform effect on different nodes (the "glass stays static")

- `pageRendererV2.tsx` `splitBlockComposition` (~`:774`, post-522) routes the
  transform-writing effects (`TRANSFORM_DECOS = {float,drift,pulse,orbit}`,
  `TRANSFORM_HOVERS = {lift,lift-glow,scale}`, and tilt via `perspectiveParent`)
  onto an INNER wrapper (`effectToInner`), while `data-surface`, `data-layer`,
  `data-layer-anchor`, `data-composition`, `data-marquee` stay on the FRAME
  (`[data-block-id]`). `radiate` (box-shadow, not transform) already stays on the
  frame — verified. The frame vs inner split exists ONLY to keep the anchor
  `transform: translate()` from being overwritten by an effect `transform`.
- **`pageCompositionEffects.tsx` `PAGE_COMPOSITION_EFFECTS_CSS`** maps
  `[data-layer-anchor="top-left"|…|"bottom-right"]` to
  `transform:translate(…)` (`:41-49`, verified). Because this uses `transform`,
  it collides with an effect `transform` on the same node → hence 522's split.
  Switching these nine rules to the independent CSS **`translate:` PROPERTY**
  (`translate:0 0` … `translate:-100% -100%`) lets the anchor self-offset COMPOSE
  with a `transform`-based effect on ONE node (different composited properties).

### RC-2 — glass tint derived from `style.background`, not independently settable

- `pageCompositionEffects.tsx` `resolveBlockCompositionAttrs` (`:124`) computes
  `const bg = style.background ?? undefined; const glow = bg && !isGradientOrUrl(bg)
  ? bg : undefined;` (`:134-135`) and, `if (glow && needsGlow)`, seeds
  `cssVars["--surface-glow"|"--deco-ring"|"--orb-color"] = glow` (`:144-148`,
  verified). There is no independent tint field, so the glass glow always tracks
  the block background. A new present-only `surfaceTint` seeds these vars FIRST;
  the plain-color background remains a FALLBACK only when `surfaceTint` is absent.

### Model / schema / control anchors (verified)

- `PageBlockStyleV2` (`pageDocumentV2.ts:586-631`) already carries the 522
  present-only style fields (`surfacePreset`, `hoverEffect`, `decoration`, `tilt`,
  `layer`, `marquee`, `composition`) + `textColor?: string | null` and
  `background`. `surfaceTint` is added ADJACENT (present-only string).
- Block-style allowlist `pageBlockStyleKeys` (the `as const` list ending `:735`
  with the 522 fields) — `surfaceTint` joins it.
- Block-style JSON schema properties (the object closing `:1454`, e.g.
  `surfacePreset`, `hoverEffect`, `layer`) — `surfaceTint: { type: "string" }`
  joins it (mirrors `textColor`, `:1389`, but present-only string so no `null`).
- Block-style normalizer (`:2606-2811` region): `textColor` normalizes via
  `readOptionalSafeColor` (`:1849`, `sanitizeAuthoringCssColor`-backed, alpha
  capable) at `:2607`; `surfaceTint` normalizes present-only right after it.
- `pageUniversalBlockControls` (`pageEditorControlRegistry.ts:434`) holds the
  block-level color controls (`block.style.textColor` `:455`,
  `block.style.background` `:465`, both `input:"color"`, `responsive:true`); the
  new `block.surface.tint` control mirrors `block.style.textColor`.

## Subtask breakdown (single-writer file ownership; strict land order)

| # | Subtask | Sole-writer file(s) / owned region | Leaves | Depends on |
|---|---------|-----------------------------------|--------|------------|
| 524-01 | Co-locate surface with its transform effect (anchor→`translate` property; single-node surface+effect) | `core/services/pages/pageCompositionEffects.tsx` **[`PAGE_COMPOSITION_EFFECTS_CSS` anchor rules — seam]**; `core/services/pages/pageRendererV2.tsx` **[`splitBlockComposition` co-location region — seam]**; the 522 placement tests (owned breaking-test rebaseline) `tests/vitest/pages/page-renderer-v2.test.tsx` + `tests/vitest/pages/page-composition-effects.test.ts` | L01 anchor→`translate`-property CSS, L02 `splitBlockComposition` co-location, L03 update placement tests + new "glass+float move together" render test | TASK-522, TASK-523 |
| 524-02 | Independent surface tint (decouple glass glow from `block.background`) | `core/services/pages/pageDocumentV2.ts` **[`PageBlockStyleV2` + `pageBlockStyleKeys` allowlist + block-style JSON schema + block-style normalizer — seams]**; `core/services/pages/pageCompositionEffects.tsx` **[`resolveBlockCompositionAttrs` glow-source region — seam, DISJOINT from 524-01's CSS-string edit]**; `core/services/pages/pageEditorControlRegistry.ts` **[`pageUniversalBlockControls` `block.surface.tint` control — seam]** | L01 model+schema+normalize, L02 resolver uses `surfaceTint` (background fallback), L03 control, L04 tests | 524-01 |

**Land order (strictly sequential):** 524-01 (single-node co-location) → 524-02
(independent tint). 524-02's resolver edit ASSUMES the 524-01 co-location (surface
+ effect on one frame) so the seeded tint reaches the animating surface. Both land
AFTER 522 and AFTER 523.

## Coordination / collision guards

- **524 DEPENDS ON 522 (landed) and BRANCHES FROM POST-523 HEAD.** Every 522/523
  seam file 524 also touches is edited in a DISJOINT symbol region, temporally
  after both merge. 524 NEVER edits a 522- or 523-owned line it is not explicitly
  reworking (523 = spotlight; 524 = anchor `translate` + tint).
- **`pageCompositionEffects.tsx` is shared by 524-01 and 524-02 in DISJOINT
  regions:** 524-01 owns ONLY the `PAGE_COMPOSITION_EFFECTS_CSS`
  `[data-layer-anchor="…"]` string rules; 524-02 owns ONLY the
  `resolveBlockCompositionAttrs` glow-source lines. No overlap. Land 524-01 first.
- **`pageRendererV2.tsx` = 524-01 only** (its `splitBlockComposition` region).
  524-02 does not touch it.
- **`pageDocumentV2.ts` = 524-02 only** (model + allowlist + schema + normalizer).
- **`pageEditorControlRegistry.ts` = 524-02 only** (`pageUniversalBlockControls`
  `block.surface.tint` in a DISJOINT id-namespace).
- **OWNED breaking-test change (524-01-L03).** 522's placement tests assert the
  OLD frame-vs-inner split (`data-deco`/`data-hover` on the inner wrapper alongside
  a `data-surface` frame). After 524-01 co-locates surface + transform effect on
  ONE node, those assertions are UPDATED to the new correct placement (surface +
  `data-deco`/`data-hover` on the SAME node; tilt still inner). This is a
  DECLARED breaking-test rebaseline OWNED by 524-01-L03 — not drift, not a
  weakened assertion. A new "glass+float move together" render test asserts the
  `data-surface` attr sits on the SAME node as `data-deco`. **Re-grep first:** the
  four owned tests are the flip-signature assertions (A/B/F/C) enumerated by the
  `frameAttrs(...)["data-deco"|"data-hover"]).toBeUndefined()` /
  `frameVars(...)["--deco-*"]).toBeUndefined()` grep in the Root-cause anchor note;
  since grounding was pre-523, re-scan `page-renderer-v2.test.tsx` on the post-523
  tree and fold any 523-added inner-placement test into this owned inventory before
  rebaselining (trust the A/B/F/C symbols, not the pre-523 line numbers).
- **`prefers-reduced-motion` guard unchanged:** 524 does NOT alter any keyframe
  binding, `@media (prefers-reduced-motion: no-preference)` gate, or runtime
  early-return; the anchor rules are STATIC offsets (no animation) so switching
  `transform`→`translate` is motion-neutral.
- **`hero.tsx` / `PageEditor.tsx` / `pageEffectsRuntime.ts` are NOT edited by 524.**
- rg misdetects `pageRendererV2.tsx` / `pageDocumentV2.ts` as binary — use `Read`
  / `grep -an`, never trust an empty `rg`.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (orchestrator owns
  them). Closure changelog = then-current next-free at closure (grep highest+1).

## Security Contract

**No new route, RBAC bucket, method, or endpoint.** All additions ride the existing
validated Page v2 `document` write path (`normalizePageDocument`, gated by the
pages write permission) and the SSR render path. The only new attacker-influenceable
surface is the `surfaceTint` COLOR string.

1. **Surface tint color (whitelist, no CSS injection).** `surfaceTint` runs through
   `sanitizeAuthoringCssColor` (via the `readOptionalSafeColor` helper,
   `pageDocumentV2.ts:1849`) at write (hex/hex8/`rgb[a]()`/`hsl[a]()`/`var(--…)`/
   `transparent`; else omitted). Raw stored input NEVER reaches CSS — only a
   validated value, injected as the `--surface-glow`/`--deco-ring`/`--orb-color`
   CSS custom properties (consumed by the glass/orb/grid/radiate/pulse CSS with the
   reference aqua/violet literals as FALLBACKS), never a raw declaration. At render
   `resolveBlockCompositionAttrs` reads only the already-sanitized stored value
   (defence in depth: the field never carries unsanitized bytes because it is
   sanitized at write). An `expression(alert(1))` / `url(javascript:…)` tint →
   `sanitizeAuthoringCssColor` returns undefined → field omitted (present-only) →
   CSS falls back to the literal. No new markup, no new URL, no interpolation.
2. **Present-only + reject-unknown (fail-closed READ trap).** `surfaceTint` joins
   `pageBlockStyleKeys` (`assertKnownKeys`) AND the block-style
   `pageDocumentV2JsonSchema` (`additionalProperties:false`) in lockstep, and ships
   a persistence round-trip test — a forgotten allowlist entry would silently
   degrade every stored doc carrying the key to empty on read. Unset → the key is
   OMITTED (never `null`, never `""`) so no-effect docs stay byte-identical.
3. **Anchor CSS change is a static-offset rewrite (no new attacker surface).** 524-01
   only swaps the CSS PROPERTY (`transform:translate` → `translate:`) on nine fixed
   `[data-layer-anchor="…"]` selectors with fixed offset literals — no
   author-controlled value, no interpolation, no new attribute; the runtime and
   reduced-motion gates are untouched. Qualifier: the individual `translate:`
   property is a CSS Transforms L2 feature (baseline Chrome/Edge 104, Firefox 72,
   Safari 14.1, ~2021; universal on the 2026 evergreen baseline this project targets)
   — newer than the universal `transform:translate()`, so this is a new (broadly-
   supported) CSS capability, a deliberate composition enabler, NOT a byte-level
   no-op on legacy engines nor a support regression on the target baseline. (The
   reference site floats `.floating-chip` via the wider-support `transform:translateY`
   form; 524 uses the property so the offset composes with an effect `transform` on
   one node.)

## Hard Invariants

1. **Present-only** — `surfaceTint` and the CSS-property/co-location change emit
   ZERO bytes when unauthored; legacy / no-effect blocks normalize + render
   byte-identical to the post-522/523 output.
2. **`prefers-reduced-motion` unchanged** — no keyframe binding, CSS gate, or
   runtime early-return is altered; the anchor rules are static offsets. The
   `transform`→`translate` swap is motion-neutral on the TARGET baseline; the
   individual `translate:` property is a CSS Transforms L2 feature (Chrome/Edge 104,
   Firefox 72, Safari 14.1, ~2021; universal by 2026) — newer than the universal
   `transform:translate()`, adopted deliberately to compose with an effect
   `transform` on one node, not a support regression.
3. **No new npm dependency** (`core/package.json` unchanged).
4. **No DB migration / no DDL** — `surfaceTint` on existing `block.style` jsonb.
5. **No `PAGE_DOCUMENT_SCHEMA_VERSION` bump** (`pageDocumentV2.ts:29` stays `2`).
6. **Surface + transform effect co-locate on ONE node** — after 524-01 a block with
   `data-surface` + a transform decoration/hover carries BOTH on the SAME node
   (the frame), the anchor self-offset on the free `translate:` property; tilt
   still rides an inner node (needs a perspective parent) — that one combo
   (tilt + decoration on one block) is a documented edge, NOT regressed.
7. **Colors only via `sanitizeAuthoringCssColor`** — `surfaceTint` at write
   (normalize) and read only the sanitized value at render.
8. **Reject-unknown + fail-soft** — `surfaceTint` joins its allowlist + one
   normalizer + a round-trip test; a bad color value fails soft (omitted); unknown
   KEYS reject (`PageDocumentError`).
9. **Owned breaking-test change** — 522's placement assertions are rebaselined by
   524-01-L03 to the new correct placement (documented, not drift, no weakened
   behavior assertion; a new "glass+float move together" test is added).

## Acceptance Criteria (measured LIVE vs the reference — ≥5 real-flow scenarios per area)

Verified against the live admin (`coderso-dev-core-host`,
`http://coderso-a.localhost:5173/admin/`) + real front (`:3000`) with
`playwright-cli`, light + dark, 0 console errors, screenshots to
`_docs/_workflows/_smoke/`. Assert VISIBLE effect (computed styles, geometry,
DOM/attribute state), side-by-side with the reference wow-site
(`_docs/projekty-domow-wow-site/index.html` hero).

1. **Glass floats with its content.** A single block with `surfacePreset:"glass"` +
   `decoration.motion:"float"` (no layer) animates the WHOLE glass card (computed
   `transform` translateY on the same node that has `data-surface="glass"`), not
   just its inner content — matching `.floating-chip`. The `data-surface` and
   `data-deco` attributes sit on the SAME DOM node.
2. **Anchored + floating badge.** A `.floating-chip`-style block
   (`layer:{x,y,anchor:"bottom-right"}` + `decoration.motion:"float"` +
   `surfacePreset:"glass"`) keeps its corner offset (computed `translate`
   property `-100% -100%`) AND floats (computed `transform` translateY) — both on
   one node — inside a `composition:"layered"` ancestor; the glass moves with it.
3. **Hover lift + glass together.** A glass card with `hoverEffect:"lift"` lifts the
   glass surface itself on hover (`transform:translateY(-6px)` on the
   `data-surface` node), not an inner wrapper.
4. **Tilt stays a perspective combo.** A card with `tilt:"subtle"` +
   `surfacePreset:"glass"` still tilts (tilt on an inner node under a
   `data-tilt-parent` frame); tilt + decoration on ONE block is a documented edge
   (decoration keeps the frame, tilt the inner node) — no crash, no lost surface.
5. **Independent surface tint.** Three chips with DIFFERENT `style.background`
   colors but the SAME `surfaceTint:"rgba(142,232,255,.5)"` render the SAME glass
   glow (`--surface-glow` computed identical on all three); a chip with a
   `surfaceTint` and NO background still glows; a chip with a background and NO
   `surfaceTint` falls back to the 522 background-derived glow (byte-identical to
   522). Alpha in `surfaceTint` round-trips (hex8/`rgba()`).
6. **Reduced-motion.** With `prefers-reduced-motion:reduce`, the glass stays static
   (no float/lift animation) but the surface + tint + anchor offset still apply —
   identical to 522's reduced-motion behavior.
7. **No-effect byte-identity.** A page with no `surfaceTint` and no
   surface+transform combo produces normalized JSON + rendered HTML byte-identical
   to the post-522/523 output (no new attribute, no `null`, no wrapper change).
8. **Security negatives.** `surfaceTint:"expression(alert(1))"` /
   `"url(javascript:alert(1))"` → `sanitizeAuthoringCssColor` fallback (field
   omitted, CSS literal used); an unknown block-style key still throws
   `PageDocumentError`; the stored doc round-trips with the sanitized/omitted value.

## Definition of done

Both subtasks landed in order, AFTER 522 and branched from the post-523 HEAD; a
block with a glass/glow surface AND a transform decoration/hover animates the
SURFACE (surface + effect co-located on one node, anchor on the `translate:`
property); tilt remains a perspective-parent inner-node combo; `surfaceTint` sets
the glass glow independently of `block.background` (background a fallback only),
persists, round-trips, rejects unknown keys, and fails soft on a bad color; the
522 placement tests are rebaselined to the new placement + a new "glass+float move
together" test added; no npm dependency, no migration, no schemaVersion bump, no
route; `hero.tsx` / `PageEditor.tsx` / `pageEffectsRuntime.ts` untouched; legacy /
no-effect docs byte-identical; Security Contract satisfied (`surfaceTint` via
`sanitizeAuthoringCssColor` at write + render, present-only, static anchor rewrite);
every gate green (root `tsc -p tsconfig.json --noEmit`, `bun --cwd core lint:types`,
`bun --cwd core lint`, vitest, `bun test`, `gates:coderso`); ≥5-scenario-per-area
Playwright smoke passes light + dark with 0 console errors side-by-side vs the
reference; closure documented under the then-current next-free changelog (grep
`_docs/_CHANGELOG/` highest+1).
</content>
</invoke>
