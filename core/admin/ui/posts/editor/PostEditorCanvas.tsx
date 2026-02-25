import { Image as ImageIcon, PlayCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type {
  PostBlock,
  PostBlockDocument,
  PostBlockType,
} from "../../../../services/posts/editor/postBlockDocument";
import {
  buildPostImageLayoutClasses,
  resolvePostImageLayoutFromAttrs,
} from "../../../../services/posts/postImageWrapLayout";
import {
  postRichTextToPlainText,
  serializePostRichText,
} from "../../../../services/posts/editor/postRichTextSerializer";
import {
  createWritingCanvasContentFromPaste,
  serializeWritingCanvasContentToHtml,
} from "../../../../services/posts/editor/postPasteNormalizer";
import { PostRichTextAdapter } from "./richtext/PostRichTextAdapter";
import type { PostInsertOptions } from "./hooks/usePostEditorState";

type PostEditorCanvasProps = {
  document: PostBlockDocument;
  title: string;
  onTitleChange: (value: string) => void;
  selectedBlockId: string | null;
  insertFocusToken: number;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlockContent: (id: string, content: unknown) => void;
  onUploadClipboardImage?: (file: File) => Promise<{ id: string; key: string; url: string }>;
  onInsertBlock: (type: PostBlockType, options?: PostInsertOptions) => void;
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

const normalizeListForEdit = (value: unknown) => {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string").join("\n");
};

const parseListItems = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const renderHtmlPreview = (value: unknown, emptyLabel: string) => {
  const html = serializePostRichText(value);
  if (!html) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div
      className="prose prose-slate max-w-none text-lg leading-relaxed text-slate-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const mediaPlaceholderClassName =
  "group flex min-h-[12rem] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100";

function PostCanvasBlockItem({
  block,
  selected,
  onSelect,
  onUpdateBlockContent,
  onUploadClipboardImage,
  onInsertBlock,
  onEnsureDynamicTocBlock,
  onOpenBlockDetails,
}: {
  block: PostBlock;
  selected: boolean;
  onSelect: () => void;
  onUpdateBlockContent: (content: unknown) => void;
  onUploadClipboardImage?: (file: File) => Promise<{ id: string; key: string; url: string }>;
  onInsertBlock: (type: PostBlockType, options?: PostInsertOptions) => void;
  onEnsureDynamicTocBlock?: () => void;
  onOpenBlockDetails?: (blockId: string) => void;
}) {
  const attrs = (block.attrs ?? {}) as Record<string, unknown>;
  const isWritingCanvas = block.type === "writing-canvas";
  const writingCanvasHtml =
    isWritingCanvas ? serializeWritingCanvasContentToHtml(block.content) : "";

  return (
    <section
      data-post-editor-block-id={block.id}
      className={cn(
        "relative rounded-lg px-1 py-1.5 transition",
        selected ? "ring-1 ring-primary/30" : "ring-0"
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {block.type === "writing-canvas" ? (
        selected ? (
          <PostRichTextAdapter
            value={writingCanvasHtml}
            onChange={(nextHtml) => {
              const nextContent = createWritingCanvasContentFromPaste({
                html: nextHtml,
                text: postRichTextToPlainText(nextHtml),
              }).content;
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
            value={normalizeListForEdit(block.content)}
            onChange={(event) => onUpdateBlockContent(parseListItems(event.target.value))}
            onFocus={onSelect}
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
          const src =
            typeof attrs.mediaId === "string" &&
            (attrs.mediaId.startsWith("/") || attrs.mediaId.startsWith("http"))
              ? attrs.mediaId
              : null;
          const alt =
            typeof attrs.alt === "string" && attrs.alt.trim().length > 0
              ? attrs.alt
              : "Selected image";
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
                data-post-editor-media-placeholder="image"
              >
                <ImageIcon className="mb-2 h-8 w-8" />
                <p className="text-sm font-medium">Click to configure image</p>
                <p className="mt-1 text-xs text-slate-500">Set URL/media ID in Block settings.</p>
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
        <button
          type="button"
          className={mediaPlaceholderClassName}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
            onOpenBlockDetails?.(block.id);
          }}
          data-post-editor-media-placeholder="button"
        >
          <p className="text-sm font-medium">
            {typeof attrs.label === "string" && attrs.label.trim().length > 0
              ? attrs.label
              : "Configure button label and URL"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Click to edit this CTA block.</p>
        </button>
      ) : null}

      {block.type === "embed" ? (
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
          <p className="text-sm font-medium">
            {typeof attrs.url === "string" && attrs.url.trim().length > 0
              ? attrs.url
              : "Click to configure embed URL"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Add video or external embed in Block settings.</p>
        </button>
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
  onUploadClipboardImage,
  onInsertBlock,
  onEnsureDynamicTocBlock,
  onOpenBlockDetails,
}: PostEditorCanvasProps) {
  const blockRefs = useRef(new Map<string, HTMLDivElement>());

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
                    onUploadClipboardImage={onUploadClipboardImage}
                    onInsertBlock={onInsertBlock}
                    onEnsureDynamicTocBlock={onEnsureDynamicTocBlock}
                    onOpenBlockDetails={onOpenBlockDetails}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
