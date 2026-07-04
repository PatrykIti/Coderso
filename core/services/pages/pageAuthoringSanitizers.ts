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
const functionalColorPattern = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9a-z .,%/-]*\)$/i;
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

export const isSafeAuthoringCssGradient = (value: string): boolean =>
  gradientCharsetPattern.test(value) && hasBalancedParens(value);

export const sanitizeAuthoringCssColor = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isSafeAuthoringCssColor(trimmed) ? trimmed : null;
};

export const sanitizeAuthoringCssBackground = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isSafeAuthoringCssColor(trimmed) || isSafeAuthoringCssGradient(trimmed)) return trimmed;
  return null;
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
