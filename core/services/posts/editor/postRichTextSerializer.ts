import { sanitizePostRichTextHtml } from "./postRichTextSanitizer";
import { postRichTextAllowedTagSet } from "./postRichTextSchema";
import { escapeHtml, htmlToPlainText } from "./postRichTextHtmlUtils";

const postRichTextPlainTextBlockTags = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "li",
  "pre",
]);

const richTextAliasTagSet = new Set(["b", "i", "div"]);

const normalizeBrowserRichTextAliases = (value: string) =>
  value
    .replace(/<\s*b(\s|>)/gi, "<strong$1")
    .replace(/<\s*\/\s*b\s*>/gi, "</strong>")
    .replace(/<\s*i(\s|>)/gi, "<em$1")
    .replace(/<\s*\/\s*i\s*>/gi, "</em>")
    .replace(/<\s*strike(\s|>)/gi, "<s$1")
    .replace(/<\s*\/\s*strike\s*>/gi, "</s>")
    .replace(/<\s*div(\s|>)/gi, "<p$1")
    .replace(/<\s*\/\s*div\s*>/gi, "</p>");

const looksLikeHtml = (value: string) => {
  for (const match of value.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    const tag = match[1]?.toLowerCase();
    if (tag && (postRichTextAllowedTagSet.has(tag) || richTextAliasTagSet.has(tag))) {
      return true;
    }
  }
  return false;
};

const containsKnownHtmlEntity = (value: string) =>
  /&(nbsp|amp|lt|gt|quot|#39|#x?[0-9a-f]+);/i.test(value);

const normalizeNewlines = (value: string) => value.replace(/\r\n/g, "\n");

export const postRichTextFromPlainText = (value: string) =>
  escapeHtml(normalizeNewlines(value)).replace(/\n/g, "<br>");

export function serializePostRichText(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = normalizeNewlines(value).split("\0").join("");
  if (!normalized.trim()) return "";
  const htmlCandidate = looksLikeHtml(normalized)
    || containsKnownHtmlEntity(normalized)
    ? normalizeBrowserRichTextAliases(normalized)
    : postRichTextFromPlainText(normalized);
  return sanitizePostRichTextHtml(htmlCandidate);
}

export function deserializePostRichText(value: unknown): string {
  return serializePostRichText(value);
}

export function postRichTextToPlainText(value: unknown): string {
  const html = serializePostRichText(value);
  if (!html) return "";
  return htmlToPlainText(html, postRichTextPlainTextBlockTags);
}

export function countPostRichTextWords(value: unknown): number {
  const text = postRichTextToPlainText(value);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}
