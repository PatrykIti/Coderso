import {
  FileAudio,
  FileText,
  Image as ImageIcon,
  Images,
  PlayCircle,
  Trash2,
  Video,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/ui/media/types";
import type { PostBlock, PostBlockType } from "../../../../services/posts/editor/postBlockDocument";
import {
  POST_IMAGE_WIDTH_VALUES,
  POST_IMAGE_WRAP_VALUES,
  buildPostImageLayoutClasses,
  resolvePostImageLayoutFromAttrs,
} from "../../../../services/posts/postImageWrapLayout";
import {
  postRichTextToPlainText,
  serializePostRichText,
} from "../../../../services/posts/editor/postRichTextSerializer";
import { renderPostRichTextHtml } from "../../../../services/posts/runtime/postRichTextReactRenderer";
import {
  createWritingCanvasContentFromEditorHtml,
  serializeWritingCanvasContentToHtml,
} from "../../../../services/posts/editor/postPasteNormalizer";
import { PostRichTextAdapter } from "./richtext/PostRichTextAdapter";
import { resolveToolbarProfileForBlockType } from "./richtext/postRichTextCommandEngine";
import type { PostInsertOptions } from "./hooks/usePostEditorState";
import type { MediaPickerKind } from "./postEditorCanvasBlockItemModel";
import {
  asString,
  buttonSizeClass,
  buttonVariantClass,
  embedAspectPaddingTop,
  formatMediaSize,
  getMediaDisplayName,
  mediaKindByPicker,
  mediaPlaceholderClassName,
  normalizeListForEdit,
  parseListItems,
  readBoolean,
  readMediaIds,
  resolveBlockActionLabel,
  resolveEmbedSrc,
  resolveMediaSource,
  richTextBlockTypes,
  writingCanvasPlaceholder,
} from "./postEditorCanvasBlockItemModel";

const renderHtmlPreview = (value: unknown, emptyLabel: string) => {
  const html = serializePostRichText(value);
  const text = postRichTextToPlainText(value);
  if (!text) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="post-editor-richtext prose prose-slate max-w-none text-lg leading-relaxed text-slate-700">
      {renderPostRichTextHtml(html)}
    </div>
  );
};

export function PostCanvasBlockItem({
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
  onOpenMediaPicker,
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
  onOpenMediaPicker?: (blockId: string, kind: MediaPickerKind) => void;
  mediaById: Map<string, MediaItem>;
  onEnsureDynamicTocBlock?: () => void;
  onOpenBlockDetails?: (blockId: string) => void;
}) {
  const attrs = (block.attrs ?? {}) as Record<string, unknown>;
  const isWritingCanvas = block.type === "writing-canvas";
  const writingCanvasHtml = isWritingCanvas
    ? serializeWritingCanvasContentToHtml(block.content)
    : "";
  const [writingCanvasDraftHtml, setWritingCanvasDraftHtml] = useState<string | null>(null);
  const [listDraft, setListDraft] = useState<string | null>(null);
  const listDraftValue = listDraft ?? normalizeListForEdit(block.content);

  return (
    <section
      data-post-editor-block-id={block.id}
      className={cn(
        "group relative rounded-lg px-1 py-1.5 transition",
        selected ? "ring-primary/30" : "ring-0"
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
              selected
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
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
          className="mb-3 flex flex-wrap items-center gap-2 bg-muted/20 p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenMediaPicker?.(block.id, "image")}
          >
            Replace image
          </Button>
          <Select
            value={
              typeof attrs.wrap === "string" &&
              POST_IMAGE_WRAP_VALUES.includes(attrs.wrap as (typeof POST_IMAGE_WRAP_VALUES)[number])
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
              typeof attrs.widthPercent === "number" &&
              POST_IMAGE_WIDTH_VALUES.includes(
                attrs.widthPercent as (typeof POST_IMAGE_WIDTH_VALUES)[number]
              )
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
          className="mb-3 grid gap-2 bg-muted/20 p-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
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

      {selected && block.type === "video" && onUpdateBlockAttrs ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 bg-muted/20 p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenMediaPicker?.(block.id, "video")}
          >
            Replace video
          </Button>
          <Input
            value={typeof attrs.caption === "string" ? attrs.caption : ""}
            onChange={(event) => onUpdateBlockAttrs({ caption: event.target.value })}
            placeholder="Video caption"
            className="h-9 min-w-[12rem] flex-1"
          />
        </div>
      ) : null}

      {selected && block.type === "gallery" && onUpdateBlockAttrs ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 bg-muted/20 p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenMediaPicker?.(block.id, "gallery")}
          >
            Select gallery images
          </Button>
          <Select
            value={typeof attrs.columns === "number" ? String(attrs.columns) : "3"}
            onValueChange={(value) => onUpdateBlockAttrs({ columns: Number(value) })}
          >
            <SelectTrigger className="h-8 w-[7.5rem] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 columns</SelectItem>
              <SelectItem value="3">3 columns</SelectItem>
              <SelectItem value="4">4 columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {selected && block.type === "audio" && onUpdateBlockAttrs ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 bg-muted/20 p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenMediaPicker?.(block.id, "audio")}
          >
            Replace audio
          </Button>
          <Input
            value={typeof attrs.caption === "string" ? attrs.caption : ""}
            onChange={(event) => onUpdateBlockAttrs({ caption: event.target.value })}
            placeholder="Audio caption"
            className="h-9 min-w-[12rem] flex-1"
          />
        </div>
      ) : null}

      {selected && block.type === "file" && onUpdateBlockAttrs ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 bg-muted/20 p-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenMediaPicker?.(block.id, "file")}
          >
            Replace file
          </Button>
          <Input
            value={typeof attrs.label === "string" ? attrs.label : "Download file"}
            onChange={(event) => onUpdateBlockAttrs({ label: event.target.value })}
            placeholder="Download label"
            className="h-9 min-w-[12rem] flex-1"
          />
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
            placeholder={writingCanvasPlaceholder}
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
          renderHtmlPreview(writingCanvasHtml, writingCanvasPlaceholder)
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
              (block.type === "paragraph" ||
                block.type === "heading" ||
                block.type === "quote" ||
                block.type === "callout")
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
          renderHtmlPreview(block.content, "Write content for this block...")
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
            {asString(block.content) || "Write code for this block..."}
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
              <li className="list-none text-sm text-muted-foreground">One item per line...</li>
            )}
          </ul>
        )
      ) : null}

      {block.type === "separator" ? (
        <div className="py-3">
          <hr className="border-t border-slate-200" />
        </div>
      ) : null}

      {block.type === "image"
        ? (() => {
            const imageLayout = resolvePostImageLayoutFromAttrs(attrs);
            const mediaId =
              typeof attrs.mediaId === "string" && attrs.mediaId.trim().length > 0
                ? attrs.mediaId.trim()
                : null;
            const candidate = mediaId ? mediaById.get(mediaId) : undefined;
            const selectedMedia =
              candidate?.type === mediaKindByPicker.image ? candidate : undefined;
            const src =
              selectedMedia?.url ??
              (mediaId && (mediaId.startsWith("/") || mediaId.startsWith("http")) ? mediaId : null);
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
                    onOpenMediaPicker?.(block.id, "image");
                  }}
                  data-post-editor-media-placeholder="image"
                >
                  <ImageIcon className="mb-2 h-8 w-8" />
                  <p className="text-sm font-medium">Click to choose image from media library</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Advanced URL/media overrides stay in Block settings.
                  </p>
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
        : null}

      {block.type === "video"
        ? (() => {
            const { selectedMedia, url } = resolveMediaSource(
              attrs,
              mediaById,
              mediaKindByPicker.video
            );
            const caption =
              typeof attrs.caption === "string" && attrs.caption.trim().length > 0
                ? attrs.caption.trim()
                : selectedMedia?.caption?.trim();
            if (!url) {
              return (
                <button
                  type="button"
                  className={mediaPlaceholderClassName}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect();
                    onOpenMediaPicker?.(block.id, "video");
                  }}
                  data-post-editor-media-placeholder="video"
                >
                  <Video className="mb-2 h-8 w-8" />
                  <p className="text-sm font-medium">Click to choose video from media library</p>
                  <p className="mt-1 text-xs text-slate-500">Supports uploaded video assets.</p>
                </button>
              );
            }
            return (
              <figure className="space-y-2 rounded-lg border bg-black/5 p-2">
                <video
                  src={url}
                  controls={attrs.controls !== false}
                  preload="metadata"
                  className="aspect-video w-full rounded-md bg-black"
                />
                {caption ? (
                  <figcaption className="px-1 text-xs text-slate-600">{caption}</figcaption>
                ) : null}
              </figure>
            );
          })()
        : null}

      {block.type === "gallery"
        ? (() => {
            const mediaIds = readMediaIds(attrs).slice(0, 12);
            const columns =
              typeof attrs.columns === "number" && [2, 3, 4].includes(attrs.columns)
                ? attrs.columns
                : 3;
            const images = mediaIds
              .map((id) => mediaById.get(id))
              .filter(
                (item): item is MediaItem =>
                  item?.type === mediaKindByPicker.gallery && Boolean(item.url)
              );
            if (images.length === 0) {
              return (
                <button
                  type="button"
                  className={mediaPlaceholderClassName}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect();
                    onOpenMediaPicker?.(block.id, "gallery");
                  }}
                  data-post-editor-media-placeholder="gallery"
                >
                  <Images className="mb-2 h-8 w-8" />
                  <p className="text-sm font-medium">Click to choose gallery images</p>
                  <p className="mt-1 text-xs text-slate-500">Select up to 12 image assets.</p>
                </button>
              );
            }
            return (
              <div
                className={cn(
                  "grid gap-3",
                  columns === 2
                    ? "grid-cols-2"
                    : columns === 4
                      ? "grid-cols-2 sm:grid-cols-4"
                      : "grid-cols-3"
                )}
                data-post-editor-gallery-grid="true"
              >
                {images.map((item) => (
                  <figure key={item.id} className="space-y-1">
                    <img
                      src={item.url}
                      alt={item.alt ?? getMediaDisplayName(item, "Gallery image")}
                      className="aspect-square w-full rounded-lg border object-cover"
                      loading="lazy"
                    />
                    {attrs.captions !== false && item.caption ? (
                      <figcaption className="text-xs text-slate-600">{item.caption}</figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            );
          })()
        : null}

      {block.type === "audio"
        ? (() => {
            const { selectedMedia, url } = resolveMediaSource(
              attrs,
              mediaById,
              mediaKindByPicker.audio
            );
            const caption =
              typeof attrs.caption === "string" && attrs.caption.trim().length > 0
                ? attrs.caption.trim()
                : selectedMedia?.caption?.trim();
            if (!url) {
              return (
                <button
                  type="button"
                  className={mediaPlaceholderClassName}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect();
                    onOpenMediaPicker?.(block.id, "audio");
                  }}
                  data-post-editor-media-placeholder="audio"
                >
                  <FileAudio className="mb-2 h-8 w-8" />
                  <p className="text-sm font-medium">Click to choose audio from media library</p>
                  <p className="mt-1 text-xs text-slate-500">Supports uploaded audio assets.</p>
                </button>
              );
            }
            return (
              <figure className="space-y-2 rounded-lg border bg-slate-50 p-3">
                <audio src={url} controls className="w-full" preload="metadata" />
                {caption ? (
                  <figcaption className="text-xs text-slate-600">{caption}</figcaption>
                ) : null}
              </figure>
            );
          })()
        : null}

      {block.type === "file"
        ? (() => {
            const { selectedMedia, url } = resolveMediaSource(
              attrs,
              mediaById,
              mediaKindByPicker.file
            );
            const label =
              typeof attrs.label === "string" && attrs.label.trim().length > 0
                ? attrs.label.trim()
                : getMediaDisplayName(selectedMedia, "Download file");
            const sizeLabel = formatMediaSize(selectedMedia?.sizeBytes);
            if (!url) {
              return (
                <button
                  type="button"
                  className={mediaPlaceholderClassName}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect();
                    onOpenMediaPicker?.(block.id, "file");
                  }}
                  data-post-editor-media-placeholder="file"
                >
                  <FileText className="mb-2 h-8 w-8" />
                  <p className="text-sm font-medium">Click to choose file from media library</p>
                  <p className="mt-1 text-xs text-slate-500">Renders as a safe download link.</p>
                </button>
              );
            }
            return (
              <a
                href={url}
                target={attrs.newTab === true ? "_blank" : undefined}
                rel={attrs.newTab === true ? "noopener noreferrer" : undefined}
                className="flex items-center justify-between gap-3 rounded-lg border bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
                onClick={(event) => event.preventDefault()}
              >
                <span className="min-w-0 truncate">{label}</span>
                {attrs.showSize !== false && sizeLabel ? (
                  <span className="shrink-0 text-xs text-slate-500">{sizeLabel}</span>
                ) : null}
              </a>
            );
          })()
        : null}

      {block.type === "button"
        ? (() => {
            const label =
              typeof attrs.label === "string" && attrs.label.trim().length > 0
                ? attrs.label
                : "Button";
            const href =
              typeof attrs.url === "string" && attrs.url.trim().length > 0 ? attrs.url.trim() : "#";
            const variant =
              typeof attrs.variant === "string" && buttonVariantClass[attrs.variant]
                ? attrs.variant
                : "primary";
            const size =
              typeof attrs.size === "string" && buttonSizeClass[attrs.size] ? attrs.size : "md";

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
        : null}

      {block.type === "embed"
        ? (() => {
            const provider = typeof attrs.provider === "string" ? attrs.provider : "custom";
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
                  <p className="mt-1 text-xs text-slate-500">
                    Supports YouTube, Vimeo, Loom, or custom URL.
                  </p>
                </button>
              );
            }

            return (
              <div className="overflow-hidden rounded-lg border bg-black/5">
                <div
                  className="relative w-full"
                  style={{
                    paddingTop: embedAspectPaddingTop[aspect] ?? embedAspectPaddingTop["16:9"],
                  }}
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
        : null}
    </section>
  );
}
