import {
  dangerousHtmlContentTagSet,
  escapeHtml,
  parseHtmlAttributes,
  sanitizeHtmlWithPolicy,
} from "../posts/editor/postRichTextHtmlUtils";

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

const hexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const namedColorPattern = /^[a-z]+$/i;
// NOTE: the leading `\s*` after `(` is deliberately OMITTED — the trailing char class
// `[0-9a-z .,%/-]*` already matches leading spaces, and a `\s*` here overlaps that class
// producing catastrophic backtracking (ReDoS) on pathological input like
// `rgb(<20000 spaces>z`. Do NOT re-add it. Leading whitespace inside the parens is still
// accepted by the char class; the whole value is length-guarded before it reaches here.
const functionalColorPattern = /^(?:rgb|rgba|hsl|hsla)\([0-9a-z .,%/-]*\)$/i;
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

export const isSafeAuthoringCssColor = (value: string): boolean =>
  hexColorPattern.test(value) ||
  isAuthoringColorToken(value) ||
  namedColorPattern.test(value) ||
  functionalColorPattern.test(value);

const urlFunctionPattern = /url\s*\(/i;

export const isSafeAuthoringCssGradient = (value: string): boolean =>
  gradientCharsetPattern.test(value) &&
  hasBalancedParens(value) &&
  !urlFunctionPattern.test(value) &&
  isSingleGradientLayer(value);

// ── TASK-531 REGION (multi-layer background sanitizer relax) ──────────────────
// Accept a COMMA-SEPARATED list of safe gradient/color layers (glow-over-gradient,
// the reference `.cta-card`/`art-*` look) while STILL rejecting every hostile
// construct. This is the SECURITY-CRITICAL core of TASK-531 and the one new attack
// surface: the relaxation is an ALLOWLIST applied PER top-level comma-split layer —
// NOT a loosened regex, NOT a denylist — plus a whole-value tripwire pre-pass and a
// layer-count cap, failing CLOSED on any bad layer / over-cap / tripwire hit.

// Top-level layer cap (the reference never exceeds 2-3; bounds pathological /
// ReDoS-adjacent input).
export const PAGE_BG_MAX_LAYERS = 6 as const;

// Whole-value tripwire pre-pass (fail-closed defence-in-depth, BEFORE the split): any
// hostile CSS function / protocol / at-rule that could smuggle a network fetch or
// script execution. `url()` is already blocked per-layer by isSafeAuthoringCssGradient's
// urlFunctionPattern, but this tripwires the WHOLE value so nothing slips even if a
// future charset tweak widens a per-layer validator. This validator is EXPORTED and is
// re-used by BOTH render boundaries (the SSR inline `toGradientBackground` and the RAW
// `<style>` per-device `pageResponsiveCss.ts` emit), so the tripwire MUST live inside
// the exported fn — do NOT let a consumer re-implement or bypass it.
const multiLayerTripwire =
  /(?:url|image-set|image|element|cross-fade)\s*\(|@import|expression\s*\(|behavior\s*:|-moz-binding|(?:javascript|vbscript|data)\s*:/i;

// Split a background value at TOP-LEVEL commas only (paren-depth 0). A comma inside a
// gradient's own paren group (e.g. `radial-gradient(circle, a, b)`) stays with its
// layer. Mirrors the existing hasBalancedParens / isSingleGradientLayer paren walk —
// NEVER a naive value.split(",") (which would shred gradient internals).
const splitTopLevelBackgroundLayers = (value: string): string[] => {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (char === "," && depth === 0) {
      layers.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  layers.push(value.slice(start).trim());
  return layers;
};

/**
 * Accept a value as a SAFE multi-layer background: the whole value is tripwire-clean,
 * splits into 2..PAGE_BG_MAX_LAYERS top-level layers, and EVERY layer is a safe color
 * OR a safe (single) gradient. Fails CLOSED on any bad layer / over-cap / tripwire hit.
 *
 * EXPORTED — both render boundaries import it to relax their post-sanitizer re-check so
 * a multi-layer value actually PAINTS (531-01-L02): the SSR inline `toGradientBackground`
 * (React-escaped `CSSProperties`) and the RAW `<style>` per-device emit in
 * `pageResponsiveCss.ts` (dangerouslySetInnerHTML, un-escaped — the whole-value tripwire
 * is load-bearing there). Because both boundaries reuse THIS fn they inherit the same
 * allowlist + tripwire + cap for free; a value one boundary accepts is exactly what the
 * write boundary accepts.
 */
export const isSafeAuthoringCssBackgroundLayers = (value: string): boolean => {
  if (multiLayerTripwire.test(value)) return false; // fail-closed pre-pass
  const layers = splitTopLevelBackgroundLayers(value);
  if (layers.length < 2 || layers.length > PAGE_BG_MAX_LAYERS) return false;
  return layers.every(
    (layer) =>
      layer.length > 0 && (isSafeAuthoringCssColor(layer) || isSafeAuthoringCssGradient(layer))
  );
};
// ── END TASK-531 REGION ───────────────────────────────────────────────────────

// Cheap length pre-guard (defence-in-depth against algorithmic-complexity / ReDoS): no
// legitimate authoring color or multi-layer background comes close to this. Rejecting
// oversized input BEFORE it reaches any regex guarantees no future charset/quantifier
// tweak can re-open a super-linear path on unbounded input. Single-layer colors are tiny
// (< ~64 chars); a 6-layer gradient stack still fits comfortably under this cap.
export const PAGE_CSS_VALUE_MAX_LENGTH = 512 as const;

export const sanitizeAuthoringCssColor = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > PAGE_CSS_VALUE_MAX_LENGTH) return null;
  return isSafeAuthoringCssColor(trimmed) ? trimmed : null;
};

export const sanitizeAuthoringCssBackground = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > PAGE_CSS_VALUE_MAX_LENGTH) return null;
  // UNCHANGED single-layer fast path — a value with no top-level comma is byte-identical
  // to pre-531 behavior (no single-layer document changes).
  if (isSafeAuthoringCssColor(trimmed) || isSafeAuthoringCssGradient(trimmed)) return trimmed;
  // TASK-531: NEW multi-layer branch (glow-over-gradient). Entered ONLY when the
  // single-layer fast path fails; the allowlist + tripwire + cap fail closed.
  if (isSafeAuthoringCssBackgroundLayers(trimmed)) return trimmed;
  return null; // fail-closed
};

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
// Number sub-pattern accepts a leading-dot decimal (`.85fr`, `.9fr`) — the reference
// `.project-grid{grid-template-columns:1.15fr .85fr}` uses them. GRID_LEN re-validates
// the INNER tokens of minmax()/repeat(); the unit is OPTIONAL there so a BARE unitless
// numeric bound (canonically `0`, as in `.hero-grid{…minmax(0,1fr)…}`) is ACCEPTED. A
// bare finite number is a valid flexible/fixed minmax bound with no injection surface
// (the up-front metacharacter reject + bounded track/repeat counts stay intact).
const GRID_LEN = /^(?:(?:\d+(?:\.\d+)?|\.\d+)(?:fr|px|%|rem|em)?|auto)$/; // unit OPTIONAL (bare `0` ok)
// GRID_TRACK keeps the unit REQUIRED for a STANDALONE track (a bare unitless number is
// not a valid standalone grid track); the unitless allowance applies ONLY to the
// minmax/repeat inner re-validation via GRID_LEN. The minmax()/repeat() inner body is
// NOT validated by this regex alone (`[^()]+` admits arbitrary chars) — the loop below
// re-validates each inner token against GRID_LEN. The regex only recognises the shape.
const GRID_TRACK =
  /^(?:(?:\d+(?:\.\d+)?|\.\d+)(?:fr|px|%|rem|em)|auto|minmax\([^()]+\)|repeat\(\d{1,2},[^()]+\))$/;

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
  // → `minmax(0,1fr)`), while bare tracks (`1.15fr`, `.85fr`, `auto`) pass through as-is.
  const normalized: string[] = [];
  for (const track of tracks) {
    if (!GRID_TRACK.test(track)) return null;
    // CLOSED grammar: re-validate the INNER tokens of minmax()/repeat() against
    // GRID_LEN (bounded finite numbers only — `[^()]+` in GRID_TRACK does NOT).
    const mm = /^minmax\((.+)\)$/.exec(track);
    if (mm) {
      const inner = gridInnerTokens(mm[1]!);
      // minmax(min, max) — exactly two length/fr/auto tokens, each valid.
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
      if (inner.length === 0 || !inner.every((token) => GRID_LEN.test(token))) return null;
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
