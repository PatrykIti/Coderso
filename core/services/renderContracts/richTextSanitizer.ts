import {
  dangerousHtmlContentTagSet,
  escapeHtml,
  parseHtmlAttributes,
  sanitizeHtmlWithPolicy,
  stripNullBytes,
  tokenizeHtml,
} from "../posts/editor/postRichTextHtmlUtils";

export type RichTextSanitizerDiagnosticCode =
  "tag_removed" | "attribute_removed" | "href_rewritten";

export type RichTextSanitizerDiagnostic = {
  code: RichTextSanitizerDiagnosticCode;
  tagName?: string;
  attributeName?: string;
};

export const richTextHtmlMaxLength = 24000;
export const richTextDiagnosticsMax = 8;

export const allowedTagSet = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h2",
  "h3",
  "h4",
  "hr",
  "span",
]);

export const selfClosingTagSet = new Set(["br", "hr"]);

const sanitizeAnchorHref = (value: string | undefined) => {
  if (typeof value !== "string") return "#";
  const trimmed = value.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return "#";
};

const parseAttributes = (rawAttrs: string) => parseHtmlAttributes(rawAttrs);

const sanitizeTagAttributes = (tagName: string, rawAttrs: string) => {
  if (tagName !== "a") return "";

  const attributes = parseAttributes(rawAttrs);
  const href = sanitizeAnchorHref(attributes.get("href"));
  const title = attributes.get("title");
  const target = attributes.get("target") === "_blank" ? "_blank" : undefined;

  let attrs = ` href="${escapeHtml(href)}"`;
  if (typeof title === "string" && title.trim().length > 0) {
    attrs += ` title="${escapeHtml(title.trim())}"`;
  }

  if (target === "_blank") {
    attrs += ' target="_blank" rel="noopener noreferrer"';
  }

  return attrs;
};

const collectRawAttributeNames = (rawAttrs: string) => {
  const names = new Set<string>();
  const regex = /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;

  for (const match of rawAttrs.matchAll(regex)) {
    const name = (match[1] ?? "").toLowerCase();
    if (name) names.add(name);
  }

  return [...names];
};

export const dedupeRichTextDiagnostics = (diagnostics: RichTextSanitizerDiagnostic[]) => {
  const unique: RichTextSanitizerDiagnostic[] = [];
  const seen = new Set<string>();

  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}:${diagnostic.tagName ?? ""}:${diagnostic.attributeName ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(diagnostic);
    if (unique.length >= richTextDiagnosticsMax) break;
  }

  return unique;
};

export function normalizeRichTextSanitizerDiagnostics(
  diagnostics: RichTextSanitizerDiagnostic[] | undefined
): RichTextSanitizerDiagnostic[] {
  if (!Array.isArray(diagnostics)) return [];
  return dedupeRichTextDiagnostics(
    diagnostics
      .filter((diagnostic): diagnostic is RichTextSanitizerDiagnostic => {
        if (typeof diagnostic !== "object" || diagnostic === null) return false;
        return (
          diagnostic.code === "tag_removed" ||
          diagnostic.code === "attribute_removed" ||
          diagnostic.code === "href_rewritten"
        );
      })
      .map((diagnostic) => ({
        code: diagnostic.code,
        tagName:
          typeof diagnostic.tagName === "string" && diagnostic.tagName.trim().length > 0
            ? diagnostic.tagName.trim().toLowerCase()
            : undefined,
        attributeName:
          typeof diagnostic.attributeName === "string" && diagnostic.attributeName.trim().length > 0
            ? diagnostic.attributeName.trim().toLowerCase()
            : undefined,
      }))
  );
}

export function sanitizeRichTextHtmlWithDiagnostics(rawHtml: string | undefined): {
  html: string;
  diagnostics: RichTextSanitizerDiagnostic[];
} {
  if (typeof rawHtml !== "string" || rawHtml.trim().length === 0) {
    return { html: "", diagnostics: [] };
  }

  const diagnostics: RichTextSanitizerDiagnostic[] = [];

  for (const token of tokenizeHtml(stripNullBytes(rawHtml.slice(0, richTextHtmlMaxLength)))) {
    if (token.kind !== "tag" || token.closing) continue;

    if (dangerousHtmlContentTagSet.has(token.name) || !allowedTagSet.has(token.name)) {
      diagnostics.push({ code: "tag_removed", tagName: token.name });
      continue;
    }

    const rawAttributeNames = collectRawAttributeNames(token.rawAttrs);
    if (rawAttributeNames.length === 0) continue;

    const originalAttributes = parseHtmlAttributes(token.rawAttrs);
    const sanitizedAttributes = parseHtmlAttributes(
      sanitizeTagAttributes(token.name, token.rawAttrs)
    );

    for (const attributeName of rawAttributeNames) {
      if (attributeName.startsWith("on")) {
        diagnostics.push({
          code: "attribute_removed",
          tagName: token.name,
          attributeName,
        });
        continue;
      }

      if (attributeName === "href") {
        const originalHref = originalAttributes.get("href");
        const sanitizedHref = sanitizedAttributes.get("href");
        if (originalHref && sanitizedHref && originalHref !== sanitizedHref) {
          diagnostics.push({ code: "href_rewritten", tagName: token.name, attributeName });
          continue;
        }
      }

      if (!sanitizedAttributes.has(attributeName)) {
        diagnostics.push({
          code: "attribute_removed",
          tagName: token.name,
          attributeName,
        });
      }
    }
  }

  return {
    html: sanitizeHtmlWithPolicy(rawHtml.slice(0, richTextHtmlMaxLength), {
      allowedTags: allowedTagSet,
      selfClosingTags: selfClosingTagSet,
      dropContentTags: dangerousHtmlContentTagSet,
      sanitizeAttributes: sanitizeTagAttributes,
    }),
    diagnostics: dedupeRichTextDiagnostics(diagnostics),
  };
}

export function sanitizeRichTextHtml(rawHtml: string | undefined): string {
  return sanitizeRichTextHtmlWithDiagnostics(rawHtml).html;
}
