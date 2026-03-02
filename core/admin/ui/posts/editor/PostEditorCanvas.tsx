import { Image as ImageIcon, PlayCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MediaGrid } from "@/ui/media/MediaGrid";
import type { MediaItem } from "@/ui/media/types";
import { toMediaItem } from "@/ui/media/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import { listMediaCached } from "@/services/mediaClient";

import type {
  PostBlock,
  PostBlockDocument,
  PostBlockType,
  PostBlockDocumentMeta,
} from "../../../../services/posts/editor/postBlockDocument";
import {
  POST_IMAGE_WIDTH_VALUES,
  POST_IMAGE_WRAP_VALUES,
  buildPostImageLayoutClasses,
  resolvePostImageLayoutFromAttrs,
} from "../../../../services/posts/postImageWrapLayout";
import {
  serializePostRichText,
} from "../../../../services/posts/editor/postRichTextSerializer";
import {
  createWritingCanvasContentFromEditorHtml,
  serializeWritingCanvasContentToHtml,
} from "../../../../services/posts/editor/postPasteNormalizer";
import { getPostBlockLabel } from "./blocks/blockCatalog";
import { PostRichTextAdapter } from "./richtext/PostRichTextAdapter";
import { resolveToolbarProfileForBlockType } from "./richtext/postRichTextCommandEngine";
import type { PostInsertOptions } from "./hooks/usePostEditorState";

type PostEditorCanvasProps = {
  document: PostBlockDocument;
  title: string;
  onTitleChange: (value: string) => void;
  selectedBlockId: string | null;
  insertFocusToken: number;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlockContent: (id: string, content: unknown) => void;
  onUpdateBlockAttrs?: (id: string, patch: Record<string, unknown>) => void;
  onTransformBlock?: (id: string, targetType: PostBlockType) => void;
  onUpdateDocumentTypography?: (
    typography: NonNullable<PostBlockDocumentMeta["typography"]>
  ) => void;
  onUploadClipboardImage?: (file: File) => Promise<{ id: string; key: string; url: string }>;
  onInsertBlock: (type: PostBlockType, options?: PostInsertOptions) => void;
  onDeleteBlock?: (id: string) => void;
  onEnsureDynamicTocBlock?: () => void;
  onOpenBlockDetails?: (blockId: string) => void;
};

const richTextBlockTypes = new Set<PostBlockType>([
  "paragraph",
  "heading",
  "quote",
  "callout",
]);

const asString = (value: unknown) => (typeof value === "string" ? value : "");
const readBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const normalizeListForEdit = (value: unknown) => {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string").join("\n");
};

const parseListItems = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const resolveTypography = (meta: PostBlockDocument["meta"]) => {
  const typography =
    meta && typeof meta === "object" && "typography" in meta
      ? (meta.typography as PostBlockDocumentMeta["typography"] | undefined)
      : undefined;

  return {
    fontFamily:
      typography?.fontFamily === "serif" || typography?.fontFamily === "mono"
        ? typography.fontFamily
        : "sans",
    baseTextScale:
      typography?.baseTextScale === "sm"
      || typography?.baseTextScale === "lg"
      || typography?.baseTextScale === "xl"
        ? typography.baseTextScale
        : "md",
  } as const;
};

const buttonVariantClass: Record<string, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border bg-background hover:bg-muted",
  ghost: "hover:bg-muted",
  link: "bg-transparent p-0 text-primary underline-offset-4 hover:underline",
};

const buttonSizeClass: Record<string, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

const embedAspectPaddingTop: Record<string, string> = {
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

const resolveEmbedSrc = (provider: string, url: unknown) => {
  const safeUrl = sanitizeEmbedUrl(url);
  if (!safeUrl) return null;
  if (provider === "youtube") {
    const id = parseYoutubeId(safeUrl);
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : null;
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

const renderHtmlPreview = (value: unknown, emptyLabel: string) => {
  const html = serializePostRichText(value);
  if (!html) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div
      className="post-editor-richtext prose prose-slate max-w-none text-lg leading-relaxed text-slate-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const mediaPlaceholderClassName =
  "group flex min-h-[12rem] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100";

const resolveBlockActionLabel = (block: PostBlock) => {
  if (block.type === "writing-canvas") return "Section";
  if (block.type === "toc") return "Table of contents";
  if (block.type === "button") return "CTA block";
  if (block.type === "embed") return "Embed block";
  return getPostBlockLabel(block.type);
};

function PostCanvasBlockItem({
  block,
  selected,
  onSelect,
  onUpdateBlockContent,
  onUpdateBlockAttrs,
  onTransformBlock,
  typography,
  onUpdateTypography,
  onUploadClipboardImage,
  onInsertBlock,
  onDeleteBlock,
  onOpenImagePicker,
  mediaById,
  onEnsureDynamicTocBlock,
  onOpenBlockDetails,
}: {
  block: PostBlock;
  selected: boolean;
  onSelect: () => void;
  onUpdateBlockContent: (content: unknown) => void;
  onUpdateBlockAttrs?: (patch: Record<string, unknown>) => void;
  onTransformBlock?: (id: string, targetType: PostBlockType) => void;
  typography: {
    fontFamily: "sans" | "serif" | "mono";
    baseTextScale: "sm" | "md" | "lg" | "xl";
  };
  onUpdateTypography?: (typography: {
    fontFamily: "sans" | "serif" | "mono";
    baseTextScale: "sm" | "md" | "lg" | "xl";
  }) => void;
  onUploadClipboardImage?: (file: File) => Promise<{ id: string; key: string; url: string }>;
  onInsertBlock: (type: PostBlockType, options?: PostInsertOptions) => void;
  onDeleteBlock?: (id: string) => void;
  onOpenImagePicker?: (blockId: string) => void;
  mediaById: Map<string, MediaItem>;
  onEnsureDynamicTocBlock?: () => void;
  onOpenBlockDetails?: (blockId: string) => void;
}) {
  const attrs = (block.attrs ?? {}) as Record<string, unknown>;
  const isWritingCanvas = block.type === "writing-canvas";
  const writingCanvasHtml =
    isWritingCanvas ? serializeWritingCanvasContentToHtml(block.content) : "";
  const [writingCanvasDraftHtml, setWritingCanvasDraftHtml] = useState<string | null>(null);
  const [listDraft, setListDraft] = useState<string | null>(null);
  const listDraftValue = listDraft ?? normalizeListForEdit(block.content);

  return (
    <section
      data-post-editor-block-id={block.id}
      className={cn(
        "group relative rounded-lg px-1 py-1.5 transition",
        selected ? "ring-1 ring-primary/30" : "ring-0"
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {onDeleteBlock ? (
        <div className="absolute right-1 top-1 z-20">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-7 w-7 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive ${
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            }`}
            aria-label={`Delete block: ${resolveBlockActionLabel(block)}`}
            title="Delete selected block"
            onClick={(event) => {
              event.stopPropagation();
              onDeleteBlock(block.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {selected && block.type === "image" && onUpdateBlockAttrs ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenImagePicker?.(block.id)}
          >
            Replace image
          </Button>
          <Select
            value={
              typeof attrs.wrap === "string" && POST_IMAGE_WRAP_VALUES.includes(attrs.wrap as (typeof POST_IMAGE_WRAP_VALUES)[number])
                ? (attrs.wrap as string)
                : "none"
            }
            onValueChange={(value) => onUpdateBlockAttrs({ wrap: value })}
          >
            <SelectTrigger className="h-8 w-[8.5rem] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POST_IMAGE_WRAP_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "none" ? "No wrap" : value === "left" ? "Wrap left" : "Wrap right"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={
              typeof attrs.widthPercent === "number" && POST_IMAGE_WIDTH_VALUES.includes(attrs.widthPercent as (typeof POST_IMAGE_WIDTH_VALUES)[number])
                ? String(attrs.widthPercent)
                : "50"
            }
            onValueChange={(value) => onUpdateBlockAttrs({ widthPercent: Number(value) })}
          >
            <SelectTrigger className="h-8 w-[6rem] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POST_IMAGE_WIDTH_VALUES.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {selected && block.type === "button" && onUpdateBlockAttrs ? (
        <div
          className="mb-3 grid gap-2 rounded-lg border bg-muted/20 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
          onClick={(event) => event.stopPropagation()}
        >
          <Input
            value={typeof attrs.label === "string" ? attrs.label : "Button"}
            onChange={(event) => onUpdateBlockAttrs({ label: event.target.value })}
            placeholder="Button label"
          />
          <Input
            value={typeof attrs.url === "string" ? attrs.url : ""}
            onChange={(event) => onUpdateBlockAttrs({ url: event.target.value })}
            placeholder="https://example.com"
          />
          <Select
            value={typeof attrs.variant === "string" ? attrs.variant : "primary"}
            onValueChange={(value) => onUpdateBlockAttrs({ variant: value })}
          >
            <SelectTrigger className="h-9 w-[7.5rem] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
              <SelectItem value="link">Link</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeof attrs.size === "string" ? attrs.size : "md"}
            onValueChange={(value) => onUpdateBlockAttrs({ size: value })}
          >
            <SelectTrigger className="h-9 w-[6rem] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {selected && block.type === "embed" && onUpdateBlockAttrs ? (
        <div
          className="mb-3 grid gap-2 rounded-lg border bg-muted/20 p-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
          onClick={(event) => event.stopPropagation()}
        >
          <Input
            value={typeof attrs.url === "string" ? attrs.url : ""}
            onChange={(event) => onUpdateBlockAttrs({ url: event.target.value })}
            placeholder="https://example.com/video"
          />
          <Select
            value={typeof attrs.provider === "string" ? attrs.provider : "custom"}
            onValueChange={(value) => onUpdateBlockAttrs({ provider: value })}
          >
            <SelectTrigger className="h-9 w-[7.5rem] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="vimeo">Vimeo</SelectItem>
              <SelectItem value="loom">Loom</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeof attrs.aspect === "string" ? attrs.aspect : "16:9"}
            onValueChange={(value) => onUpdateBlockAttrs({ aspect: value })}
          >
            <SelectTrigger className="h-9 w-[6rem] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">16:9</SelectItem>
              <SelectItem value="4:3">4:3</SelectItem>
              <SelectItem value="1:1">1:1</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {selected && block.type === "list" && onUpdateBlockAttrs ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Select
            value={readBoolean(attrs.ordered, false) ? "ordered" : "unordered"}
            onValueChange={(value) =>
              onUpdateBlockAttrs({
                ordered: value === "ordered",
              })
            }
          >
            <SelectTrigger className="h-8 w-[8.5rem] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unordered">Bullet list</SelectItem>
              <SelectItem value="ordered">Ordered list</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={readBoolean(attrs.compact, false) ? "default" : "outline"}
            size="sm"
            onClick={() =>
              onUpdateBlockAttrs({
                compact: !readBoolean(attrs.compact, false),
              })
            }
          >
            Compact spacing
          </Button>
        </div>
      ) : null}

      {block.type === "writing-canvas" ? (
        selected ? (
          <PostRichTextAdapter
            value={writingCanvasDraftHtml ?? writingCanvasHtml}
            onChange={(nextHtml) => {
              setWritingCanvasDraftHtml(nextHtml);
              const nextContent = createWritingCanvasContentFromEditorHtml({
                html: nextHtml,
                previousContent: block.content,
              });
              onUpdateBlockContent(nextContent);
            }}
            onEditorBlur={(finalHtml) => {
              setWritingCanvasDraftHtml(null);
              const nextContent = createWritingCanvasContentFromEditorHtml({
                html: finalHtml,
                previousContent: block.content,
              });
              onUpdateBlockContent(nextContent);
            }}
            onPasteDirectives={(directives) => {
              if (directives.replaceWordTocWithDynamicToc) {
                onEnsureDynamicTocBlock?.();
              }
            }}
            onUploadClipboardImage={onUploadClipboardImage}
            placeholder="Start writing or paste content from Word..."
            minHeightClassName="min-h-[16rem]"
            onSlashInsertBlock={(type) =>
              onInsertBlock(type, {
                source: "slash",
                target: { mode: "after-block", blockId: block.id },
              })
            }
            onFocus={onSelect}
            toolbarProfile="writing-canvas"
            onBlockTypeChange={
              onTransformBlock
                ? (targetType, attrs) => {
                    onTransformBlock(block.id, targetType);
                    if (attrs && onUpdateBlockAttrs) {
                      onUpdateBlockAttrs(attrs);
                    }
                  }
                : undefined
            }
            blockTransformMode="type-only"
            fontFamily={typography.fontFamily}
            baseTextScale={typography.baseTextScale}
            onFontFamilyChange={(fontFamily) =>
              onUpdateTypography?.({
                ...typography,
                fontFamily,
              })
            }
            onBaseTextScaleChange={(baseTextScale) =>
              onUpdateTypography?.({
                ...typography,
                baseTextScale,
              })
            }
          />
        ) : (
          renderHtmlPreview(writingCanvasHtml, "Empty section")
        )
      ) : null}

      {block.type === "toc" ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">
            {typeof attrs.title === "string" && attrs.title.trim().length > 0
              ? attrs.title
              : "Table of contents"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Dynamic table of contents is generated from heading blocks and heading nodes.
          </p>
        </div>
      ) : null}

      {richTextBlockTypes.has(block.type) ? (
        selected ? (
          <PostRichTextAdapter
            value={asString(block.content)}
            onChange={onUpdateBlockContent}
            onUploadClipboardImage={onUploadClipboardImage}
            placeholder="Write content for this block..."
            minHeightClassName="min-h-[8rem]"
            onSlashInsertBlock={(type) =>
              onInsertBlock(type, {
                source: "slash",
                target: { mode: "after-block", blockId: block.id },
              })
            }
            onFocus={onSelect}
            toolbarProfile={resolveToolbarProfileForBlockType(block.type) ?? "paragraph"}
            onBlockTypeChange={
              onTransformBlock &&
              (block.type === "paragraph"
                || block.type === "heading"
                || block.type === "quote"
                || block.type === "callout")
                ? (targetType, attrs) => {
                    onTransformBlock(block.id, targetType);
                    if (attrs && onUpdateBlockAttrs) {
                      onUpdateBlockAttrs(attrs);
                    }
                  }
                : undefined
            }
            fontFamily={typography.fontFamily}
            baseTextScale={typography.baseTextScale}
            onFontFamilyChange={(fontFamily) =>
              onUpdateTypography?.({
                ...typography,
                fontFamily,
              })
            }
            onBaseTextScaleChange={(baseTextScale) =>
              onUpdateTypography?.({
                ...typography,
                baseTextScale,
              })
            }
          />
        ) : (
          renderHtmlPreview(block.content, "Empty block")
        )
      ) : null}

      {block.type === "code" ? (
        selected ? (
          <Textarea
            value={asString(block.content)}
            onChange={(event) => onUpdateBlockContent(event.target.value)}
            onFocus={onSelect}
            className="min-h-[12rem] font-mono"
            data-post-editor-primary-editable="true"
            placeholder="Write code block content"
          />
        ) : (
          <pre className="overflow-x-auto rounded-lg border bg-slate-50 p-3 text-xs text-slate-700">
            {asString(block.content) || "Empty code block"}
          </pre>
        )
      ) : null}

      {block.type === "list" ? (
        selected ? (
          <Textarea
            value={listDraftValue}
            onChange={(event) => setListDraft(event.target.value)}
            onFocus={() => {
              setListDraft(normalizeListForEdit(block.content));
              onSelect();
            }}
            onBlur={() => {
              onUpdateBlockContent(parseListItems(listDraftValue));
              setListDraft(null);
            }}
            className="min-h-[10rem]"
            data-post-editor-primary-editable="true"
            placeholder="One item per line"
          />
        ) : (
          <ul className="list-disc space-y-1 pl-6 text-slate-700">
            {Array.isArray(block.content) && block.content.length > 0 ? (
              block.content
                .filter((item): item is string => typeof item === "string")
                .map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>)
            ) : (
              <li className="list-none text-sm text-muted-foreground">Empty list</li>
            )}
          </ul>
        )
      ) : null}

      {block.type === "separator" ? (
        <div className="py-3">
          <hr className="border-t border-slate-200" />
        </div>
      ) : null}

      {block.type === "image" ? (
        (() => {
          const imageLayout = resolvePostImageLayoutFromAttrs(attrs);
          const mediaId =
            typeof attrs.mediaId === "string" && attrs.mediaId.trim().length > 0
              ? attrs.mediaId.trim()
              : null;
          const selectedMedia = mediaId ? mediaById.get(mediaId) : undefined;
          const src =
            selectedMedia?.url
            ?? (mediaId && (mediaId.startsWith("/") || mediaId.startsWith("http"))
              ? mediaId
              : null);
          const alt =
            typeof attrs.alt === "string" && attrs.alt.trim().length > 0
              ? attrs.alt
              : typeof selectedMedia?.alt === "string" && selectedMedia.alt.trim().length > 0
                ? selectedMedia.alt
              : "Selected image";
          if (!src) {
            return (
              <button
                type="button"
                className={mediaPlaceholderClassName}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect();
                  onOpenImagePicker?.(block.id);
                }}
                data-post-editor-media-placeholder="image"
              >
                <ImageIcon className="mb-2 h-8 w-8" />
                <p className="text-sm font-medium">Click to choose image from media library</p>
                <p className="mt-1 text-xs text-slate-500">Advanced URL/media overrides stay in Block settings.</p>
              </button>
            );
          }
          return (
            <figure
              className={cn("post-editor-richtext", buildPostImageLayoutClasses(imageLayout))}
            >
              <img
                src={src}
                alt={alt}
                className="h-auto w-full rounded-lg border object-cover"
                loading="lazy"
              />
              {typeof attrs.caption === "string" && attrs.caption.trim().length > 0 ? (
                <figcaption className="pt-2 text-xs text-slate-600">{attrs.caption}</figcaption>
              ) : null}
            </figure>
          );
        })()
      ) : null}

      {block.type === "button" ? (
        (() => {
          const label =
            typeof attrs.label === "string" && attrs.label.trim().length > 0
              ? attrs.label
              : "Button";
          const href =
            typeof attrs.url === "string" && attrs.url.trim().length > 0
              ? attrs.url.trim()
              : "#";
          const variant =
            typeof attrs.variant === "string" && buttonVariantClass[attrs.variant]
              ? attrs.variant
              : "primary";
          const size =
            typeof attrs.size === "string" && buttonSizeClass[attrs.size]
              ? attrs.size
              : "md";

          return (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center rounded-md font-medium transition",
                  buttonVariantClass[variant],
                  buttonSizeClass[size]
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelect();
                  onOpenBlockDetails?.(block.id);
                }}
                data-post-editor-media-placeholder="button"
              >
                {label}
              </button>
              <p className="mt-2 text-xs text-slate-500">Target: {href}</p>
            </div>
          );
        })()
      ) : null}

      {block.type === "embed" ? (
        (() => {
          const provider =
            typeof attrs.provider === "string" ? attrs.provider : "custom";
          const aspect =
            typeof attrs.aspect === "string" && embedAspectPaddingTop[attrs.aspect]
              ? attrs.aspect
              : "16:9";
          const src = resolveEmbedSrc(provider, attrs.url);

          if (!src) {
            return (
              <button
                type="button"
                className={mediaPlaceholderClassName}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect();
                  onOpenBlockDetails?.(block.id);
                }}
                data-post-editor-media-placeholder="embed"
              >
                <PlayCircle className="mb-2 h-8 w-8" />
                <p className="text-sm font-medium">Click to configure embed URL</p>
                <p className="mt-1 text-xs text-slate-500">Supports YouTube, Vimeo, Loom, or custom URL.</p>
              </button>
            );
          }

          return (
            <div className="overflow-hidden rounded-lg border bg-black/5">
              <div
                className="relative w-full"
                style={{ paddingTop: embedAspectPaddingTop[aspect] ?? embedAspectPaddingTop["16:9"] }}
              >
                <iframe
                  src={src}
                  loading={attrs.lazy === false ? "eager" : "lazy"}
                  title="Embed preview"
                  className="absolute inset-0 h-full w-full border-0"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          );
        })()
      ) : null}
    </section>
  );
}

export function PostEditorCanvas({
  document,
  title,
  onTitleChange,
  selectedBlockId,
  insertFocusToken,
  onSelectBlock,
  onUpdateBlockContent,
  onUpdateBlockAttrs,
  onTransformBlock,
  onUpdateDocumentTypography,
  onUploadClipboardImage,
  onInsertBlock,
  onDeleteBlock,
  onEnsureDynamicTocBlock,
  onOpenBlockDetails,
}: PostEditorCanvasProps) {
  const blockRefs = useRef(new Map<string, HTMLDivElement>());
  const [imagePickerBlockId, setImagePickerBlockId] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaQuery, setMediaQuery] = useState("");

  const typography = useMemo(() => resolveTypography(document.meta), [document.meta]);
  const mediaById = useMemo(
    () => new Map(mediaItems.map((item) => [item.id, item])),
    [mediaItems]
  );

  const filteredMediaItems = useMemo(() => {
    const normalizedQuery = mediaQuery.trim().toLowerCase();
    return mediaItems.filter((item) => {
      if (item.type !== "image") return false;
      if (!normalizedQuery) return true;
      return (
        item.name.toLowerCase().includes(normalizedQuery)
        || (item.originalName ?? "").toLowerCase().includes(normalizedQuery)
        || (item.title ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [mediaItems, mediaQuery]);

  const selectedImageMediaId = useMemo(() => {
    if (!imagePickerBlockId) return null;
    const block = document.blocks.find((item) => item.id === imagePickerBlockId);
    if (!block || block.type !== "image") return null;
    const attrs = (block.attrs ?? {}) as Record<string, unknown>;
    if (typeof attrs.mediaId !== "string") return null;
    const mediaId = attrs.mediaId.trim();
    return mediaId.length > 0 ? mediaId : null;
  }, [document.blocks, imagePickerBlockId]);

  const openImagePicker = useCallback((blockId: string) => {
    setMediaQuery("");
    setMediaError(null);
    setMediaLoading(true);
    setImagePickerBlockId(blockId);
  }, []);

  const handleMediaSelect = useCallback(
    (id: string) => {
      if (!imagePickerBlockId || !onUpdateBlockAttrs) return;
      const media = mediaById.get(id);
      const patch: Record<string, unknown> = {
        mediaId: id,
      };
      if (typeof media?.alt === "string" && media.alt.trim().length > 0) {
        patch.alt = media.alt;
      }
      if (typeof media?.caption === "string" && media.caption.trim().length > 0) {
        patch.caption = media.caption;
      }
      onUpdateBlockAttrs(imagePickerBlockId, patch);
      setImagePickerBlockId(null);
    },
    [imagePickerBlockId, mediaById, onUpdateBlockAttrs]
  );

  useEffect(() => {
    if (!selectedBlockId) return;
    const element = blockRefs.current.get(selectedBlockId);
    element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedBlockId]);

  useEffect(() => {
    if (!selectedBlockId || insertFocusToken === 0) return;
    const element = blockRefs.current.get(selectedBlockId);
    if (!element) return;

    const focusTarget = () => {
      const editable = element.querySelector<HTMLElement>(
        "[data-post-editor-primary-editable='true'], [contenteditable='true'], textarea, input"
      );
      editable?.focus({ preventScroll: true });
    };

    if (typeof window === "undefined") {
      focusTarget();
      return;
    }

    const rafId = window.requestAnimationFrame(focusTarget);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [insertFocusToken, selectedBlockId]);

  useEffect(() => {
    const imageBlocksRequireLookup = document.blocks.some((block) => {
      if (block.type !== "image") return false;
      const attrs = (block.attrs ?? {}) as Record<string, unknown>;
      if (typeof attrs.mediaId !== "string") return false;
      const mediaId = attrs.mediaId.trim();
      if (!mediaId) return false;
      if (mediaId.startsWith("/") || mediaId.startsWith("http")) return false;
      return !mediaById.has(mediaId);
    });

    if (!imageBlocksRequireLookup) return;
    let active = true;
    void listMediaCached({ force: false })
      .then((items) => {
        if (!active) return;
        setMediaItems(items.map(toMediaItem));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [document.blocks, mediaById]);

  useEffect(() => {
    if (!imagePickerBlockId) return;
    let active = true;
    void listMediaCached({ force: true })
      .then((items) => {
        if (!active) return;
        setMediaItems(items.map(toMediaItem));
      })
      .catch((error) => {
        if (!active) return;
        if (isApiClientError(error)) {
          setMediaError(error.message);
          return;
        }
        setMediaError("Failed to load media assets.");
      })
      .finally(() => {
        if (!active) return;
        setMediaLoading(false);
      });

    return () => {
      active = false;
    };
  }, [imagePickerBlockId]);

  return (
    <div
      className="flex min-h-0 flex-1 bg-background"
      onClick={() => onSelectBlock(null)}
      data-post-editor-canvas="article"
    >
      <div
        className="mx-auto flex min-h-full w-full max-w-[720px] flex-col px-4 py-10 sm:px-8 sm:py-20"
        data-post-editor-canvas-shell="true"
      >
        <div className="space-y-10">
          <div className="space-y-2">
            <Textarea
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              onFocus={(event) => {
                event.stopPropagation();
                onSelectBlock(null);
              }}
              placeholder="Enter post title..."
              className="min-h-0 resize-none border-0 p-0 text-5xl font-display font-bold leading-tight tracking-tight text-slate-900 shadow-none placeholder:text-slate-200 focus-visible:ring-0"
              rows={1}
              data-post-editor-title-input="true"
            />
          </div>

          {document.blocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
              <p className="text-sm text-muted-foreground">No blocks yet.</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() =>
                  onInsertBlock("writing-canvas", {
                    source: "outline-plus",
                    target: { mode: "index", index: 0 },
                  })
                }
              >
                Add section
              </Button>
            </div>
          ) : (
            <div className="space-y-6" data-post-editor-flow="unified">
              {document.blocks.map((block) => (
                <div
                  key={block.id}
                  ref={(element) => {
                    if (element) {
                      blockRefs.current.set(block.id, element);
                    } else {
                      blockRefs.current.delete(block.id);
                    }
                  }}
                >
                  <PostCanvasBlockItem
                    block={block}
                    selected={selectedBlockId === block.id}
                    onSelect={() => onSelectBlock(block.id)}
                    onUpdateBlockContent={(content) => onUpdateBlockContent(block.id, content)}
                    onUpdateBlockAttrs={
                      onUpdateBlockAttrs
                        ? (patch) => onUpdateBlockAttrs(block.id, patch)
                        : undefined
                    }
                    onTransformBlock={onTransformBlock}
                    typography={typography}
                    onUpdateTypography={onUpdateDocumentTypography}
                    onUploadClipboardImage={onUploadClipboardImage}
                    onInsertBlock={onInsertBlock}
                    onDeleteBlock={onDeleteBlock}
                    onOpenImagePicker={openImagePicker}
                    mediaById={mediaById}
                    onEnsureDynamicTocBlock={onEnsureDynamicTocBlock}
                    onOpenBlockDetails={onOpenBlockDetails}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(imagePickerBlockId)}
        onOpenChange={(open) => {
          if (!open) {
            setImagePickerBlockId(null);
            setMediaQuery("");
            setMediaError(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] w-[95vw] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select Image</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={mediaQuery}
              onChange={(event) => setMediaQuery(event.target.value)}
              placeholder="Search by file name, title, or original name"
            />

            {mediaError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {mediaError}
              </p>
            ) : null}

            {mediaLoading ? (
              <div className="flex min-h-[14rem] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Loading media assets...
              </div>
            ) : filteredMediaItems.length === 0 ? (
              <div className="flex min-h-[14rem] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No image assets found for this query.
              </div>
            ) : (
              <div className="max-h-[58vh] overflow-y-auto pr-1">
                <MediaGrid
                  items={filteredMediaItems}
                  selectedId={selectedImageMediaId}
                  onSelect={handleMediaSelect}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
