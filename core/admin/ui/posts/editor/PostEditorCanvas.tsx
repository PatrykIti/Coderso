import { MoveDown, MoveUp, Plus, Shuffle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import type {
  PostBlock,
  PostBlockDocument,
  PostBlockType,
} from "../../../../services/posts/editor/postBlockDocument";
import { postRichTextToPlainText } from "../../../../services/posts/editor/postRichTextSerializer";
import { getTransformTargetTypes } from "./blocks/blockTransforms";
import { getPostBlockLabel } from "./blocks/blockCatalog";
import { PostListViewPanel } from "./blocks/PostListViewPanel";
import { PostRichTextAdapter } from "./richtext/PostRichTextAdapter";

type PostEditorCanvasProps = {
  document: PostBlockDocument;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onUpdateBlockContent: (id: string, content: unknown) => void;
  onMoveBlock: (id: string, direction: "up" | "down") => void;
  onMoveBlockToIndex: (id: string, targetIndex: number) => void;
  onTransformBlock: (id: string, targetType: PostBlockType) => void;
  onDeleteBlock: (id: string) => void;
  onInsertBlockAfterSelected: (type: string) => void;
  outlineVisible: boolean;
};

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

function PostCanvasBlockItem({
  block,
  selected,
  onSelect,
  onUpdateBlockContent,
  onMoveBlock,
  onTransformBlock,
  onDeleteBlock,
  onInsertBlockAfterSelected,
}: {
  block: PostBlock;
  selected: boolean;
  onSelect: () => void;
  onUpdateBlockContent: (content: unknown) => void;
  onMoveBlock: (direction: "up" | "down") => void;
  onTransformBlock: (targetType: PostBlockType) => void;
  onDeleteBlock: () => void;
  onInsertBlockAfterSelected: (type: string) => void;
}) {
  const transformTargets = useMemo(
    () => getTransformTargetTypes(block.type),
    [block.type]
  );

  const attrs = (block.attrs ?? {}) as Record<string, unknown>;

  return (
    <section
      data-post-editor-block-id={block.id}
      className={`rounded-xl border bg-background/60 p-4 transition ${
        selected ? "border-primary/60 ring-1 ring-primary/20" : "border-border/70"
      }`}
      onClick={onSelect}
    >
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

      <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
        {richTextBlockTypes.has(block.type) ? (
          selected ? (
            <PostRichTextAdapter
              value={asString(block.content)}
              onChange={onUpdateBlockContent}
              placeholder="Write content for this block..."
              minHeightClassName="min-h-[9rem]"
              onSlashInsertBlock={onInsertBlockAfterSelected}
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
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {typeof attrs.mediaId === "string" && attrs.mediaId.trim().length > 0
              ? `Image media selected: ${attrs.mediaId}`
              : "No media selected yet. Configure this block in Details -> Block."}
          </div>
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
  onSelectBlock,
  onUpdateBlockContent,
  onMoveBlock,
  onMoveBlockToIndex,
  onTransformBlock,
  onDeleteBlock,
  onInsertBlockAfterSelected,
  outlineVisible,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
      <div
        className={`grid min-h-0 flex-1 gap-4 ${
          outlineVisible
            ? "grid-cols-1 lg:grid-cols-[minmax(220px,320px)_minmax(0,1fr)]"
            : "grid-cols-1"
        }`}
      >
        {outlineVisible ? (
          <PostListViewPanel
            blocks={document.blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={onSelectBlock}
            onMoveBlockToIndex={onMoveBlockToIndex}
          />
        ) : null}

        <div className="min-h-0 overflow-hidden rounded-xl border bg-background shadow-sm">
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
                  onClick={() => onInsertBlockAfterSelected("paragraph")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add first block
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
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
                      onMoveBlock={(direction) => onMoveBlock(block.id, direction)}
                      onTransformBlock={(targetType) => onTransformBlock(block.id, targetType)}
                      onDeleteBlock={() => onDeleteBlock(block.id)}
                      onInsertBlockAfterSelected={onInsertBlockAfterSelected}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
