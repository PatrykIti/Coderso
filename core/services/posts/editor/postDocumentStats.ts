import type { PostBlockDocument } from "./postBlockDocument";
import { isRecord } from "./postBlockDocument";
import { postRichTextToPlainText } from "./postRichTextSerializer";

export const DEFAULT_POST_READING_WPM = 220;

export type PostDocumentStats = {
  words: number;
  characters: number;
  readingTimeMinutes: number;
  headings: number;
  paragraphs: number;
  blocks: number;
};

type BuildPostDocumentStatsOptions = {
  wordsPerMinute?: number;
};

const normalizeWordsPerMinute = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_POST_READING_WPM;
  }
  return Math.max(80, Math.min(600, Math.round(value)));
};

const normalizeText = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .trim();

const countWords = (value: string) => {
  if (!value) return 0;
  return value.split(/\s+/).filter(Boolean).length;
};

const collectWritingCanvasStats = (content: unknown) => {
  if (!isRecord(content) || !Array.isArray(content.nodes)) {
    return {
      textParts: [] as string[],
      headings: 0,
      paragraphs: 0,
    };
  }

  const textParts: string[] = [];
  let headings = 0;
  let paragraphs = 0;

  for (const node of content.nodes) {
    if (!isRecord(node)) continue;
    const type = typeof node.type === "string" ? node.type.trim().toLowerCase() : "";

    if (type === "paragraph") {
      const text = normalizeText(
        postRichTextToPlainText(typeof node.text === "string" ? node.text : "")
      );
      if (text) {
        paragraphs += 1;
        textParts.push(text);
      }
      continue;
    }

    if (type === "heading") {
      const text = normalizeText(
        postRichTextToPlainText(typeof node.text === "string" ? node.text : "")
      );
      if (text) {
        headings += 1;
        textParts.push(text);
      }
      continue;
    }

    if (type === "quote") {
      const text = normalizeText(
        postRichTextToPlainText(typeof node.text === "string" ? node.text : "")
      );
      if (text) textParts.push(text);
      continue;
    }

    if (type === "list" && Array.isArray(node.items)) {
      for (const item of node.items) {
        const text = normalizeText(
          postRichTextToPlainText(typeof item === "string" ? item : "")
        );
        if (text) textParts.push(text);
      }
      continue;
    }

    if (type === "image") {
      const alt = normalizeText(typeof node.alt === "string" ? node.alt : "");
      const caption = normalizeText(
        typeof node.caption === "string" ? node.caption : ""
      );
      if (alt) textParts.push(alt);
      if (caption) textParts.push(caption);
    }
  }

  return {
    textParts,
    headings,
    paragraphs,
  };
};

export function buildPostDocumentStats(
  document: PostBlockDocument,
  options: BuildPostDocumentStatsOptions = {}
): PostDocumentStats {
  const textParts: string[] = [];
  let headings = 0;
  let paragraphs = 0;

  for (const block of document.blocks) {
    if (block.type === "writing-canvas") {
      const writingStats = collectWritingCanvasStats(block.content);
      headings += writingStats.headings;
      paragraphs += writingStats.paragraphs;
      textParts.push(...writingStats.textParts);
      continue;
    }

    if (block.type === "heading") {
      const text = normalizeText(
        postRichTextToPlainText(
          typeof block.content === "string" ? block.content : ""
        )
      );
      if (text) {
        headings += 1;
        textParts.push(text);
      }
      continue;
    }

    if (block.type === "paragraph") {
      const text = normalizeText(
        postRichTextToPlainText(
          typeof block.content === "string" ? block.content : ""
        )
      );
      if (text) {
        paragraphs += 1;
        textParts.push(text);
      }
      continue;
    }

    if (block.type === "quote" || block.type === "callout") {
      const text = normalizeText(
        postRichTextToPlainText(
          typeof block.content === "string" ? block.content : ""
        )
      );
      if (text) textParts.push(text);
      continue;
    }

    if (block.type === "list" && Array.isArray(block.content)) {
      for (const item of block.content) {
        const text = normalizeText(
          postRichTextToPlainText(typeof item === "string" ? item : "")
        );
        if (text) textParts.push(text);
      }
      continue;
    }

    if (block.type === "code") {
      const text = normalizeText(
        typeof block.content === "string" ? block.content : ""
      );
      if (text) textParts.push(text);
      continue;
    }

    if (block.type === "image" && isRecord(block.attrs)) {
      const alt = normalizeText(typeof block.attrs.alt === "string" ? block.attrs.alt : "");
      const caption = normalizeText(
        typeof block.attrs.caption === "string" ? block.attrs.caption : ""
      );
      if (alt) textParts.push(alt);
      if (caption) textParts.push(caption);
      continue;
    }

    if (block.type === "button" && isRecord(block.attrs)) {
      const label = normalizeText(
        typeof block.attrs.label === "string" ? block.attrs.label : ""
      );
      if (label) textParts.push(label);
    }
  }

  const plainText = normalizeText(textParts.join(" "));
  const words = countWords(plainText);
  const wordsPerMinute = normalizeWordsPerMinute(options.wordsPerMinute);

  return {
    words,
    characters: plainText.length,
    readingTimeMinutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / wordsPerMinute)),
    headings,
    paragraphs,
    blocks: document.blocks.length,
  };
}
