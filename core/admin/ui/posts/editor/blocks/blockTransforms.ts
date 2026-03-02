import type {
  PostBlock,
  PostBlockType,
} from "../../../../../services/posts/editor/postBlockDocument";
import {
  postRichTextToPlainText,
  serializePostRichText,
} from "../../../../../services/posts/editor/postRichTextSerializer";
import {
  createWritingCanvasContentFromEditorHtml,
  serializeWritingCanvasContentToHtml,
} from "../../../../../services/posts/editor/postPasteNormalizer";

const TRANSFORMABLE_BLOCK_TYPES: PostBlockType[] = [
  "paragraph",
  "heading",
  "list",
  "quote",
  "code",
  "callout",
  "writing-canvas",
];

const transformableSet = new Set<PostBlockType>(TRANSFORMABLE_BLOCK_TYPES);

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const toTextLines = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) return [];
  const serialized = serializePostRichText(value);
  if (!serialized) return [];

  const lineBreakAware = serialized
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|h4|h5|h6|blockquote|li|pre)>/gi, "\n");

  const plain = decodeHtmlEntities(lineBreakAware.replace(/<[^>]+>/g, ""));
  return plain
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const resolveAttrsForTarget = (targetType: PostBlockType): Record<string, unknown> => {
  switch (targetType) {
    case "heading":
      return { level: 2 };
    case "list":
      return { ordered: false };
    case "callout":
      return { tone: "info" };
    default:
      return {};
  }
};

const normalizeContentForTarget = (
  source: PostBlock,
  targetType: PostBlockType
): unknown => {
  if (targetType === "list") {
    const sourceContent =
      source.type === "writing-canvas"
        ? serializeWritingCanvasContentToHtml(source.content)
        : source.content;
    return toTextLines(sourceContent);
  }

  if (targetType === "code") {
    const sourceContent =
      source.type === "writing-canvas"
        ? serializeWritingCanvasContentToHtml(source.content)
        : source.content;
    const plain = toTextLines(sourceContent).join("\n");
    return plain;
  }

  if (targetType === "writing-canvas") {
    const html =
      source.type === "list"
        ? (() => {
            const items = toTextLines(source.content)
              .map((item) => serializePostRichText(item))
              .filter(Boolean)
              .map((item) => `<li>${item}</li>`)
              .join("");
            const ordered = Boolean((source.attrs ?? {}).ordered);
            const tag = ordered ? "ol" : "ul";
            return items.length > 0 ? `<${tag}>${items}</${tag}>` : "<p></p>";
          })()
        : source.type === "writing-canvas"
          ? serializeWritingCanvasContentToHtml(source.content)
          : typeof source.content === "string"
            ? source.content
            : "";
    return createWritingCanvasContentFromEditorHtml({ html });
  }

  const textValue =
    source.type === "list"
      ? toTextLines(source.content).join("\n")
      : source.type === "writing-canvas"
        ? serializeWritingCanvasContentToHtml(source.content)
        : typeof source.content === "string"
          ? source.content
          : "";

  return serializePostRichText(textValue);
};

export const canTransformBlock = (sourceType: PostBlockType, targetType: PostBlockType) =>
  sourceType !== targetType &&
  transformableSet.has(sourceType) &&
  transformableSet.has(targetType);

export const getTransformTargetTypes = (sourceType: PostBlockType) =>
  TRANSFORMABLE_BLOCK_TYPES.filter((targetType) =>
    canTransformBlock(sourceType, targetType)
  );

export const transformPostBlock = (
  source: PostBlock,
  targetType: PostBlockType
): PostBlock | null => {
  if (!canTransformBlock(source.type, targetType)) return null;

  return {
    ...source,
    type: targetType,
    attrs: resolveAttrsForTarget(targetType),
    content: normalizeContentForTarget(source, targetType),
  };
};

export const extractPostBlockText = (block: PostBlock) => {
  if (Array.isArray(block.content)) {
    return block.content
      .filter((item): item is string => typeof item === "string")
      .join("\n");
  }
  if (typeof block.content === "string") {
    return block.type === "code" ? block.content : postRichTextToPlainText(block.content);
  }
  if (block.type === "writing-canvas") {
    return postRichTextToPlainText(serializeWritingCanvasContentToHtml(block.content));
  }
  return "";
};
