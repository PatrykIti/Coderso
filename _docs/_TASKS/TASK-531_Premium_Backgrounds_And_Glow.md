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

**Status:** ⏳ To Do
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
| 531-01 | Multi-layer sanitizer relax + glow model + section-gradient/glow render + controls (foundation) | `core/services/pages/pageAuthoringSanitizers.ts` **[multi-layer relax — 531 OWNS this file's multi-layer changes]**; `core/services/pages/pageDocumentV2.ts` **[TASK-531 region: `PageGlow` type + clamps, `glow?` on both style types, `pageBlockStyleKeys` + section `assertKnownKeys` additions, ALL THREE JSON schemas (block `:1424`, partial section `:1629`, inlined top-level section `:1827-1850`), `normalizeBlockStyle` + `normalizeSectionStyle` glow blocks]**; `core/services/pages/pageRendererV2.tsx` **[TASK-531 region: relax `toGradientBackground` re-check (`:345`) to accept multi-layer via `isSafeAuthoringCssBackgroundLayers`, section gradient branch in `toPageSectionStyle` + `toPageSectionBleedStyle`, `composeGlowBoxShadow` helper, glow merge into `toPageBlockVisualStyle` + `toPageSectionStyle`]**; `core/services/pages/pageEditorControlRegistry.ts` **[TASK-531 region: `section.style.glow.*` group in `pageUniversalSectionControls` + `block.style.glow.*` group in `pageUniversalBlockControls`]** | L01 sanitizer multi-layer relax, L02 glow model + section-gradient/glow render, L03 glow + gradient-type controls, L04 tests (sanitizer/model/render) | TASK-530 |
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
> 534 does not touch the file. **Serialize note:** 531's section-gradient+glow emit and
> 533-02's per-edge `border` emit BOTH append to `toPageSectionStyle`
> (`pageRendererV2.tsx:405`); disjoint labelled regions → additive three-way merge, with
> only a trivial adjacent-append resolution if 531+533 land into one integration branch
> concurrently. Canonical region sigil confirmed **`// ── TASK-53x ──`** (531 & 534
> already use it; 532/533 aligned in their parents). Append-anchor rule: append each new
> entry on its OWN line inside the labelled region; never rewrite the closing
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
5. **Override/reset + cross-device.** Glow + multi-layer authored at desktop persist and
   round-trip; toggling glow off / clearing the multi-layer value returns to byte
   identity; per-device background/glow overrides ride the existing responsive machinery.
6. **Security negatives.** `background:"linear-gradient(#fff,#000), url(//evil/beacon)"` →
   `sanitizeAuthoringCssBackground` returns `null` (no external ref reaches CSS);
   `background` with 7+ top-level layers → rejected (over cap); `glow.color:"expression(alert(1))"`
   → glow OMITTED (fail-soft); `glow.blur:9999` → clamps to 120; an unknown key
   `style.glow.wobble` → `PageDocumentError` (fail-closed); `style.foo` → rejected.
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
every new key joins its reject-unknown allowlist + JSON schema + round-trip test and
fail-soft on bad values; no npm dependency, no migration, no schemaVersion bump, no route,
no new block type; all 531 additions live in a labelled `TASK-531` region in each shared
seam; legacy / no-effect docs byte-identical; Security Contract satisfied (multi-layer
allowlist + color whitelist + clamps at write and render); every gate green (root `tsc -p
tsconfig.json --noEmit`, `bun --cwd core lint:types`, `bun --cwd core lint`, vitest, `bun
test`, `gates:coderso`); ≥5-scenario-per-area Playwright smoke passes light + dark with 0
console errors measured side-by-side vs the prototype; closure documented under the
then-current next-free changelog (grep `_docs/_CHANGELOG/` highest+1; highest on disk 1242
as of authoring, 531 = 1243+).
