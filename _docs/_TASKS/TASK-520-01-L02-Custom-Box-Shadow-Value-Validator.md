# TASK-520-01-L02: Custom Box-Shadow Value Validator (Security-Critical CSS-Value Whitelist)

# FileName: TASK-520-01-L02-Custom-Box-Shadow-Value-Validator.md

**Parent Subtask:** TASK-520-01
**Priority:** High
**Category:** Services / Schema (JSON model) / Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Adds the **`normalizeMenuBoxShadowValue`** helper to
`core/services/menus/menuDocumentV2.ts` (sole owner 520-01; disjoint helper
region, sibling of `clampLocalNumber`/`normalizeEnumLocal` @792-797) and fills the
two `// L02 SEAM` branches L01 left in `normalizeMenuBarLayout` so
`shadowCustom`/`shadowCustomScrolled` are validated. Lands after L01. This is the
parent-mandated "color-value validation as security" extended to box-shadow
strings that reach a `<style>`/inline declaration on the PUBLIC render path.

## Why a bespoke validator (grounded)

`normalizeMenuColorValue` (exported `normalizeMenuAppearance.ts:182`; pattern
`:152-165`) validates a
single COLOR token — it cannot validate a full `box-shadow` (offsets + blur +
spread + color, possibly comma-layered). `MENU_SHADOW_CSS` (`menuDocumentCss.ts:86`)
is a fixed 3-entry map with no custom slot. A custom `box-shadow` is
attacker-influenceable free text that 520-02 emits into CSS, so it MUST pass a
bounded grammar whitelist at WRITE (and 520-02 re-emits only the validated string).

## Implementation pseudocode

```ts
// Sibling of clampLocalNumber (@792). Returns the SANITIZED string or null (fail-soft).
const BOX_SHADOW_MAX_LENGTH = 200;
const BOX_SHADOW_MAX_LAYERS = 4;
// One length token: optional sign, integer/decimal, required unit px|rem|em (0 allowed unitless).
const SHADOW_LENGTH = String.raw`-?(?:\d+(?:\.\d+)?(?:px|rem|em)|0)`;
// Hard-deny anything that could break out of the value context or fetch/execute:
const SHADOW_DENY = /url\(|expression\(|javascript:|image-set\(|var\(|calc\(|[;{}<>@\\]|\/\*/i;

// Bracket-aware tokenizer (EXECUTABLE — NOT the naive `rest.split(/\s+/)`): scan chars,
// track paren depth, and split on whitespace ONLY at depth 0 so a color function like
// `rgba(8, 17, 31, .84)` (internal spaces after commas) stays a SINGLE token. Colors
// that split into pieces under a naive whitespace split are exactly the bug this avoids.
function tokenizeShadowLayer(layer: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let depth = 0;
  for (const ch of layer) {
    if (ch === "(") { depth += 1; cur += ch; continue; }
    if (ch === ")") { depth = Math.max(0, depth - 1); cur += ch; continue; }
    if (depth === 0 && /\s/.test(ch)) { if (cur) { tokens.push(cur); cur = ""; } continue; }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
}

export function normalizeMenuBoxShadowValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (raw.length === 0 || raw.length > BOX_SHADOW_MAX_LENGTH) return null;
  if (SHADOW_DENY.test(raw)) return null;                       // security gate 1

  const layers = raw.split(","); // NOTE: naive comma split would break rgba(…) layers — see below.
  // Re-join comma runs that fall INSIDE a color function's parens (a comma at paren-depth
  // > 0 belongs to the color, not a shadow-layer separator):
  const mergedLayers: string[] = [];
  let depth = 0;
  for (const piece of layers) {
    if (depth > 0) mergedLayers[mergedLayers.length - 1] += "," + piece;
    else mergedLayers.push(piece);
    for (const ch of piece) { if (ch === "(") depth += 1; else if (ch === ")") depth = Math.max(0, depth - 1); }
  }
  if (mergedLayers.length > BOX_SHADOW_MAX_LAYERS) return null;
  const cleaned: string[] = [];
  for (const layerRaw of mergedLayers) {
    const layer = layerRaw.trim();
    if (layer.length === 0) return null;
    let rest = layer;
    let inset = "";
    if (/^inset\b/i.test(rest)) { inset = "inset "; rest = rest.replace(/^inset\b\s*/i, ""); }
    // Bracket-aware split; a box-shadow layer = 2..4 lengths + exactly ONE color.
    const tokens = tokenizeShadowLayer(rest).filter(Boolean);
    const lengths: string[] = [];
    let color: string | null = null;
    for (const tok of tokens) {
      if (new RegExp(`^${SHADOW_LENGTH}$`, "i").test(tok)) { lengths.push(tok); continue; }
      if (color !== null) return null;                          // second non-length ⇒ reject
      color = normalizeMenuColorValue(tok);                     // security gate 2 (reuses color whitelist)
      if (color === null) return null;                          // unknown token / bad color ⇒ reject
    }
    if (lengths.length < 2 || lengths.length > 4) return null;  // need offset-x/y (+ optional blur/spread)
    if (color === null) return null;                            // a visible shadow needs a color
    // `color` is normalizeMenuColorValue's output — the leading-dot alpha form (`.24`) is
    // PRESERVED verbatim. This DIFFERS from TASK-519 on purpose: 519 canonicalizes
    // `.84`→`0.84` because its render boundary regex (`resolveClearableCssColorValue`)
    // REJECTS leading-dot alpha; 520's box-shadow does NOT need that canonicalization
    // because 520-02 emits it as raw CSS in a `<style>` block (which browsers accept
    // with leading-dot) and it never passes through `resolveClearableCssColorValue`.
    cleaned.push(`${inset}${lengths.join(" ")} ${color}`.trim());
  }
  return cleaned.join(", ");                                    // canonicalized, validated
}
```

Then fill the L01 seam:

```ts
if (v.shadowCustom != null) {
  const sh = normalizeMenuBoxShadowValue(v.shadowCustom); if (sh !== null) out.shadowCustom = sh;
}
if (v.shadowCustomScrolled != null) {
  const sh = normalizeMenuBoxShadowValue(v.shadowCustomScrolled); if (sh !== null) out.shadowCustomScrolled = sh;
}
```

**DECISION for the contract (settled — the tokenizer above is executable):** the
custom-shadow color accepts the SAME whitelist as the other menu color fields —
hex / hex8 / `rgb[a]()` / `hsl[a]()` / `var(--color-*)` / `transparent` — validated
by the shared `normalizeMenuColorValue`. It is NOT restricted to "hex only". A color
function can contain internal spaces (`rgba(8, 17, 31, .84)`), so tokenizing MUST be
bracket-aware, not `rest.split(/\s+/)`:
- `tokenizeShadowLayer` (above) scans characters, tracks paren depth, and splits on
  whitespace ONLY at depth 0, so `rgba(8, 17, 31, .84)` stays a single token.
- The top-level comma split is likewise re-merged for commas that fall inside a
  color function's parens (a comma at depth > 0 belongs to the color, not a layer
  boundary) — otherwise `rgba(0,0,0,.24)` would be miscounted as extra layers.
- `var(`/`calc(`/`url(`/`expression(` stay denied by `SHADOW_DENY` (gate 1), so the
  only bracketed functions that survive are the whitelisted `rgb[a]()`/`hsl[a]()`
  color forms, which `normalizeMenuColorValue` (gate 2) then re-validates.

The owner acceptance token **`0 18px 50px rgba(0,0,0,.24)`** is therefore accepted as
`0 18px 50px` (three lengths) + one `rgba(0,0,0,.24)` color token, and the leading-dot
alpha (`.24`) is preserved verbatim in the canonical output. This is intentionally
UNLIKE TASK-519: 519 canonicalizes leading-dot alpha (`.84`→`0.84` via
`normalizeAdminColorValue`) because its render boundary `resolveClearableCssColorValue`
rejects the leading-dot form; 520's custom box-shadow needs no such rewrite because
520-02 emits it as raw CSS inside a `<style>` block — a context where the browser's
CSS parser accepts leading-dot alpha directly — and it never traverses
`resolveClearableCssColorValue`.

## Regression-test shape (Vitest, Bun-free)

`tests/vitest/services/menu-document-v2.test.ts` — dedicated `normalizeMenuBoxShadowValue`
unit table:
- **Accept:** `"0 18px 50px rgba(0,0,0,.24)"` (owner token) → returns the
  canonicalized string; `"0 8px 24px #0000003d"`; `"inset 0 1px 2px #00000022"`;
  `"0 2px 4px #000, 0 8px 16px #0003"` (2 layers).
- **Reject (→ null):** `"0 0 10px red;} body{display:none}"`, `"0 0 5px url(x)"`,
  `"0 0 5px expression(alert(1))"`, `"0 0 5px var(--x)"`, `"0 0 5px calc(1px)"`,
  `"<script>"`, a 5-layer value, a >200-char value, `"10px"` (missing color),
  `"foo bar baz #fff"` (non-length token).
- **Round-trip through `normalizeMenuDocumentV2`:** a `layout.shadowCustom` with a
  valid value persists; an invalid value is omitted (fail-soft), sibling keys
  survive; the doc round-trips.

## Hard Invariants

- Fail-soft (returns null → key omitted); never throws.
- Deny-list gate (`url(`/`expression(`/`javascript:`/`{`/`}`/`;`/`<`/`>`/`@`/
  `\`/`/*`/`var(`/`calc(`) applied BEFORE parsing; length cap ≤200; layer cap ≤4.
- Reuses `normalizeMenuColorValue` for the color token (single color policy).
- No new file; helper lives in `menuDocumentV2.ts` (520-01 sole writer).
