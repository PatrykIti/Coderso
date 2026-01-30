import { GripVertical } from "lucide-react";

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
  onMove: (from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function BlockList({
  blocks,
  selectedId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
}: BlockListProps) {
  const widgetRegistry = getWidgetRegistry();
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const widget = widgetRegistry.find((item) => item.type === block.type);
        const label = widget?.title ?? block.type;
        return (
          <div
            key={block.id}
            className={cn(
              "rounded-xl border bg-background p-4 shadow-sm",
              selectedId === block.id && "border-primary/50 ring-2 ring-primary/10"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="flex flex-1 items-start gap-3 text-left"
                onClick={() => onSelect(block.id)}
              >
                <span className="rounded-md border bg-muted/40 p-2 text-muted-foreground">
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
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {widget?.description ?? "Unknown widget type"}
                  </p>
                </div>
              </button>
              <BlockToolbar
                onMoveUp={() => onMove(index, index - 1)}
                onMoveDown={() => onMove(index, index + 1)}
                onDuplicate={() => onDuplicate(block.id)}
                onDelete={() => onDelete(block.id)}
                disableMoveUp={index === 0}
                disableMoveDown={index === blocks.length - 1}
              />
            </div>
            <div className="mt-4 rounded-lg border bg-muted/10 p-4">
              <WidgetRenderer block={block} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
