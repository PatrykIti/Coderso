import {
  createEmptyWritingCanvasContent,
  isPostBlockType,
  isRecord,
  POST_BLOCK_DOCUMENT_VERSION,
  WRITING_CANVAS_NODE_TYPES,
  WRITING_CANVAS_VERSION,
  WRITING_CANVAS_ALIGN_VALUES,
  WRITING_CANVAS_WIDTH_VALUES,
  WRITING_CANVAS_WRAP_VALUES,
  type PostBlock,
  type PostBlockDocument,
  type PostBlockDocumentMeta,
  type PostBlockType,
  type WritingCanvasContent,
  type WritingCanvasNode,
  type WritingCanvasNodeType,
  type WritingCanvasAlign,
  type WritingCanvasWidth,
  type WritingCanvasWrap,
} from "./postBlockDocument";
import {
  normalizePostImageMargin,
  normalizePostImageWidth,
  normalizePostImageWrap,
} from "../postImageWrapLayout";
import {
  postRichTextToPlainText,
  serializePostRichText,
} from "./postRichTextSerializer";

const MAX_TEXT_LENGTH = 20_000;
const MAX_META_TITLE_LENGTH = 200;
const MAX_META_EXCERPT_LENGTH = 320;
const MAX_LIST_ITEMS = 200;
const DEFAULT_WORDS_PER_MINUTE = 200;
const MAX_WRITING_CANVAS_NODES = 400;
const MAX_WRITING_CANVAS_LIST_ITEMS = 200;
const MAX_WRITING_CANVAS_CAPTION_LENGTH = 320;

const CALL_OUT_TONES = ["info", "success", "warning", "danger", "neutral"] as const;
const ALIGN_VALUES = ["left", "center", "right"] as const;
const WIDTH_VALUES = ["auto", "narrow", "wide", "full"] as const;
const SPACING_VALUES = ["none", "sm", "md", "lg"] as const;
const TEXT_SCALE_VALUES = ["sm", "md", "lg", "xl"] as const;
const BUTTON_VARIANT_VALUES = ["primary", "secondary", "ghost", "link"] as const;
const BUTTON_SIZE_VALUES = ["sm", "md", "lg"] as const;
const EMBED_PROVIDER_VALUES = ["custom", "youtube", "vimeo", "loom"] as const;
const EMBED_ASPECT_VALUES = ["16:9", "4:3", "1:1"] as const;
const SEPARATOR_STYLE_VALUES = ["solid", "dashed", "dotted"] as const;
const META_FONT_FAMILY_VALUES = ["sans", "serif", "mono"] as const;
const META_BASE_TEXT_SCALE_VALUES = ["sm", "md", "lg", "xl"] as const;

const WRITING_CANVAS_LEVEL_VALUES = new Set([1, 2, 3, 4, 5, 6]);
const writingCanvasNodeTypeSet = new Set<string>(WRITING_CANVAS_NODE_TYPES);
const writingCanvasWrapSet = new Set<string>(WRITING_CANVAS_WRAP_VALUES);
const writingCanvasWidthSet = new Set<number>(WRITING_CANVAS_WIDTH_VALUES);
const writingCanvasAlignSet = new Set<string>(WRITING_CANVAS_ALIGN_VALUES);

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

const normalizeOptionalAnchorId = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return normalized.length > 0 ? normalized : undefined;
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

const sanitizeWritingNodeId = (value: unknown, index: number) => {
  if (typeof value !== "string") return `node-${index + 1}`;
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
  return normalized || `node-${index + 1}`;
};

const ensureUniqueWritingNodeId = (id: string, used: Set<string>) => {
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

const normalizeTocLevel = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
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

const normalizeTokenString = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T) : fallback;
};

const normalizeOptionalClassName = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const tokens = value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.replace(/[^a-zA-Z0-9:_-]/g, ""))
    .filter(Boolean)
    .slice(0, 8);
  return tokens.length > 0 ? tokens.join(" ") : undefined;
};

const normalizeCommonBlockLayoutAttrs = (source: Record<string, unknown>) => {
  const normalized: Record<string, unknown> = {
    align: normalizeTokenString(source.align, ALIGN_VALUES, "left"),
    width: normalizeTokenString(source.width, WIDTH_VALUES, "auto"),
    spacingTop: normalizeTokenString(source.spacingTop, SPACING_VALUES, "md"),
    spacingBottom: normalizeTokenString(source.spacingBottom, SPACING_VALUES, "md"),
    textScale: normalizeTokenString(source.textScale, TEXT_SCALE_VALUES, "md"),
    highlight: source.highlight === true,
    hideOnMobile: source.hideOnMobile === true,
  };

  const anchorId = normalizeOptionalAnchorId(source.anchorId);
  if (anchorId) {
    normalized.anchorId = anchorId;
  }

  const className = normalizeOptionalClassName(source.className);
  if (className) {
    normalized.className = className;
  }

  return normalized;
};

const normalizeBlockAttrs = (type: PostBlockType, attrs: unknown) => {
  const source = isRecord(attrs) ? attrs : {};
  const common = normalizeCommonBlockLayoutAttrs(source);

  switch (type) {
    case "toc": {
      const minLevel = normalizeTocLevel(source.minLevel, 1);
      const maxLevel = Math.max(minLevel, normalizeTocLevel(source.maxLevel, 3));
      return {
        ...common,
        title: normalizeOptionalString(source.title, 120) ?? "Table of contents",
        minLevel,
        maxLevel,
        ordered: source.ordered === true,
        hideIfEmpty: source.hideIfEmpty !== false,
      };
    }
    case "heading":
      return {
        ...common,
        level: normalizeHeadingLevel(source.level),
      };
    case "list":
      return {
        ...common,
        ordered: source.ordered === true,
        compact: source.compact === true,
      };
    case "image":
      return {
        ...common,
        mediaId:
          typeof source.mediaId === "string" && source.mediaId.trim().length > 0
            ? source.mediaId.trim()
            : null,
        alt: normalizeString(source.alt, 500),
        ...(normalizeOptionalString(source.caption, MAX_WRITING_CANVAS_CAPTION_LENGTH)
          ? {
              caption: normalizeOptionalString(
                source.caption,
                MAX_WRITING_CANVAS_CAPTION_LENGTH
              ),
            }
          : {}),
        wrap: normalizePostImageWrap(source.wrap),
        widthPercent: normalizePostImageWidth(source.widthPercent),
        marginPreset: normalizePostImageMargin(source.marginPreset),
      };
    case "callout":
      return {
        ...common,
        tone: normalizeCalloutTone(source.tone),
        showIcon: source.showIcon !== false,
      };
    case "button":
      return {
        ...common,
        label: normalizeOptionalString(source.label, 120) ?? "Button",
        url: normalizeOptionalString(source.url, 2048) ?? "",
        variant: normalizeTokenString(source.variant, BUTTON_VARIANT_VALUES, "primary"),
        size: normalizeTokenString(source.size, BUTTON_SIZE_VALUES, "md"),
        newTab: source.newTab === true,
      };
    case "embed":
      return {
        ...common,
        provider: normalizeTokenString(source.provider, EMBED_PROVIDER_VALUES, "custom"),
        url: normalizeOptionalString(source.url, 2048) ?? "",
        aspect: normalizeTokenString(source.aspect, EMBED_ASPECT_VALUES, "16:9"),
        lazy: source.lazy !== false,
      };
    case "separator":
      return {
        ...common,
        style: normalizeTokenString(source.style, SEPARATOR_STYLE_VALUES, "solid"),
        thickness:
          typeof source.thickness === "number" && Number.isFinite(source.thickness)
            ? Math.min(8, Math.max(1, Math.round(source.thickness)))
            : 1,
      };
    case "writing-canvas":
    case "paragraph":
    case "quote":
    case "code":
      return common;
    default:
      return common;
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

const normalizeWritingWrap = (value: unknown): WritingCanvasWrap => {
  if (typeof value !== "string") return "none";
  const normalized = value.trim().toLowerCase();
  return writingCanvasWrapSet.has(normalized)
    ? (normalized as WritingCanvasWrap)
    : "none";
};

const normalizeWritingWidth = (value: unknown): WritingCanvasWidth => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  const rounded = Math.round(value);
  if (!writingCanvasWidthSet.has(rounded)) return 50;
  return rounded as WritingCanvasWidth;
};

const normalizeWritingHeadingLevel = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 2 as const;
  const rounded = Math.round(value);
  if (!WRITING_CANVAS_LEVEL_VALUES.has(rounded)) return 2 as const;
  return rounded as 1 | 2 | 3 | 4 | 5 | 6;
};

const normalizeWritingAlign = (value: unknown): WritingCanvasAlign | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return writingCanvasAlignSet.has(normalized)
    ? (normalized as WritingCanvasAlign)
    : undefined;
};

const normalizeWritingListItems = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeRichTextContent(item))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_WRITING_CANVAS_LIST_ITEMS);
};

const normalizeWritingNode = (
  input: unknown,
  index: number,
  usedIds: Set<string>
): WritingCanvasNode | null => {
  if (!isRecord(input)) return null;

  const rawType = typeof input.type === "string" ? input.type.trim().toLowerCase() : "";
  if (!writingCanvasNodeTypeSet.has(rawType)) return null;

  const id = ensureUniqueWritingNodeId(sanitizeWritingNodeId(input.id, index), usedIds);
  const type = rawType as WritingCanvasNodeType;

  if (type === "paragraph") {
    const align = normalizeWritingAlign(input.align);
    return {
      id,
      type,
      text: normalizeRichTextContent(input.text ?? input.content ?? ""),
      ...(align ? { align } : {}),
    };
  }

  if (type === "heading") {
    const anchorId = normalizeOptionalAnchorId(input.anchorId);
    const align = normalizeWritingAlign(input.align);
    return {
      id,
      type,
      level: normalizeWritingHeadingLevel(input.level),
      text: normalizeRichTextContent(input.text ?? input.content ?? ""),
      ...(anchorId ? { anchorId } : {}),
      ...(align ? { align } : {}),
    };
  }

  if (type === "list") {
    const align = normalizeWritingAlign(input.align);
    return {
      id,
      type,
      ordered: input.ordered === true,
      items: normalizeWritingListItems(input.items ?? input.content),
      ...(align ? { align } : {}),
    };
  }

  if (type === "quote") {
    const align = normalizeWritingAlign(input.align);
    const variant = input.variant === "code" ? "code" : "quote";
    return {
      id,
      type,
      text: normalizeRichTextContent(input.text ?? input.content ?? ""),
      ...(align ? { align } : {}),
      ...(variant === "code" ? { variant } : {}),
    };
  }

  return {
    id,
    type: "image",
    mediaId:
      typeof input.mediaId === "string" && input.mediaId.trim().length > 0
        ? input.mediaId.trim()
        : null,
    alt: normalizeString(input.alt, 500),
    ...(normalizeOptionalString(input.caption, MAX_WRITING_CANVAS_CAPTION_LENGTH)
      ? {
          caption: normalizeOptionalString(input.caption, MAX_WRITING_CANVAS_CAPTION_LENGTH),
        }
      : {}),
    wrap: normalizeWritingWrap(input.wrap),
    widthPercent: normalizeWritingWidth(input.widthPercent),
  };
};

const normalizeWritingCanvasContent = (content: unknown): WritingCanvasContent => {
  if (typeof content === "string") {
    return {
      version: WRITING_CANVAS_VERSION,
      nodes: [
        {
          id: "node-1",
          type: "paragraph",
          text: normalizeRichTextContent(content),
        },
      ],
    };
  }

  if (!isRecord(content)) {
    return createEmptyWritingCanvasContent();
  }

  const rawNodes = Array.isArray(content.nodes) ? content.nodes : [];
  const usedIds = new Set<string>();
  const nodes = rawNodes
    .slice(0, MAX_WRITING_CANVAS_NODES)
    .map((node, index) => normalizeWritingNode(node, index, usedIds))
    .filter((node): node is WritingCanvasNode => node !== null);

  if (nodes.length === 0) {
    nodes.push(...createEmptyWritingCanvasContent().nodes);
  }

  return {
    version: WRITING_CANVAS_VERSION,
    nodes,
  };
};

const readWritingCanvasPlainText = (content: unknown) => {
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
        const parts = [
          typeof node.alt === "string" ? node.alt : "",
          typeof node.caption === "string" ? node.caption : "",
        ]
          .map((part) => part.trim())
          .filter(Boolean);
        return parts.join(" ");
      }

      return "";
    })
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
};

const normalizeBlockContent = (type: PostBlockType, content: unknown) => {
  switch (type) {
    case "list":
      return normalizeListContent(content);
    case "writing-canvas":
      return normalizeWritingCanvasContent(content);
    case "paragraph":
    case "heading":
    case "quote":
    case "callout":
      return normalizeRichTextContent(content);
    case "code":
      return normalizeString(content);
    case "separator":
      return null;
    case "toc":
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
      if (block.type === "writing-canvas") return readWritingCanvasPlainText(block.content);
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

  if (isRecord(source.typography)) {
    const fontFamily = normalizeTokenString(
      source.typography.fontFamily,
      META_FONT_FAMILY_VALUES,
      "sans"
    );
    const baseTextScale = normalizeTokenString(
      source.typography.baseTextScale,
      META_BASE_TEXT_SCALE_VALUES,
      "md"
    );
    normalized.typography = {
      fontFamily,
      baseTextScale,
    };
  }

  return normalized;
};

const createDefaultWritingCanvasBlock = (): PostBlock => ({
  id: "block-1",
  type: "writing-canvas",
  attrs: {},
  content: createEmptyWritingCanvasContent(),
});

export function createEmptyPostBlockDocument(): PostBlockDocument {
  const blocks = [createDefaultWritingCanvasBlock()];
  return {
    version: POST_BLOCK_DOCUMENT_VERSION,
    blocks,
    meta: {
      readingTimeMinutes: 0,
      typography: {
        fontFamily: "sans",
        baseTextScale: "md",
      },
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
    blocks.push(createDefaultWritingCanvasBlock());
  }

  const meta = normalizeDocumentMeta(input.meta, blocks);

  return {
    version: POST_BLOCK_DOCUMENT_VERSION,
    blocks,
    meta,
  };
}
