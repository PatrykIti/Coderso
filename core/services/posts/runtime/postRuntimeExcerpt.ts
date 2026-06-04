import { coercePostDocument } from "../editor/postBlockLegacyAdapter";
import { postRichTextToPlainText } from "../editor/postRichTextSerializer";

const DEFAULT_EXCERPT_MAX_LENGTH = 220;
const META_DESCRIPTION_MAX_LENGTH = 160;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toTrimmedOptional = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
};

const readWritingCanvasText = (content: unknown) => {
  if (!isRecord(content) || !Array.isArray(content.nodes)) return "";
  return content.nodes
    .map((node) => {
      if (!isRecord(node)) return "";
      const type = typeof node.type === "string" ? node.type.trim().toLowerCase() : "";
      if (type === "paragraph" || type === "heading" || type === "quote") {
        return postRichTextToPlainText(typeof node.text === "string" ? node.text : "");
      }
      if (type === "list" && Array.isArray(node.items)) {
        return node.items
          .filter((item): item is string => typeof item === "string")
          .map((item) => postRichTextToPlainText(item))
          .join(" ");
      }
      if (type === "image") {
        const alt = typeof node.alt === "string" ? node.alt : "";
        const caption = typeof node.caption === "string" ? node.caption : "";
        return `${alt} ${caption}`.trim();
      }
      return "";
    })
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");
};

const resolveDocumentExcerpt = (data: Record<string, unknown>, maxLength: number) => {
  const document = coercePostDocument(data);
  const fromMeta = toTrimmedOptional(document.meta.excerpt);
  if (fromMeta) return truncate(fromMeta, maxLength);

  const runtimeBlocks = document.blocks
    .map((block) => {
      if (block.type === "list" && Array.isArray(block.content)) {
        return block.content.filter((item): item is string => typeof item === "string").join(" ");
      }
      if (block.type === "writing-canvas") {
        return readWritingCanvasText(block.content);
      }
      if (typeof block.content === "string") return postRichTextToPlainText(block.content);
      return "";
    })
    .map((part) => part.trim())
    .filter(Boolean);

  if (runtimeBlocks.length === 0) return undefined;
  return truncate(runtimeBlocks.join(" "), maxLength);
};

export function resolvePostRuntimeExcerpt(data: unknown, maxLength = DEFAULT_EXCERPT_MAX_LENGTH) {
  if (!isRecord(data)) return undefined;
  const normalizedMax = clamp(Math.round(maxLength), 40, 500);
  const candidates = [
    data.excerpt,
    data.summary,
    data.description,
    data.lead,
    data.intro,
    data.content,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const plain = postRichTextToPlainText(candidate);
    if (!plain) continue;
    return truncate(plain, normalizedMax);
  }

  return resolveDocumentExcerpt(data, normalizedMax);
}

export function resolvePostRuntimeMetaDescription(data: unknown) {
  return resolvePostRuntimeExcerpt(data, META_DESCRIPTION_MAX_LENGTH) ?? null;
}
