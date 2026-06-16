import { normalizeWidgetSafeHref } from "../../widgets/core/widgetSafeHref";
import {
  dangerousHtmlContentTagSet,
  escapeHtml,
  parseHtmlAttributes,
  sanitizeHtmlWithPolicy,
} from "../posts/editor/postRichTextHtmlUtils";

export type AuthoringUrlKind = "link" | "media";

const hexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const namedColorPattern = /^[a-z]+$/i;
const functionalColorPattern = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9a-z .,%/-]*\)$/i;
const gradientCharsetPattern = /^(?:linear|radial|conic)-gradient\([0-9a-z #%,.()/\s-]*\)$/i;
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

export const isSafeAuthoringCssColor = (value: string): boolean =>
  hexColorPattern.test(value) ||
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
  const safe = normalizeWidgetSafeHref(value, {
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
