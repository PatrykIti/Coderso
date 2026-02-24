import { MoveDown, MoveUp, Plus, Shuffle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { postRichTextToPlainText } from "../../../../services/posts/editor/postRichTextSerializer";
import {
  createWritingCanvasContentFromPaste,
  serializeWritingCanvasContentToHtml,
} from "../../../../services/posts/editor/postPasteNormalizer";
import { getTransformTargetTypes } from "./blocks/blockTransforms";
import {
  BLOCK_CATEGORY_LABELS,
  getPostBlockLabel,
  groupPostBlockCatalogByCategory,
  POST_BLOCK_CATALOG,
} from "./blocks/blockCatalog";
import { PostRichTextAdapter } from "./richtext/PostRichTextAdapter";
import type { PostInsertOptions } from "./hooks/usePostEditorState";

type PostEditorCanvasProps = {
  document: PostBlockDocument;
  selectedBlockId: string | null;
  insertFocusToken: number;
  onSelectBlock: (id: string) => void;
  onUpdateBlockContent: (id: string, content: unknown) => void;
  onUploadClipboardImage?: (file: File) => Promise<{ id: string; key: string; url: string }>;
  onMoveBlock: (id: string, direction: "up" | "down") => void;
  onTransformBlock: (id: string, targetType: PostBlockType) => void;
  onDeleteBlock: (id: string) => void;
  onInsertBlock: (type: PostBlockType, options?: PostInsertOptions) => void;
  onEnsureDynamicTocBlock?: () => void;
};

const appenderCatalogGroups = groupPostBlockCatalogByCategory(POST_BLOCK_CATALOG);

const richTextBlockTypes = new Set<PostBlockType>([
  "paragraph",
  "heading",
  "quote",
  "callout",
]);

const normalizeListForEdit = (value: unknown) => {
  if (!Array.isArray(value)) return "";
  return value.filter((item): item is string => typeof item === "string").join("\n");
};

const parseListItems = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const asString = (value: unknown) => (typeof value === "string" ? value : "");

const renderReadOnlyText = (value: unknown, emptyLabel: string) => {
  const text = postRichTextToPlainText(value);
  if (!text) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>;
};

function CanvasInlineAppender({
  onInsert,
}: {
  onInsert: (type: PostBlockType) => void;
}) {
  return (
    <div className="flex justify-center py-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-3 text-xs"
            aria-label="Insert block"
            data-post-editor-appender="true"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add block
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-72">
          {appenderCatalogGroups.map((group, index) => (
            <div key={group.category}>
              {index > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
                {BLOCK_CATEGORY_LABELS[group.category]}
              </DropdownMenuLabel>
              {group.items.map((item) => (
                <DropdownMenuItem key={item.type} onClick={() => onInsert(item.type)}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function PostCanvasBlockItem({
  block,
  selected,
  onSelect,
  onUpdateBlockContent,
  onUploadClipboardImage,
  onMoveBlock,
  onTransformBlock,
  onDeleteBlock,
  onInsertBlock,
  onEnsureDynamicTocBlock,
}: {
  block: PostBlock;
  selected: boolean;
  onSelect: () => void;
  onUpdateBlockContent: (content: unknown) => void;
  onUploadClipboardImage?: (file: File) => Promise<{ id: string; key: string; url: string }>;
  onMoveBlock: (direction: "up" | "down") => void;
  onTransformBlock: (targetType: PostBlockType) => void;
  onDeleteBlock: () => void;
  onInsertBlock: (type: PostBlockType, options?: PostInsertOptions) => void;
  onEnsureDynamicTocBlock?: () => void;
}) {
  const transformTargets = useMemo(
    () => getTransformTargetTypes(block.type),
    [block.type]
  );

  const attrs = (block.attrs ?? {}) as Record<string, unknown>;
  const isWritingCanvas = block.type === "writing-canvas";
  const writingCanvasHtml =
    isWritingCanvas
      ? serializeWritingCanvasContentToHtml(block.content)
      : "";

  return (
    <section
      data-post-editor-block-id={block.id}
      className={cn(
        "transition",
        isWritingCanvas
          ? "bg-transparent p-0"
          : "rounded-xl border bg-background/60 p-4",
        !isWritingCanvas && (selected ? "border-primary/60 ring-1 ring-primary/20" : "border-border/70")
      )}
      onClick={onSelect}
    >
      {!isWritingCanvas ? (
        <header className="mb-3 flex flex-wrap items-center gap-2 border-b pb-3">
          <p className="text-sm font-semibold text-foreground">{getPostBlockLabel(block.type)}</p>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {selected && transformTargets.length > 0 ? (
              <div className="mr-1 hidden items-center gap-1 xl:flex">
                <span className="text-xs text-muted-foreground">Transform:</span>
                {transformTargets.map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      onTransformBlock(type);
                    }}
                  >
                    <Shuffle className="h-3 w-3" />
                    {getPostBlockLabel(type)}
                  </Button>
                ))}
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Move block up"
              onClick={(event) => {
                event.stopPropagation();
                onMoveBlock("up");
              }}
            >
              <MoveUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Move block down"
              onClick={(event) => {
                event.stopPropagation();
                onMoveBlock("down");
              }}
            >
              <MoveDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Delete block"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteBlock();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </header>
      ) : null}

      <div
        className={cn("space-y-3", isWritingCanvas && "space-y-0")}
        onClick={(event) => event.stopPropagation()}
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
              placeholder="Write your post content..."
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
            renderReadOnlyText(writingCanvasHtml, "Empty writing section")
          )
        ) : null}

        {block.type === "toc" ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">
              {typeof attrs.title === "string" && attrs.title.trim().length > 0
                ? attrs.title
                : "Table of contents"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Dynamic table of contents is generated from heading blocks and heading nodes in
              writing sections.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure heading range in Details -&gt; Block.
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
              minHeightClassName="min-h-[9rem]"
              onSlashInsertBlock={(type) =>
                onInsertBlock(type, {
                  source: "slash",
                  target: { mode: "after-block", blockId: block.id },
                })
              }
              onFocus={onSelect}
            />
          ) : (
            renderReadOnlyText(block.content, "Empty block")
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
            <pre className="overflow-x-auto rounded-lg border bg-muted/20 p-3 text-xs">
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
              className="min-h-[12rem]"
              data-post-editor-primary-editable="true"
              placeholder="One item per line"
            />
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {Array.isArray(block.content) && block.content.length > 0 ? (
                block.content
                  .filter((item): item is string => typeof item === "string")
                  .map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>)
              ) : (
                <li className="list-none text-muted-foreground">Empty list</li>
              )}
            </ul>
          )
        ) : null}

        {block.type === "separator" ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Horizontal separator block.
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
            return (
              <div className="rounded-lg border p-4">
                <div className="overflow-hidden text-sm text-muted-foreground">
                  <figure
                    className={cn(
                      "post-editor-richtext",
                      buildPostImageLayoutClasses(imageLayout)
                    )}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={alt}
                        className="h-auto w-full rounded-lg border object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="rounded-lg border border-dashed px-3 py-5 text-sm">
                        No image URL preview yet. Add media ID or URL in block settings.
                      </div>
                    )}
                    {typeof attrs.caption === "string" && attrs.caption.trim().length > 0 ? (
                      <figcaption className="pt-2 text-xs">{attrs.caption}</figcaption>
                    ) : null}
                  </figure>
                  <p className="pt-3 text-xs">
                    Wrap: {imageLayout.wrap} · Width: {imageLayout.widthPercent}% · Spacing:{" "}
                    {imageLayout.marginPreset}
                  </p>
                </div>
              </div>
            );
          })()
        ) : null}

        {block.type === "button" ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {typeof attrs.label === "string" && attrs.label.trim().length > 0
              ? `Button label: ${attrs.label}`
              : "No button label yet. Configure this block in Details -> Block."}
          </div>
        ) : null}

        {block.type === "embed" ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {typeof attrs.url === "string" && attrs.url.trim().length > 0
              ? `Embed URL: ${attrs.url}`
              : "No embed URL yet. Configure this block in Details -> Block."}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function PostEditorCanvas({
  document,
  selectedBlockId,
  insertFocusToken,
  onSelectBlock,
  onUpdateBlockContent,
  onUploadClipboardImage,
  onMoveBlock,
  onTransformBlock,
  onDeleteBlock,
  onInsertBlock,
  onEnsureDynamicTocBlock,
}: PostEditorCanvasProps) {
  // TASK-061-01 UX contract anchor:
  // this canvas is the single writing surface. Future smart-paste and
  // writing-canvas enhancements must keep this view as the primary editing area.
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="flex items-center border-b px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Document canvas</p>
            <p className="text-sm font-semibold text-foreground">
              Edit the full post flow in one view.
            </p>
          </div>
        </div>

        <div className="max-h-[calc(100vh-23rem)] overflow-auto p-4">
          {document.blocks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">No blocks yet.</p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() =>
                  onInsertBlock("writing-canvas", {
                    source: "appender",
                    target: { mode: "index", index: 0 },
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add writing section
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {document.blocks.map((block, index) => (
                <div key={block.id} className="space-y-4">
                  <div
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
                      onMoveBlock={(direction) => onMoveBlock(block.id, direction)}
                      onTransformBlock={(targetType) => onTransformBlock(block.id, targetType)}
                      onDeleteBlock={() => onDeleteBlock(block.id)}
                      onInsertBlock={onInsertBlock}
                      onEnsureDynamicTocBlock={onEnsureDynamicTocBlock}
                    />
                  </div>
                  <CanvasInlineAppender
                    onInsert={(type) =>
                      onInsertBlock(type, {
                        source: "appender",
                        target: { mode: "index", index: index + 1 },
                      })
                    }
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
