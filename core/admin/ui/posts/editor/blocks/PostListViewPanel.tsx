import { GripVertical } from "lucide-react";
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
  onMoveBlockToIndex: (id: string, targetIndex: number) => void;
};

export function PostListViewPanel({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onMoveBlockToIndex,
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
    <div className="min-h-0 overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className="border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">List view</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag blocks to reorder. Keyboard: <kbd>Alt</kbd> + <kbd>Arrow keys</kbd>.
        </p>
      </div>

      <div className="max-h-[30rem] space-y-2 overflow-auto p-3">
        {blocks.map((block, index) => {
          const active = block.id === selectedBlockId;
          const showDropBefore = dropIndex === index;
          const showDropAfter = dropIndex === index + 1;

          return (
            <div
              key={block.id}
              className={`rounded-lg border ${
                active ? "border-primary/60 bg-primary/10" : "border-border/70"
              }`}
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
                className={`group flex w-full cursor-grab items-start gap-2 px-3 py-2 text-left transition active:cursor-grabbing ${
                  draggingId === block.id ? "opacity-60" : ""
                }`}
                aria-label={`Select block ${index + 1}: ${getPostBlockLabel(block.type)}`}
              >
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    #{index + 1} {getPostBlockLabel(block.type)}
                  </p>
                </div>
              </button>
              {showDropAfter ? <div className="h-0.5 bg-primary" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
