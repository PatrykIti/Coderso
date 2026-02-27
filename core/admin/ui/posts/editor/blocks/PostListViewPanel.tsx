import { GripVertical, Trash2 } from "lucide-react";
import { useState, type DragEvent, type KeyboardEvent } from "react";

import type { PostBlock } from "../../../../../services/posts/editor/postBlockDocument";
import {
  resolveDropIndexFromPointer,
} from "./blockDnD";
import { getPostBlockLabel } from "./blockCatalog";

type PostListViewPanelProps = {
  blocks: PostBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onDeleteBlock?: (id: string) => void;
  onMoveBlockToIndex: (id: string, targetIndex: number) => void;
  showKeyboardHints?: boolean;
};

const resolveOutlineBlockLabel = (block: PostBlock) => {
  if (block.type === "writing-canvas") return "Section";
  if (block.type === "toc") return "Table of contents";
  if (block.type === "button") return "CTA block";
  if (block.type === "embed") return "Embed block";
  return getPostBlockLabel(block.type);
};

export function PostListViewPanel({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onMoveBlockToIndex,
  showKeyboardHints = true,
}: PostListViewPanelProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const clearDragState = () => {
    setDraggingId(null);
    setDropIndex(null);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, id: string) => {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
    setDropIndex(null);
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    setDropIndex(resolveDropIndexFromPointer(index, event.clientY, rect));
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>, fallbackIndex: number) => {
    event.preventDefault();
    const droppedId = event.dataTransfer.getData("text/plain") || draggingId;
    if (!droppedId) {
      clearDragState();
      return;
    }
    const target = dropIndex ?? fallbackIndex;
    onMoveBlockToIndex(droppedId, target);
    clearDragState();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string, index: number) => {
    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      onMoveBlockToIndex(id, index - 1);
      return;
    }

    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      onMoveBlockToIndex(id, index + 2);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg bg-background">
      <div className="border-b px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          List view
        </p>
        {showKeyboardHints ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Drag blocks to reorder. Keyboard: <kbd>Alt</kbd> + <kbd>Arrow keys</kbd>.
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-auto p-2">
        {blocks.map((block, index) => {
          const active = block.id === selectedBlockId;
          const showDropBefore = dropIndex === index;
          const showDropAfter = dropIndex === index + 1;
          const blockLabel = resolveOutlineBlockLabel(block);

          return (
            <div
              key={block.id}
              className="group relative rounded-md"
            >
              {showDropBefore ? <div className="h-0.5 bg-primary" /> : null}
              <button
                type="button"
                draggable
                onDragStart={(event) => handleDragStart(event, block.id)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDrop={(event) => handleDrop(event, index)}
                onDragEnd={clearDragState}
                onClick={() => onSelectBlock(block.id)}
                onKeyDown={(event) => handleKeyDown(event, block.id, index)}
                className={`flex w-full cursor-grab items-start gap-2 rounded-md border px-2.5 py-2 pr-10 text-left transition active:cursor-grabbing ${
                  active
                    ? "border-primary/30 bg-primary/5"
                    : "border-transparent hover:border-border/60 hover:bg-muted/30"
                } ${draggingId === block.id ? "opacity-60" : ""}`}
                aria-label={`Select block ${index + 1}: ${blockLabel}`}
              >
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {index + 1}. {blockLabel}
                  </p>
                </div>
              </button>
              {onDeleteBlock ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteBlock(block.id);
                  }}
                  className={`absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 group-hover:opacity-100 ${
                    active ? "opacity-100" : ""
                  }`}
                  aria-label={`Delete block ${index + 1}: ${blockLabel}`}
                  title="Delete block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {showDropAfter ? <div className="h-0.5 bg-primary" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
