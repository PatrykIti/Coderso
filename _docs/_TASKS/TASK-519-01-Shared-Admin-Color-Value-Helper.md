# TASK-519-01: Shared Admin Color-Value Normalize/Parse Helper

# FileName: TASK-519-01-Shared-Admin-Color-Value-Helper.md

**Parent Task:** TASK-519
**Priority:** High
**Category:** Admin UI / Editor Controls (shared helper) / Security (CSS-value validation)
**Estimated Effort:** Medium
**Dependencies:** none — foundation. No route/RBAC/schema/migration change. Imported read-only by 519-02/03.
**Status:** ✅ Done

---

## Scope (single-writer keystone)

**Sole writer of `core/admin/ui/shared/colorValue.ts` (NEW).** Nothing renders it
until 519-02 (`ColorSwatchControl`) and 519-03 (`SharedColorControl`/`ClearableFields`)
import it. This module is the ONE place that knows how to (a) parse any accepted color
string into a `{ baseHex, alpha, format }` shape the alpha-slider UI needs, (b) compose
a `{ baseHex, alpha }` pair back into a canonical, whitelist-safe string, and (c)
mirror — read-only — the authoritative server/render accepted-set so the UI never emits
a value the boundary would drop.

**This subtask decomposes into executable leaves:**

| Leaf | Owns | Purpose |
|------|------|---------|
| 519-01-L01 | `core/admin/ui/shared/colorValue.ts` (NEW) | the helper module |
| 519-01-L02 | `tests/vitest/ui/color-value.test.ts` (NEW) | unit tests + whitelist-parity + round-trip |

**Land order within subtask:** L01 (module) → L02 (tests). L02 imports L01 by exact
export name.

## Reference — authoritative accepted-set (verified in live code)

The helper's EMITTED value MUST be a subset of BOTH boundaries **in canonical form**:
- `resolveClearableCssColorValue` (`core/widgets/core/clearableStyle.ts:66`;
  `cssHexColorPattern` :15 = `^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$`,
  `cssRgbColorPattern` :17-18 rgb[a] with alpha, `cssHslColorPattern` :19, token :16,
  keywords), and
- `normalizeMenuColorValue` (`core/services/menus/normalizeMenuAppearance.ts:182` →
  `MENU_APPEARANCE_COLOR_PATTERN` :152-165: 3/4/6/8-digit hex, rgb[a] incl. leading-dot
  `.06`, hsl[a], `var(--color-*)`, `transparent`).

**CRITICAL render-boundary asymmetry (verified):** the two boundaries do NOT accept the
same alpha syntax. `MENU_APPEARANCE_COLOR_PATTERN` accepts a **leading-dot** alpha
(`rgba(8,17,31,.84)`, `.06`) — the shell's own legacy defaults use it — but the RENDER
boundary's `cssRgbColorPattern` (:17-18) does NOT: its alpha group is
`(0(?:\.\d+)?|1(?:\.0+)?|\d{1,3}(?:\.\d+)?%)`, which REQUIRES a leading `0`. Verified:
`resolveClearableCssColorValue("rgba(8,17,31,.84)")` is **undefined**, while
`resolveClearableCssColorValue("rgba(8,17,31,0.84)")` is defined. So a leading-dot value
that PASSES the menu write boundary would be DROPPED at render.

**Resolution (canonicalize at the admin write — do NOT loosen the render boundary):** the
helper MAY parse/accept leading-dot alpha as INPUT (so it can read the owner's `.84`/`.06`
tokens), but its normalize/compose step MUST CANONICALIZE alpha to render-safe form on
EMIT — rewrite leading-dot `.84`→`0.84`, `.06`→`0.06` (rgba/rgba% and hsla alpha groups;
the hex `#rrggbbaa` path and integer/percent alphas are already canonical). The emitted
value therefore passes BOTH `resolveClearableCssColorValue` AND `normalizeMenuColorValue`.
The accepted (emitted) set is a subset of BOTH boundaries **in this canonical form**. The
helper adds NO new format.

## Security Contract (color-value validation IS the security surface)

**No route/RBAC/endpoint/schema/migration.** The security requirement is that this
helper's `compose`/normalize output is a strict subset of the authoritative whitelist
and NEVER constructs `url(`/`expression(`/`javascript:`/`data:`/`;{}<>`:

- `composeHexColor({baseHex, alpha})` emits ONLY `#rrggbb` (alpha === 1) or
  `#rrggbbaa` (alpha < 1), with hex digits `[0-9a-f]`; no other characters can appear.
- `alpha` is clamped to `[0,1]`; NaN/out-of-range → `1` (fully opaque). The 2-digit
  hex alpha suffix is `Math.round(alpha*255)` → `00`–`ff`.
- `parseColorValue` NEVER throws; unrecognized/unsafe input → `{ kind: "opaque-token"
  | "unrepresentable", raw }` (see shape) so the UI shows the raw text field, not a
  crash.
- A mandatory test asserts **whitelist parity on the CANONICAL emit**: for a fixture of
  every value the helper accepts as input (including the owner's leading-dot
  `rgba(8,17,31,.84)`), `resolveClearableCssColorValue(normalizeAdminColorValue(value))`
  is defined — proving the helper's EMITTED (canonicalized) value cannot be one the
  render boundary would reject/strip. Note the raw leading-dot input would itself FAIL
  `resolveClearableCssColorValue`, which is exactly why `normalizeAdminColorValue` must
  canonicalize `.84`→`0.84` before emit.

The server/render boundary (`resolveClearableCssColorValue` /
`normalizeMenuColorValue`) remains authoritative and is NOT modified — defence in depth.

## Pseudocode (519-01-L01 — `colorValue.ts`)

```ts
// core/admin/ui/shared/colorValue.ts — SOLE WRITER 519-01-L01.
// Pure, framework-free (no React import). Mirrors clearableStyle.ts patterns
// read-only; imports NOTHING from services (avoid admin→services deep coupling —
// re-declare the patterns here, and the L02 parity test proves they stay a subset).

// --- accepted-set patterns (read-only mirror of the authoritative boundary) ---
const HEX3468 = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGBA = /^rgba?\(\s*(\d{1,3}(?:\.\d+)?%?)\s*,\s*(\d{1,3}(?:\.\d+)?%?)\s*,\s*(\d{1,3}(?:\.\d+)?%?)(?:\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?|\.\d+|\d{1,3}(?:\.\d+)?%))?\s*\)$/i;
const HSLA = /^hsla?\(\s*\d{1,3}(?:\.\d+)?(?:deg)?\s*,\s*\d{1,3}(?:\.\d+)?%\s*,\s*\d{1,3}(?:\.\d+)?%(?:\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?|\.\d+|\d{1,3}(?:\.\d+)?%))?\s*\)$/i;
const TOKEN = /^var\(\s*--color-[a-zA-Z0-9_-]+\s*\)$/i;
const KEYWORD = new Set(["transparent", "currentcolor", "inherit"]);

export type ParsedColor =
  | { kind: "hex";     baseHex: string /* #rrggbb */; alpha: number /* 0..1 */; raw: string } // representable by picker+slider
  | { kind: "rgb";     baseHex: string;               alpha: number;            raw: string } // rgb[a] -> picker+slider representable
  | { kind: "keyword"; keyword: "transparent" | "currentColor" | "inherit";     raw: string }
  | { kind: "token";   raw: string /* var(--color-*) */ }         // show raw text, swatch = fallback
  | { kind: "unknown"; raw: string };                              // unrepresentable/blank -> raw text only

// clamp helper
const clampAlpha = (a: number): number => (Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 1);

// #rgb -> #rrggbb ; #rgba -> {#rrggbb, a} ; #rrggbb -> a=1 ; #rrggbbaa -> {#rrggbb, a}
function parseHex(raw: string): { baseHex: string; alpha: number } { /* expand shorthand, split alpha pair -> alpha/255 */ }

export function parseColorValue(value: string | null | undefined): ParsedColor {
  const raw = (value ?? "").trim();
  if (!raw) return { kind: "unknown", raw: "" };
  if (KEYWORD.has(raw.toLowerCase())) return { kind: "keyword", keyword: /* normalized */, raw };
  if (TOKEN.test(raw)) return { kind: "token", raw };
  if (HEX3468.test(raw)) { const { baseHex, alpha } = parseHex(raw); return { kind: "hex", baseHex, alpha, raw }; }
  const m = RGBA.exec(raw);
  if (m) { /* convert %/int channels -> baseHex (opaque), read alpha group (default 1, %→/100) */ return { kind: "rgb", baseHex, alpha: clampAlpha(alpha), raw }; }
  if (HSLA.test(raw)) return { kind: "token", raw };   // valid+safe but not picker-representable -> raw text, swatch fallback
  return { kind: "unknown", raw };
}

// Canonical, whitelist-safe emit. alpha===1 -> #rrggbb ; else #rrggbbaa.
export function composeHexColor(baseHex: string, alpha: number): string {
  const a = clampAlpha(alpha);
  const hex6 = /* ensure #rrggbb, lowercase; invalid -> "#000000" */;
  if (a >= 1) return hex6;
  const aa = Math.round(a * 255).toString(16).padStart(2, "0");
  return `${hex6}${aa}`;
}

// The alpha value a slider should show for a parsed color (1 for token/keyword/unknown).
export function colorAlpha(parsed: ParsedColor): number { /* hex/rgb -> parsed.alpha ; else 1 */ }

// The #rrggbb a native <input type=color> should show (fallback for non-representable).
export function pickerHexFor(parsed: ParsedColor, fallback = "#000000"): string { /* hex/rgb -> baseHex ; else fallback */ }

// True when picker+alpha-slider can faithfully round-trip (hex/rgb kinds).
export function isAlphaPickerRepresentable(value: string | null | undefined): boolean {
  const p = parseColorValue(value); return p.kind === "hex" || p.kind === "rgb";
}

// Canonicalize a leading-dot alpha to render-safe form: `.84` -> `0.84`, `.06` -> `0.06`.
// Only touches an alpha arg that begins with a bare dot inside rgba()/hsla(); everything
// else (hex, integer/percent alpha, `0.x`, keywords, tokens) is already canonical. This
// is REQUIRED because the render boundary's cssRgbColorPattern rejects `.84` (needs `0.`).
function canonicalizeAlpha(raw: string): string { /* rewrite `,\s*.\d+` alpha group -> `,0.\d+` for rgba/hsla */ }

// Read-only mirror validity check + CANONICAL emit (subset of BOTH boundaries).
export function normalizeAdminColorValue(value: string | null | undefined): string | undefined {
  const raw = (value ?? "").trim();
  if (!raw) return undefined;
  if (KEYWORD.has(raw.toLowerCase()) || TOKEN.test(raw) || HEX3468.test(raw)) return raw;
  if (RGBA.test(raw) || HSLA.test(raw)) return canonicalizeAlpha(raw);  // `.84` -> `0.84`
  return undefined;   // fail-soft: unknown/unsafe -> drop (never emitted upstream)
}
```

Error handling: pure functions, no throws; every unrecognized/unsafe input degrades to
a raw-text-only `{ kind: "unknown" }` or `undefined`. Alpha always clamped `[0,1]`.

## Test shape (519-01-L02 — `tests/vitest/ui/color-value.test.ts`, Vitest pure)

Lane: **Vitest pure** (per `_docs/TESTING_STRATEGY.md` — no DB, no `Bun.serve`, imports
`{ describe, expect, test } from "vitest"`). Assertions:

- **parse hex8:** `parseColorValue("#0812209e")` → `{ kind:"hex", baseHex:"#081220", alpha≈0.62 }` (`0x9e/255`).
- **parse shorthand + alpha:** `#abcd` → `baseHex:"#aabbcc"`, `alpha≈0.87` (`0xdd/255`).
- **parse rgba:** `rgba(8,17,31,.84)` → `{ kind:"rgb", baseHex:"#08111f", alpha:0.84 }`.
- **compose round-trip:** `composeHexColor("#081220", 0.62)` startsWith `"#081220"` and length 9; `composeHexColor("#081220", 1)` === `"#081220"` (opaque drops the suffix).
- **compose clamp:** `composeHexColor("#081220", 2)` → opaque (`#081220`); `composeHexColor("#081220", NaN)` → opaque; `composeHexColor("#081220", -1)` → `#08122000`.
- **HI-1 idempotence:** `composeHexColor(parseColorValue(v).baseHex, colorAlpha(parseColorValue(v)))` reproduces `v` (for hex kinds), proving no alpha loss.
- **keyword/token:** `parseColorValue("transparent").kind === "keyword"`; `var(--color-brand)` → `kind:"token"`; `hsla(210,60%,8%,.84)` → `kind:"token"` (safe, not picker-representable).
- **isAlphaPickerRepresentable:** true for `#0812209e`/`rgba(…,.84)`, false for `var(--color-x)`/`transparent`/`""`.
- **Security — whitelist parity on canonical emit (mandatory):** for every input `v`
  (incl. leading-dot `rgba(8,17,31,.84)`) where `normalizeAdminColorValue(v)` returns a
  string `out`, `resolveClearableCssColorValue(out)` (imported RELATIVELY from
  `../../../core/widgets/core/clearableStyle`) is defined → helper's canonical output ⊆
  render boundary. Explicitly assert the canonicalization: `normalizeAdminColorValue("rgba(8,17,31,.84)")
  === "rgba(8,17,31,0.84)"` and that `resolveClearableCssColorValue("rgba(8,17,31,.84)")`
  is UNDEFINED (the raw leading-dot fails render) while the canonical form is defined. And
  `normalizeAdminColorValue("url(x)")`, `("expression(1)")`, `("javascript:alert(1)")`,
  `("#fff;}<script>")` all → `undefined`.

## UI/UX + flexibility notes

The helper is deliberately UI-agnostic: it exposes exactly the primitives the two
alpha-capable controls need (`pickerHexFor` for the native `<input type=color>`,
`colorAlpha` for the slider position, `composeHexColor` for emit, `parseColorValue`
for classification, `isAlphaPickerRepresentable` to decide slider-vs-raw-text). No
Tailwind, no React — so both `ColorSwatchControl` (pages) and `SharedColorControl`
(widgets) can import it without cross-tree coupling.
