# TASK-531-01: Multi-Layer Sanitizer Relax + Glow Model + Section-Gradient/Glow Render + Controls (Foundation)

# FileName: TASK-531-01-Multi-Layer-Sanitizer-Glow-Model-Render-Controls.md

**Parent Task:** TASK-531
**Priority:** High
**Category:** Security / Content (Pages) / Site Render / Admin UI / Schema (JSON model)
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

The single implementation subtask for TASK-531 (Bundle A). Delivers, in strict leaf
order, the three grounded capabilities:

- **L01** — SECURITY-CRITICAL relaxation of `pageAuthoringSanitizers` so a comma-separated
  list of safe gradient/color layers is accepted (allowlist per top-level layer, cap,
  fail-closed), while still rejecting `url()`/`javascript:`/`expression`/`data:text/html`/
  `@import` and any non-gradient/non-color layer. **531 OWNS `pageAuthoringSanitizers`
  multi-layer changes.**
- **L02** — `PageGlow` model + clamps + `glow?` on `PageBlockStyleV2` AND
  `PageSectionStyleV2` (allowlist + JSON schema + normalize), plus the SECTION gradient
  render branch (block gradient is already wired — grounding correction), the
  `composeGlowBoxShadow` render helper merged into block + section box-shadow, AND the SECOND
  render boundary `pageResponsiveCss.ts` (per-device `@media`, contract-audit 2026-07-09):
  relax the block gradient override + ADD a section gradient override (both gating on the
  tripwire-bearing `isSafeAuthoringCssBackgroundLayers`) + extend the section/block
  responsive box-shadow branches to compose per-device glow (shared pure glow-compose home).
- **L03** — `glow.*` controls (color + numeric) on the universal section AND block control
  groups; confirm `backgroundType:"gradient"` is offered for both targets; AND close the
  nested `style.glow.color` client mutation-guard gap in `pageEditorMutationActions.ts`
  (finding #4, mirroring sibling 533-02's `border.*.color`).
- **L04** — Vitest for sanitizer (accept/reject corpus), model (round-trip / reject-unknown /
  fail-soft), render (section gradient, block+section glow, byte-identity), the SECOND
  render boundary `page-responsive-css.test.ts` (per-device gradient/glow + RAW-boundary
  security rejects), and the client mutation-guard (`glow.color` sanitized).

Single-writer file ownership (this subtask owns ALL of these; 531-02 owns tests + docs
only): `pageAuthoringSanitizers.ts`, the `TASK-531` region of `pageDocumentV2.ts`, the
`TASK-531` region of `pageRendererV2.tsx`, the `TASK-531` region of `pageResponsiveCss.ts`
(the SECOND render boundary), the `TASK-531` region of `pageEditorControlRegistry.ts`, the
`TASK-531` region of `pageEditorMutationActions.ts`, and the Bun-free shared pure
glow-compose home L02 factors out.

## Grounded anchors (verified 2026-07-09; RE-GREP at implement time)

- `pageAuthoringSanitizers.ts`: `isSingleGradientLayer :54`, `isSafeAuthoringCssColor :79`,
  `isSafeAuthoringCssGradient :87`, `sanitizeAuthoringCssColor :93`,
  `sanitizeAuthoringCssBackground :100`, `hasBalancedParens :34`, `urlFunctionPattern :85`,
  `gradientCharsetPattern :29`.
- `pageDocumentV2.ts`: `PageSectionStyleV2 :534`, `PageBlockStyleV2 :596`,
  `pageBlockStyleKeys :746`, section `assertKnownKeys` literal `:2495-2514`,
  `pageBlockStyleJsonSchema :1424`, `partialSectionStyleJsonSchema :1629`,
  `normalizeSectionStyle :2488`, `normalizeBlockStyle :2661`, `readNumber` /
  `readOptionalSafeColor` (used by consumers), `assertKnownKeys :2013`,
  `PAGE_DOCUMENT_SCHEMA_VERSION = 2 :29`.
- `pageRendererV2.tsx`: `toPageShadowValue :331`, `toGradientBackground :345` (already
  calls `sanitizeAuthoringCssBackground`), `toPageSectionBoxShadow :396`,
  `toPageSectionStyle :405` (color branch `:409`, image branch `:413`, boxShadow `:420`,
  non-bleed return boxShadow `:446`), `toPageSectionBleedStyle :464`,
  `toPageBlockVisualStyle :714` (block gradient ALREADY wired `:738`, boxShadow `:746`).
- `pageResponsiveCss.ts` (the SECOND render boundary): `isSafeCssGradient :188` (single-layer
  alias), `renderRule :266-273` (RAW `` `${property}:${value} !important` ``, injected
  un-escaped via `dangerouslySetInnerHTML`), `shadowCssValues :196`, section background
  override `:367-396` (NO gradient branch — clears in the `else` `:392-395`), section
  responsive box-shadow `:401-403`, block gradient override `:528-534` (single-layer re-gate),
  block responsive box-shadow `:564-565`, `hasOverride :745-751`, `hasBlockOverride :702-709`,
  import block `:54-59`. Module is Bun-free / import-side-effect-free (Vitest lane).
- `pageEditorMutationActions.ts` (client optimistic write-guard): `sanitizePageEditorControlValue
  :72-80` (`const [group, key] = control.overridePath` `:76`), `sanitizeStyleValue :63-70`,
  `sanitizeAuthoringCssColor` already imported `:10`.
- `pageEditorControlRegistry.ts`: input union `:67-75` (`text|number|select|segmented|
  switch|color|swatch|media|…`), `control()` helper `:165`,
  `pageUniversalSectionControls :225`, `section.style.backgroundType` `:276`,
  `section.style.shadow` `:305`, `pageUniversalBlockControls :449`,
  `block.style.backgroundType` `:489`, `block.style.shadow` `:535`.
- Reference: `_docs/projekty-domow-wow-site` — `.cta-card` (radial 82%/10% over linear
  145deg), `.service-card`/`art-*` (radial glow over linear), hero `sun-ring`, colored
  glow shadows (`0 18px 45px rgba(142,232,255,.22)`, `0 0 28px aqua`).

## Land order (leaves, strictly sequential)

L01 (sanitizer relax) → L02 (glow model + section-gradient/glow render) → L03 (controls) →
L04 (tests).

## Security note

The one new attack surface is the RELAXED multi-layer background (531-01-L01): the
relaxation is an ALLOWLIST per top-level comma-split layer (each layer must be a safe
color or safe gradient), bracketed by a whole-value tripwire pre-pass and a layer-count
cap, failing CLOSED (reject the whole value to `null`) on any bad layer / over-cap /
tripwire. `glow.color` (531-01-L02) is whitelisted via `sanitizeAuthoringCssColor` and
composed into a fixed `box-shadow` template (never a raw string). See the parent Security
Contract §1-4.

## Regression / owned-breaking-test notes

- **No owned re-baseline of an existing assertion (verified on disk 2026-07-09).** An
  earlier version of this section claimed `tests/vitest/pages/page-authoring-sanitizers.test.ts`
  "currently asserts that a safe multi-layer comma value is REJECTED" and would be
  re-baselined by 531-01-L01. That claim is WRONG and is REMOVED — its own leaves
  (531-01-L01 and 531-01-L04) already correct it. That file's ONLY
  `sanitizeAuthoringCssBackground` assertions are
  `sanitizeAuthoringCssBackground("url(javascript:alert(1))")` → `null` (`:70`) and
  `sanitizeAuthoringCssBackground("linear-gradient(90deg,#000,</style>)")` → `null` (`:71`);
  BOTH stay rejected post-531 (charset / tripwire) and NEITHER is a safe-multi-layer
  rejection. There is NO existing safe-multi-layer rejection assertion to re-baseline.
- **Owned change is ADDITIVE only — `tests/vitest/pages/page-authoring-sanitizers.test.ts`.**
  531-01-L01 (via 531-01-L04) ADDS accept coverage (the NEW safe-multi-layer ACCEPT — the
  intended contract change) plus a security REJECT corpus (over-cap,
  `image-set(`/`element(`/`image(`/`cross-fade(`, non-color/non-gradient layer). No
  existing assertion in that file is weakened or re-baselined.
- **Real security regression gate — `tests/vitest/pages/page-document-v2.test.ts:2282-2304`
  (the TASK-523 outbound-beacon suite).** That is where the pre-531 url()-layer rejection
  contract actually lives; every case there is `url()`-bearing, so the whole-value tripwire
  + per-layer allowlist keep them REJECTED. 531-01-L04 CONFIRMS these stay green; it does
  NOT re-baseline them. 531-02 does NOT touch this file's contract (it owns only NEW test
  files + docs).
- All other suites (`page-renderer-v2.test.ts`, `page-composition-effects.test.ts`, model
  round-trip) gain ADDITIVE assertions only; no existing assertion is weakened.
