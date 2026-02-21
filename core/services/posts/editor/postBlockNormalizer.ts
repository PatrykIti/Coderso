import {
  isPostBlockType,
  isRecord,
  POST_BLOCK_DOCUMENT_VERSION,
  type PostBlock,
  type PostBlockDocument,
  type PostBlockDocumentMeta,
  type PostBlockType,
} from "./postBlockDocument";
import {
  postRichTextToPlainText,
  serializePostRichText,
} from "./postRichTextSerializer";

const MAX_TEXT_LENGTH = 20_000;
const MAX_META_TITLE_LENGTH = 200;
const MAX_META_EXCERPT_LENGTH = 320;
const MAX_LIST_ITEMS = 200;
const DEFAULT_WORDS_PER_MINUTE = 200;

const CALL_OUT_TONES = ["info", "success", "warning", "danger", "neutral"] as const;

type CalloutTone = (typeof CALL_OUT_TONES)[number];

type NormalizeDocumentOptions = {
  fallbackToEmpty?: boolean;
};

const normalizeString = (value: unknown, maxLength = MAX_TEXT_LENGTH) => {
  if (typeof value !== "string") return "";
  const compact = value.replace(/\r\n/g, "\n");
  return compact.length > maxLength ? compact.slice(0, maxLength) : compact;
};

const normalizeOptionalString = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const sanitizeBlockId = (value: unknown, index: number) => {
  if (typeof value !== "string") return `block-${index + 1}`;
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
  return normalized || `block-${index + 1}`;
};

const ensureUniqueBlockId = (id: string, used: Set<string>) => {
  if (!used.has(id)) {
    used.add(id);
    return id;
  }
  let suffix = 2;
  while (used.has(`${id}-${suffix}`)) {
    suffix += 1;
  }
  const unique = `${id}-${suffix}`;
  used.add(unique);
  return unique;
};

const normalizeHeadingLevel = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 2;
  const rounded = Math.round(value);
  if (rounded < 1) return 1;
  if (rounded > 6) return 6;
  return rounded;
};

const normalizeCalloutTone = (value: unknown): CalloutTone => {
  if (typeof value !== "string") return "info";
  return (CALL_OUT_TONES as readonly string[]).includes(value)
    ? (value as CalloutTone)
    : "info";
};

const normalizeBlockAttrs = (type: PostBlockType, attrs: unknown) => {
  const source = isRecord(attrs) ? attrs : {};

  switch (type) {
    case "heading":
      return { level: normalizeHeadingLevel(source.level) };
    case "list":
      return { ordered: source.ordered === true };
    case "image":
      return {
        mediaId:
          typeof source.mediaId === "string" && source.mediaId.trim().length > 0
            ? source.mediaId.trim()
            : null,
        alt: normalizeString(source.alt, 500),
      };
    case "callout":
      return { tone: normalizeCalloutTone(source.tone) };
    case "button":
      return {
        label: normalizeOptionalString(source.label, 120) ?? "Button",
        url: normalizeOptionalString(source.url, 2048) ?? "",
        variant: normalizeOptionalString(source.variant, 40) ?? "primary",
      };
    case "embed":
      return {
        provider: normalizeOptionalString(source.provider, 80) ?? "custom",
        url: normalizeOptionalString(source.url, 2048) ?? "",
      };
    case "paragraph":
    case "quote":
    case "code":
    case "separator":
    default:
      return {};
  }
};

const normalizeListContent = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeString(item))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
  return normalized;
};

const normalizeRichTextContent = (value: unknown) => {
  if (typeof value !== "string") return "";
  const serialized = serializePostRichText(value);
  if (!serialized) return "";
  const plainText = postRichTextToPlainText(serialized);
  if (plainText.length <= MAX_TEXT_LENGTH) return serialized;
  return serializePostRichText(plainText.slice(0, MAX_TEXT_LENGTH));
};

const normalizeBlockContent = (type: PostBlockType, content: unknown) => {
  switch (type) {
    case "list":
      return normalizeListContent(content);
    case "paragraph":
    case "heading":
    case "quote":
    case "callout":
      return normalizeRichTextContent(content);
    case "code":
      return normalizeString(content);
    case "separator":
      return null;
    case "image":
    case "button":
    case "embed":
    default:
      return null;
  }
};

const normalizeBlock = (
  input: unknown,
  index: number,
  usedIds: Set<string>
): PostBlock => {
  if (!isRecord(input)) throw new Error("post_document_invalid");
  if (!isPostBlockType(input.type)) throw new Error("post_document_invalid");

  const id = ensureUniqueBlockId(sanitizeBlockId(input.id, index), usedIds);
  const type = input.type;

  return {
    id,
    type,
    attrs: normalizeBlockAttrs(type, input.attrs),
    content: normalizeBlockContent(type, input.content),
  };
};

const estimateReadingTimeMinutes = (blocks: PostBlock[]) => {
  const textPayload = blocks
    .map((block) => {
      if (typeof block.content === "string") return postRichTextToPlainText(block.content);
      if (Array.isArray(block.content)) return block.content.join(" ");
      return "";
    })
    .join(" ")
    .trim();

  if (!textPayload) return 0;

  const words = textPayload.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / DEFAULT_WORDS_PER_MINUTE));
};

const normalizeDocumentMeta = (
  meta: unknown,
  blocks: PostBlock[]
): PostBlockDocumentMeta => {
  const source = isRecord(meta) ? meta : {};
  const normalized: PostBlockDocumentMeta = {};

  const title = normalizeOptionalString(source.title, MAX_META_TITLE_LENGTH);
  if (title) normalized.title = title;

  const excerpt = normalizeOptionalString(source.excerpt, MAX_META_EXCERPT_LENGTH);
  if (excerpt) normalized.excerpt = excerpt;

  if (typeof source.readingTimeMinutes === "number" && Number.isFinite(source.readingTimeMinutes)) {
    normalized.readingTimeMinutes = Math.max(0, Math.round(source.readingTimeMinutes));
  } else {
    normalized.readingTimeMinutes = estimateReadingTimeMinutes(blocks);
  }

  return normalized;
};

const createDefaultParagraphBlock = (): PostBlock => ({
  id: "block-1",
  type: "paragraph",
  attrs: {},
  content: "",
});

export function createEmptyPostBlockDocument(): PostBlockDocument {
  const blocks = [createDefaultParagraphBlock()];
  return {
    version: POST_BLOCK_DOCUMENT_VERSION,
    blocks,
    meta: {
      readingTimeMinutes: 0,
    },
  };
}

export function normalizePostBlockDocument(
  input: unknown,
  options?: NormalizeDocumentOptions
): PostBlockDocument {
  const fallbackToEmpty = options?.fallbackToEmpty === true;

  if (!isRecord(input)) {
    if (fallbackToEmpty) return createEmptyPostBlockDocument();
    throw new Error("post_document_invalid");
  }

  if (
    input.version !== undefined &&
    (typeof input.version !== "number" || Math.round(input.version) !== POST_BLOCK_DOCUMENT_VERSION)
  ) {
    if (fallbackToEmpty) return createEmptyPostBlockDocument();
    throw new Error("post_document_invalid");
  }

  const rawBlocks = Array.isArray(input.blocks) ? input.blocks : [];
  const usedIds = new Set<string>();
  const blocks = rawBlocks.map((block, index) => normalizeBlock(block, index, usedIds));
  if (blocks.length === 0) {
    blocks.push(createDefaultParagraphBlock());
  }

  const meta = normalizeDocumentMeta(input.meta, blocks);

  return {
    version: POST_BLOCK_DOCUMENT_VERSION,
    blocks,
    meta,
  };
}
