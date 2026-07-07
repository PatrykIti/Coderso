// core/admin/ui/shared/colorValue.ts — SOLE WRITER TASK-519-01-L01.
//
// Shared admin color-value normalize/parse helper. Pure and framework-free (no
// React, no imports from `core/services`): it re-declares the accepted-set
// patterns as a READ-ONLY MIRROR of the authoritative server/render boundary so
// the authoring UI never emits a value the boundary would drop. The parity is
// PROVEN by the L02 test, which asserts every value the helper EMITS (via
// `normalizeAdminColorValue`) is accepted by `resolveClearableCssColorValue`.
//
// Boundary sources mirrored here (do NOT loosen either):
//   - render:  core/widgets/core/clearableStyle.ts     (resolveClearableCssColorValue)
//   - write:   core/services/menus/normalizeMenuAppearance.ts (normalizeMenuColorValue)
//
// CRITICAL asymmetry (verified): the render boundary's rgb/hsl alpha group
// REQUIRES a leading `0` (`0.84`), while the menu write boundary ALSO accepts a
// bare leading-dot (`.84`). The owner's legacy tokens use `.84`. To keep BOTH
// boundaries happy, this helper ACCEPTS a leading-dot alpha as input but
// CANONICALIZES it (`.84` -> `0.84`) on emit. That is the ONLY normalization —
// hex round-trips byte-identically.

// --- accepted-set patterns (read-only mirror of the authoritative boundary) ---
const HEX3468 = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGBA =
  /^rgba?\(\s*(\d{1,3}(?:\.\d+)?%?)\s*,\s*(\d{1,3}(?:\.\d+)?%?)\s*,\s*(\d{1,3}(?:\.\d+)?%?)(?:\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?|\.\d+|\d{1,3}(?:\.\d+)?%))?\s*\)$/i;
const HSLA =
  /^hsla?\(\s*\d{1,3}(?:\.\d+)?(?:deg)?\s*,\s*\d{1,3}(?:\.\d+)?%\s*,\s*\d{1,3}(?:\.\d+)?%(?:\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?|\.\d+|\d{1,3}(?:\.\d+)?%))?\s*\)$/i;
const TOKEN = /^var\(\s*--color-[a-zA-Z0-9_-]+\s*\)$/i;

const KEYWORDS = new Map<string, "transparent" | "currentColor" | "inherit">([
  ["transparent", "transparent"],
  ["currentcolor", "currentColor"],
  ["inherit", "inherit"],
]);

export type ParsedColor =
  | { kind: "hex"; baseHex: string; alpha: number; raw: string }
  | { kind: "rgb"; baseHex: string; alpha: number; raw: string }
  | { kind: "keyword"; keyword: "transparent" | "currentColor" | "inherit"; raw: string }
  | { kind: "token"; raw: string }
  | { kind: "unknown"; raw: string };

const clampAlpha = (a: number): number => (Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 1);

const clampByte = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.min(255, Math.max(0, Math.round(n)));
};

const byteToHex = (n: number): string => clampByte(n).toString(16).padStart(2, "0");

// Normalize a `#rrggbb`-ish input to a lowercase `#rrggbb`; invalid -> `#000000`.
const toBaseHex6 = (baseHex: string): string => {
  const body = baseHex.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{6}$/.test(body)) return `#${body}`;
  if (/^[0-9a-f]{3}$/.test(body)) {
    return `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`;
  }
  return "#000000";
};

// #rgb -> #rrggbb ; #rgba -> {#rrggbb, a} ; #rrggbb -> a=1 ; #rrggbbaa -> {#rrggbb, a}
function parseHex(raw: string): { baseHex: string; alpha: number } {
  const body = raw.replace(/^#/, "").toLowerCase();
  if (body.length === 3) {
    return { baseHex: `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`, alpha: 1 };
  }
  if (body.length === 4) {
    const baseHex = `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`;
    const alpha = Number.parseInt(`${body[3]}${body[3]}`, 16) / 255;
    return { baseHex, alpha: clampAlpha(alpha) };
  }
  if (body.length === 6) {
    return { baseHex: `#${body}`, alpha: 1 };
  }
  // length 8
  const baseHex = `#${body.slice(0, 6)}`;
  const alpha = Number.parseInt(body.slice(6, 8), 16) / 255;
  return { baseHex, alpha: clampAlpha(alpha) };
}

// Convert one `rgb()` channel token (`\d{1,3}` int or `%`) to a byte 0..255.
const channelToByte = (token: string): number => {
  const numeric = Number.parseFloat(token);
  if (token.trim().endsWith("%")) return clampByte((numeric / 100) * 255);
  return clampByte(numeric);
};

// Read an rgb/hsl alpha group token (int/decimal/`.dot`/percent) to 0..1.
const alphaTokenToNumber = (token: string | undefined): number => {
  if (token === undefined) return 1;
  const numeric = Number.parseFloat(token);
  return clampAlpha(token.trim().endsWith("%") ? numeric / 100 : numeric);
};

export function parseColorValue(value: string | null | undefined): ParsedColor {
  const raw = (value ?? "").trim();
  if (!raw) return { kind: "unknown", raw: "" };

  const keyword = KEYWORDS.get(raw.toLowerCase());
  if (keyword) return { kind: "keyword", keyword, raw };

  if (TOKEN.test(raw)) return { kind: "token", raw };

  if (HEX3468.test(raw)) {
    const { baseHex, alpha } = parseHex(raw);
    return { kind: "hex", baseHex, alpha, raw };
  }

  const rgb = RGBA.exec(raw);
  if (rgb) {
    const baseHex = `#${byteToHex(channelToByte(rgb[1]!))}${byteToHex(channelToByte(rgb[2]!))}${byteToHex(channelToByte(rgb[3]!))}`;
    return { kind: "rgb", baseHex, alpha: alphaTokenToNumber(rgb[4]), raw };
  }

  // Valid + safe but not faithfully picker-representable -> raw text, swatch fallback.
  if (HSLA.test(raw)) return { kind: "token", raw };

  return { kind: "unknown", raw };
}

// Canonical, whitelist-safe emit. alpha === 1 -> #rrggbb ; else #rrggbbaa.
export function composeHexColor(baseHex: string, alpha: number): string {
  const hex6 = toBaseHex6(baseHex);
  const a = clampAlpha(alpha);
  if (a >= 1) return hex6;
  return `${hex6}${byteToHex(a * 255)}`;
}

// The alpha value a slider should show for a parsed color (1 for token/keyword/unknown).
export function colorAlpha(parsed: ParsedColor): number {
  return parsed.kind === "hex" || parsed.kind === "rgb" ? parsed.alpha : 1;
}

// The #rrggbb a native <input type=color> should show (fallback for non-representable).
export function pickerHexFor(parsed: ParsedColor, fallback = "#000000"): string {
  return parsed.kind === "hex" || parsed.kind === "rgb" ? parsed.baseHex : fallback;
}

// True when picker + alpha-slider can faithfully round-trip (hex/rgb kinds).
export function isAlphaPickerRepresentable(value: string | null | undefined): boolean {
  const parsed = parseColorValue(value);
  return parsed.kind === "hex" || parsed.kind === "rgb";
}

// Canonicalize a leading-dot alpha to render-safe form: `.84` -> `0.84`, `.06` -> `0.06`.
// Only the alpha group of an rgb/hsl functional color can carry a bare leading dot
// (channel/hue tokens all require a leading digit), so the first `,` + `.digits`
// occurrence is unambiguously the alpha. REQUIRED because the render boundary's
// rgb/hsl alpha group rejects `.84` (needs a leading `0`).
function canonicalizeAlpha(raw: string): string {
  return raw.replace(/,(\s*)\.(\d+)/, ",$10.$2");
}

// Read-only mirror validity check + CANONICAL emit (subset of BOTH boundaries).
// Any string this returns is accepted by BOTH resolveClearableCssColorValue and
// normalizeMenuColorValue; unknown/unsafe input fails soft to `undefined`.
export function normalizeAdminColorValue(value: string | null | undefined): string | undefined {
  const raw = (value ?? "").trim();
  if (!raw) return undefined;
  if (KEYWORDS.has(raw.toLowerCase()) || TOKEN.test(raw) || HEX3468.test(raw)) return raw;
  if (RGBA.test(raw) || HSLA.test(raw)) return canonicalizeAlpha(raw);
  return undefined;
}
