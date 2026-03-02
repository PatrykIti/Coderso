import {
  WRITING_CANVAS_ALIGN_VALUES,
  WRITING_CANVAS_VERSION,
  type WritingCanvasAlign,
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
const writingCanvasAlignSet = new Set<string>(WRITING_CANVAS_ALIGN_VALUES);

const blockMatcher =
  /<(p|h1|h2|h3|h4|h5|h6|blockquote|pre|ul|ol)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const listItemMatcher = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const blockLikeTagsMatcher = /<\/?(p|h[1-6]|blockquote|pre|ul|ol|li)\b[^>]*>/gi;
const spanTagMatcher = /<\/?span\b[^>]*>/gi;
const headingLevelClassMatcher = /\b(?:msoheading|heading)\s*[-_]?([1-6])\b/i;
const headingLevelStyleMatcher = /\bmso-outline-level\s*:\s*([1-6])\b/i;
const headingStyleNameMatcher =
  /\bmso-style-name\s*:\s*["']?\s*(?:heading|naglowek)\s*([1-6])\b/i;
const headingTitleMatcher = /\bmso-title\b/i;
const wordTocHrefMatcher = /href\s*=\s*["']#_toc[\w-]*["']/i;
const wordTocAnchorMatcher =
  /<a\b[^>]*href\s*=\s*["']#_toc[\w-]*["'][^>]*>([\s\S]*?)<\/a>/gi;
const tocTitleMatcher = /^(table\s+of\s+contents|spis\s+tre[sś]ci)$/i;
const tocNumberedLineMatcher = /^\d+(?:\.\d+)*\.?\s+\S+/;
const tocDottedLeaderMatcher = /\.{2,}\s*\d+\s*$/;

const textTrim = (value: string) => value.replace(/\r\n/g, "\n").trim();

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

const parseBlockAlignFromAttrs = (rawAttrs: string): WritingCanvasAlign | undefined => {
  const attrs = parseAttributes(rawAttrs);
  const alignCandidate = attrs.get("data-align") ?? attrs.get("align");
  if (!alignCandidate) return undefined;
  const normalized = alignCandidate.trim().toLowerCase();
  return writingCanvasAlignSet.has(normalized)
    ? (normalized as WritingCanvasAlign)
    : undefined;
};

export type PostPasteWarningCode =
  | "html_truncated"
  | "text_truncated"
  | "office_markup_removed"
  | "unsupported_markup_removed"
  | "nodes_truncated"
  | "list_items_truncated"
  | "fallback_to_plain_text"
  | "empty_payload"
  | "word_toc_replaced";

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
  directives: PostPasteDirectives;
  diagnostics: PostPasteDiagnostics;
};

export type PostPasteDirectives = {
  replaceWordTocWithDynamicToc: boolean;
};

export type PostPasteDiagnostics = {
  wordTocDetectedLinks?: number;
  wordTocRemovedNodes?: number;
};

type WordTocStripResult = {
  nodes: WritingCanvasNode[];
  detectedLinkCount: number;
  removedNodeCount: number;
};

type StripWordTocAnchorsResult = {
  html: string;
  removedLinkCount: number;
};

type StripWordTocAnchorsFromNodesResult = {
  nodes: WritingCanvasNode[];
  removedLinkCount: number;
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

const clampHeadingLevel = (level: number): 1 | 2 | 3 | 4 | 5 | 6 => {
  if (level <= 1) return 1;
  if (level === 2) return 2;
  if (level === 3) return 3;
  if (level === 4) return 4;
  if (level === 5) return 5;
  return 6;
};

const createPostPasteDirectives = (): PostPasteDirectives => ({
  replaceWordTocWithDynamicToc: false,
});

const parseHeadingLevelFromWordAttrs = (rawAttrs: string): 1 | 2 | 3 | 4 | 5 | 6 | null => {
  if (!rawAttrs) return null;
  const attrs = rawAttrs.toLowerCase();

  const outlineMatch = attrs.match(headingLevelStyleMatcher);
  if (outlineMatch?.[1]) {
    return clampHeadingLevel(Number(outlineMatch[1]));
  }

  const classMatch = attrs.match(headingLevelClassMatcher);
  if (classMatch?.[1]) {
    return clampHeadingLevel(Number(classMatch[1]));
  }

  const styleNameMatch = attrs.match(headingStyleNameMatcher);
  if (styleNameMatch?.[1]) {
    return clampHeadingLevel(Number(styleNameMatch[1]));
  }

  if (/\bmsoheading\b/i.test(attrs) || headingTitleMatcher.test(attrs)) {
    return 1;
  }

  return null;
};

const normalizeWordHeadingMarkup = (value: string) => {
  if (!value) return value;

  return value
    .replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi, (match, rawAttrs, innerHtml) => {
      const level = parseHeadingLevelFromWordAttrs(String(rawAttrs ?? ""));
      if (!level) return match;
      return `<h${level}>${innerHtml ?? ""}</h${level}>`;
    })
    .replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, _rawLevel, rawAttrs, innerHtml) => {
      const level = parseHeadingLevelFromWordAttrs(String(rawAttrs ?? ""));
      if (!level) return match;
      return `<h${level}>${innerHtml ?? ""}</h${level}>`;
    });
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

const stripWordTocAnchorsFromRichText = (value: string): StripWordTocAnchorsResult => {
  if (!value) {
    return { html: "", removedLinkCount: 0 };
  }

  let removedLinkCount = 0;
  const html = value.replace(wordTocAnchorMatcher, (_match, text) => {
    removedLinkCount += 1;
    return String(text ?? "");
  });

  return {
    html,
    removedLinkCount,
  };
};

const readNodeRichText = (node: WritingCanvasNode) => {
  if (node.type === "paragraph" || node.type === "heading" || node.type === "quote") {
    return node.text;
  }
  return "";
};

const normalizePlainLine = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isLikelyWordTocTitle = (plain: string) => tocTitleMatcher.test(normalizePlainLine(plain));

const isLikelyWordTocLine = (plain: string) => {
  const normalized = normalizePlainLine(plain);
  if (!normalized) return false;
  if (tocDottedLeaderMatcher.test(normalized)) return true;
  return tocNumberedLineMatcher.test(normalized) && /\s\d+$/.test(normalized);
};

const reindexWritingCanvasNodes = (nodes: WritingCanvasNode[]) =>
  nodes.map((node, index) => ({
    ...node,
    id: `node-${index + 1}`,
  }));

const stripWordTocNodes = (nodes: WritingCanvasNode[]): WordTocStripResult | null => {
  if (nodes.length === 0) return null;

  const linkIndexes: number[] = [];
  for (const [index, node] of nodes.entries()) {
    if (node.type !== "paragraph" && node.type !== "heading") continue;
    if (wordTocHrefMatcher.test(readNodeRichText(node))) {
      linkIndexes.push(index);
    }
  }

  if (linkIndexes.length < 3) {
    return null;
  }

  const removeIndexes = new Set<number>(linkIndexes);
  const first = Math.min(...linkIndexes);
  const last = Math.max(...linkIndexes);

  if (first > 0) {
    const previous = nodes[first - 1];
    if (previous) {
      const previousPlain = postRichTextToPlainText(readNodeRichText(previous));
      if (isLikelyWordTocTitle(previousPlain)) {
        removeIndexes.add(first - 1);
      }
    }
  }

  for (let index = first; index <= last; index += 1) {
    if (removeIndexes.has(index)) continue;
    const node = nodes[index];
    if (!node || (node.type !== "paragraph" && node.type !== "heading")) continue;
    const plain = postRichTextToPlainText(readNodeRichText(node));
    if (isLikelyWordTocTitle(plain) || isLikelyWordTocLine(plain)) {
      removeIndexes.add(index);
    }
  }

  if (removeIndexes.size === 0) {
    return null;
  }

  const nextNodes = nodes.filter((_, index) => !removeIndexes.has(index));
  return {
    nodes: reindexWritingCanvasNodes(nextNodes),
    detectedLinkCount: linkIndexes.length,
    removedNodeCount: removeIndexes.size,
  };
};

const stripWordTocAnchorsFromNodes = (
  nodes: WritingCanvasNode[]
): StripWordTocAnchorsFromNodesResult => {
  let removedLinkCount = 0;

  const nextNodes = nodes.map((node) => {
    if (node.type === "list") {
      const nextItems = node.items.map((item) => {
        const stripped = stripWordTocAnchorsFromRichText(item);
        removedLinkCount += stripped.removedLinkCount;
        return stripped.html;
      });
      return {
        ...node,
        items: nextItems,
      };
    }

    if (node.type === "heading" || node.type === "paragraph" || node.type === "quote") {
      const stripped = stripWordTocAnchorsFromRichText(node.text);
      removedLinkCount += stripped.removedLinkCount;
      return {
        ...node,
        text: stripped.html,
      };
    }

    return node;
  });

  return {
    nodes: nextNodes,
    removedLinkCount,
  };
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
    const rawAttrs = match[2] ?? "";
    const innerHtml = match[3] ?? "";
    const index = match.index ?? 0;

    if (index > cursor) {
      const leading = html.slice(cursor, index);
      pushParagraphFromFragment(leading);
    }

    if (tag === "ul" || tag === "ol") {
      const items = extractListItems(innerHtml);
      const align = parseBlockAlignFromAttrs(rawAttrs);
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
          ...(align ? { align } : {}),
        });
      }
      cursor = index + wholeMatch.length;
      continue;
    }

    const normalized = normalizeInlineRichText(innerHtml);
    const plainText = postRichTextToPlainText(normalized);
    const keepEmptyParagraph =
      tag === "p" && (/<br\b/i.test(innerHtml) || /&nbsp;/i.test(innerHtml));
    const keepEmptyCodeBlock = tag === "pre" && /(<br\b|^\s*$)/i.test(innerHtml);
    if (!plainText && !keepEmptyParagraph && !keepEmptyCodeBlock) {
      cursor = index + wholeMatch.length;
      continue;
    }

    const align = parseBlockAlignFromAttrs(rawAttrs);
    const normalizedText =
      !plainText && (keepEmptyParagraph || keepEmptyCodeBlock) ? "<br>" : normalized;
    const headingLevelFromAttrs = parseHeadingLevelFromWordAttrs(rawAttrs);
    if (tag.startsWith("h") || (tag === "p" && headingLevelFromAttrs)) {
      const levelRaw = Number(tag.slice(1));
      const levelFromTag =
        Number.isFinite(levelRaw) && levelRaw >= 1 && levelRaw <= 6 ? levelRaw : 2;
      const level = headingLevelFromAttrs ?? levelFromTag;
      nodes.push({
        id: `node-${nodes.length + 1}`,
        type: "heading",
        level: level as 1 | 2 | 3 | 4 | 5 | 6,
        text: normalizedText,
        ...(align ? { align } : {}),
      });
    } else if (tag === "blockquote") {
      nodes.push({
        id: `node-${nodes.length + 1}`,
        type: "quote",
        text: normalizedText,
        ...(align ? { align } : {}),
      });
    } else if (tag === "pre") {
      nodes.push({
        id: `node-${nodes.length + 1}`,
        type: "quote",
        text: normalizedText,
        variant: "code",
        ...(align ? { align } : {}),
      });
    } else {
      nodes.push({
        id: `node-${nodes.length + 1}`,
        type: "paragraph",
        text: normalizedText,
        ...(align ? { align } : {}),
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

const toAlignAttr = (align: WritingCanvasAlign | undefined) =>
  align ? ` data-align="${align}"` : "";

const toCodeNodeHtml = (value: string) => {
  const normalized = normalizeInlineRichText(value);
  if (!normalized || normalized === "<br>") {
    return "<code><br></code>";
  }
  if (/<code\b/i.test(normalized)) {
    return normalized;
  }
  return `<code>${normalized}</code>`;
};

export const serializeWritingCanvasNodesToHtml = (nodes: WritingCanvasNode[]) =>
  nodes
    .map((node) => {
      if (node.type === "heading") {
        return `<h${node.level}${toAlignAttr(node.align)}>${node.text}</h${node.level}>`;
      }
      if (node.type === "list") {
        const wrapper = node.ordered ? "ol" : "ul";
        const items = node.items
          .map((item) => `<li>${normalizeInlineRichText(item)}</li>`)
          .join("");
        return `<${wrapper}${toAlignAttr(node.align)}>${items}</${wrapper}>`;
      }
      if (node.type === "quote") {
        if (node.variant === "code") {
          return `<pre${toAlignAttr(node.align)}>${toCodeNodeHtml(node.text)}</pre>`;
        }
        return `<blockquote${toAlignAttr(node.align)}>${node.text}</blockquote>`;
      }
      if (node.type === "image") {
        return "";
      }
      return `<p${toAlignAttr(node.align)}>${node.text}</p>`;
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

const withStableWritingNodeIds = (
  nodes: WritingCanvasNode[],
  previousContent: unknown
): WritingCanvasNode[] => {
  if (!previousContent || typeof previousContent !== "object" || Array.isArray(previousContent)) {
    return nodes.map((node, index) => ({ ...node, id: `node-${index + 1}` }));
  }

  const previousNodes = Array.isArray((previousContent as { nodes?: unknown }).nodes)
    ? ((previousContent as { nodes: unknown[] }).nodes as WritingCanvasNode[])
    : [];

  return nodes.map((node, index) => {
    const previousNode = previousNodes[index];
    if (!previousNode || previousNode.type !== node.type || typeof previousNode.id !== "string") {
      return { ...node, id: `node-${index + 1}` };
    }
    return { ...node, id: previousNode.id };
  });
};

export const createWritingCanvasContentFromEditorHtml = (input: {
  html: string;
  previousContent?: unknown;
}): WritingCanvasContent => {
  const sanitized = sanitizePostRichTextHtml(input.html ?? "");
  const warnings: PostPasteWarning[] = [];
  const mapped = mapSanitizedHtmlToNodes(sanitized, warnings);
  const nodes = withStableWritingNodeIds(mapped, input.previousContent);

  if (nodes.length === 0) {
    return createWritingCanvasContentFromPaste({ html: "<p></p>", text: "" }).content;
  }

  return {
    version: WRITING_CANVAS_VERSION,
    nodes,
  };
};

export const createWritingCanvasContentFromPaste = (
  input: NormalizePostPastePayloadInput
): {
  content: WritingCanvasContent;
  warnings: PostPasteWarning[];
  source: "html" | "text" | "empty";
  directives: PostPasteDirectives;
  diagnostics: PostPasteDiagnostics;
} => {
  const result = normalizePostPastePayload(input);
  return {
    content: {
      version: WRITING_CANVAS_VERSION,
      nodes: result.nodes,
    },
    warnings: result.warnings,
    source: result.source,
    directives: result.directives,
    diagnostics: result.diagnostics,
  };
};

export function normalizePostPastePayload(
  input: NormalizePostPastePayloadInput
): NormalizePostPastePayloadResult {
  const warnings: PostPasteWarning[] = [];
  const directives = createPostPasteDirectives();
  const diagnostics: PostPasteDiagnostics = {};

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

  const htmlCandidate = textTrim(normalizeWordHeadingMarkup(normalizedHtmlInput.value));
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
      directives,
      diagnostics,
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
      const stripped = stripWordTocAnchorsFromRichText(richText);
      if (
        postRichTextToPlainText(stripped.html).trim().length > 0 ||
        /<img\b/i.test(stripped.html)
      ) {
        nodes = [
          {
            id: "node-1",
            type: "paragraph",
            text: stripped.html,
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

  if (source === "html" && nodes.length > 0) {
    const strippedWordToc = stripWordTocNodes(nodes);
    if (strippedWordToc) {
      nodes = strippedWordToc.nodes;
      directives.replaceWordTocWithDynamicToc = true;
      diagnostics.wordTocDetectedLinks = strippedWordToc.detectedLinkCount;
      diagnostics.wordTocRemovedNodes = strippedWordToc.removedNodeCount;
      pushWarning(warnings, {
        code: "word_toc_replaced",
        message: "Detected Word table of contents. Replaced with dynamic TOC.",
      });
    }

    const strippedAnchors = stripWordTocAnchorsFromNodes(nodes);
    if (strippedAnchors.removedLinkCount > 0) {
      nodes = strippedAnchors.nodes;
    }
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
      mode: directives.replaceWordTocWithDynamicToc ? "writing-canvas" : "empty",
      html: "",
      nodes: [],
      warnings,
      directives,
      diagnostics,
    };
  }

  const html = serializeWritingCanvasNodesToHtml(nodes);
  return {
    source,
    mode: "writing-canvas",
    html,
    nodes,
    warnings,
    directives,
    diagnostics,
  };
}
