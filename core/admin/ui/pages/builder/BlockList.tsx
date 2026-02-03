import { GripVertical } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { WidgetRenderer } from "../../../../widgets/renderers/widgetRenderer";
import type { Block } from "./types";
import { getWidgetRegistry } from "./widgetRegistry";
import { BlockToolbar } from "./BlockToolbar";

export type BlockListProps = {
  blocks: Block[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  onMove: (path: number[], from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  path?: number[];
  depth?: number;
};

export function BlockList({
  blocks,
  selectedId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  path,
  depth,
}: BlockListProps) {
  const widgetRegistry = getWidgetRegistry();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const listPath = path ?? [];
  const listToken = listPath.length ? listPath.join(".") : "root";
  const level = depth ?? 0;

  const handleDrop = (from: number, to: number) => {
    if (from === to) return;
    onMove(listPath, from, to);
  };

  const resetDragState = () => {
    setDragIndex(null);
    setHoverIndex(null);
  };

  return (
    <div className={cn("space-y-3", level > 0 && "ml-6")}>
      {blocks.map((block, index) => {
        const widget = widgetRegistry.find((item) => item.type === block.type);
        const label = widget?.title ?? block.type;
        const childCount = Array.isArray(block.children) ? block.children.length : 0;
        return (
          <div
            key={block.id}
            className={cn(
              "cursor-pointer rounded-xl border bg-background p-4 shadow-sm",
              level > 0 && "border-dashed bg-muted/20",
              selectedId === block.id && "border-primary/50 ring-2 ring-primary/10",
              hoverIndex === index && dragIndex !== null && "border-primary/40"
            )}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(block.id);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onSelect(block.id);
              }
            }}
            onDragOver={(event) => {
              if (dragIndex === null) return;
              event.preventDefault();
              event.stopPropagation();
              setHoverIndex(index);
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const payload = event.dataTransfer.getData("text/plain");
              const [token, rawIndex] = payload.split(":");
              if (token !== listToken) {
                resetDragState();
                return;
              }
              const from = Number(rawIndex);
              if (!Number.isNaN(from)) {
                handleDrop(from, index);
              }
              resetDragState();
            }}
            onDragLeave={() => {
              if (hoverIndex === index) setHoverIndex(null);
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="flex flex-1 items-start gap-3 text-left"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(block.id);
                }}
              >
                <span
                  className="rounded-md border bg-muted/40 p-2 text-muted-foreground"
                  role="button"
                  tabIndex={0}
                  draggable
                  aria-label={`Reorder ${label}`}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "text/plain",
                      `${listToken}:${String(index)}`
                    );
                    event.dataTransfer.effectAllowed = "move";
                    setDragIndex(index);
                  }}
                  onDragEnd={() => resetDragState()}
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    {block.variant ? (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {block.variant}
                      </Badge>
                    ) : null}
                    {childCount > 0 ? (
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        Nested {childCount}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {widget?.description ?? "Unknown widget type"}
                  </p>
                </div>
              </button>
              <BlockToolbar
                onMoveUp={() => onMove(listPath, index, index - 1)}
                onMoveDown={() => onMove(listPath, index, index + 1)}
                onDuplicate={() => onDuplicate(block.id)}
                onDelete={() => onDelete(block.id)}
                disableMoveUp={index === 0}
                disableMoveDown={index === blocks.length - 1}
              />
            </div>
            <div className="mt-4 rounded-lg border bg-muted/10 p-4">
              <WidgetRenderer block={block} />
            </div>
            {childCount ? (
              <div className="mt-4">
                <BlockList
                  blocks={block.children ?? []}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onMove={onMove}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  path={[...listPath, index]}
                  depth={level + 1}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
