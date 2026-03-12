import type { PostBlockType } from "../editor/postBlockDocument";
import { coercePostDocument, adaptLegacyDocumentForRuntime } from "../editor/postBlockLegacyAdapter";
import {
  postRichTextToPlainText,
  serializePostRichText,
} from "../editor/postRichTextSerializer";
import {
  resolvePostStableAnchorId,
  sanitizePostHeadingAnchorId,
} from "../editor/postDocumentOutline";
import {
  resolvePostImageLayoutFromAttrs,
  type PostImageMargin,
  type PostImageWidth,
  type PostImageWrap,
} from "../postImageWrapLayout";

type ReadMediaById = typeof import("../../media/mediaService").getMediaById;

const DEFAULT_EXCERPT_MAX_LENGTH = 220;
const META_DESCRIPTION_MAX_LENGTH = 160;

const alignValues = new Set(["left", "center", "right"]);
const widthValues = new Set(["auto", "narrow", "wide", "full"]);
const spacingValues = new Set(["none", "sm", "md", "lg"]);
const textScaleValues = new Set(["sm", "md", "lg", "xl"]);
const calloutToneValues = new Set(["info", "success", "warning", "danger", "neutral"]);
const separatorStyleValues = new Set(["solid", "dashed", "dotted"]);
const buttonVariantValues = new Set(["primary", "secondary", "ghost", "link"]);
const buttonSizeValues = new Set(["sm", "md", "lg"]);
const embedProviderValues = new Set(["custom", "youtube", "vimeo", "loom"]);
const embedAspectValues = new Set(["16:9", "4:3", "1:1"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toTrimmedOptional = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeToken = (
  value: unknown,
  allowed: Set<string>,
  fallback: string
) => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return allowed.has(normalized) ? normalized : fallback;
};

const sanitizeClassName = (value: unknown) => {
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

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
};

const isSafeHref = (value: string) =>
  value.startsWith("/") ||
  value.startsWith("#") ||
  value.startsWith("?") ||
  value.startsWith("http://") ||
  value.startsWith("https://") ||
  value.startsWith("mailto:") ||
  value.startsWith("tel:");

const sanitizeHref = (value: unknown) => {
  const trimmed = toTrimmedOptional(value);
  if (!trimmed) return "#";
  return isSafeHref(trimmed) ? trimmed : "#";
};

const sanitizeEmbedUrl = (value: unknown) => {
  const trimmed = toTrimmedOptional(value);
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return null;
};

const parseYoutubeId = (value: string) => {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return videoId;
      const split = parsed.pathname.split("/").filter(Boolean);
      return split[1] ?? split[0] ?? null;
    }
    if (host.includes("youtu.be")) {
      const [id] = parsed.pathname.split("/").filter(Boolean);
      return id ?? null;
    }
  } catch {
    return null;
  }
  return null;
};

const parseVimeoId = (value: string) => {
  try {
    const parsed = new URL(value);
    const split = parsed.pathname.split("/").filter(Boolean);
    for (let index = split.length - 1; index >= 0; index -= 1) {
      const token = split[index];
      if (/^\d+$/.test(token)) return token;
    }
  } catch {
    return null;
  }
  return null;
};

const parseLoomId = (value: string) => {
  try {
    const parsed = new URL(value);
    const split = parsed.pathname.split("/").filter(Boolean);
    const index = split.findIndex((token) => token === "share" || token === "embed");
    if (index !== -1) return split[index + 1] ?? null;
  } catch {
    return null;
  }
  return null;
};

const resolveEmbedSrc = (provider: string, url: string | null) => {
  if (!url) return null;
  if (provider === "youtube") {
    const id = parseYoutubeId(url);
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
  }
  if (provider === "vimeo") {
    const id = parseVimeoId(url);
    return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
  }
  if (provider === "loom") {
    const id = parseLoomId(url);
    return id ? `https://www.loom.com/embed/${encodeURIComponent(id)}` : null;
  }
  return url;
};

type RuntimeBlockLayout = {
  align: "left" | "center" | "right";
  width: "auto" | "narrow" | "wide" | "full";
  spacingTop: "none" | "sm" | "md" | "lg";
  spacingBottom: "none" | "sm" | "md" | "lg";
  textScale: "sm" | "md" | "lg" | "xl";
  highlight: boolean;
  hideOnMobile: boolean;
  anchorId?: string;
  className?: string;
};

type RuntimeButtonConfig = {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "ghost" | "link";
  size: "sm" | "md" | "lg";
  newTab: boolean;
};

type RuntimeEmbedConfig = {
  src: string | null;
  provider: "custom" | "youtube" | "vimeo" | "loom";
  aspect: "16:9" | "4:3" | "1:1";
  lazy: boolean;
};

type RuntimeWritingCanvasParagraphNode = {
  id: string;
  type: "paragraph";
  html: string;
  align?: "left" | "center" | "right";
};

type RuntimeWritingCanvasHeadingNode = {
  id: string;
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  html: string;
  anchorId?: string;
  align?: "left" | "center" | "right";
};

type RuntimeWritingCanvasListNode = {
  id: string;
  type: "list";
  ordered: boolean;
  items: string[];
  align?: "left" | "center" | "right";
};

type RuntimeWritingCanvasQuoteNode = {
  id: string;
  type: "quote";
  html: string;
  align?: "left" | "center" | "right";
  variant?: "quote" | "code";
};

type RuntimeWritingCanvasImageNode = {
  id: string;
  type: "image";
  src: string | null;
  alt: string;
  caption?: string;
  wrap: PostImageWrap;
  widthPercent: PostImageWidth;
  marginPreset: PostImageMargin;
};

export type RuntimeWritingCanvasNode =
  | RuntimeWritingCanvasParagraphNode
  | RuntimeWritingCanvasHeadingNode
  | RuntimeWritingCanvasListNode
  | RuntimeWritingCanvasQuoteNode
  | RuntimeWritingCanvasImageNode;

type RuntimeTocItem = {
  anchorId: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
};

type RuntimeBlockContent = {
  html?: string;
  listItems?: string[];
  code?: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  ordered?: boolean;
  image?: {
    src: string | null;
    alt: string;
    caption?: string;
    wrap: PostImageWrap;
    widthPercent: PostImageWidth;
    marginPreset: PostImageMargin;
  };
  calloutTone?: "info" | "success" | "warning" | "danger" | "neutral";
  separatorStyle?: "solid" | "dashed" | "dotted";
  separatorThickness?: number;
  button?: RuntimeButtonConfig;
  embed?: RuntimeEmbedConfig;
  language?: string;
  showLineNumbers?: boolean;
  writingCanvas?: {
    nodes: RuntimeWritingCanvasNode[];
  };
  toc?: {
    title: string;
    minLevel: 1 | 2 | 3 | 4 | 5 | 6;
    maxLevel: 1 | 2 | 3 | 4 | 5 | 6;
    ordered: boolean;
    hideIfEmpty: boolean;
    items: RuntimeTocItem[];
  };
};

export type PostRuntimeMappedBlock = {
  id: string;
  type: PostBlockType;
  layout: RuntimeBlockLayout;
  content: RuntimeBlockContent;
};

export type PostRuntimeMappedDocument = {
  version: number;
  blocks: PostRuntimeMappedBlock[];
  warnings: string[];
  meta: {
    title?: string;
    excerpt?: string;
    readingTimeMinutes?: number;
  };
};

type MapRuntimeOptions = {
  getMediaById?: ReadMediaById;
};

const resolveRuntimeLayout = (attrs: Record<string, unknown>): RuntimeBlockLayout => ({
  align: normalizeToken(attrs.align, alignValues, "left") as RuntimeBlockLayout["align"],
  width: normalizeToken(attrs.width, widthValues, "auto") as RuntimeBlockLayout["width"],
  spacingTop: normalizeToken(
    attrs.spacingTop,
    spacingValues,
    "md"
  ) as RuntimeBlockLayout["spacingTop"],
  spacingBottom: normalizeToken(
    attrs.spacingBottom,
    spacingValues,
    "md"
  ) as RuntimeBlockLayout["spacingBottom"],
  textScale: normalizeToken(
    attrs.textScale,
    textScaleValues,
    "md"
  ) as RuntimeBlockLayout["textScale"],
  highlight: attrs.highlight === true,
  hideOnMobile: attrs.hideOnMobile === true,
  anchorId: sanitizePostHeadingAnchorId(attrs.anchorId),
  className: sanitizeClassName(attrs.className),
});

const mapRichTextBlock = (content: unknown) => ({ html: serializePostRichText(content) });

const mapListItems = (content: unknown) => {
  if (!Array.isArray(content)) return [];
  return content
    .filter((item): item is string => typeof item === "string")
    .map((item) => serializePostRichText(item))
    .filter((item) => item.length > 0);
};

const resolveImageSrc = async (
  mediaId: string | null,
  mediaCache: Map<string, string | null>,
  readMedia: ReadMediaById
) => {
  if (!mediaId) return null;
  if (mediaId.startsWith("http://") || mediaId.startsWith("https://")) return mediaId;
  if (mediaId.startsWith("/")) return mediaId;

  if (mediaCache.has(mediaId)) {
    return mediaCache.get(mediaId) ?? null;
  }

  try {
    const media = await readMedia(mediaId);
    const url = typeof media?.url === "string" ? media.url : null;
    mediaCache.set(mediaId, url);
    return url;
  } catch {
    mediaCache.set(mediaId, null);
    return null;
  }
};

const getDefaultMediaReader = async (): Promise<ReadMediaById> => {
  const { getMediaById } = await import("../../media/mediaService");
  return getMediaById;
};

const pushRuntimeWarning = (warnings: string[], warning: string | undefined) => {
  if (!warning) return;
  if (warnings.includes(warning)) return;
  warnings.push(warning);
};

const toNodeId = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toHeadingLevel = (value: unknown): 1 | 2 | 3 | 4 | 5 | 6 => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 2;
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded === 2) return 2;
  if (rounded === 3) return 3;
  if (rounded === 4) return 4;
  if (rounded === 5) return 5;
  return 6;
};

const toHeadingBoundLevel = (value: unknown, fallback: 1 | 2 | 3 | 4 | 5 | 6) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return toHeadingLevel(value);
};

const toOptionalAlign = (value: unknown): "left" | "center" | "right" | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return alignValues.has(normalized) ? (normalized as "left" | "center" | "right") : undefined;
};

const mapWritingCanvasNodesForRuntime = async (
  content: unknown,
  blockId: string,
  mediaCache: Map<string, string | null>,
  readMedia: ReadMediaById,
  warnings: string[]
): Promise<RuntimeWritingCanvasNode[]> => {
  if (!isRecord(content) || !Array.isArray(content.nodes)) {
    pushRuntimeWarning(warnings, `runtime_writing_canvas_invalid_content:${blockId}`);
    return [];
  }

  const nodes: RuntimeWritingCanvasNode[] = [];
  let ordinal = 1;

  for (const node of content.nodes) {
    if (!isRecord(node)) {
      pushRuntimeWarning(warnings, `runtime_writing_canvas_invalid_node:${blockId}:${ordinal}`);
      ordinal += 1;
      continue;
    }

    const type = typeof node.type === "string" ? node.type.trim().toLowerCase() : "";
    const nodeId = toNodeId(node.id, `${blockId}-node-${ordinal}`);

    if (type === "paragraph") {
      const align = toOptionalAlign(node.align);
      nodes.push({
        id: nodeId,
        type: "paragraph",
        html: serializePostRichText(typeof node.text === "string" ? node.text : ""),
        ...(align ? { align } : {}),
      });
      ordinal += 1;
      continue;
    }

    if (type === "heading") {
      const align = toOptionalAlign(node.align);
      nodes.push({
        id: nodeId,
        type: "heading",
        level: toHeadingLevel(node.level),
        html: serializePostRichText(typeof node.text === "string" ? node.text : ""),
        anchorId: sanitizePostHeadingAnchorId(node.anchorId),
        ...(align ? { align } : {}),
      });
      ordinal += 1;
      continue;
    }

    if (type === "quote") {
      const align = toOptionalAlign(node.align);
      nodes.push({
        id: nodeId,
        type: "quote",
        html: serializePostRichText(typeof node.text === "string" ? node.text : ""),
        ...(align ? { align } : {}),
        ...(node.variant === "code" ? { variant: "code" as const } : {}),
      });
      ordinal += 1;
      continue;
    }

    if (type === "list") {
      const items = Array.isArray(node.items)
        ? node.items
            .filter((item): item is string => typeof item === "string")
            .map((item) => serializePostRichText(item))
            .filter((item) => postRichTextToPlainText(item).trim().length > 0)
        : [];
      if (items.length === 0) {
        pushRuntimeWarning(warnings, `runtime_writing_canvas_empty_list:${blockId}:${nodeId}`);
      } else {
        const align = toOptionalAlign(node.align);
        nodes.push({
          id: nodeId,
          type: "list",
          ordered: node.ordered === true,
          items,
          ...(align ? { align } : {}),
        });
      }
      ordinal += 1;
      continue;
    }

    if (type === "image") {
      const mediaId =
        typeof node.mediaId === "string" && node.mediaId.trim().length > 0
          ? node.mediaId.trim()
          : null;
      const imageLayout = resolvePostImageLayoutFromAttrs({
        wrap: node.wrap,
        widthPercent: node.widthPercent,
        marginPreset: node.marginPreset,
      });
      nodes.push({
        id: nodeId,
        type: "image",
        src: await resolveImageSrc(mediaId, mediaCache, readMedia),
        alt: typeof node.alt === "string" ? node.alt : "",
        ...(typeof node.caption === "string" && node.caption.trim().length > 0
          ? { caption: node.caption.trim() }
          : {}),
        wrap: imageLayout.wrap,
        widthPercent: imageLayout.widthPercent,
        marginPreset: imageLayout.marginPreset,
      });
      ordinal += 1;
      continue;
    }

    pushRuntimeWarning(warnings, `runtime_writing_canvas_node_dropped:${blockId}:${nodeId}:${type}`);
    ordinal += 1;
  }

  return nodes;
};

const readListItemText = (items: string[]) =>
  items
    .map((item) => postRichTextToPlainText(item))
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");

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

const readRuntimeWritingCanvasText = (nodes: RuntimeWritingCanvasNode[]) =>
  nodes
    .map((node) => {
      if (node.type === "paragraph" || node.type === "heading" || node.type === "quote") {
        return postRichTextToPlainText(node.html);
      }
      if (node.type === "list") {
        return node.items
          .map((item) => postRichTextToPlainText(item))
          .join(" ");
      }
      if (node.type === "image") {
        return `${node.alt} ${node.caption ?? ""}`.trim();
      }
      return "";
    })
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");

const buildRuntimeHeadingIndex = (blocks: PostRuntimeMappedBlock[]) => {
  const usedAnchors = new Set<string>();
  const items: RuntimeTocItem[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      const text = postRichTextToPlainText(block.content.html ?? "").trim();
      if (!text) continue;
      const level = block.content.headingLevel ?? 2;
      const anchorId = resolvePostStableAnchorId(
        block.layout.anchorId,
        text,
        `heading-${block.id}`,
        usedAnchors
      );
      block.layout.anchorId = anchorId;
      items.push({
        anchorId,
        level,
        text,
      });
      continue;
    }

    if (block.type !== "writing-canvas") {
      continue;
    }

    const nodes = block.content.writingCanvas?.nodes ?? [];
    for (const node of nodes) {
      if (node.type !== "heading") continue;
      const text = postRichTextToPlainText(node.html).trim();
      if (!text) continue;
      const anchorId = resolvePostStableAnchorId(
        node.anchorId,
        text,
        `heading-${block.id}-${node.id}`,
        usedAnchors
      );
      node.anchorId = anchorId;
      items.push({
        anchorId,
        level: node.level,
        text,
      });
    }
  }

  return items;
};

const readBlockPlainText = (block: PostRuntimeMappedBlock) => {
  if (block.content.writingCanvas?.nodes) {
    return readRuntimeWritingCanvasText(block.content.writingCanvas.nodes);
  }
  if (block.content.html) {
    return postRichTextToPlainText(block.content.html);
  }
  if (block.content.listItems) {
    return readListItemText(block.content.listItems);
  }
  if (block.content.code) {
    return block.content.code.trim();
  }
  if (block.content.toc?.items) {
    return block.content.toc.items.map((item) => item.text).join(" ").trim();
  }
  if (block.content.button?.label) {
    return block.content.button.label.trim();
  }
  return "";
};

export async function mapPostDocumentForRuntime(
  data: unknown,
  options?: MapRuntimeOptions
): Promise<PostRuntimeMappedDocument> {
  const baseDocument = coercePostDocument(data);
  const runtimeLegacy = adaptLegacyDocumentForRuntime(baseDocument);
  const document = runtimeLegacy.document;
  const readMedia: ReadMediaById = async (mediaId) => {
    const resolver = options?.getMediaById ?? (await getDefaultMediaReader());
    return resolver(mediaId);
  };
  const mediaCache = new Map<string, string | null>();
  const warnings = [...runtimeLegacy.warnings];

  const blocks = await Promise.all(
    document.blocks.map(async (block) => {
      const attrs = isRecord(block.attrs) ? block.attrs : {};
      const layout = resolveRuntimeLayout(attrs);
      const mapped: PostRuntimeMappedBlock = {
        id: block.id,
        type: block.type,
        layout,
        content: {},
      };

      if (block.type === "writing-canvas") {
        mapped.content = {
          writingCanvas: {
            nodes: await mapWritingCanvasNodesForRuntime(
              block.content,
              block.id,
              mediaCache,
              readMedia,
              warnings
            ),
          },
        };
      } else if (
        block.type === "paragraph" ||
        block.type === "heading" ||
        block.type === "quote" ||
        block.type === "callout"
      ) {
        const richText = mapRichTextBlock(block.content);
        mapped.content =
          block.type === "callout"
            ? {
                ...richText,
                calloutTone: normalizeToken(
                  attrs.tone,
                  calloutToneValues,
                  "info"
                ) as RuntimeBlockContent["calloutTone"],
              }
            : richText;
      } else if (block.type === "list") {
        mapped.content = {
          listItems: mapListItems(block.content),
          ordered: attrs.ordered === true,
        };
      } else if (block.type === "code") {
        mapped.content = {
          code: typeof block.content === "string" ? block.content : "",
          language: toTrimmedOptional(attrs.language),
          showLineNumbers: attrs.showLineNumbers === true,
        };
      } else if (block.type === "image") {
        const mediaId = toTrimmedOptional(attrs.mediaId) ?? null;
        const imageLayout = resolvePostImageLayoutFromAttrs(attrs);
        mapped.content = {
          image: {
            src: await resolveImageSrc(mediaId, mediaCache, readMedia),
            alt: toTrimmedOptional(attrs.alt) ?? "",
            caption: toTrimmedOptional(attrs.caption),
            wrap: imageLayout.wrap,
            widthPercent: imageLayout.widthPercent,
            marginPreset: imageLayout.marginPreset,
          },
        };
      } else if (block.type === "separator") {
        mapped.content = {
          separatorStyle: normalizeToken(
            attrs.style,
            separatorStyleValues,
            "solid"
          ) as RuntimeBlockContent["separatorStyle"],
          separatorThickness: clamp(
            typeof attrs.thickness === "number" ? attrs.thickness : 1,
            1,
            8
          ),
        };
      } else if (block.type === "button") {
        mapped.content = {
          button: {
            label: toTrimmedOptional(attrs.label) ?? "Button",
            href: sanitizeHref(attrs.url),
            variant: normalizeToken(
              attrs.variant,
              buttonVariantValues,
              "primary"
            ) as RuntimeButtonConfig["variant"],
            size: normalizeToken(
              attrs.size,
              buttonSizeValues,
              "md"
            ) as RuntimeButtonConfig["size"],
            newTab: attrs.newTab === true,
          },
        };
      } else if (block.type === "embed") {
        const provider = normalizeToken(
          attrs.provider,
          embedProviderValues,
          "custom"
        ) as RuntimeEmbedConfig["provider"];
        const rawUrl = sanitizeEmbedUrl(attrs.url);
        mapped.content = {
          embed: {
            provider,
            src: resolveEmbedSrc(provider, rawUrl),
            aspect: normalizeToken(
              attrs.aspect,
              embedAspectValues,
              "16:9"
            ) as RuntimeEmbedConfig["aspect"],
            lazy: attrs.lazy !== false,
          },
        };
      } else if (block.type === "toc") {
        const minLevel = toHeadingBoundLevel(attrs.minLevel, 1);
        const maxLevelCandidate = toHeadingBoundLevel(attrs.maxLevel, 3);
        const maxLevel = (maxLevelCandidate < minLevel ? minLevel : maxLevelCandidate) as
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6;
        mapped.content = {
          toc: {
            title: toTrimmedOptional(attrs.title) ?? "Table of contents",
            minLevel,
            maxLevel,
            ordered: attrs.ordered === true,
            hideIfEmpty: attrs.hideIfEmpty !== false,
            items: [],
          },
        };
      } else {
        pushRuntimeWarning(warnings, `runtime_block_unsupported:${block.id}:${block.type}`);
      }

      if (block.type === "heading") {
        const headingLevel =
          typeof attrs.level === "number" && Number.isFinite(attrs.level)
            ? Math.round(attrs.level)
            : 2;
        mapped.content.headingLevel = clamp(headingLevel, 1, 6) as 1 | 2 | 3 | 4 | 5 | 6;
      }

      return mapped;
    })
  );

  const headingIndex = buildRuntimeHeadingIndex(blocks);
  for (const block of blocks) {
    if (block.type !== "toc") continue;
    const toc = block.content.toc;
    if (!toc) continue;
    toc.items = headingIndex.filter(
      (item) => item.level >= toc.minLevel && item.level <= toc.maxLevel
    );
  }

  return {
    version: document.version,
    blocks,
    warnings,
    meta: {
      ...(typeof document.meta.title === "string"
        ? { title: document.meta.title }
        : {}),
      ...(typeof document.meta.excerpt === "string"
        ? { excerpt: document.meta.excerpt }
        : {}),
      ...(typeof document.meta.readingTimeMinutes === "number"
        ? { readingTimeMinutes: document.meta.readingTimeMinutes }
        : {}),
    },
  };
}

const resolveDocumentExcerpt = (data: Record<string, unknown>, maxLength: number) => {
  const document = coercePostDocument(data);
  const fromMeta = toTrimmedOptional(document.meta.excerpt);
  if (fromMeta) return truncate(fromMeta, maxLength);

  const runtimeBlocks = document.blocks
    .map((block) => {
      if (block.type === "list" && Array.isArray(block.content)) {
        return block.content
          .filter((item): item is string => typeof item === "string")
          .join(" ");
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

export function resolvePostRuntimeExcerpt(
  data: unknown,
  maxLength = DEFAULT_EXCERPT_MAX_LENGTH
) {
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
    const plain = stripHtml(candidate);
    if (!plain) continue;
    return truncate(plain, normalizedMax);
  }

  return resolveDocumentExcerpt(data, normalizedMax);
}

export function resolvePostRuntimeMetaDescription(data: unknown) {
  return resolvePostRuntimeExcerpt(data, META_DESCRIPTION_MAX_LENGTH) ?? null;
}

export function isPostContentTypeSlug(slug: string | undefined | null) {
  if (typeof slug !== "string") return false;
  const normalized = slug.trim().toLowerCase();
  return normalized === "post" || normalized === "posts";
}

export function getPostRuntimePlainText(document: PostRuntimeMappedDocument) {
  const parts = document.blocks.map((block) => readBlockPlainText(block));
  return parts
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}
