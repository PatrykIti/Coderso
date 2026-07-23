# TASK-531-01-L01: Multi-Layer Background Sanitizer Relax (Security-Critical)

# FileName: TASK-531-01-L01-Multi-Layer-Background-Sanitizer-Relax.md

**Parent Task:** TASK-531
**Parent Subtask:** TASK-531-01
**Priority:** High
**Category:** Security / Site Render
**Estimated Effort:** Medium
**Status:** ✅ Done (2026-07-09)

---

## Scope

Executable leaf. Edits `core/services/pages/pageAuthoringSanitizers.ts` (531 OWNS this
file's multi-layer changes) so that `sanitizeAuthoringCssBackground` ACCEPTS a
COMMA-SEPARATED list of safe gradient/color layers (glow-over-gradient, the reference
`.cta-card`/`art-*` look) while STILL rejecting `url()` / `javascript:` / `vbscript:` /
`data:text/html` / `expression(` / `behavior:` / `-moz-binding` / `@import` /
`image-set(`/`image(`/`element(`/`cross-fade(` and any non-gradient/non-color layer.
This is the SECURITY-CRITICAL core of TASK-531 and the one new attack surface.

The relaxation is an ALLOWLIST applied PER top-level comma-split layer — NOT a loosened
regex, NOT a denylist. The single-layer fast path is unchanged (byte-identical), so no
existing single-layer document changes behavior.

## Grounded anchors (verified 2026-07-09)

- `isSingleGradientLayer :54` — currently returns `true` only when nothing follows the
  matching close-paren; its doc-comment (`:46-53`) states it deliberately blocks the
  top-level comma multi-layer form because a trailing `url()` layer would be fetched.
- `isSafeAuthoringCssColor :79`, `isSafeAuthoringCssGradient :87` (which already enforces
  `gradientCharsetPattern :29` + `hasBalancedParens :34` + `!urlFunctionPattern :85` +
  `isSingleGradientLayer`), `sanitizeAuthoringCssBackground :100`.
- `sanitizeAuthoringCssBackground` is consumed by the block gradient path
  (`toGradientBackground`, `pageRendererV2.tsx:345/347`) AND the section gradient path
  531-01-L02 adds. **CAUTION (render-side re-gate):** `toGradientBackground` (`:345-349`)
  is `const safe = sanitizeAuthoringCssBackground(value); return safe && isSafeAuthoringCssGradient(safe) ? safe : undefined;`
  — it RE-CHECKS the sanitizer output through `isSafeAuthoringCssGradient` (`:87`, which
  requires `isSingleGradientLayer`), so relaxing THIS file alone does NOT make multi-layer
  paint (the single-layer re-gate drops it on both block and section). This leaf therefore
  EXPORTS `isSafeAuthoringCssBackgroundLayers` so 531-01-L02 can relax the render helper's
  re-check to `isSafeAuthoringCssGradient(safe) || isSafeAuthoringCssBackgroundLayers(safe)`.
  Relaxing the sanitizer here + relaxing `toGradientBackground` in L02 together fix BOTH
  targets.
- **The exported `isSafeAuthoringCssBackgroundLayers` has TWO render consumers, not one
  (contract-audit 2026-07-09).** Besides `toGradientBackground` (the SSR inline-style path,
  React-escaped), 531-01-L02 ALSO imports it into `pageResponsiveCss.ts` — the SECOND render
  boundary, which emits per-device declarations RAW into a `<style>` string
  (`dangerouslySetInnerHTML`, NOT escaped) and re-gates gradients through its own single-layer
  alias `isSafeCssGradient` (`:188`). Because that boundary is UN-escaped, the whole-value
  tripwire baked into `isSafeAuthoringCssBackgroundLayers` (the `multiLayerTripwire` pre-pass)
  is load-bearing there — it MUST run BEFORE the per-layer allowlist so a hostile value can
  never reach the raw `<style>`. This is why the tripwire lives INSIDE the exported validator
  (not only in `sanitizeAuthoringCssBackground`): both render boundaries reuse the exported
  fn and inherit the tripwire for free. Keep the tripwire inside the exported validator; do
  NOT let a consumer re-implement or bypass it.

## Implementation pseudocode

```ts
// ── TASK-531 REGION (pageAuthoringSanitizers.ts) ──────────────────────────────
// Top-level layer cap (reference never exceeds 2-3; bounds pathological input).
export const PAGE_BG_MAX_LAYERS = 6 as const;

// Whole-value tripwire pre-pass (fail-closed defence-in-depth, BEFORE the split):
// any hostile CSS function / protocol / rule that could smuggle a fetch or exec.
// url() is already blocked per-layer by isSafeAuthoringCssGradient's urlFunctionPattern,
// but tripwire the WHOLE value so nothing slips even if a future charset tweak widens it.
const multiLayerTripwire =
  /(?:url|image-set|image|element|cross-fade)\s*\(|@import|expression\s*\(|behavior\s*:|-moz-binding|(?:javascript|vbscript|data)\s*:/i;

// Split a background value at TOP-LEVEL commas only (depth-0). A comma inside a
// gradient's own paren group (e.g. `radial-gradient(circle, a, b)`) stays with its
// layer. Mirrors the existing hasBalancedParens / isSingleGradientLayer paren walk —
// NEVER a naive value.split(",").
const splitTopLevelLayers = (value: string): string[] => {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i];
    if (c === "(") depth += 1;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (c === "," && depth === 0) {
      layers.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  layers.push(value.slice(start).trim());
  return layers;
};

// Accept a value as a SAFE multi-layer background: every top-level layer is a safe
// color OR a safe (single) gradient, count within cap, whole value tripwire-clean.
// EXPORTED — the render-side toGradientBackground (pageRendererV2.tsx:345) imports it to
// relax its post-sanitizer re-check so multi-layer values actually PAINT (see L02 render).
export const isSafeAuthoringCssBackgroundLayers = (value: string): boolean => {
  if (multiLayerTripwire.test(value)) return false;      // fail-closed pre-pass
  const layers = splitTopLevelLayers(value);
  if (layers.length < 2 || layers.length > PAGE_BG_MAX_LAYERS) return false;
  return layers.every(
    (layer) =>
      layer.length > 0 &&
      (isSafeAuthoringCssColor(layer) || isSafeAuthoringCssGradient(layer))
  );
};
// ── END TASK-531 REGION ───────────────────────────────────────────────────────

// sanitizeAuthoringCssBackground (:100) — ADD the multi-layer branch. The
// single-layer fast path (isSafeAuthoringCssColor || isSafeAuthoringCssGradient) is
// UNCHANGED and still runs first, so a value with no top-level comma is byte-identical
// to today. The multi-layer branch is entered ONLY for a >1-layer value:
export const sanitizeAuthoringCssBackground = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isSafeAuthoringCssColor(trimmed) || isSafeAuthoringCssGradient(trimmed)) return trimmed; // UNCHANGED fast path
  if (isSafeAuthoringCssBackgroundLayers(trimmed)) return trimmed;                              // NEW multi-layer
  return null;                                                                                  // fail-closed
};
```

**Design notes.** `isSingleGradientLayer` is NOT loosened — it remains the per-layer
single-gradient guard, now called PER comma-split layer via `isSafeAuthoringCssGradient`.
The relaxation is purely a NEW top-level branch that (a) tripwires the whole value, (b)
splits at depth-0 commas, (c) allowlists each layer with the existing validators, (d)
caps the count, (e) fails closed. `url()` fails because a `url(...)` layer is neither a
safe color nor a safe gradient (`urlFunctionPattern`), AND the whole-value tripwire
rejects it first. The doc-comment on `isSingleGradientLayer` must be UPDATED to note that
multi-layer is now handled by `isSafeAuthoringCssBackgroundLayers` per-layer, not
forbidden wholesale (the single-layer guarantee it provides per layer is still relied on).

## Regression-test shape (delegated to 531-01-L04, asserted here; corrected 2026-07-09)

**Owned-test-surface correction (verified on disk 2026-07-09).** The earlier claim that
`tests/vitest/pages/page-authoring-sanitizers.test.ts` "asserts a safe multi-layer comma
value is REJECTED" is WRONG — that file's only background assertions are
`sanitizeAuthoringCssBackground("url(javascript:alert(1))")` → `null` (`:70`) and
`sanitizeAuthoringCssBackground("linear-gradient(90deg,#000,</style>)")` → `null` (`:71`),
BOTH of which STAY rejected post-531 (charset / tripwire) and NEITHER is a safe-multi-layer
rejection. There is NO owned re-baseline of an existing assertion in that file.

**The REAL pre-531 multi-layer / url()-layer rejection contract lives in
`tests/vitest/pages/page-document-v2.test.ts:2282-2304`** (the "TASK-523 outbound-beacon"
suite + "url() NESTED in a gradient" case, e.g. `linear-gradient(red,blue), url(//evil.com/beacon.png)`).
Those assertions MUST STAY GREEN post-531 — every case there contains `url()`, so the
whole-value tripwire + per-layer allowlist still reject them (a `url(...)` layer is neither
a safe color nor a safe gradient). This leaf must confirm those stay green; it does NOT
re-baseline them (no safe multi-layer value is asserted-rejected anywhere on disk today).

**Net owned change = ADDITIVE coverage in `page-authoring-sanitizers.test.ts`** (new
safe-multi-layer ACCEPT assertions + the security REJECT corpus: over-cap,
`image-set(`/`element(`/`image(`/`cross-fade(`, non-color/non-gradient layer) — NOT a
re-baseline of assertions that do not exist there. Security rejections (`url()`,
`javascript:`, over-cap, tripwire constructs) MUST remain asserted (some in the doc-v2
beacon suite, the rest added here). Intended contract change is the ACCEPT of a safe
multi-layer value, added as new coverage; no existing security assertion is weakened.

Accept corpus (each returns the trimmed value unchanged):
- `radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)` (reference `.cta-card`).
- `linear-gradient(180deg,#eaf3ff,#dfe9ff), radial-gradient(circle,#8ee8ff,transparent 70%)`.
- Single-layer values still accepted byte-identically (`linear-gradient(90deg,#000,#fff)`,
  a hex color, `var(--color-primary)`, `rgba(0,0,0,.5)`) — the fast path is unchanged.

Reject corpus (each returns `null`):
- `linear-gradient(#fff,#000), url(//evil/beacon)` (trailing url layer — the original attack).
- `url(//evil/x)` alone; `linear-gradient(#fff,#000), image-set("//evil/x" 1x)`;
  `element(#foo), linear-gradient(#fff,#000)`.
- `javascript:alert(1), linear-gradient(#fff,#000)`; `linear-gradient(#fff,#000), data:text/html,<script>`.
- `@import url(evil); linear-gradient(#fff,#000)` (tripwire); `linear-gradient(#fff,#000), expression(alert(1))`
  (MULTI-LAYER `expression(` — the whole-value tripwire rejects it). **NOTE (verified on
  disk + live vitest 2026-07-09):** the SINGLE-LAYER form
  `linear-gradient(#fff,expression(alert(1)))` has NO top-level comma, so it NEVER enters
  the new multi-layer branch — it goes through the UNCHANGED single-layer fast path and is
  ACCEPTED-but-inert (the gradient charset permits letters+parens; `expression()` is inert
  inside an inline `background` value in modern browsers). That is PRE-EXISTING behavior
  and OUT OF 531 SCOPE — do NOT assert it as a 531 reject (it would fail). The multi-layer
  tripwire (the true new surface) DOES reject a top-level `expression(`/`data:`/`javascript:`
  layer.
- 7+ safe top-level layers (over `PAGE_BG_MAX_LAYERS` cap) → `null`.
- A layer that is neither color nor gradient (`12 34, linear-gradient(#fff,#000)` — the
  first layer `12 34` fails BOTH `isSafeAuthoringCssColor` and `isSafeAuthoringCssGradient`)
  → `null` (fail-closed, whole value rejected). **NOTE:** do NOT use `solid` as the bad
  layer — `isSafeAuthoringCssColor("solid")` is `true` because `namedColorPattern`
  (`/^[a-z]+$/i`) accepts any bare `[a-z]+` word (a pre-existing property of the color
  validator, not a stricter named-color allowlist); `solid, linear-gradient(#fff,#000)` is
  therefore ACCEPTED, not rejected (live-confirmed `solid`→`solid`).
- **Paren-integrity:** a comma INSIDE a gradient (`radial-gradient(circle, a, b)`) is NOT
  split into separate layers — the value is treated as ONE safe layer (accepted).
- **Idempotent:** `sanitizeAuthoringCssBackground(sanitizeAuthoringCssBackground(x)!)`
  equals the first result for every accept-corpus value.
- **Lane:** Vitest `tests/vitest/pages/page-authoring-sanitizers.test.ts` (model lane —
  pure string logic, no runtime).

## Hard Invariants

1. Relaxation is an ALLOWLIST per top-level comma-split layer, fail-closed on any bad
   layer / over-cap / whole-value tripwire; single-layer fast path unchanged.
2. `url()` / `javascript:` / `vbscript:` / `data:text/html` / `expression(` / `behavior:` /
   `-moz-binding` / `@import` / `image-set(`/`image(`/`element(`/`cross-fade(` never pass
   (tripwire pre-pass + per-layer allowlist).
3. Depth-0 split only — commas inside a gradient's paren group stay with their layer.
4. `PAGE_BG_MAX_LAYERS = 6` cap; `isSingleGradientLayer` NOT loosened (still per-layer).
5. This leaf ADDS safe-multi-layer ACCEPT + security-REJECT coverage to
   `page-authoring-sanitizers.test.ts` (additive — that file has NO existing safe-multi-layer
   rejection to re-baseline); it CONFIRMS the real pre-531 url()-layer rejection contract in
   `page-document-v2.test.ts:2282-2304` stays green (all `url()`-bearing ⇒ still rejected).
   Intended contract change = the new ACCEPT; no existing security assertion is weakened.
