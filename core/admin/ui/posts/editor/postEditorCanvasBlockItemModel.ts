import type { MediaItem } from "@/ui/media/types";
import type { PostBlock, PostBlockType } from "../../../../services/posts/editor/postBlockDocument";
import { toYoutubeEmbedUrl } from "../../../../services/posts/shared/videoEmbed";
import { getPostBlockLabel } from "./blocks/blockCatalog";

export const richTextBlockTypes = new Set<PostBlockType>([
  "paragraph",
  "heading",
  "quote",
  "callout",
]);

export const asString = (value: unknown) => (typeof value === "string" ? value : "");
export const readBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

export const normalizeListForEdit = (value: unknown) => {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string").join("\n");
};

export const parseListItems = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

export const buttonVariantClass: Record<string, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border bg-background hover:bg-muted",
  ghost: "hover:bg-muted",
  link: "bg-transparent p-0 text-primary underline-offset-4 hover:underline",
};

export const buttonSizeClass: Record<string, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export const embedAspectPaddingTop: Record<string, string> = {
  "16:9": "56.25%",
  "4:3": "75%",
  "1:1": "100%",
};

const sanitizeEmbedUrl = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
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

export const resolveEmbedSrc = (provider: string, url: unknown) => {
  const safeUrl = sanitizeEmbedUrl(url);
  if (!safeUrl) return null;
  if (provider === "youtube") {
    return toYoutubeEmbedUrl(safeUrl);
  }
  if (provider === "vimeo") {
    const id = parseVimeoId(safeUrl);
    return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}` : null;
  }
  if (provider === "loom") {
    const id = parseLoomId(safeUrl);
    return id ? `https://www.loom.com/embed/${encodeURIComponent(id)}` : null;
  }
  return safeUrl;
};

export const writingCanvasPlaceholder = "Start writing or paste content from Word...";

export const mediaPlaceholderClassName =
  "group flex min-h-[12rem] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100";

export type MediaPickerKind = "image" | "video" | "gallery" | "audio" | "file";

export const mediaKindByPicker: Record<MediaPickerKind, MediaItem["type"]> = {
  image: "image",
  video: "video",
  gallery: "image",
  audio: "audio",
  file: "document",
};

export const getMediaDisplayName = (item: MediaItem | undefined, fallback: string) =>
  item?.title?.trim() || item?.originalName?.trim() || item?.name?.trim() || fallback;

export const formatMediaSize = (bytes: number | undefined) => {
  if (!bytes || !Number.isFinite(bytes)) return null;
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

export const readMediaId = (attrs: Record<string, unknown>) =>
  typeof attrs.mediaId === "string" && attrs.mediaId.trim().length > 0
    ? attrs.mediaId.trim()
    : null;

export const readMediaIds = (attrs: Record<string, unknown>) =>
  Array.isArray(attrs.mediaIds)
    ? attrs.mediaIds
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

export const resolveMediaSource = (
  attrs: Record<string, unknown>,
  mediaById: Map<string, MediaItem>,
  expectedType: MediaItem["type"]
) => {
  const mediaId = readMediaId(attrs);
  const candidate = mediaId ? mediaById.get(mediaId) : undefined;
  const selectedMedia = candidate?.type === expectedType ? candidate : undefined;
  const legacyUrl =
    typeof attrs.url === "string" && attrs.url.trim().length > 0 ? attrs.url.trim() : null;
  const url = selectedMedia?.url ?? legacyUrl;
  return { mediaId, selectedMedia, url };
};

export const resolveBlockActionLabel = (block: PostBlock) => {
  if (block.type === "writing-canvas") return "Section";
  if (block.type === "toc") return "Table of contents";
  if (block.type === "button") return "CTA block";
  if (block.type === "embed") return "Embed block";
  return getPostBlockLabel(block.type);
};
