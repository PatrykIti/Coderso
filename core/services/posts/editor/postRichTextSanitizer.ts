import {
  postRichTextAlignmentSet,
  postRichTextAllowedTagSet,
  postRichTextBlockTagSet,
  postRichTextSelfClosingTagSet,
} from "./postRichTextSchema";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const parseAttributes = (rawAttrs: string) => {
  const attributes = new Map<string, string>();
  const regex = /([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  for (const match of rawAttrs.matchAll(regex)) {
    const key = match[1]?.toLowerCase();
    if (!key) continue;
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    attributes.set(key, value);
  }

  return attributes;
};

const sanitizeAnchorHref = (value: string | undefined) => {
  if (typeof value !== "string") return "#";
  const trimmed = value.trim();
  if (!trimmed) return "#";
  if (/^(https?:|mailto:|tel:|\/|#|\?)/i.test(trimmed)) return trimmed;
  return "#";
};

const sanitizeAlignment = (value: string | undefined) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return postRichTextAlignmentSet.has(normalized) ? normalized : undefined;
};

const sanitizeTagAttributes = (tagName: string, rawAttrs: string) => {
  const attributes = parseAttributes(rawAttrs);
  const chunks: string[] = [];

  if (tagName === "a") {
    const href = sanitizeAnchorHref(attributes.get("href"));
    chunks.push(`href="${escapeHtml(href)}"`);

    const title = attributes.get("title");
    if (typeof title === "string" && title.trim().length > 0) {
      chunks.push(`title="${escapeHtml(title.trim().slice(0, 300))}"`);
    }

    const target = attributes.get("target")?.trim();
    if (target === "_blank") {
      chunks.push('target="_blank"');
      chunks.push('rel="noopener noreferrer nofollow"');
    }
  }

  if (postRichTextBlockTagSet.has(tagName)) {
    const align =
      sanitizeAlignment(attributes.get("data-align")) ??
      sanitizeAlignment(attributes.get("align"));
    if (align) {
      chunks.push(`data-align="${align}"`);
    }
  }

  return chunks.length > 0 ? ` ${chunks.join(" ")}` : "";
};

const removeForbiddenElements = (value: string) =>
  value
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      ""
    )
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)[^>]*\/?\s*>/gi,
      ""
    );

const officeArtifactPatterns = [
  /<\?xml[\s\S]*?\?>/gi,
  /<!--\[if[\s\S]*?<!\[endif\]-->/gi,
  /<\/?[a-z0-9]+:[a-z0-9-]+\b[^>]*>/gi,
  /<\/?o:p\b[^>]*>/gi,
  /\sxmlns(:[a-z0-9-]+)?="[^"]*"/gi,
  /\sxmlns(:[a-z0-9-]+)?='[^']*'/gi,
] as const;

export const stripPostOfficeHtmlArtifacts = (value: string) => {
  let html = value;
  let removed = false;

  for (const pattern of officeArtifactPatterns) {
    const next = html.replace(pattern, "");
    if (next !== html) {
      removed = true;
      html = next;
    }
  }

  return { html, removed };
};

export function sanitizePostRichTextHtml(rawHtml: string | undefined): string {
  if (typeof rawHtml !== "string") return "";
  if (!rawHtml.trim()) return "";

  let html = rawHtml.split("\0").join("").replace(/<!--[\s\S]*?-->/g, "");
  html = stripPostOfficeHtmlArtifacts(html).html;
  html = removeForbiddenElements(html);
  html = html.replace(/\son[a-z-]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");

  html = html.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (match, rawTag, rawAttrs) => {
    const tag = String(rawTag).toLowerCase();
    const isClosing = match.startsWith("</");

    if (!postRichTextAllowedTagSet.has(tag)) return "";
    if (isClosing) return `</${tag}>`;
    if (postRichTextSelfClosingTagSet.has(tag)) return `<${tag}>`;

    const attrs = sanitizeTagAttributes(tag, String(rawAttrs));
    return `<${tag}${attrs}>`;
  });

  return html.trim();
}
