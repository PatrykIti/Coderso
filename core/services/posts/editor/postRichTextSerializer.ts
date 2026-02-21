import { sanitizePostRichTextHtml } from "./postRichTextSanitizer";
import { postRichTextAllowedTagSet } from "./postRichTextSchema";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const stripHtmlTags = (value: string) => value.replace(/<[^>]+>/g, " ");

const looksLikeHtml = (value: string) => {
  for (const match of value.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
    const tag = match[1]?.toLowerCase();
    if (tag && postRichTextAllowedTagSet.has(tag)) {
      return true;
    }
  }
  return false;
};

const normalizeNewlines = (value: string) => value.replace(/\r\n/g, "\n");

export const postRichTextFromPlainText = (value: string) =>
  escapeHtml(normalizeNewlines(value)).replace(/\n/g, "<br>");

export function serializePostRichText(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = normalizeNewlines(value).split("\0").join("");
  if (!normalized.trim()) return "";
  const candidate = looksLikeHtml(normalized)
    ? normalized
    : postRichTextFromPlainText(normalized);
  return sanitizePostRichTextHtml(candidate);
}

export function deserializePostRichText(value: unknown): string {
  return serializePostRichText(value);
}

export function postRichTextToPlainText(value: unknown): string {
  const html = serializePostRichText(value);
  if (!html) return "";
  const text = decodeHtmlEntities(stripHtmlTags(html))
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

export function countPostRichTextWords(value: unknown): number {
  const text = postRichTextToPlainText(value);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}
