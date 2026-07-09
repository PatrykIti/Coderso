# 1244 - TASK-531 Premium Backgrounds & Glow (Multi-Layer Background, Section Gradient, Colored Glow)

Date: 2026-07-09
Version: Unreleased
Tasks: TASK-531 (+ 531-01 / 531-02 subtasks + 531-01-L01…L04 leaves)

## Key Changes

Two premium-fidelity Page v2 surfaces on BOTH blocks AND sections — a **safe
multi-layer background** (glow-over-gradient, the reference `.cta-card`/`art-*`
look) and an **arbitrary colored glow box-shadow** — plus the missing SECTION
`backgroundType:"gradient"` render branch. All additions are **present-only /
jsonb-only**: NO npm dependency, NO DB migration/DDL, NO
`PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`), NO route/RBAC change. Every path a
page without the new fields touches normalizes AND renders **byte-identical** to
post-530 (the single-layer background fast path is unchanged; unset glow omits the
key). The relaxed multi-layer background is the one new attack surface and is
allowlist-hardened at write + BOTH render boundaries.

### SECURITY-CRITICAL — multi-layer background allowlist (`pageAuthoringSanitizers.ts`)

- `sanitizeAuthoringCssBackground` now ACCEPTS a comma-separated list of safe
  gradient/color layers via the new exported `isSafeAuthoringCssBackgroundLayers`.
  The relaxation is an **ALLOWLIST applied PER top-level comma-split layer** (NOT a
  loosened regex, NOT a denylist) — `isSingleGradientLayer` is UNCHANGED (still the
  per-layer single-gradient guard, now called per layer). It fails CLOSED:
  1. a **whole-value tripwire pre-pass** rejects any
     `url(`/`image-set(`/`image(`/`element(`/`cross-fade(`/`@import`/`expression(`/
     `behavior:`/`-moz-binding`/`javascript:`/`vbscript:`/`data:` anywhere in the value;
  2. the value is split at **depth-0 commas only** (a comma inside a gradient's own
     parens stays with its layer — never a naive `split(",")`);
  3. EVERY split layer must independently pass `isSafeAuthoringCssColor` OR
     `isSafeAuthoringCssGradient` (a `url()`/non-color-non-gradient layer fails);
  4. layer count is capped at `PAGE_BG_MAX_LAYERS` (6).
- **ReDoS / algorithmic-complexity hardening (defence-in-depth):** a new
  `PAGE_CSS_VALUE_MAX_LENGTH` (512) cap rejects oversized input BEFORE any regex runs
  in both `sanitizeAuthoringCssColor` and `sanitizeAuthoringCssBackground`; the
  `rgb()`/`hsl()` `functionalColorPattern` dropped a redundant leading `\s*` that
  overlapped the trailing char class (catastrophic-backtracking source on pathological
  whitespace input). Both are documented in-code as MUST-NOT-revert.
- The single-layer fast path is byte-identical, so no existing single-layer document
  changes behavior. The TASK-523 outbound-beacon rejection contract
  (`page-document-v2.test.ts` — every case contains `url()`) stays REJECTED and green.

### Colored glow box-shadow model (`pageDocumentV2.ts`) + shared compose (`pageGlow.ts`)

- New present-only `PageGlow = { color, blur?, spread?, x?, y? }` on BOTH
  `PageBlockStyleV2` and `PageSectionStyleV2`. `color` is REQUIRED and sanitized via
  `sanitizeAuthoringCssColor` at write (invalid/absent color OMITS the whole glow —
  present-only, fail-soft, never a partial glow). Numerics clamped:
  `PAGE_GLOW_BLUR_CLAMP` 0..120 (default 24 at render), `PAGE_GLOW_SPREAD_CLAMP`
  -40..80, `PAGE_GLOW_OFFSET_CLAMP` ±80 (x AND y). Reject-unknown nested key
  (`assertKnownKeys`), joins `pageBlockStyleKeys` + the section `assertKnownKeys`
  literal + ALL THREE `additionalProperties:false` style JSON schemas in lockstep
  (block, per-breakpoint `partialSectionStyleJsonSchema`, AND the inlined TOP-LEVEL
  section-style schema — required so a top-level `style.glow` round-trips against the
  compiled `pageDocumentV2JsonSchema`). Shared `normalizeGlow` used by both
  `normalizeBlockStyle` and `normalizeSectionStyle`.
- New Bun-free `pageGlow.ts` home for `composeGlowBoxShadow` / `mergeShadows` /
  `clampGlowNum` (imported by BOTH render boundaries so the compose logic is never
  duplicated). `composeGlowBoxShadow` RE-sanitizes the color + RE-clamps the numbers
  into a FIXED `"<x>px <y>px <blur>px <spread>px <color>"` template — NEVER a raw
  author string; a bad color composes to nothing. When the enum `shadow` token is also
  set, `mergeShadows` APPENDS the glow (`"<enum>, <glow>"`) so both render.

### Render — SSR inline path (`pageRendererV2.tsx`)

- `toGradientBackground` re-check relaxed to
  `isSafeAuthoringCssGradient(safe) || isSafeAuthoringCssBackgroundLayers(safe)` so a
  multi-layer value actually PAINTS (else the single-layer re-gate dropped it on block
  AND section). This single shared-helper relax reaches BOTH targets; the block
  gradient call site is UNCHANGED.
- NEW SECTION gradient branch: `section.style.backgroundType:"gradient"` paints via
  `background-image` on the content box (`toPageSectionStyle`) AND on the `100vw` bleed
  box for a full-bleed section (`toPageSectionBleedStyle`) — the block gradient was
  already wired; only the section path was missing.
- Block + section (+ bleed) `boxShadow` now `mergeShadows(<enum shadow>, composeGlow…)`.

### Render — per-device RAW `<style>` path (`pageResponsiveCss.ts`)

- The SECOND render boundary emits declarations UN-escaped via
  `dangerouslySetInnerHTML`, so the whole-value tripwire inside
  `isSafeAuthoringCssBackgroundLayers` is LOAD-BEARING here. `isSafeCssGradient` stays
  the single-layer alias; multi-layer routes through a NEW `isSafeCssBackgroundValue`
  (`isSafeCssGradient || isSafeAuthoringCssBackgroundLayers`) with a code-comment
  FORBIDDING a naive re-bind of `isSafeCssGradient` to the multi-layer validator
  without the tripwire pre-pass.
- NEW section per-device gradient override branch + relaxed block per-device gradient
  re-gate (both on `isSafeCssBackgroundValue`; a `url()`/`@import`/over-cap override
  emits NO rule + an `unsafe_background_value` diagnostic — identical to the write
  boundary). Section + block responsive box-shadow branches compose a per-device glow
  via the shared `mergeShadows`/`composeGlowBoxShadow`, firing on a `shadow` OR `glow`
  device override (a device-only glow with no enum shadow still emits); an EXPLICIT
  `shadow` override with no glow still resets to `box-shadow` byte-identically to
  pre-531 (the `"none"`-as-absent handling is deliberate).

### Controls (`pageEditorControlRegistry.ts`) + editor client guard (`pageEditorMutationActions.ts`)

- Appended 5 `section.style.glow.*` + 5 `block.style.glow.*` controls (color swatch +
  four numeric fields with `clamp`, `responsive:true`) reusing the existing
  `color`/`number` input kinds — NO new UI kind, NO `editorControls/*` change. The
  gradient background TYPE reuses the existing `backgroundType` `select`
  (`pageBackgroundTypes` already includes `"gradient"`) — no new control.
- `sanitizePageEditorControlValue` now routes the nested length-3 `style.glow.color`
  overridePath through `sanitizeAuthoringCssColor` (finding #4) — the `[group, key]`
  destructure otherwise left `key="glow"` and the glow color UNSANITIZED in optimistic
  client preview state (NOT a persistence/SSR hole — the write boundary + render
  compose already re-sanitize — but closed for defence-in-depth, mirroring sibling
  533-02's `border.*.color` handling).

## Tests (owned)

- `page-authoring-sanitizers.test.ts` — additive multi-layer ACCEPT corpus (reference
  `.cta-card` two-layer, color+gradient two-layer, single-layer byte-identity) +
  security REJECT corpus (trailing `url()` layer, `image-set(`/`element(`/`image(`/
  `cross-fade(`, `javascript:`/`data:text/html`, `@import`, multi-layer `expression(`,
  over-`PAGE_BG_MAX_LAYERS`, non-color/non-gradient layer), paren-integrity (comma
  inside a gradient not split), idempotence. The pre-existing `url(javascript:…)`→null
  / `…</style>`→null assertions stay green unchanged (not re-baselined).
- `page-document-v2.test.ts` — glow round-trip on block AND section, reject-unknown
  (`glow.wobble`), fail-soft (bad color omits, `blur:9999`→120, `spread:-999`→-40,
  offsets ±80, missing color omits), byte-identity; the TASK-523 outbound-beacon
  suite is CONFIRMED still green (not edited).
- `page-renderer-v2.test.tsx` — `composeGlowBoxShadow` exact string + `mergeShadows`
  enum+glow join; block/section (+ bleed) glow boxShadow; SECTION gradient
  `backgroundImage` single AND MULTI-LAYER (the reference two-layer value survives the
  relaxed `toGradientBackground` re-gate — the render-side gate for the fix); block
  multi-layer gradient paints; no-effect byte-identity.
- `page-responsive-css.test.ts` — per-device section (NEW branch) + block (relaxed
  re-gate) multi-layer gradient emit; per-device `url()`/`@import`/over-cap →
  `unsafe_background_value` diagnostic + no emit; mobile-only glow → `box-shadow` rule;
  shadow+glow merged two-shadow; `expression()` glow color → no rule; byte-identity.
- `page-editor-control-registry.test.ts` — 5 section + 5 block glow controls with
  correct `path`/`clamp`/`input`; `backgroundType` still lists `"gradient"`; the two
  frozen path Sets (`validSectionPaths`/`validBlockPaths`) gained the five
  `style.glow.*` entries each (owned breaking-test edit, landed with the control
  append); nested `style.glow.color` client-guard assertion (bad color dropped, safe
  color passed) via `sanitizePageEditorControlValue`.

## Docs

- `SECURITY_SPEC.md` — the multi-layer background allowlist (tripwire pre-pass →
  depth-0 split → per-layer allowlist → cap → length cap), the two render boundaries
  relaxing in lockstep on the SAME validator (the RAW `<style>` boundary's load-bearing
  tripwire), and the structured colored-glow spec (write sanitize + render re-sanitize
  into a fixed template + client mutation guard).
- `PAGE_MODEL.md` — block + section `glow?: PageGlow` fields; multi-layer background +
  the NEW section gradient branch; the three-schema lockstep note.
- `DESIGN_TOKENS.md` — glow clamps (`PAGE_GLOW_*_CLAMP`), multi-layer caps
  (`PAGE_BG_MAX_LAYERS`, `PAGE_CSS_VALUE_MAX_LENGTH`), the shared `composeGlowBoxShadow`
  render model.

## Gates — all green

- `bun --cwd core lint` — pass.
- `bun --cwd core lint:types` — pass.
- root `tsc -p tsconfig.json --noEmit` — pass (exit 0).
- `test:vitest` — changed pages files (`page-authoring-sanitizers`, `page-document-v2`,
  `page-editor-control-registry`, `page-renderer-v2`, `page-responsive-css`) 377/377;
  broad `tests/vitest/pages/` 635/635 (23 files).
- `test:bun` — <FILL: pass/skip/fail> (the DB-backed lanes; any residual fail = the
  known shared-remote-DB seed-count / 15s-timeout transient, green in isolation).
- `gates:coderso` — <FILL: N/5> (functional, ux, performance, security, reliability);
  the SECURITY gate is green (the one new attack surface — the relaxed multi-layer
  background — rejects `url()`/`javascript:`/`data:text/html`/`expression`/`@import`/
  over-cap at write AND both render boundaries; glow is a structured spec, no raw string
  reaches CSS).

## Open follow-ups (explicit, not dropped)

- **INFO (deferred to the orchestrator post-merge):** the live ≥5-scenario-per-area
  light+dark Playwright smoke (multi-layer background two-layer paint on section/card/
  full-bleed + per-device override; section vs block gradient parity; colored glow +
  shadow+glow stacking + mobile-only glow; security negatives = `url()` beacon no-fetch
  at every viewport) — the dev host serves the MAIN tree, so the runtime smoke runs
  after merge.
- **INFO:** the glow numeric controls are ALWAYS shown (the registry has no value-
  conditional `showWhen`), so `glow.blur/spread/x/y` are harmless no-ops until a
  `glow.color` is set (normalize omits the whole glow without a valid color).
