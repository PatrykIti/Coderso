import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MediaGrid } from "@/ui/media/MediaGrid";
import type { MediaItem } from "@/ui/media/types";
import { toMediaItem } from "@/ui/media/utils";
import { isApiClientError } from "@/services/apiClient";
import { listMediaCached } from "@/services/mediaClient";

import type {
  PostBlockDocument,
  PostBlockType,
  PostBlockDocumentMeta,
} from "../../../../services/posts/editor/postBlockDocument";
import type { PostInsertOptions } from "./hooks/usePostEditorState";
import { CanvasBlockList } from "./postEditorCanvasBlocks";
import type { CanvasBlockTypography } from "./postEditorCanvasBlocks";
import {
  attachCanvasBlockRef,
  createCanvasBlockRefs,
  readCanvasBlockElement,
  scheduleCanvasBlockFocus,
  scrollCanvasBlockIntoView,
} from "./postEditorCanvasFocus";
import type { CanvasBlockRefs } from "./postEditorCanvasFocus";
import {
  clearCanvasSelection,
  deselectCanvasSelectionOnTitleFocus,
  EMPTY_CANVAS_INSERT_OPTIONS,
} from "./postEditorCanvasSelection";
import type { MediaPickerKind } from "./postEditorCanvasBlockItemModel";
import { mediaKindByPicker, readMediaId, readMediaIds } from "./postEditorCanvasBlockItemModel";

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

const resolveTypography = (meta: PostBlockDocument["meta"]): CanvasBlockTypography => {
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
      typography?.baseTextScale === "sm" ||
      typography?.baseTextScale === "lg" ||
      typography?.baseTextScale === "xl"
        ? typography.baseTextScale
        : "md",
  };
};

type MediaPickerState = {
  blockId: string;
  kind: MediaPickerKind;
};

const mediaPickerCopy: Record<
  MediaPickerKind,
  {
    title: string;
    empty: string;
    accept: (item: MediaItem) => boolean;
  }
> = {
  image: {
    title: "Select Image",
    empty: "No image assets found for this query.",
    accept: (item) => item.type === mediaKindByPicker.image,
  },
  video: {
    title: "Select Video",
    empty: "No video assets found for this query.",
    accept: (item) => item.type === mediaKindByPicker.video,
  },
  gallery: {
    title: "Select Gallery Images",
    empty: "No image assets found for this query.",
    accept: (item) => item.type === mediaKindByPicker.gallery,
  },
  audio: {
    title: "Select Audio",
    empty: "No audio assets found for this query.",
    accept: (item) => item.type === mediaKindByPicker.audio,
  },
  file: {
    title: "Select File",
    empty: "No file assets found for this query.",
    accept: (item) => item.type === mediaKindByPicker.file,
  },
};

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
  const blockRefs = useRef<CanvasBlockRefs>(createCanvasBlockRefs());
  const lastMediaLookupKeyRef = useRef<string | null>(null);
  const [mediaPicker, setMediaPicker] = useState<MediaPickerState | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaQuery, setMediaQuery] = useState("");

  const typography = useMemo(() => resolveTypography(document.meta), [document.meta]);
  const mediaById = useMemo(() => new Map(mediaItems.map((item) => [item.id, item])), [mediaItems]);

  const filteredMediaItems = useMemo(() => {
    const normalizedQuery = mediaQuery.trim().toLowerCase();
    const copy = mediaPicker ? mediaPickerCopy[mediaPicker.kind] : mediaPickerCopy.image;
    return mediaItems.filter((item) => {
      if (!copy.accept(item)) return false;
      if (!normalizedQuery) return true;
      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        (item.originalName ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.title ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [mediaItems, mediaPicker, mediaQuery]);

  const selectedPickerMediaIds = useMemo(() => {
    if (!mediaPicker) return [];
    const block = document.blocks.find((item) => item.id === mediaPicker.blockId);
    if (!block) return [];
    const attrs = (block.attrs ?? {}) as Record<string, unknown>;
    if (mediaPicker.kind === "gallery") return readMediaIds(attrs);
    const mediaId = readMediaId(attrs);
    return mediaId ? [mediaId] : [];
  }, [document.blocks, mediaPicker]);

  const openMediaPicker = useCallback((blockId: string, kind: MediaPickerKind) => {
    setMediaQuery("");
    setMediaError(null);
    setMediaLoading(true);
    setMediaPicker({ blockId, kind });
  }, []);

  const handleMediaSelect = useCallback(
    (id: string) => {
      if (!mediaPicker || !onUpdateBlockAttrs) return;
      const media = mediaById.get(id);
      if (!media || !mediaPickerCopy[mediaPicker.kind].accept(media)) return;
      if (mediaPicker.kind === "gallery") {
        const block = document.blocks.find((item) => item.id === mediaPicker.blockId);
        const attrs = (block?.attrs ?? {}) as Record<string, unknown>;
        const current = readMediaIds(attrs);
        const next = current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id].slice(0, 12);
        onUpdateBlockAttrs(mediaPicker.blockId, { mediaIds: next });
        return;
      }
      const patch: Record<string, unknown> = {
        mediaId: id,
      };
      if (
        mediaPicker.kind === "image" &&
        typeof media?.alt === "string" &&
        media.alt.trim().length > 0
      ) {
        patch.alt = media.alt;
      }
      if (typeof media?.caption === "string" && media.caption.trim().length > 0) {
        patch.caption = media.caption;
      }
      onUpdateBlockAttrs(mediaPicker.blockId, patch);
      setMediaPicker(null);
    },
    [document.blocks, mediaById, mediaPicker, onUpdateBlockAttrs]
  );

  const registerBlockElement = useCallback(
    (blockId: string, element: HTMLDivElement | null) => {
      attachCanvasBlockRef(blockRefs.current, blockId, element);
    },
    [blockRefs]
  );

  useEffect(() => {
    if (!selectedBlockId) return;
    const element = readCanvasBlockElement(blockRefs.current, selectedBlockId);
    if (!element) return;
    scrollCanvasBlockIntoView(element);
  }, [selectedBlockId]);

  useEffect(() => {
    if (!selectedBlockId || insertFocusToken === 0) return;
    const element = readCanvasBlockElement(blockRefs.current, selectedBlockId);
    if (!element) return;
    return scheduleCanvasBlockFocus(element);
  }, [insertFocusToken, selectedBlockId]);

  useEffect(() => {
    const missingMediaIds = new Set<string>();
    document.blocks.forEach((block) => {
      if (
        block.type !== "image" &&
        block.type !== "video" &&
        block.type !== "gallery" &&
        block.type !== "audio" &&
        block.type !== "file"
      ) {
        return;
      }
      const attrs = (block.attrs ?? {}) as Record<string, unknown>;
      const mediaIds =
        block.type === "gallery" ? readMediaIds(attrs) : [readMediaId(attrs)].filter(Boolean);
      mediaIds.forEach((mediaId) => {
        if (!mediaId) return false;
        if (mediaId.startsWith("/") || mediaId.startsWith("http")) return false;
        if (!mediaById.has(mediaId)) {
          missingMediaIds.add(mediaId);
        }
        return false;
      });
    });

    if (missingMediaIds.size === 0) {
      lastMediaLookupKeyRef.current = null;
      return;
    }

    const lookupKey = [...missingMediaIds].sort().join("|");
    if (lastMediaLookupKeyRef.current === lookupKey) return;
    lastMediaLookupKeyRef.current = lookupKey;

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
    if (!mediaPicker) return;
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
  }, [mediaPicker]);

  return (
    <div
      className="flex min-h-0 flex-1 bg-dotted px-4 py-8 sm:px-8 sm:py-12"
      onClick={() => clearCanvasSelection(onSelectBlock)}
      data-post-editor-canvas="article"
    >
      <div
        className="mx-auto flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card p-6 shadow-card sm:p-10"
        data-post-editor-canvas-shell="true"
      >
        <div className="space-y-10">
          <div className="space-y-2">
            <Textarea
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              onFocus={(event) => {
                deselectCanvasSelectionOnTitleFocus(event, onSelectBlock);
              }}
              placeholder="Enter post title..."
              className="min-h-0 resize-none border-0 p-0 text-3xl font-display font-bold leading-tight tracking-tight text-foreground shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0"
              rows={1}
              data-post-editor-title-input="true"
            />
          </div>

          {document.blocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
              <p className="text-sm text-muted-foreground">No blocks yet.</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => onInsertBlock("writing-canvas", EMPTY_CANVAS_INSERT_OPTIONS)}
              >
                Add section
              </Button>
            </div>
          ) : (
            <CanvasBlockList
              blocks={document.blocks}
              selectedBlockId={selectedBlockId}
              registerBlockElement={registerBlockElement}
              typography={typography}
              mediaById={mediaById}
              onSelectBlock={onSelectBlock}
              onUpdateBlockContent={onUpdateBlockContent}
              onUpdateBlockAttrs={onUpdateBlockAttrs}
              onTransformBlock={onTransformBlock}
              onUpdateDocumentTypography={onUpdateDocumentTypography}
              onUploadClipboardImage={onUploadClipboardImage}
              onInsertBlock={onInsertBlock}
              onDeleteBlock={onDeleteBlock}
              onOpenMediaPicker={openMediaPicker}
              onEnsureDynamicTocBlock={onEnsureDynamicTocBlock}
              onOpenBlockDetails={onOpenBlockDetails}
            />
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(mediaPicker)}
        onOpenChange={(open) => {
          if (!open) {
            setMediaPicker(null);
            setMediaQuery("");
            setMediaError(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] w-[95vw] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {mediaPicker ? mediaPickerCopy[mediaPicker.kind].title : "Select Media"}
            </DialogTitle>
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
                {mediaPicker ? mediaPickerCopy[mediaPicker.kind].empty : "No media assets found."}
              </div>
            ) : (
              <div className="max-h-[58vh] overflow-y-auto pr-1">
                <MediaGrid
                  items={filteredMediaItems}
                  selectedId={
                    mediaPicker?.kind === "gallery" ? undefined : selectedPickerMediaIds[0]
                  }
                  selectedIds={mediaPicker?.kind === "gallery" ? selectedPickerMediaIds : undefined}
                  onSelect={handleMediaSelect}
                />
                {mediaPicker?.kind === "gallery" ? (
                  <div className="mt-3 flex justify-end">
                    <Button type="button" variant="outline" onClick={() => setMediaPicker(null)}>
                      Done
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
