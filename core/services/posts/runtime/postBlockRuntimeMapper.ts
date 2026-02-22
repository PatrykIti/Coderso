import type { PostBlockType } from "../editor/postBlockDocument";
import { coercePostDocument } from "../editor/postBlockLegacyAdapter";
import {
  postRichTextToPlainText,
  serializePostRichText,
} from "../editor/postRichTextSerializer";
import { getMediaById } from "../../media/mediaService";

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

const sanitizeAnchorId = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return normalized.length > 0 ? normalized : undefined;
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

type RuntimeBlockContent = {
  html?: string;
  listItems?: string[];
  code?: string;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  ordered?: boolean;
  image?: {
    src: string | null;
    alt: string;
    caption?: string;
  };
  calloutTone?: "info" | "success" | "warning" | "danger" | "neutral";
  separatorStyle?: "solid" | "dashed" | "dotted";
  separatorThickness?: number;
  button?: RuntimeButtonConfig;
  embed?: RuntimeEmbedConfig;
  language?: string;
  showLineNumbers?: boolean;
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
  meta: {
    title?: string;
    excerpt?: string;
    readingTimeMinutes?: number;
  };
};

type MapRuntimeOptions = {
  getMediaById?: typeof getMediaById;
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
  anchorId: sanitizeAnchorId(attrs.anchorId),
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
  readMedia: typeof getMediaById
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

const readBlockPlainText = (block: PostRuntimeMappedBlock) => {
  if (block.content.html) {
    return postRichTextToPlainText(block.content.html);
  }
  if (block.content.listItems) {
    return readListItemText(block.content.listItems);
  }
  if (block.content.code) {
    return block.content.code.trim();
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
  const document = coercePostDocument(data);
  const readMedia = options?.getMediaById ?? getMediaById;
  const mediaCache = new Map<string, string | null>();

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

      if (
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
        mapped.content = {
          image: {
            src: await resolveImageSrc(mediaId, mediaCache, readMedia),
            alt: toTrimmedOptional(attrs.alt) ?? "",
            caption: toTrimmedOptional(attrs.caption),
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
      }

      if (block.type === "heading") {
        const headingLevel =
          typeof attrs.level === "number" && Number.isFinite(attrs.level)
            ? Math.round(attrs.level)
            : 2;
        mapped.content.headingLevel = clamp(headingLevel, 2, 6) as 2 | 3 | 4 | 5 | 6;
      }

      return mapped;
    })
  );

  return {
    version: document.version,
    blocks,
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
