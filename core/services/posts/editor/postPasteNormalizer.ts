import {
  WRITING_CANVAS_VERSION,
  type WritingCanvasContent,
  type WritingCanvasNode,
} from "./postBlockDocument";
import {
  postRichTextFromPlainText,
  postRichTextToPlainText,
  serializePostRichText,
} from "./postRichTextSerializer";
import {
  sanitizePostRichTextHtml,
  stripPostOfficeHtmlArtifacts,
} from "./postRichTextSanitizer";

const MAX_HTML_INPUT_LENGTH = 350_000;
const MAX_TEXT_INPUT_LENGTH = 150_000;
const MAX_WRITING_NODES = 200;
const MAX_LIST_ITEMS = 120;

const blockMatcher = /<(p|h2|h3|h4|h5|h6|blockquote|pre|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
const listItemMatcher = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const blockLikeTagsMatcher = /<\/?(p|h[2-6]|blockquote|pre|ul|ol|li)\b[^>]*>/gi;
const spanTagMatcher = /<\/?span\b[^>]*>/gi;

const textTrim = (value: string) => value.replace(/\r\n/g, "\n").trim();

export type PostPasteWarningCode =
  | "html_truncated"
  | "text_truncated"
  | "office_markup_removed"
  | "unsupported_markup_removed"
  | "nodes_truncated"
  | "list_items_truncated"
  | "fallback_to_plain_text"
  | "empty_payload";

export type PostPasteWarning = {
  code: PostPasteWarningCode;
  message: string;
};

export type NormalizePostPastePayloadInput = {
  html?: string | null;
  text?: string | null;
};

export type NormalizePostPastePayloadResult = {
  source: "html" | "text" | "empty";
  mode: "writing-canvas" | "empty";
  html: string;
  nodes: WritingCanvasNode[];
  warnings: PostPasteWarning[];
};

const pushWarning = (
  warnings: PostPasteWarning[],
  warning: PostPasteWarning
) => {
  if (warnings.some((item) => item.code === warning.code)) {
    return;
  }
  warnings.push(warning);
};

const normalizeInputChunk = (value: string, maxLength: number) => {
  const normalized = value.replace(/\0/g, "");
  if (normalized.length <= maxLength) {
    return { value: normalized, truncated: false };
  }
  return {
    value: normalized.slice(0, maxLength),
    truncated: true,
  };
};

const normalizeInlineRichText = (value: string) => {
  const sanitized = sanitizePostRichTextHtml(value)
    .replace(blockLikeTagsMatcher, "")
    .replace(spanTagMatcher, "")
    .trim();
  if (!sanitized) {
    return "";
  }
  return serializePostRichText(sanitized);
};

const buildParagraphNodesFromText = (
  text: string,
  startIndex = 0
): WritingCanvasNode[] => {
  const normalized = textTrim(text);
  if (!normalized) {
    return [];
  }

  const sections = normalized.split(/\n{2,}/).map((section) => section.trim());
  const nodes: WritingCanvasNode[] = [];

  for (const section of sections) {
    if (!section) continue;
    const lines = section
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const unordered = lines.every((line) => /^[-*•]\s+/.test(line));
    if (unordered) {
      const items = lines
        .map((line) => line.replace(/^[-*•]\s+/, "").trim())
        .filter(Boolean)
        .map((item) => postRichTextFromPlainText(item));
      if (items.length > 0) {
        nodes.push({
          id: `node-${startIndex + nodes.length + 1}`,
          type: "list",
          ordered: false,
          items,
        });
      }
      continue;
    }

    const ordered = lines.every((line) => /^\d+[.)]\s+/.test(line));
    if (ordered) {
      const items = lines
        .map((line) => line.replace(/^\d+[.)]\s+/, "").trim())
        .filter(Boolean)
        .map((item) => postRichTextFromPlainText(item));
      if (items.length > 0) {
        nodes.push({
          id: `node-${startIndex + nodes.length + 1}`,
          type: "list",
          ordered: true,
          items,
        });
      }
      continue;
    }

    const paragraph = postRichTextFromPlainText(lines.join("\n"));
    nodes.push({
      id: `node-${startIndex + nodes.length + 1}`,
      type: "paragraph",
      text: paragraph,
    });
  }

  return nodes;
};

const extractListItems = (innerHtml: string) => {
  const items: string[] = [];
  for (const match of innerHtml.matchAll(listItemMatcher)) {
    const itemHtml = normalizeInlineRichText(match[1] ?? "");
    if (!postRichTextToPlainText(itemHtml)) continue;
    items.push(itemHtml);
  }
  return items;
};

const mapSanitizedHtmlToNodes = (
  html: string,
  warnings: PostPasteWarning[]
): WritingCanvasNode[] => {
  const nodes: WritingCanvasNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let listItemsTruncated = false;

  const pushParagraphFromFragment = (fragment: string) => {
    const normalized = normalizeInlineRichText(fragment);
    if (!postRichTextToPlainText(normalized)) return;
    nodes.push({
      id: `node-${nodes.length + 1}`,
      type: "paragraph",
      text: normalized,
    });
  };

  while ((match = blockMatcher.exec(html)) !== null) {
    const wholeMatch = match[0] ?? "";
    const tag = (match[1] ?? "").toLowerCase();
    const innerHtml = match[2] ?? "";
    const index = match.index ?? 0;

    if (index > cursor) {
      const leading = html.slice(cursor, index);
      pushParagraphFromFragment(leading);
    }

    if (tag === "ul" || tag === "ol") {
      const items = extractListItems(innerHtml);
      if (items.length > 0) {
        const clipped = items.slice(0, MAX_LIST_ITEMS);
        if (clipped.length < items.length) {
          listItemsTruncated = true;
        }
        nodes.push({
          id: `node-${nodes.length + 1}`,
          type: "list",
          ordered: tag === "ol",
          items: clipped,
        });
      }
      cursor = index + wholeMatch.length;
      continue;
    }

    const normalized = normalizeInlineRichText(innerHtml);
    if (!postRichTextToPlainText(normalized)) {
      cursor = index + wholeMatch.length;
      continue;
    }

    if (tag.startsWith("h")) {
      const levelRaw = Number(tag.slice(1));
      const level = Number.isFinite(levelRaw) && levelRaw >= 2 && levelRaw <= 6 ? levelRaw : 2;
      nodes.push({
        id: `node-${nodes.length + 1}`,
        type: "heading",
        level: level as 2 | 3 | 4 | 5 | 6,
        text: normalized,
      });
    } else if (tag === "blockquote" || tag === "pre") {
      nodes.push({
        id: `node-${nodes.length + 1}`,
        type: "quote",
        text: normalized,
      });
    } else {
      nodes.push({
        id: `node-${nodes.length + 1}`,
        type: "paragraph",
        text: normalized,
      });
    }

    cursor = index + wholeMatch.length;
  }

  if (cursor < html.length) {
    pushParagraphFromFragment(html.slice(cursor));
  }

  if (listItemsTruncated) {
    pushWarning(warnings, {
      code: "list_items_truncated",
      message: `Some list items were skipped after ${MAX_LIST_ITEMS} items per list.`,
    });
  }

  return nodes;
};

export const serializeWritingCanvasNodesToHtml = (nodes: WritingCanvasNode[]) =>
  nodes
    .map((node) => {
      if (node.type === "heading") {
        return `<h${node.level}>${node.text}</h${node.level}>`;
      }
      if (node.type === "list") {
        const wrapper = node.ordered ? "ol" : "ul";
        const items = node.items
          .map((item) => `<li>${normalizeInlineRichText(item)}</li>`)
          .join("");
        return `<${wrapper}>${items}</${wrapper}>`;
      }
      if (node.type === "quote") {
        return `<blockquote>${node.text}</blockquote>`;
      }
      if (node.type === "image") {
        return "";
      }
      return `<p>${node.text}</p>`;
    })
    .join("");

export const serializeWritingCanvasContentToHtml = (content: unknown) => {
  if (!content || typeof content !== "object" || Array.isArray(content)) return "";
  const nodes = Array.isArray((content as { nodes?: unknown }).nodes)
    ? ((content as { nodes: unknown[] }).nodes as WritingCanvasNode[])
    : [];
  if (nodes.length === 0) return "";
  return serializeWritingCanvasNodesToHtml(nodes);
};

export const createWritingCanvasContentFromPaste = (
  input: NormalizePostPastePayloadInput
): { content: WritingCanvasContent; warnings: PostPasteWarning[]; source: "html" | "text" | "empty" } => {
  const result = normalizePostPastePayload(input);
  return {
    content: {
      version: WRITING_CANVAS_VERSION,
      nodes: result.nodes,
    },
    warnings: result.warnings,
    source: result.source,
  };
};

export function normalizePostPastePayload(
  input: NormalizePostPastePayloadInput
): NormalizePostPastePayloadResult {
  const warnings: PostPasteWarning[] = [];

  const htmlRaw = typeof input.html === "string" ? input.html : "";
  const textRaw = typeof input.text === "string" ? input.text : "";

  const normalizedHtmlInput = normalizeInputChunk(htmlRaw, MAX_HTML_INPUT_LENGTH);
  if (normalizedHtmlInput.truncated) {
    pushWarning(warnings, {
      code: "html_truncated",
      message: "Pasted HTML was large and got truncated for editor safety.",
    });
  }

  const normalizedTextInput = normalizeInputChunk(textRaw, MAX_TEXT_INPUT_LENGTH);
  if (normalizedTextInput.truncated) {
    pushWarning(warnings, {
      code: "text_truncated",
      message: "Pasted text was large and got truncated for editor safety.",
    });
  }

  const htmlCandidate = textTrim(normalizedHtmlInput.value);
  const textCandidate = textTrim(normalizedTextInput.value);

  if (!htmlCandidate && !textCandidate) {
    pushWarning(warnings, {
      code: "empty_payload",
      message: "Clipboard payload is empty.",
    });
    return {
      source: "empty",
      mode: "empty",
      html: "",
      nodes: [],
      warnings,
    };
  }

  let source: "html" | "text" = htmlCandidate ? "html" : "text";
  let nodes: WritingCanvasNode[] = [];

  if (htmlCandidate) {
    const office = stripPostOfficeHtmlArtifacts(htmlCandidate);
    if (office.removed) {
      pushWarning(warnings, {
        code: "office_markup_removed",
        message: "Office/Docs formatting artifacts were removed.",
      });
    }

    const sanitized = sanitizePostRichTextHtml(office.html);
    if (textTrim(office.html) !== textTrim(sanitized)) {
      pushWarning(warnings, {
        code: "unsupported_markup_removed",
        message: "Unsupported HTML markup was removed.",
      });
    }
    nodes = mapSanitizedHtmlToNodes(sanitized, warnings);

    if (nodes.length === 0 && /<img\b/i.test(sanitized)) {
      const richText = serializePostRichText(sanitized);
      if (postRichTextToPlainText(richText).trim().length > 0 || /<img\b/i.test(richText)) {
        nodes = [
          {
            id: "node-1",
            type: "paragraph",
            text: richText,
          },
        ];
      }
    }
  }

  if (nodes.length === 0 && textCandidate) {
    source = "text";
    pushWarning(warnings, {
      code: "fallback_to_plain_text",
      message: "Pasted content was converted to plain text blocks.",
    });
    nodes = buildParagraphNodesFromText(textCandidate);
  }

  if (nodes.length > MAX_WRITING_NODES) {
    nodes = nodes.slice(0, MAX_WRITING_NODES).map((node, index) => ({
      ...node,
      id: `node-${index + 1}`,
    }));
    pushWarning(warnings, {
      code: "nodes_truncated",
      message: `Only the first ${MAX_WRITING_NODES} content blocks were kept.`,
    });
  }

  if (nodes.length === 0) {
    return {
      source,
      mode: "empty",
      html: "",
      nodes: [],
      warnings,
    };
  }

  const html = serializeWritingCanvasNodesToHtml(nodes);
  return {
    source,
    mode: "writing-canvas",
    html,
    nodes,
    warnings,
  };
}
