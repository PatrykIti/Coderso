# TASK-531: Premium Backgrounds & Glow — Multi-Layer Section/Block Backgrounds, Gradient Block Background, and Arbitrary Colored Glow Box-Shadow

# FileName: TASK-531_Premium_Backgrounds_And_Glow.md

**Priority:** High
**Category:** Admin UI / Content (Pages) / Site Render / Schema (JSON model) / Security
**Estimated Effort:** Medium
**Dependencies:**
- **TASK-530 (last landed page-toolkit task) — HARD, LANDS FIRST.** 531 is authored
  and merged strictly on the post-530 tree. All 531 additions are ADDITIVE to
  `PageDocumentV2`, present-only (omit when unset ⇒ byte-identical to post-530),
  reject-unknown, colors ONLY via `sanitizeAuthoringCssColor` /
  `sanitizeAuthoringCssBackground`. **NO DB migration, NO `PAGE_DOCUMENT_SCHEMA_VERSION`
  bump (`pageDocumentV2.ts:29` stays `2`), NO npm dependency.**
- **TASK-519 (alpha color input)** — glow/tint colors author through the 519
  alpha-capable swatch (`hex8`/`rgba()`); the write boundary already PERSISTS alpha
  (`sanitizeAuthoringCssColor` accepts `#rrggbbaa` + `rgba()`,
  `pageAuthoringSanitizers.ts:26/28`), so 531 stores alpha today; 519 is required only
  so the ADMIN swatch authors + round-trips alpha (else the raw hex `color` control is
  the fallback).
- TASK-424/425 (`PageSectionStyleV2`, `PageBlockStyleV2`, the responsive-override
  machinery every new style field rides for free), TASK-522/524/525 (the composition
  toolkit, `surfaceTint`, present-only style-field precedent already on this tree).

**Status:** ✅ Done
**Completed:** 2026-07-09
**Closure changelog:** Assigned at closure as the then-current next-free (grep
`_docs/_CHANGELOG/` highest+1). As of authoring the highest on disk is **1242**
(TASK-530); **531–534 take 1243+** (531 = the first of the four premium-fidelity
bundles). Do **NOT** hardcode a colliding number and do **NOT** edit `_CHANGELOG/*`
or `_TASKS/README.md` — the orchestrator owns those.

---

## Overview

This task closes the three 🔴 background/glow fidelity gaps catalogued in the owner's
7-agent report (`_TMP-cms-ograniczenia.md §4.1-3`, listed again in `§1` bundle 1..3)
and reproduces the premium look of the prototype `_docs/projekty-domow-wow-site` — a
site that layers **radial glow OVER a base gradient** on hero cards, project-art
tiles, glass panels and CTA cards (`§2`, e.g. `.cta-card` = `radial 82%/10% + linear
145deg`, the hero `sun-ring`, `art-*` two-layer fills, `preview-glass`), uses
**gradient fills on buttons/cards**, and paints **colored glow box-shadows**
(`0 18px 45px rgba(142,232,255,.22)`, `0 0 28px aqua`). Today the CMS flattens all of
these because:

1. `pageAuthoringSanitizers.isSingleGradientLayer` (`:54`) REJECTS any top-level
   comma-separated multi-layer background, so `radial-gradient(...), linear-gradient(...)`
   never survives the write boundary — multi-layer glow-over-gradient is impossible.
2. Section backgrounds have NO gradient branch (`toPageSectionStyle` handles only
   `backgroundType === "color"` / `"image"`, `pageRendererV2.tsx:409-416`), so a section
   cannot paint a gradient at all.
3. There is no arbitrary colored box-shadow — the only shadow surface is the fixed
   4-value `shadow` enum (`none|sm|md|lg`, `pageShadowTokens :148`) whose values are
   hardcoded slate drop-shadows (`toPageShadowValue :331`, `toPageSectionBoxShadow
   :396`), so a colored glow (aqua/violet) cannot be authored.

531 delivers exactly three additive capabilities, ALL present-only and
reduced-motion-irrelevant (static paint, no animation):

1. **MULTI-LAYER backgrounds** (radial glow + gradient) on section AND block —
   **RELAX `pageAuthoringSanitizers` so a COMMA-SEPARATED list of safe gradient/color
   layers is accepted** while STILL rejecting `url()` / `javascript:` / `expression` /
   `data:text/html` / `@import` and any non-gradient/non-color layer. **This is the
   SECURITY-CRITICAL core of the task and the one new attack surface** — see Security
   Contract §1. Implemented by allowlisting each comma-split layer through the existing
   single-layer validator, capping the layer count, fail-closed. **531 OWNS all
   `pageAuthoringSanitizers` multi-layer changes.**
2. **GRADIENT as BLOCK background** — `block.style` already has `background` +
   `backgroundType`; the block renderer ALREADY emits a gradient
   (`toGradientBackground(style.background)` at `pageRendererV2.tsx:738`, gated on
   `backgroundType === "gradient"`). **Grounding correction (see §Gap analysis G-2):**
   block-gradient EMIT is already wired end-to-end; what is missing is (a) the SECTION
   gradient branch (sections cannot paint a gradient at all today) and (b) exposing
   `backgroundType:"gradient"` cleanly in controls for BOTH targets. 531 adds the
   section gradient emit through `sanitizeAuthoringCssBackground` (mirroring how the
   block path already does), so both section and block reach gradient parity.
3. **Arbitrary COLORED box-shadow (glow)** — add a present-only `style.glow` field
   (a SAFE, STRUCTURED shadow spec: `color` via `sanitizeAuthoringCssColor` + numeric
   `blur`/`spread`/`x`/`y` clamps, composed to a single `box-shadow` string at render —
   **NOT a raw arbitrary string**) on block AND section, ALONGSIDE the existing
   `shadow` enum (glow composes independently and, when both present, is appended after
   the enum shadow).

Every addition joins the **reject-unknown allowlist** (`assertKnownKeys` +
`pageDocumentV2JsonSchema` `additionalProperties:false`) with a **round-trip test**.
Legacy / no-effect documents parse + render **byte-identical** to post-530.

## Gap analysis (grounded 2026-07-09 — SYMBOL names are authoritative; RE-GREP line anchors at implement time)

### G-1 — multi-layer backgrounds rejected at the write boundary (BLOCKING, security-critical)

- `sanitizeAuthoringCssBackground` (`pageAuthoringSanitizers.ts:100`) accepts a value
  only if `isSafeAuthoringCssColor(trimmed) || isSafeAuthoringCssGradient(trimmed)`.
  `isSafeAuthoringCssGradient` (`:87`) requires `isSingleGradientLayer` (`:54`), which
  returns `true` ONLY when nothing follows the matching close-paren of the single
  gradient call. Its doc-comment (`:46-53`) states the deliberate intent: block the
  top-level comma-separated multi-layer form (`linear-gradient(...), url(//evil/beacon)`)
  because the trailing `url()` layer would be fetched on render. So a LEGITIMATE
  glow-over-gradient (`radial-gradient(...), linear-gradient(...)`) is rejected TOGETHER
  with the malicious `url()` case — the current guard is correct-but-blunt.
- **Fix (531, security-critical):** RELAX the multi-layer path by SPLITTING the value at
  TOP-LEVEL commas (depth-0 only — never inside a gradient's own paren group) and
  running EACH layer through the EXISTING per-layer validator
  (`isSafeAuthoringCssColor(layer) || isSafeAuthoringCssGradient(layer)`), capping the
  layer count (`PAGE_BG_MAX_LAYERS = 6`), and failing CLOSED (reject the WHOLE value) if
  any layer is not a safe color/gradient. `url()` / `javascript:` / `data:text/html` /
  `expression` / `@import` never pass because a `url(...)` layer is neither a safe color
  nor a safe gradient (`isSafeAuthoringCssGradient` still contains `!urlFunctionPattern.test`),
  so it fails the per-layer check and the whole value is rejected. This is the SAME
  allowlist discipline as today, applied per comma-split layer instead of forbidding the
  comma entirely. See 531-01-L01 + Security Contract §1.

### G-2 — section has no gradient background; block gradient already wired (PARTIAL — seed correction)

- **Block gradient EMIT is ALREADY wired, but its render-side helper `toGradientBackground`
  RE-APPLIES the single-layer guard — so relaxing the write sanitizer alone does NOT make
  multi-layer paint (grounding correction to the seed, sharpened 2026-07-09).**
  `PageBlockStyleV2` already has `background` + `backgroundType`
  (`pageDocumentV2.ts:613-614`), the normalizer accepts `backgroundType:"gradient"`
  (`normalizeBlockStyle :2702`, `pageBackgroundTypes` includes `"gradient"`), and
  `toPageBlockVisualStyle` (`pageRendererV2.tsx:738`) ALREADY emits
  `toGradientBackground(style.background)` when `backgroundType === "gradient"`. BUT
  `toGradientBackground` (`pageRendererV2.tsx:345-349`) is
  `const safe = sanitizeAuthoringCssBackground(value); return safe && isSafeAuthoringCssGradient(safe) ? safe : undefined;`
  — after the (relaxed) write sanitizer accepts a multi-layer value, this render helper
  RE-GATES it through `isSafeAuthoringCssGradient` (`:87`), which still requires
  `isSingleGradientLayer` and therefore returns `false` for ANY comma-joined multi-layer
  value. Simulated on the reference `.cta-card` value
  `radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)`:
  `sanitizeAuthoringCssBackground` returns the value (relaxed accept, G-1) BUT
  `toGradientBackground` returns `undefined` (single-layer re-gate) → the gradient does NOT
  paint on block OR section. **Therefore 531 ALSO owns `toGradientBackground` (`:345-349`):**
  relax its render-side re-check so it trusts the (already-allowlisted) sanitizer return,
  gating on `isSafeAuthoringCssGradient(safe) || isSafeAuthoringCssBackgroundLayers(safe)`
  (import `isSafeAuthoringCssBackgroundLayers` from `pageAuthoringSanitizers`; L01 exports
  it). The block render CASE (the `backgroundType === "gradient"` branch at `:738`) is
  UNCHANGED, but the helper it calls (`toGradientBackground :345`) IS a 531 render-owned
  edit — so multi-layer paints on BOTH block and section without touching the `:738` call
  site. So the seed's "wire `backgroundType:"gradient"` for blocks through
  `sanitizeAuthoringCssBackground` at emit like sections do" is INVERTED — the BLOCK EMIT
  is wired; the SECTION emit AND the shared render-helper multi-layer re-gate are missing.
  **531 corrects the seed here explicitly.**
- The MISSING half is the **SECTION** gradient: `toPageSectionStyle`
  (`pageRendererV2.tsx:405`) computes `backgroundColor` only for `backgroundType ===
  "color"` (`:409-412`) and `backgroundImage` only for `"image"` (`:413-416`); there is
  NO `"gradient"` branch, so a section with `backgroundType:"gradient"` paints nothing.
  Add a section gradient branch that emits `toGradientBackground(section.style.background)`
  into `backgroundImage` (CSS gradients paint via `background-image`), mirroring the block
  path AND the full-bleed section box (`toPageSectionBleedStyle :464` — must gain the same
  branch so a full-bleed gradient bleeds edge-to-edge). Because both section and block call
  the SAME `toGradientBackground` helper, relaxing that helper's re-gate (above) makes
  multi-layer paint on BOTH targets once G-1 relaxes the write sanitizer.

### G-2b — the SECOND render boundary: `pageResponsiveCss.ts` per-device @media emit (BLOCKING, security-critical, contract-audit 2026-07-09)

- **There are TWO render boundaries, not one.** The SSR inline-style path
  (`pageRendererV2.tsx` `toGradientBackground`/`toPageSectionStyle`, G-2 above) emits into
  React `CSSProperties` objects — React ESCAPES those values into the `style` attribute. The
  SECOND boundary is **`core/services/pages/pageResponsiveCss.ts`**, which emits per-device
  `@media` declarations RAW into a `<style>` string (`renderRule :266-273` →
  `` `${property}:${value} !important` `` joined and injected via
  `dangerouslySetInnerHTML` by the renderer — **NOT React-escaped**). This module RE-GATES
  gradients through its own alias **`isSafeCssGradient` (`:188`) = the single-layer
  `isSafeAuthoringCssGradient`**. So even after G-1 relaxes the write sanitizer and G-2
  relaxes `toGradientBackground`, a PER-DEVICE (tablet/mobile) multi-layer background
  override is DROPPED here (single-layer re-gate → `unsafe_background_value` diagnostic),
  and section per-device gradients cannot emit at all:
  - **Block gradient override branch** (`:528-534`): `mergedStyle.backgroundType ===
    "gradient" && mergedStyle.background` → `isSafeCssGradient(mergedStyle.background)` →
    emits `background-image: <value>` RAW. Multi-layer fails the single-layer re-gate.
  - **Section has NO gradient override branch** (`:372-395`): the section background
    override handles only `backgroundType === "color"` (`:374-380`) and `"image"`
    (`:381-391`); the `else` (`:392-395`) CLEARS to transparent/none — so a per-device
    section `backgroundType:"gradient"` override paints nothing (mirroring the SSR gap G-2
    fixes for the base, but never fixed here for the responsive delta).
  - **DECISION (contract-audit 2026-07-09 — option (a), for fidelity):** 531 **relaxes the
    block gradient override branch AND ADDS a section gradient override branch** in
    `pageResponsiveCss.ts` so the RAW `<style>` path keeps the SAME allowlist + tripwire as
    the write boundary. Both branches gate the emitted value on the NEW tripwire-bearing
    validator: `isSafeCssGradient(v) || isSafeAuthoringCssBackgroundLayers(v)` (import
    `isSafeAuthoringCssBackgroundLayers` from `pageAuthoringSanitizers`, exported by
    531-01-L01 — the SAME per-layer allowlist + whole-value tripwire + `PAGE_BG_MAX_LAYERS`
    cap the SSR helper uses, so the RAW-string boundary can never accept a multi-layer value
    the write boundary would reject). The section branch emits `background-image: <value>`
    (+ `background-color: transparent`) mirroring the block branch and the SSR section
    branch G-2 adds. **Rejected the weaker option (b)** (declaring per-device multi-layer
    OUT OF SCOPE) because acceptance-criterion #5 explicitly claims per-device overrides
    "ride the existing responsive machinery" — dropping that would leave a fidelity hole vs
    the prototype's responsive cards. **Security note (fail-closed):** because
    `isSafeAuthoringCssBackgroundLayers` runs its whole-value tripwire FIRST and allowlists
    each comma-split layer, the RAW un-escaped `<style>` emit is exactly as safe as the SSR
    escaped emit — a `url()`/`@import`/`expression(`/`</style>`-charset value is rejected at
    BOTH boundaries. The single-layer `color` (`:374`) / `image` (`:381`) branches are
    UNCHANGED (single-layer fast path parity). **531 adds
    `core/services/pages/pageResponsiveCss.ts` to the seam-file list and to 531-01-L02's
    render ownership** (see the seam list and subtask table below). A code-comment MUST mark
    the relaxed `:188` alias / `:528` block branch / new `:372` section branch as a
    tripwire-bearing multi-layer accept, FORBIDDING a future naive re-bind of
    `isSafeCssGradient` to the multi-layer validator WITHOUT the whole-value tripwire
    pre-pass (the tripwire lives inside `isSafeAuthoringCssBackgroundLayers`; never widen the
    single-layer alias directly).

### G-3 — no arbitrary colored box-shadow / glow (MISSING)

- The only shadow surface is the `shadow` enum (`PageShadowToken = none|sm|md|lg`,
  `pageDocumentV2.ts:148/365`), rendered to FIXED slate drop-shadow strings
  (`toPageShadowValue :331` for blocks, `toPageSectionBoxShadow :396` for sections). A
  colored glow (the reference `0 18px 45px rgba(142,232,255,.22)`, `0 0 28px aqua`)
  cannot be expressed. Add a present-only STRUCTURED `style.glow` on `PageBlockStyleV2`
  AND `PageSectionStyleV2`: `{ color: <safe color>; blur?: 0..120; spread?: -40..80;
  x?: -80..80; y?: -80..80 }` composed at render to ONE `box-shadow` declaration —
  never a raw author string (defence against CSS injection). When both `shadow` (enum)
  and `glow` are present, the render composes `"<enum-shadow>, <glow-shadow>"` (comma
  list = two stacked shadows), so glow AUGMENTS rather than replaces the token shadow.

### G-3b — per-device GLOW is NOT composed by the responsive @media boundary (contract-audit 2026-07-09)

- 531-01-L03 marks the five `glow.*` controls `responsive:true` (per-device authoring), and
  acceptance-criterion #5 claims per-device glow "rides the existing responsive machinery".
  But `pageResponsiveCss.ts` composes only the shadow ENUM per device — the responsive
  box-shadow branches map `shadowCssValues[mergedStyle.shadow]` and **read no glow**:
  - **Section** (`:401-403`): `if (styleOverride.shadow !== undefined) { value =
    shadowCssValues[mergedStyle.shadow]; content.push({box-shadow, value}) }` — glow is not
    read, so a per-device `style.glow` override emits nothing.
  - **Block** (`:564-565`): same — `value = shadowCssValues[mergedStyle.shadow ?? ""]`, no
    glow read/compose.
  So a per-device glow authored through the responsive controls is silently dropped, and if
  a device sets ONLY glow (no enum shadow) no box-shadow rule emits at all.
- **DECISION (contract-audit 2026-07-09 — extend, for fidelity + control honesty):** 531
  **extends both responsive box-shadow branches to COMPOSE a per-device glow** so the
  `responsive:true` flag on the glow controls is honored. This requires the glow composer +
  clamps to be available inside `pageResponsiveCss.ts`; because `composeGlowBoxShadow` lives
  in `pageRendererV2.tsx` (which must stay Bun-free / import-side-effect-free per the module
  header, and `pageResponsiveCss.ts` is a separate Vitest-lane module), 531-01-L02 **factors
  the pure glow-compose + shadow-merge logic (`composeGlowBoxShadow` / `mergeShadows` /
  `clampGlowNum` + the `PAGE_GLOW_*_CLAMP` reads) into a shared pure helper both modules
  import** (either a small new pure module, or export the pure fns from a Bun-free home;
  `pageDocumentV2.ts` already owns the clamps). Each responsive branch then emits, when the
  device has `shadow` and/or `glow` overriding:
  `box-shadow: mergeShadows(shadowCssValues[mergedStyle.shadow], composeGlowBoxShadow(mergedStyle.glow))`
  gated so it fires when EITHER `styleOverride.shadow` OR `styleOverride.glow` is present
  (a device-only glow with no enum shadow still emits). `glow.color` is re-run through
  `sanitizeAuthoringCssColor` inside `composeGlowBoxShadow` (the RAW `<style>` boundary must
  re-validate — the whole value is composed from the sanitized color + clamped numbers into
  a fixed template, never a raw string), fail-soft to no glow on a bad color (mirroring the
  `unsafe_color_value` diagnostic idiom). The `glow` group is added to the section + block
  responsive-override CHANGE detectors (`hasOverride` `:745-751` / `hasBlockOverride`
  `:702-709` already key on `style` object non-emptiness, so a `style.glow` override is
  already detected — verify, do not double-count). **Rejected the fallback (desktop-only
  glow)**: it would require dropping `responsive:true` from the five L03 glow controls and
  correcting criterion #5, leaving a fidelity gap. 531-01-L02 owns the shared-helper
  extraction + both responsive branches; 531-01-L04 owns the per-device-glow @media emit
  test (a section/block with only a mobile `glow` override emits a mobile `box-shadow` rule).

## Schema-extension plan (JSON model — NO DDL, NO schemaVersion bump)

All additions are **present-only**, join the **reject-unknown allowlist**
(`assertKnownKeys`, `pageDocumentV2.ts:2013/2669/2495`), ship a **round-trip test**, and
are mirrored in **all THREE** strict `additionalProperties:false` style schemas in
lockstep:
1. `pageBlockStyleJsonSchema :1424` (block style — `$defs`/`$ref`, covers inline +
   responsive);
2. `partialSectionStyleJsonSchema :1629` (the per-breakpoint RESPONSIVE-OVERRIDE section
   style, referenced ONCE at `:1690` inside `sectionResponsiveJsonSchema`);
3. the **inlined TOP-LEVEL section-style schema at `:1827-1850`** (validates
   `sections[].style`, `additionalProperties:false` at `:1830`) — this is the PRIMARY
   section style and is a SEPARATE object from the partial. Established precedent:
   `surfacePreset`/`composition`/`fullBleed` appear in BOTH the partial (`:1648-1651`) AND
   the inlined top-level (`:1845-1848`); `glow` must too, or a top-level `style.glow`
   passes the normalizer allowlist but FAILS `additionalProperties:false` at `:1830` and
   the section-glow round-trip (`pageDocumentV2JsonSchema` is compiled + asserted true
   against normalized docs in `tests/vitest/pages/page-document-v2.test.ts`, e.g. `:2613`,
   `:2685`).
Legacy docs normalize **byte-unchanged**.

```ts
// ── TASK-531 REGION (pageDocumentV2.ts) — keep in one clearly-labelled block so
//    parallel worktrees (532/533/534) merge additively. ─────────────────────────

// Shared vocabulary (owned by 531-01-L01):
export const PAGE_GLOW_BLUR_CLAMP = { min: 0, max: 120 } as const;   // px
export const PAGE_GLOW_SPREAD_CLAMP = { min: -40, max: 80 } as const; // px
export const PAGE_GLOW_OFFSET_CLAMP = { min: -80, max: 80 } as const; // px (x AND y)

export type PageGlow = {
  color: string;      // REQUIRED — sanitized via sanitizeAuthoringCssColor at write
  blur?: number;      // PAGE_GLOW_BLUR_CLAMP, default 24 at render
  spread?: number;    // PAGE_GLOW_SPREAD_CLAMP, default 0
  x?: number;         // PAGE_GLOW_OFFSET_CLAMP, default 0
  y?: number;         // PAGE_GLOW_OFFSET_CLAMP, default 0
};

// PageBlockStyleV2 (pageDocumentV2.ts:596) gains, in the TASK-531 region:
//   glow?: PageGlow;   // arbitrary colored box-shadow, composed at render

// PageSectionStyleV2 (pageDocumentV2.ts:534) gains, in the TASK-531 region:
//   glow?: PageGlow;   // same shape on the section box
```

**No new `pageBlockType`, no new enum members on existing enums** — `glow` is a NEW
structured object field; multi-layer + gradient reuse the EXISTING `background` /
`backgroundType:"gradient"` surface (G-1 relaxes only the sanitizer; G-2 adds only the
section render branch).

## Subtask breakdown (single-writer file ownership; strict land order)

| # | Subtask | Sole-writer file(s) / owned region | Leaves | Depends on |
|---|---------|-----------------------------------|--------|------------|
| 531-01 | Multi-layer sanitizer relax + glow model + section-gradient/glow render + controls (foundation) | `core/services/pages/pageAuthoringSanitizers.ts` **[multi-layer relax — 531 OWNS this file's multi-layer changes; export `isSafeAuthoringCssBackgroundLayers` + tripwire]**; `core/services/pages/pageDocumentV2.ts` **[TASK-531 region: `PageGlow` type + clamps, `glow?` on both style types, `pageBlockStyleKeys` + section `assertKnownKeys` additions, ALL THREE JSON schemas (block `:1424`, partial section `:1629`, inlined top-level section `:1827-1850`), `normalizeBlockStyle` + `normalizeSectionStyle` glow blocks]**; `core/services/pages/pageRendererV2.tsx` **[TASK-531 region: relax `toGradientBackground` re-check (`:345`) to accept multi-layer via `isSafeAuthoringCssBackgroundLayers`, section gradient branch in `toPageSectionStyle` + `toPageSectionBleedStyle`, `composeGlowBoxShadow` helper (factored to a shared PURE home so `pageResponsiveCss.ts` can import it), glow merge into `toPageBlockVisualStyle` + `toPageSectionStyle`]**; `core/services/pages/pageResponsiveCss.ts` **[TASK-531 region: relax the block gradient override re-gate (`:528-534`) + ADD a section gradient override branch (`:372-395`) via `isSafeCssGradient(v) \|\| isSafeAuthoringCssBackgroundLayers(v)` (the RAW `<style>` boundary keeps the SAME tripwire+allowlist as the write boundary — G-2b); EXTEND the section (`:401-403`) + block (`:564-565`) responsive box-shadow branches to compose per-device glow (`mergeShadows` + `composeGlowBoxShadow`) — G-3b; code-comment forbidding a naive re-bind of `isSafeCssGradient` without the tripwire pre-pass]**; `core/services/pages/pageEditorControlRegistry.ts` **[TASK-531 region: `section.style.glow.*` group in `pageUniversalSectionControls` + `block.style.glow.*` group in `pageUniversalBlockControls`]**; `core/services/pages/pageEditorMutationActions.ts` **[TASK-531 region: route the nested `style.glow.color` (length-3) path through `sanitizeAuthoringCssColor` in `sanitizeStyleValue`/`sanitizePageEditorControlValue` — the `[group,key]` destructure (`:76`) otherwise leaves `glow.color` UNSANITIZED in optimistic client state (finding #4); mirror sibling 533-02's `border.*.color` handling]** | L01 sanitizer multi-layer relax, L02 glow model + section-gradient/glow render (+ shared pure glow-compose home) + `pageResponsiveCss.ts` multi-layer/glow relax + glow.color mutation-guard, L03 glow + gradient-type controls, L04 tests (sanitizer/model/render/responsive-css/mutation-guard) | TASK-530 |
| 531-02 | Tests, docs, closure | test files (own) + `_docs/*.md` | — | 531-01 |

**Land order (strictly sequential):** 531-01 (sanitizer + model + render + controls) →
531-02 (closure). **All of 531 lands AFTER all of 530.**

## Coordination / collision guards (shared seams — 531 keeps all additions in a labelled TASK-531 region)

> **Cross-bundle RECONCILE (531/532/533/534), 2026-07-09 — PASS.** No two bundles add
> the same field name, control id, or CSS token with a different meaning (verified:
> 531 `glow` + section-gradient render + multi-layer sanitizer relax vs 532
> `fontSizeCustom`/`textTransform`, 533 `colSpan`/`rowSpan`/`columnTemplate`/`border`,
> 534 `magnetic`/`noiseOverlay`/`switcher`/`scrollHint` — all distinct; clamps
> `PAGE_GLOW_*_CLAMP` and all `section/block.style.glow.*` control ids are unique).
> **531 is the SOLE owner of `pageAuthoringSanitizers.ts` multi-layer changes** —
> confirmed 532 (`sanitizeAuthoringCssFontSize`) and 533 (`sanitizeAuthoringGridTemplate`)
> only ADD independent new functions in their own labelled regions and never touch
> `isSingleGradientLayer`/`isSafeAuthoringCssGradient`/`sanitizeAuthoringCssBackground`;
> 534 does not touch the file. **531 is the SOLE owner of `pageResponsiveCss.ts`** — no
> other bundle (532/533/534) edits that file (grep-confirmed 2026-07-09), so 531's
> block-gradient-override relax + new section-gradient-override branch + per-device glow
> compose land without a cross-bundle merge there. **NEW shared seam (contract-audit
> 2026-07-09): `pageEditorMutationActions.ts` is shared between 531 (nested `style.glow.color`
> route) and 533-02 (nested `style.border.*.color` route).** Both add DISJOINT branches to
> the SAME `sanitizePageEditorControlValue` / `sanitizeStyleValue` in their own labelled
> `TASK-53x` regions — 531 matches `key==="glow" && rest[0]==="color"` (length-3), 533-02
> matches the `["style","border",side,"color"]` (length-4) path; distinct conditions, no
> overlap. If 531+533 land into one integration branch concurrently, resolve by keeping BOTH
> branches (additive) — neither rewrites the other's condition. **Serialize note:** 531's
> section-gradient+glow emit and 533-02's per-edge `border` emit BOTH append to
> `toPageSectionStyle` (`pageRendererV2.tsx:405`); disjoint labelled regions → additive
> three-way merge, with only a trivial adjacent-append resolution if 531+533 land into one
> integration branch concurrently. Canonical region sigil confirmed **`// ── TASK-53x ──`**
> (531 & 534 already use it; 532/533 aligned in their parents). Append-anchor rule: append
> each new entry on its OWN line inside the labelled region; never rewrite the closing
> `] as const;` line, a function `return` line, or a schema object's closing brace.

The four premium-fidelity bundles (531/532/533/534) share these seam files; each ADDS
DISJOINT fields in a clearly-labelled `TASK-###` region so parallel worktrees merge
additively. 531's owned seam regions:

- **`pageAuthoringSanitizers.ts` — 531 OWNS the multi-layer relaxation** (the only
  bundle touching `isSingleGradientLayer` / `isSafeAuthoringCssGradient` /
  `sanitizeAuthoringCssBackground`). No other bundle edits this file's gradient path.
- **`pageDocumentV2.ts` (shared with 532/533/534):** 531 adds ONLY the `PageGlow` type,
  the three glow clamps, `glow?` on both style types, `"glow"` in `pageBlockStyleKeys`
  (`:746`) + the section `assertKnownKeys` literal (`:2495-2514`), the `glow` schema
  object in **all THREE** `additionalProperties:false` style schemas —
  `pageBlockStyleJsonSchema` (`:1424`), `partialSectionStyleJsonSchema` (`:1629`, the
  responsive-override), AND the **inlined top-level section-style schema** (`:1827-1850`,
  which validates `sections[].style`; this is separate from the partial and MUST gain
  `glow` in lockstep, mirroring how `surfacePreset`/`composition`/`fullBleed` live in both
  `:1648` and `:1845`) — and the `glow` normalize block in `normalizeBlockStyle` (`:2661`)
  + `normalizeSectionStyle` (`:2488`). 531 adds NO new `pageBlockType` and NO member to any
  existing enum. All 531 edits are wrapped in a `// ── TASK-531 …` region comment.
- **`pageRendererV2.tsx` (shared):** 531 (a) relaxes the render-side `toGradientBackground`
  helper (`:345-349`) so its post-sanitizer re-check accepts multi-layer values —
  `isSafeAuthoringCssGradient(safe) || isSafeAuthoringCssBackgroundLayers(safe)` (import
  `isSafeAuthoringCssBackgroundLayers` from `pageAuthoringSanitizers`; L01 exports it) —
  because otherwise the single-layer re-gate defeats the relaxed write sanitizer on BOTH
  block and section (see §Gap analysis G-2); (b) adds the section gradient branch in
  `toPageSectionStyle` (`:405`) + `toPageSectionBleedStyle` (`:464`); (c) adds a new
  `composeGlowBoxShadow(glow)` helper adjacent to `toPageShadowValue` (`:331`); and (d)
  merges glow into `toPageBlockVisualStyle` (`:714`, `boxShadow` line `:746`) +
  `toPageSectionStyle` (`boxShadow` line `:420/446`). The block gradient CALL SITE (the
  `backgroundType === "gradient"` branch at `:738`) is UNCHANGED — it already calls
  `toGradientBackground`; 531 relaxes only the shared HELPER at `:345`, so multi-layer
  paints on both block and section without editing the `:738` call. The top-of-file import
  block is APPEND-ONLY.
- **`pageEditorControlRegistry.ts` (shared):** 531 appends a `section.style.glow.*`
  group to `pageUniversalSectionControls` (`:225`) and a `block.style.glow.*` group to
  `pageUniversalBlockControls` (`:449`), plus (if not already an option) confirms
  `"gradient"` is offered by the existing `backgroundType` `select` controls (`:276`,
  `:489`) — `pageBackgroundTypes` already includes `"gradient"`, so no enum change.
- **`pageResponsiveCss.ts` (the SECOND render boundary — contract-audit 2026-07-09):**
  this module emits per-device `@media` declarations RAW into a `<style>` string
  (`renderRule :266-273`, injected via `dangerouslySetInnerHTML`, **NOT React-escaped**) and
  RE-GATES gradients through its own single-layer alias `isSafeCssGradient` (`:188`). 531
  (a) relaxes the block gradient override branch (`:528-534`) and (b) ADDS a section
  gradient override branch (`:372-395`), both gating on
  `isSafeCssGradient(v) || isSafeAuthoringCssBackgroundLayers(v)` (import the 531-01-L01
  export) so the RAW `<style>` path keeps the SAME per-layer allowlist + whole-value
  tripwire + `PAGE_BG_MAX_LAYERS` cap as the write boundary — fail-closed and exactly as
  safe as the SSR escaped emit (see G-2b + Security Contract §1); and (c) extends the section
  (`:401-403`) + block (`:564-565`) responsive box-shadow branches to compose a per-device
  glow via `mergeShadows`/`composeGlowBoxShadow` (imported from the shared pure home L02
  factors out — this module is a Bun-free Vitest-lane module and must not import from the
  render-side inline path) so the `responsive:true` glow controls actually emit (see G-3b).
  A code-comment marks these as tripwire-bearing multi-layer accepts and FORBIDS a future
  naive re-bind of `isSafeCssGradient` to the multi-layer validator without the tripwire
  pre-pass. All 531 edits are wrapped in a `// ── TASK-531 …` region.
- **`pageEditorMutationActions.ts` (client optimistic write-guard — finding #4):** the
  editor value sanitizer `sanitizePageEditorControlValue` (`:72-80`) destructures
  `const [group, key] = control.overridePath` (`:76`) and routes `group==="style"` to
  `sanitizeStyleValue(key, value)` (`:63-70`). For a nested glow color control the
  `overridePath` is the length-3 `["style","glow","color"]`, so `group="style"` but
  `key="glow"` (NOT `"color"`); `sanitizeStyleValue` matches none of its cases and returns
  the value UNSANITIZED into the editor's optimistic client state. 531 adds a TASK-531 region
  routing the nested `style.glow.color` path (and any nested glow numeric) through
  `sanitizeAuthoringCssColor` / numeric handling, mirroring how sibling 533-02 OWNS the
  equivalent `border.*.color` (length-4) seam. The persisted write boundary is unaffected
  (`normalizeGlow` re-sanitizes at persist), but this closes the client-layer gap so a bad
  glow color never reaches the optimistic preview un-validated.
- **`pageCompositionEffects.tsx`:** 531 does NOT need composition CSS — glow composes to
  an inline `box-shadow` (no class/selector), and multi-layer gradients paint via the
  existing inline `background-image`. Listed as a shared seam only because 533/534 use
  it; 531 leaves it untouched. (If a future refinement wants a glow CSS var it would go
  here, but the base contract is inline-only.)
- **`pageEditorControlUiModel.ts`:** 531 needs NO new control UI kind — glow uses
  `color` (for `glow.color`) + `number` (for blur/spread/x/y) inputs already in the
  union (`pageEditorControlRegistry.ts:67-75`); gradient type reuses the existing
  `select` on `backgroundType`. No `editorControls/*` component change.
- Do NOT edit `_docs/_TASKS/README.md` or `_docs/_CHANGELOG/*` (orchestrator owns them).
- rg misdetects `pageRendererV2.tsx` / `pageDocumentV2.ts` as binary — use `Read` /
  `grep -an`, never trust an empty `rg`.

## Security Contract

**No new route, RBAC bucket, method, or endpoint.** All additions ride the existing
validated Page v2 `document` write path (`normalizePageDocument`, gated by the pages
write permission) and the SSR render path. The attacker-influenceable surfaces are (1)
the **relaxed multi-layer background string** (the primary NEW attack surface), (2) the
new `glow.color` string, and (3) the new numeric clamps — each constrained at BOTH the
write (normalize) boundary and the render boundary (defence in depth).

1. **Multi-layer background (the core new attack surface — SECURITY-CRITICAL).** Relaxing
   `isSingleGradientLayer` widens what `sanitizeAuthoringCssBackground` accepts, so it is
   the one place the reject rules must not regress. The relaxation is an ALLOWLIST per
   comma-split layer, NOT a loosened regex:
   - **TOP-LEVEL split only.** Split the trimmed value at commas that sit at paren-depth
     0 (a comma inside `radial-gradient(circle, ...)` stays with its layer). A hand-rolled
     depth scanner (mirroring the existing `hasBalancedParens` / `isSingleGradientLayer`
     paren walk, `:34/:54`) does the split — never a naive `.split(",")` (which would
     shred gradient internals).
   - **Per-layer allowlist, fail-CLOSED.** Each layer must satisfy
     `isSafeAuthoringCssColor(layer) || isSafeAuthoringCssGradient(layer)` (the EXISTING
     per-layer validators, unchanged). `isSafeAuthoringCssGradient` still enforces
     `gradientCharsetPattern` (`:29`), `hasBalancedParens`, `!urlFunctionPattern`
     (`:85/90` — this is what rejects `url(...)`), and `isSingleGradientLayer` PER LAYER
     (each layer is itself a single gradient). If ANY layer fails, the WHOLE value is
     rejected (fail-closed) — no partial acceptance.
   - **Rejected constructs stay rejected** (each fails the per-layer allowlist): `url(...)`
     (charset + `urlFunctionPattern`), `javascript:` / `vbscript:` / `data:text/html`
     (not a gradient head, not a safe color), `expression(...)` / `behavior:` /
     `-moz-binding` (charset), `@import` / `image-set(` / `element(` (not a gradient
     head). A dedicated tripwire regex (`/(?:url|image-set|image|element|cross-fade)\s*\(|@import|expression\s*\(|behavior\s*:|-moz-binding|(?:javascript|vbscript|data)\s*:)/i`)
     runs on the WHOLE value FIRST as fail-closed defence-in-depth before the split, so a
     hostile function that somehow matched the charset can never reach the per-layer pass.
   - **Layer-count cap.** `PAGE_BG_MAX_LAYERS = 6` — more than 6 top-level layers ⇒ reject
     (bounds a pathological-paint / ReDoS-adjacent input; the reference never exceeds 2-3).
   - **Single-layer path unchanged.** A value with no top-level comma still goes through
     the existing `isSafeAuthoringCssColor || isSafeAuthoringCssGradient` fast path
     byte-identically — the multi-layer branch is entered ONLY when a top-level comma
     exists, so no single-layer document changes behavior.
   - Result: `radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%),
     linear-gradient(145deg,#0f1720,#1b2733)` (reference `.cta-card`) is ACCEPTED;
     `linear-gradient(#fff,#000), url(//evil/beacon)` is REJECTED to `null` (fallback), so
     no external fetch / injection reaches CSS.
   - **ALL consumers widened by the relaxation (finding #5 — enumerate exhaustively).**
     Relaxing `sanitizeAuthoringCssBackground` widens EVERY caller of that function, at BOTH
     the write and render boundaries. The complete grounded list (verified 2026-07-09):
     1. **Section/block `style.background` write** — `normalizeSectionStyle` /
        `normalizeBlockStyle` (the primary 531 surface). SAFE: fail-closed allowlist as above.
     2. **Section/block `style.background` SSR render** — `toGradientBackground`
        (`pageRendererV2.tsx:345/347`), which 531-01-L02 ALSO relaxes (G-2) to actually
        paint multi-layer. SAFE: emits into a React `CSSProperties` object → React-escaped;
        AND the value already passed the fail-closed write allowlist.
     3. **Section/block per-device `style.background` @media render** — `pageResponsiveCss.ts`
        (the SECOND render boundary, G-2b). This is the ONE consumer that emits RAW into a
        `<style>` string via `dangerouslySetInnerHTML` (NOT React-escaped), so it re-gates
        through the SAME tripwire-bearing `isSafeAuthoringCssBackgroundLayers` allowlist —
        a multi-layer value it accepts is exactly what the write boundary would accept, and
        `url()`/`@import`/`expression(`/`</style>`-charset never pass either boundary. SAFE.
     4. **`settings.background` page-canvas write** — `normalizeSettings`
        (`pageDocumentV2.ts:2434-2437`, TASK-523-01 per-page canvas background). This is the
        THIRD independently-widened consumer. Post-relaxation a multi-layer canvas background
        is now ACCEPTED (previously single-layer only). SAFE: same fail-closed allowlist.
     5. **`settings.background` page-canvas SSR render** — `pageRendererV2.tsx:3033-3034`
        re-sanitizes `resolved.settings.background` and feeds it into the `rootStyle`
        `CSSProperties` object (`:3038-3044`). SAFE: React-escaped into the `style` attribute
        (defence-in-depth re-sanitize matching every other color/background in the renderer);
        the RAW `<style>` @media path (consumer #3) does NOT emit a per-device canvas
        background (settings has no responsive machinery), so this consumer is escaped-only.
     6. **Editor optimistic client write-guard** — `pageEditorMutationActions.ts:67`
        (`sanitizeStyleValue`, `key === "background"` → `sanitizeAuthoringCssBackground`).
        SAFE: same fail-closed allowlist; runs BEFORE the value hits optimistic client state
        AND is re-validated at the persist boundary (consumers #1/#4). (Note: this guard is
        ALSO the finding-#4 seam for the SEPARATE nested `glow.color` path — see §5.)
     Every widened consumer re-uses the SAME allowlist (write) or is React-escaped (render),
     except the one RAW `<style>` boundary (#3) which is gated by the identical
     tripwire+allowlist. No consumer accepts a value the write boundary would reject.
2. **`glow.color` (whitelist, no CSS injection).** `glow.color` runs through the existing
   `sanitizeAuthoringCssColor` (`pageAuthoringSanitizers.ts:93`) at write (hex/hex8/
   `rgb[a]()`/`hsl[a]()`/`var(--color-*)`/named; else the whole glow is OMITTED — a glow
   with no valid color is not stored). At render, `composeGlowBoxShadow` interpolates ONLY
   the sanitized color + clamped numbers into a fixed `"<x>px <y>px <blur>px <spread>px
   <color>"` template — NEVER a raw author string, so no arbitrary `box-shadow` value
   (which could smuggle `url()` via a bogus token) is possible. This is why `glow` is a
   STRUCTURED spec, not a free-text shadow string.
3. **Numeric clamps (no injection surface).** `glow.blur/spread/x/y` are `readNumber`-clamped
   (fail-soft) to the 531 clamps; they reach CSS only as bounded `px` numbers. `glow.color`
   is REQUIRED — a `glow` object whose `color` fails sanitization normalizes to OMITTED
   (fail-soft: the whole `glow` key is dropped, never a partial/color-less glow). An unknown
   nested key inside `glow` REJECTS the write (`assertKnownKeys(g, ["color","blur","spread","x","y"], …)`,
   fail-closed, matching `layer`/`marquee`).
4. **Allowlist + round-trip (fail-closed READ trap).** `"glow"` joins its reject-unknown
   allowlist (`pageBlockStyleKeys` + the section `assertKnownKeys` literal) AND the strict
   JSON schemas (`additionalProperties:false`) in lockstep, with a persistence round-trip
   test — a forgotten allowlist entry silently degrades every stored doc carrying `glow`
   to empty on read. No new key ships without its round-trip assertion. The relaxed
   multi-layer path ships an explicit accept/reject corpus (531-01-L04).
5. **Nested `glow.color` CLIENT mutation sanitizer (finding #4 — client-layer gap).** The
   editor optimistic write-guard `sanitizePageEditorControlValue`
   (`pageEditorMutationActions.ts:72-80`) destructures `const [group, key] =
   control.overridePath` (`:76`) and routes only `group==="style"` → `sanitizeStyleValue(key,
   value)`. For the glow color control the `overridePath` is the length-3
   `["style","glow","color"]`, so `group="style"` but `key="glow"` (NOT `"color"`);
   `sanitizeStyleValue` (`:63-70`) matches none of its cases (`textColor`/`borderColor`/
   `accent`/`background`/`backgroundImage`) and returns the value UNSANITIZED into the
   editor's optimistic client state. Sibling **533-02 explicitly OWNS this seam for
   `border.*.color`** (its length-4 nested path); 531 adds the EQUIVALENT handling for the
   length-3 `glow.color` (and any nested glow numeric): a TASK-531 region in
   `pageEditorMutationActions.ts` detects the nested glow color path and routes it through
   `sanitizeAuthoringCssColor` (numeric glow fields clamp), so a hostile glow color never
   reaches the optimistic preview un-validated. This is DEFENCE-IN-DEPTH only — the persist
   boundary (`normalizeGlow`, §2/§3) already re-sanitizes `glow.color` and clamps the numbers,
   so a stored document is safe regardless; this closes the transient client-state gap and
   keeps parity with 533-02's border handling. 531-01-L04 asserts
   `sanitizePageEditorControlValue` drops a bad glow color for a `style.glow.color` control
   and that the nested length-3 color path now reaches `sanitizeAuthoringCssColor`.
6. **RAW `<style>` per-device boundary parity (finding #1 — the SECOND render boundary).**
   `pageResponsiveCss.ts` emits per-device declarations RAW (unescaped) into a `<style>`
   string; 531's relaxed block gradient override branch + NEW section gradient override
   branch there gate on the SAME tripwire-bearing `isSafeAuthoringCssBackgroundLayers`
   allowlist as the write boundary (see §1 consumer #3 + G-2b). A code-comment at the
   relaxed `isSafeCssGradient` alias (`:188`) / block branch (`:528`) / new section branch
   (`:372`) FORBIDS a future naive re-bind of the single-layer alias to the multi-layer
   validator WITHOUT the whole-value tripwire pre-pass. The per-device glow compose (G-3b)
   likewise composes from the re-sanitized `glow.color` + clamped numbers into a fixed
   `box-shadow` template — never a raw string — so the RAW `<style>` glow emit is as safe as
   the SSR emit.

## Hard Invariants

1. **Present-only** — `glow`, section-gradient, and multi-layer backgrounds emit ZERO
   bytes when unauthored; legacy / no-effect docs normalize + render **byte-identical** to
   post-530. `glow` omitted when its color is invalid; the multi-layer branch is entered
   only when a top-level comma exists (single-layer docs unchanged).
2. **Multi-layer relaxation is an ALLOWLIST, fail-closed** — top-level comma split + per-layer
   `isSafeAuthoringCssColor || isSafeAuthoringCssGradient` + whole-value tripwire pre-pass +
   `PAGE_BG_MAX_LAYERS` cap; any bad layer / over-cap / tripwire ⇒ reject the WHOLE value to
   `null`. `url()` / `javascript:` / `data:text/html` / `expression` / `@import` never pass.
3. **Glow is a STRUCTURED spec composed at render, never a raw string** — `color` via
   `sanitizeAuthoringCssColor`; blur/spread/x/y clamped; interpolated into a fixed
   `box-shadow` template; when `shadow` (enum) is also present, glow is APPENDED
   (`"<enum>, <glow>"`) not replacing it.
4. **No new npm dependency, no DB migration / DDL, no `PAGE_DOCUMENT_SCHEMA_VERSION` bump**
   (`pageDocumentV2.ts:29` stays `2`), **no new route**.
5. **No new `pageBlockType`, no new member on any existing enum** — multi-layer + gradient
   reuse the existing `background`/`backgroundType:"gradient"` surface; `glow` is a new
   structured object field only.
6. **Reject-unknown + fail-soft** — `"glow"` joins its allowlist + one value normalizer + a
   round-trip test; bad VALUES fail-soft (clamp for numbers, omit-glow for a bad color,
   reject-to-null for a bad background), unknown nested KEYS reject (`PageDocumentError`).
7. **All 531 model/schema/control additions live in a clearly-labelled `// ── TASK-531`
   region** in each shared seam file so 532/533/534 worktrees merge additively.
8. **BOTH render boundaries enforce the SAME allowlist** — the SSR inline-style path
   (React-escaped `CSSProperties`) AND the `pageResponsiveCss.ts` per-device RAW `<style>`
   path (`dangerouslySetInnerHTML`) gate multi-layer through
   `isSafeAuthoringCssBackgroundLayers` (per-layer allowlist + whole-value tripwire + cap);
   neither boundary accepts a value the write boundary would reject; a code-comment forbids
   re-binding `isSafeCssGradient` to the multi-layer validator without the tripwire pre-pass.
9. **Per-device glow + multi-layer ride the responsive machinery** — the responsive section
   (`:401-403`) + block (`:564-565`) box-shadow branches compose a per-device glow (a
   device-only glow with no enum shadow still emits a `box-shadow` rule); the block gradient
   override + new section gradient override emit multi-layer per device. The five glow
   controls keep `responsive:true` and it is honored end-to-end (not silently dropped).
10. **Nested `glow.color` is sanitized at the client mutation guard** — the editor
    optimistic write-guard routes the length-3 `style.glow.color` path through
    `sanitizeAuthoringCssColor` (parity with sibling 533-02's `border.*.color`), not left
    UNSANITIZED by the `[group,key]` destructure.

## Acceptance Criteria (measured LIVE vs the prototype — ≥5 real-flow scenarios per area)

Verified against the live admin (`coderso-dev-core-host`,
`http://coderso-a.localhost:5173/admin/`) + real front (`:3000`) with `playwright-cli`,
light + dark, 0 console errors, screenshots to `_docs/_workflows/_smoke/`. Assert VISIBLE
effects (computed `background-image` layer count, computed `box-shadow`, DOM state),
compared side-by-side to `_docs/projekty-domow-wow-site` (`.cta-card`, `.service-card`,
hero `sun-ring`, `art-*`).

1. **Multi-layer background — SECTION.** A section with `backgroundType:"gradient"` and
   `background:"radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%),
   linear-gradient(145deg,#0f1720,#1b2733)"` paints BOTH layers (computed
   `background-image` has two layers, glow over gradient like `.cta-card`); on the front
   after publish; a full-bleed section bleeds both layers edge-to-edge.
2. **Multi-layer background — BLOCK.** A card block with the same multi-layer gradient
   paints both layers (computed `background-image` two layers, like `.art-*`); a button
   block with a single `linear-gradient` still paints (gradient block background parity,
   confirming G-2 block path stays green).
3. **Gradient block/section parity.** Setting `backgroundType:"gradient"` on a BLOCK
   (already wired) and a SECTION (new) both paint the gradient; switching back to
   `"color"`/`"image"` restores the flat/image paint; `"gradient"` with an invalid value
   falls back cleanly (no paint, no console error).
4. **Colored glow — block + section.** A card with `glow:{color:"rgba(142,232,255,.22)",
   blur:45,y:18}` shows computed `box-shadow: 0px 18px 45px 0px rgba(142,232,255,.22)`
   (like the reference glow); a section with `glow` paints on the section box; a block
   with BOTH `shadow:"md"` AND `glow` shows a TWO-shadow computed `box-shadow` (enum +
   glow); reset glow → byte-identical.
5. **Override/reset + cross-device (BOTH render boundaries).** Glow + multi-layer authored
   at desktop persist and round-trip; toggling glow off / clearing the multi-layer value
   returns to byte identity. Per-device overrides ride the responsive `@media` machinery
   (`pageResponsiveCss.ts`, the RAW `<style>` boundary): a TABLET/MOBILE multi-layer
   background override paints BOTH layers at that breakpoint (computed `background-image`
   two layers inside the media query on section AND block); a MOBILE-ONLY `glow` override
   (no enum shadow) emits a mobile `box-shadow` rule; a per-device SECTION
   `backgroundType:"gradient"` override paints (the new section responsive gradient branch).
   Verify at desktop/tablet/mobile viewport widths on the front after publish.
6. **Security negatives (BOTH boundaries).** `background:"linear-gradient(#fff,#000),
   url(//evil/beacon)"` → `sanitizeAuthoringCssBackground` returns `null` (no external ref
   reaches CSS) AND the per-device `pageResponsiveCss.ts` branch drops it
   (`unsafe_background_value` diagnostic — no RAW `<style>` emit, network panel clean at the
   tablet/mobile viewport); `background` with 7+ top-level layers → rejected (over cap) at
   BOTH boundaries; a per-device override `background:"linear-gradient(#fff,#000),
   @import url(evil)"` → tripwire-rejected in the RAW `<style>` path (no `@import` reaches
   the injected stylesheet); `glow.color:"expression(alert(1))"` → glow OMITTED (fail-soft)
   at write AND the client mutation guard drops it (finding #4); `glow.blur:9999` → clamps
   to 120 (write AND per-device compose); an unknown key `style.glow.wobble` →
   `PageDocumentError` (fail-closed); `style.foo` → rejected.
7. **No-effect byte-identity.** A page with none of the new fields authored (and no
   multi-layer background) produces a normalized document and rendered HTML
   byte-identical to the post-530 output.

## Definition of done

531-01 + 531-02 landed in order, AFTER 530; multi-layer backgrounds (glow over gradient)
persist + render on section AND block, section gradient reaches parity with the
already-wired block gradient, and arbitrary colored glow box-shadow persists + renders on
block AND section; the relaxed multi-layer sanitizer is an allowlist per comma-split layer
(fail-closed) that still rejects `url()`/`javascript:`/`expression`/`data:text/html`/`@import`
and caps layer count; glow is a structured spec composed at render (never a raw string);
**BOTH render boundaries enforce it** — the SSR inline-style path (React-escaped) AND the
`pageResponsiveCss.ts` per-device RAW `<style>` path (relaxed block gradient override + NEW
section gradient override, both gated on `isSafeAuthoringCssBackgroundLayers`, plus the
per-device glow compose in the responsive box-shadow branches so `responsive:true` glow is
honored); the nested `style.glow.color` client mutation guard routes through
`sanitizeAuthoringCssColor` (parity with 533-02's `border.*.color`); every new key joins
its reject-unknown allowlist + JSON schema + round-trip test and
fail-soft on bad values; no npm dependency, no migration, no schemaVersion bump, no route,
no new block type; all 531 additions live in a labelled `TASK-531` region in each shared
seam (including `pageResponsiveCss.ts` + `pageEditorMutationActions.ts`); legacy /
no-effect docs byte-identical; Security Contract satisfied (multi-layer allowlist + color
whitelist + clamps at write and BOTH render boundaries + the client mutation guard, all
widened `sanitizeAuthoringCssBackground` consumers enumerated + verified safe); every gate green (root `tsc -p
tsconfig.json --noEmit`, `bun --cwd core lint:types`, `bun --cwd core lint`, vitest, `bun
test`, `gates:coderso`); ≥5-scenario-per-area Playwright smoke passes light + dark with 0
console errors measured side-by-side vs the prototype; closure documented under the
then-current next-free changelog (grep `_docs/_CHANGELOG/` highest+1; highest on disk 1242
as of authoring, 531 = 1243+).
