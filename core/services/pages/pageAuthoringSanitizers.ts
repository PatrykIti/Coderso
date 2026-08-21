import {
  dangerousHtmlContentTagSet,
  escapeHtml,
  parseHtmlAttributes,
  sanitizeHtmlWithPolicy,
} from "../posts/editor/postRichTextHtmlUtils";
import { parseCssColorValue } from "../theme/cssColorContract";

export type AuthoringUrlKind = "link" | "media";
export type AuthoringSafeHrefOptions = {
  allowRelative?: boolean;
  allowHash?: boolean;
  allowHttp?: boolean;
};

export const authoringColorTokenNames = [
  "primary",
  "secondary",
  "accent",
  "bg",
  "surface",
  "text",
  "border",
] as const;
export type AuthoringColorTokenName = (typeof authoringColorTokenNames)[number];

const gradientCharsetPattern = /^(?:linear|radial|conic)-gradient\([0-9a-z #%,.()/\s-]*\)$/i;
const colorTokenPattern = /^var\(--color-([a-z]+(?:-[a-z]+)*)\)$/;
const rejectedProtocolPattern = /^(?:javascript|data|vbscript):/i;
const specialLinkProtocols = new Set(["mailto:", "tel:"]);

const hasBalancedParens = (value: string): boolean => {
  let depth = 0;
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
};

/**
 * Ensure a candidate gradient value is a SINGLE gradient function call — i.e. one
 * gradient head followed by its balanced parentheses and nothing else. This is the
 * PER-LAYER single-gradient guard.
 *
 * NOTE (TASK-531): the top-level comma-separated multi-layer form
 * (`radial-gradient(...), linear-gradient(...)`) is NO LONGER forbidden wholesale.
 * `isSafeAuthoringCssBackgroundLayers` (below) accepts a safe multi-layer value by
 * splitting at top-level commas and allowlisting EACH layer through
 * `isSafeAuthoringCssColor`/`isSafeAuthoringCssGradient` (which still calls THIS
 * function per layer, so every layer is itself a single gradient), guarded by a
 * whole-value tripwire + layer cap. This function is unchanged and is still relied on
 * for the per-layer single-gradient guarantee — the malicious trailing-`url()` form
 * (`linear-gradient(...), url(//evil.com/beacon)`) still fails because a `url(...)`
 * layer is neither a safe color nor a safe gradient (and the whole-value tripwire
 * rejects it first).
 */
const isSingleGradientLayer = (value: string): boolean => {
  const openIndex = value.indexOf("(");
  if (openIndex < 0) return false;
  let depth = 0;
  for (let index = openIndex; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        // Nothing may follow the matching close paren of the single gradient call.
        return index === value.length - 1;
      }
    }
  }
  return false;
};

export const isAuthoringColorToken = (
  value: string
): value is `var(--color-${AuthoringColorTokenName})` => {
  const match = colorTokenPattern.exec(value.trim());
  return Boolean(match?.[1] && (authoringColorTokenNames as readonly string[]).includes(match[1]));
};

// ── TASK-541 color delegation ────────────────────────────────────────────────
// `parseCssColorValue(raw, "authoring")` is the SINGLE semantic color parser.
// Page applies ONLY the exact seven-token allowlist afterward and never pretrims,
// lowercases, regex-classifies, or recreates color syntax. Every accepted
// non-token authoring color uses TASK-541 canonical bytes; noncanonical spellings
// deliberately become canonical.
const parsePageAuthoringColor = (value: unknown): string | null => {
  const parsed = parseCssColorValue(value, "authoring");
  if (!parsed) return null;
  if (parsed.kind !== "token") return parsed.normalized;
  return isAuthoringColorToken(parsed.normalized) ? parsed.normalized : null;
};

export const isSafeAuthoringCssColor = (value: string): boolean =>
  parsePageAuthoringColor(value) !== null;

const urlFunctionPattern = /url\s*\(/i;

export const isSafeAuthoringCssGradient = (value: string): boolean =>
  gradientCharsetPattern.test(value) &&
  hasBalancedParens(value) &&
  !urlFunctionPattern.test(value) &&
  isSingleGradientLayer(value);

// ── TASK-539-02-L01 REGION (split background layers) ─────────────────────────
// ONE internal bounded analysis owns the background grammar and returns the
// structured paint plus the top-level layer count. The structured parser, the
// legacy boolean predicate, and the legacy string sanitizer each delegate to that
// single analysis; there is no second grammar, second walk, or per-wrapper regex.

// Top-level layer cap (the reference never exceeds 2-3; bounds pathological /
// ReDoS-adjacent input).
export const PAGE_BG_MAX_LAYERS = 6 as const;

// Whole-value tripwire pre-pass (fail-closed defence-in-depth, BEFORE the walk): any
// hostile CSS function / protocol / at-rule that could smuggle a network fetch or
// script execution. `url()` is already blocked per-layer by isSafeAuthoringCssGradient's
// urlFunctionPattern, but this tripwires the WHOLE value so nothing slips even if a
// future charset tweak widens a per-layer validator. The tripwire MUST live inside the
// exported analysis so every render boundary (SSR inline `toGradientBackground` and the
// RAW `<style>` per-device `pageResponsiveCss.ts` emit) inherits it; do NOT let a
// consumer re-implement or bypass it.
const multiLayerTripwire =
  /(?:url|image-set|image|element|cross-fade)\s*\(|@import|expression\s*\(|behavior\s*:|-moz-binding|(?:javascript|vbscript|data)\s*:/i;

export type AuthoringCssBackgroundPaint = {
  image: string | null;
  color: string | null;
};

type AuthoringCssBackgroundAnalysis = {
  paint: AuthoringCssBackgroundPaint;
  layerCount: number;
};

// Whole-value raw code-point guard (shared with the grid sanitizer). Rejects every
// C0/C1 control (U+0000..U+001F, U+007F..U+009F) and every Unicode/ECMAScript
// whitespace code point other than ASCII space U+0020, including BOM U+FEFF (explicit
// because it is not covered by Unicode `White_Space`), ANYWHERE in the raw value,
// before trim/split/regex/color delegation. ASCII space is the ONLY legal whitespace.
const unicodeWhitespaceCodePointPattern = /^\p{White_Space}$/u;

function hasForbiddenAuthoringCssRawCodePoint(raw: string): boolean {
  for (const char of raw) {
    const codePoint = char.codePointAt(0)!;
    const isControl = codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
    const isNonAsciiWhitespace =
      char !== " " && (unicodeWhitespaceCodePointPattern.test(char) || codePoint === 0xfeff);
    if (isControl || isNonAsciiWhitespace) return true;
  }
  return false;
}

function analyzeAuthoringCssBackgroundPaint(value: unknown): AuthoringCssBackgroundAnalysis | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > PAGE_CSS_VALUE_MAX_LENGTH) return null;
  if (hasForbiddenAuthoringCssRawCodePoint(value)) return null;
  if (multiLayerTripwire.test(value)) return null;

  // One paren-depth walk: balance check + top-level comma source offsets. A comma
  // inside a gradient's own paren group stays inside its layer; NEVER a naive
  // value.split(",") (which would shred gradient internals).
  const layerStarts: number[] = [0];
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth < 0) return null; // imbalance: unmatched close paren
    } else if (char === "," && depth === 0) {
      layerStarts.push(index + 1);
    }
  }
  if (depth !== 0) return null; // imbalance: unclosed parens
  if (layerStarts.length > PAGE_BG_MAX_LAYERS) return null;

  let imageStart: number | null = null;
  let imageEnd: number | null = null;
  let color: string | null = null;

  for (let layerIndex = 0; layerIndex < layerStarts.length; layerIndex += 1) {
    const layerStart = layerStarts[layerIndex]!;
    const layerEnd =
      layerIndex + 1 < layerStarts.length ? layerStarts[layerIndex + 1]! - 1 : value.length;
    const slice = value.slice(layerStart, layerEnd);

    // Separately located ASCII-space trimmed bounds of this original source slice.
    let trimStart = 0;
    let trimEnd = slice.length;
    while (trimStart < trimEnd && slice.charCodeAt(trimStart) === 0x20) trimStart += 1;
    while (trimEnd > trimStart && slice.charCodeAt(trimEnd - 1) === 0x20) trimEnd -= 1;
    if (trimStart >= trimEnd) return null; // empty layer
    const trimmedSlice = slice.slice(trimStart, trimEnd);

    if (isSafeAuthoringCssGradient(trimmedSlice)) {
      if (imageStart === null) imageStart = layerStart + trimStart;
      imageEnd = layerStart + trimEnd;
      continue;
    }

    // A color is legal only as the single FINAL layer; any earlier non-gradient
    // layer (color, url, or other function) rejects the whole value.
    if (layerIndex !== layerStarts.length - 1) return null;
    // Pass the UNTOUCHED slice (leading/trailing ASCII spaces included) so TASK-541's
    // 128-char raw cap, ASCII-space rule, and control/non-ASCII rejection stay
    // authoritative. `image` is never rebuilt with join(); only whole-value outer
    // ASCII spaces and the final color delimiter/slice are excluded.
    const parsedColor = parsePageAuthoringColor(slice);
    if (!parsedColor) return null;
    color = parsedColor;
  }

  const image = imageStart !== null && imageEnd !== null ? value.slice(imageStart, imageEnd) : null;
  return {
    paint: { image, color },
    layerCount: layerStarts.length,
  };
}

export const parseAuthoringCssBackgroundPaint = (
  value: unknown
): AuthoringCssBackgroundPaint | null => analyzeAuthoringCssBackgroundPaint(value)?.paint ?? null;

/**
 * Legacy multi-layer predicate: `true` only for a valid 2..PAGE_BG_MAX_LAYERS
 * stack. A valid single color or single gradient still parses and sanitizes but
 * is `false` here. Delegates to the same analysis; it does not compare or
 * reclassify paint members and does not own another grammar.
 */
export const isSafeAuthoringCssBackgroundLayers = (value: string): boolean => {
  const analysis = analyzeAuthoringCssBackgroundPaint(value);
  return analysis !== null && analysis.layerCount >= 2;
};
// ── END TASK-539-02-L01 REGION ───────────────────────────────────────────────

// Cheap length pre-guard (defence-in-depth against algorithmic-complexity / ReDoS): no
// legitimate authoring color or multi-layer background comes close to this. Rejecting
// oversized input BEFORE it reaches any regex guarantees no future charset/quantifier
// tweak can re-open a super-linear path on unbounded input. Single-layer colors are tiny
// (< ~64 chars); a 6-layer gradient stack still fits comfortably under this cap.
export const PAGE_CSS_VALUE_MAX_LENGTH = 512 as const;

export const sanitizeAuthoringCssColor = (value: unknown): string | null =>
  parsePageAuthoringColor(value);

export const sanitizeAuthoringCssBackground = (value: unknown): string | null => {
  const analysis = analyzeAuthoringCssBackgroundPaint(value);
  if (!analysis) return null;
  const { paint } = analysis;
  if (paint.image && paint.color) return `${paint.image}, ${paint.color}`;
  return paint.image ?? paint.color;
};

// ── TASK-532 typography length grammar (Bundle B — fluid font-size) ──────────
// A strict numeric-unit-clamp grammar for the ONLY new free-text CSS surface in
// Bundle B (`style.fontSizeCustom`). This is an ALLOWLIST (bare number + fixed
// unit, or a single clamp()/min()/max() of such lengths) — NEVER arbitrary CSS.
// Disjoint from bundle 531's gradient-helper region above; reuses
// `hasBalancedParens`.
const FONT_SIZE_MAX_LEN = 64; // hard length cap (defence-in-depth)
// A bare number + one allowlisted unit, e.g. 1.45rem, .78rem, 100%, 5vw, 12px.
const singleLengthPattern = /^-?(?:\d+\.?\d*|\.\d+)(?:rem|em|px|vw|vh|%|ch)$/i;
// One clamp()/min()/max() whose comma-separated args are each a singleLength.
const clampHeadPattern = /^(clamp|min|max)\((.*)\)$/i;

export const isSafeAuthoringCssLength = (value: string): boolean => {
  const v = value.trim();
  if (!v || v.length > FONT_SIZE_MAX_LEN) return false;
  // Reject every CSS-escape / injection construct up front (fail-closed):
  if (/[;{}<>\\]|\/\*|url\s*\(|expression\s*\(|:/.test(v)) return false;
  if (singleLengthPattern.test(v)) return true;
  const m = clampHeadPattern.exec(v);
  if (!m) return false;
  if (!hasBalancedParens(v)) return false; // REUSE the balanced-paren helper
  const args = m[2].split(",").map((a) => a.trim());
  // clamp needs exactly 3 args; min/max accept >=1 (all lengths, no nesting).
  if (m[1].toLowerCase() === "clamp" && args.length !== 3) return false;
  if (args.length < 1) return false;
  return args.every((a) => singleLengthPattern.test(a));
};

export const sanitizeAuthoringCssFontSize = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isSafeAuthoringCssLength(trimmed) ? trimmed : null; // present-only: null ⇒ omit
};
// ── end TASK-532 typography length grammar ──────────────────────────────────

export const sanitizeAuthoringUrl = (
  value: unknown,
  kind: AuthoringUrlKind = "link"
): string | null => {
  const safe = normalizeAuthoringSafeHref(value, {
    allowRelative: true,
    allowHash: kind === "link",
    allowHttp: true,
  });
  if (safe || kind !== "link" || typeof value !== "string") return safe ?? null;

  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    return specialLinkProtocols.has(parsed.protocol) ? trimmed : null;
  } catch {
    return null;
  }
};

export const sanitizeAuthoringLinkHref = (value: unknown): string | null =>
  sanitizeAuthoringUrl(value, "link");

export const sanitizeAuthoringMediaUrl = (value: unknown): string | null =>
  sanitizeAuthoringUrl(value, "media");

export function normalizeAuthoringSafeHref(
  value: unknown,
  options: AuthoringSafeHrefOptions = {}
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("//")) return undefined;
  if (rejectedProtocolPattern.test(trimmed)) return undefined;
  if (options.allowHash && trimmed.startsWith("#")) return trimmed;
  if (options.allowRelative && trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (!options.allowHttp) return undefined;
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

export type AuthoringGradientStop = {
  color: string;
  position: number;
};

export type AuthoringGradientModel = {
  kind: "linear" | "radial";
  angle: number;
  stops: readonly AuthoringGradientStop[];
};

const clampInteger = (value: unknown, min: number, max: number, fallback: number): number => {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
};

export const composeAuthoringGradientCss = (model: AuthoringGradientModel): string | null => {
  const kind = model.kind === "radial" ? "radial" : "linear";
  const stops = model.stops
    .map((stop) => {
      const color = sanitizeAuthoringCssColor(stop.color);
      return color
        ? {
            color,
            position: clampInteger(stop.position, 0, 100, 0),
          }
        : null;
    })
    .filter((stop): stop is { color: string; position: number } => Boolean(stop))
    .sort((left, right) => left.position - right.position);

  if (stops.length < 2) return null;
  const stopCss = stops.map((stop) => `${stop.color} ${stop.position}%`).join(", ");
  const css =
    kind === "linear"
      ? `linear-gradient(${clampInteger(model.angle, 0, 360, 180)}deg, ${stopCss})`
      : `radial-gradient(${stopCss})`;
  return isSafeAuthoringCssGradient(css) ? css : null;
};

const pageRichTextAllowedTags: ReadonlySet<string> = new Set([
  "a",
  "br",
  "code",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "strong",
  "ul",
]);

const pageRichTextSelfClosingTags: ReadonlySet<string> = new Set(["br"]);

const sanitizePageRichTextAttributes = (tagName: string, rawAttrs: string) => {
  if (tagName !== "a") return "";
  const attrs = parseHtmlAttributes(rawAttrs);
  const href = sanitizeAuthoringLinkHref(attrs.get("href"));
  if (!href) return null;
  return ` href="${escapeHtml(href)}" rel="nofollow noreferrer"`;
};

export const sanitizeAuthoringRichTextHtml = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return sanitizeHtmlWithPolicy(value, {
    allowedTags: pageRichTextAllowedTags,
    selfClosingTags: pageRichTextSelfClosingTags,
    dropContentTags: dangerousHtmlContentTagSet,
    sanitizeAttributes: sanitizePageRichTextAttributes,
  });
};

// ── TASK-533 REGION: restricted `grid-template-columns` sanitizer ─────────────
// STRICT ALLOWLIST (positive validation only) for the ONLY author-controlled
// STRING that reaches a CSS VALUE position (section `columnTemplate`, emitted as an
// inline `gridTemplateColumns`). Everything outside a tiny grid-track grammar is
// REJECTED (→ null ⇒ the model OMITS the field, present-only fail-soft). DISJOINT
// from the 531 gradient/multi-layer relaxation surface above (does NOT touch
// isSafeAuthoringCssGradient / isSingleGradientLayer / sanitizeAuthoringCssBackground).
const GRID_MAX_TRACKS = 12;
const GRID_MAX_REPEAT = 12; // repeat(N,…) count bound
// TASK-539-02-L01 zero-only unitful grammar. Only ALL-ZERO decimal spellings
// (`0`, `0.0`, `0.00…`, `.0`) may be unitless; every nonzero number requires one
// of `fr|px|%|rem|em`, INCLUDING inside minmax()/repeat(). Bare nonzero numbers,
// negatives, bare units, unsupported units, and nested functions reject
// everywhere. `.85fr` (leading-dot decimal) stays accepted (reference
// `.project-grid{…1.15fr .85fr}`). Units/function names remain lowercase as today.
const GRID_NUMBER_SOURCE = "(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)";
const GRID_ZERO_SOURCE = "(?:0+(?:\\.0+)?|\\.0+)";
const GRID_UNIT_SOURCE = "(?:fr|px|%|rem|em)";
const GRID_LEN_SOURCE = `(?:${GRID_ZERO_SOURCE}|${GRID_NUMBER_SOURCE}${GRID_UNIT_SOURCE}|auto)`;
const GRID_LEN = new RegExp(`^(?:${GRID_LEN_SOURCE})$`);
// GRID_TRACK recognises the outer shape only (`minmax(…)`/`repeat(…)` bodies are
// NOT validated by this regex alone — `[^()]+` admits arbitrary chars). The loop
// below re-validates every inner token against GRID_LEN (closed grammar).
const GRID_TRACK = new RegExp(
  `^(?:${GRID_LEN_SOURCE}|minmax\\([^()]+\\)|repeat\\(\\d{1,2},[^()]+\\))$`
);

// Split a comma-separated function body into trimmed non-empty tokens.
const gridInnerTokens = (body: string): string[] =>
  body
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

// Split a track LIST on TOP-LEVEL whitespace only — whitespace INSIDE a function's
// parens (`minmax(0, 1fr)`, `repeat(3, 1fr)`) does NOT separate tracks. Splitting the
// raw string on any `\s+` shredded the canonical spaced form (`minmax(0, 1fr)` →
// `minmax(0,`/`1fr)`), so a reference/devtools value with normal comma spacing was
// silently REJECTED. This paren-depth-aware tokenizer keeps each function call intact.
// The up-front metacharacter reject already forbids `\\<>@{};` and unbalanced parens are
// caught downstream by GRID_TRACK (a token with a stray `(` or `)` fails the shape test),
// so a well-formed depth counter here cannot admit an injection the grammar would miss.
const gridTopLevelTracks = (raw: string): string[] => {
  const tracks: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of raw) {
    if (char === "(") {
      depth += 1;
      current += char;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if (depth === 0 && /\s/.test(char)) {
      if (current.length > 0) {
        tracks.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current.length > 0) tracks.push(current);
  return tracks;
};

export const sanitizeAuthoringGridTemplate = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  // RAW code-point guard BEFORE `.trim()` / metacharacter regex / tokenizer
  // (TASK-539-02-L01): every C0/C1 control and every Unicode/ECMAScript
  // whitespace code point other than ASCII space, including U+FEFF, rejects even
  // at an outer edge or comma-adjacent position. `.trim()` must never erase a
  // leading/trailing forbidden character and `/\s/` must never reinterpret one as
  // an ordinary separator.
  if (hasForbiddenAuthoringCssRawCodePoint(value)) return null;
  const raw = value.trim();
  if (raw.length === 0 || raw.length > 200) return null;
  // Hard-reject any rule/injection metacharacter up front (defence in depth). The
  // trailing `:(?![^()]*\))` rejects a `:` that is NOT inside a function's parens.
  if (/[;{}\\<>@`]|\/\*|url\(|expression\(|:(?![^()]*\))/i.test(raw)) return null;
  // Split on TOP-LEVEL whitespace only, so `minmax(0, 1fr)` / `repeat(3, 1fr)` (the
  // canonical spaced reference/devtools form) stay ONE track instead of being shredded.
  const tracks = gridTopLevelTracks(raw);
  if (tracks.length === 0 || tracks.length > GRID_MAX_TRACKS) return null;
  // Re-validated tracks are re-emitted in a CANONICAL no-inner-space form so the output is
  // stable regardless of the author's spacing (`minmax(0, 1fr)` and `minmax(0,1fr)` both
  // → `minmax(0,1fr)`), while bare tracks (`1.15fr`, `.85fr`, `auto`, `0`) pass through
  // preserving their trimmed spelling.
  const normalized: string[] = [];
  for (const track of tracks) {
    if (!GRID_TRACK.test(track)) return null;
    // CLOSED grammar: re-validate the INNER tokens of minmax()/repeat() against
    // GRID_LEN (zero-only unitless or unitful — `[^()]+` in GRID_TRACK does NOT).
    const mm = /^minmax\((.+)\)$/.exec(track);
    if (mm) {
      const inner = gridInnerTokens(mm[1]!);
      // minmax(GRID_LEN, GRID_LEN) — exactly two tokens, each zero-or-unitful/auto.
      if (inner.length !== 2 || !inner.every((token) => GRID_LEN.test(token))) return null;
      normalized.push(`minmax(${inner.join(",")})`);
      continue;
    }
    const rp = /^repeat\((\d{1,2}),(.+)\)$/.exec(track);
    if (rp) {
      const count = Number(rp[1]);
      // finite int, bounded (reject repeat(99,…) — `\d{1,2}` alone allows up to 99).
      if (!Number.isInteger(count) || count < 1 || count > GRID_MAX_REPEAT) return null;
      const inner = gridInnerTokens(rp[2]!);
      // repeat(integer 1..12, GRID_LEN) — EXACTLY ONE inner track; multiple repeat
      // inner tracks (spaced or comma-separated) reject.
      if (inner.length !== 1 || !GRID_LEN.test(inner[0]!)) return null;
      normalized.push(`repeat(${count},${inner.join(",")})`);
      continue;
    }
    normalized.push(track);
  }
  return normalized.join(" ");
};
// ── END TASK-533 REGION ───────────────────────────────────────────────────────

/**
 * Escape a value for use inside a double-quoted CSS string such as
 * `url("...")`. Also escapes angle brackets so generated style elements can
 * never contain a literal closing tag sequence.
 */
export const escapeAuthoringCssString = (value: string): string => {
  let escaped = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (char === '"' || char === "\\") {
      escaped += `\\${char}`;
    } else if (code < 0x20 || code === 0x7f || char === "<" || char === ">") {
      escaped += `\\${code.toString(16)} `;
    } else {
      escaped += char;
    }
  }
  return escaped;
};
