import { GripVertical, Plus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { WidgetRenderer } from "../../../../widgets/renderers/widgetRenderer";
import type { WidgetRendererPageDefaults } from "../../../../widgets/renderers/widgetRenderer";
import { resolveWidgetSlotTargets } from "../../../../widgets/slots";
import type { WidgetPreviewState } from "../../../../widgets/types";
import type { Block, WidgetDefinition } from "./types";
import { getWidgetRegistry } from "./widgetRegistry";
import type { BlockPath } from "./blockUtils";
import { BlockToolbar } from "./BlockToolbar";

export type BlockListProps = {
  blocks: Block[];
  className?: string;
  pageDefaults?: WidgetRendererPageDefaults;
  selectedId?: string | null;
  highlightedId?: string | null;
  onSelect: (id: string) => void;
  onMove: (path: BlockPath, from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onInsert?: (parentId: string, slotId: string, widgetType: string) => void;
  onMoveToSlot?: (blockId: string, parentId: string, slotId: string) => void;
  onOpenSlotInsert?: (target: {
    parentId: string;
    slotId: string;
    slotLabel: string;
    allowedTypes?: string[];
  }) => void;
  previewStatesByBlockId?: Record<string, WidgetPreviewState | undefined>;
  path?: BlockPath;
  depth?: number;
  widgetRegistry?: WidgetDefinition[];
};

export function BlockList({
  blocks,
  className,
  pageDefaults,
  selectedId,
  highlightedId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onInsert,
  onMoveToSlot,
  onOpenSlotInsert,
  previewStatesByBlockId,
  path,
  depth,
  widgetRegistry: providedWidgetRegistry,
}: BlockListProps) {
  const widgetRegistry = providedWidgetRegistry ?? getWidgetRegistry();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const listPath = path ?? [];
  const listToken = listPath.length
    ? listPath
        .map((segment) =>
          segment.slotId ? `${segment.index}:${segment.slotId}` : `${segment.index}`
        )
        .join("|")
    : "root";
  const level = depth ?? 0;

  const getSlotMap = (block: Block) => {
    if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
      const result: Record<string, Block[]> = {};
      for (const [key, value] of Object.entries(block.slots)) {
        const id = key.trim();
        if (!id) continue;
        result[id] = Array.isArray(value) ? (value as Block[]) : [];
      }
      return result;
    }
    if (Array.isArray(block.children)) {
      return { default: block.children };
    }
    return {};
  };

  const handleDrop = (from: number, to: number) => {
    if (from === to) return;
    onMove(listPath, from, to);
  };

  const handleDragStart = (event: React.DragEvent<HTMLElement>, index: number, blockId: string) => {
    event.dataTransfer.setData("text/plain", `${listToken}:${String(index)}`);
    event.dataTransfer.setData("block-id", blockId);
    event.dataTransfer.effectAllowed = "move";
    setDragIndex(index);
  };

  const resetDragState = () => {
    setDragIndex(null);
    setHoverIndex(null);
  };

  return (
    <div className={cn("space-y-3", className, level > 0 && "ml-6")}>
      {blocks.map((block, index) => {
        const widget = widgetRegistry.find((item) => item.type === block.type);
        const label = widget?.title ?? block.type;
        const slotMap = getSlotMap(block);
        const previewState = previewStatesByBlockId?.[block.id] ?? null;
        const previewBlock =
          previewState?.dataPatch && block.data && typeof block.data === "object"
            ? {
                ...block,
                data: {
                  ...(block.data as Record<string, unknown>),
                  ...previewState.dataPatch,
                },
              }
            : block;
        const slotTargets =
          widget?.slots && widget.slots.length > 0
            ? resolveWidgetSlotTargets(widget.slots, slotMap)
            : Object.keys(slotMap).map((slotId) => ({
                definitionId: slotId,
                slotId,
                label: slotId === "default" ? "Default slot" : slotId,
                kind: "fixed" as const,
              }));
        const nestedCount = Object.values(slotMap).reduce((sum, items) => sum + items.length, 0);
        return (
          <div
            key={block.id}
            data-block-id={block.id}
            className={cn(
              "cursor-pointer rounded-xl border bg-background p-4 shadow-sm",
              level > 0 && "border-dashed bg-muted/20",
              selectedId === block.id && "border-primary/50 ring-2 ring-primary/10",
              highlightedId === block.id && "border-emerald-500/40 ring-2 ring-emerald-500/20",
              hoverIndex === index && dragIndex !== null && "border-primary/40"
            )}
            draggable
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
            onDragStart={(event) => handleDragStart(event, index, block.id)}
            onDragEnd={() => resetDragState()}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  data-block-select="true"
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
                      event.stopPropagation();
                      handleDragStart(event, index, block.id);
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
                      {nestedCount > 0 ? (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          Nested {nestedCount}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {widget?.description ?? "Unknown widget type"}
                    </p>
                  </div>
                </button>
                <BlockToolbar
                  blockLabel={label}
                  onMoveUp={() => onMove(listPath, index, index - 1)}
                  onMoveDown={() => onMove(listPath, index, index + 1)}
                  onDuplicate={() => onDuplicate(block.id)}
                  onDelete={() => onDelete(block.id)}
                  disableMoveUp={index === 0}
                  disableMoveDown={index === blocks.length - 1}
                />
              </div>
            </div>
            <div className="border-t bg-muted/5">
              <WidgetRenderer
                block={previewBlock}
                pageDefaults={pageDefaults}
                renderContext={{ mode: "editor-preview", previewState }}
              />
            </div>
            {slotTargets.length > 0 ? (
              <div className="border-t p-4 space-y-4">
                {slotTargets.map((slot) => {
                  const slotBlocks = slotMap[slot.slotId] ?? [];
                  const slotDefinition = widget?.slots?.find(
                    (definition) => definition.id === slot.definitionId
                  );
                  return (
                    <div
                      key={`${block.id}-slot-${slot.slotId}`}
                      className="space-y-2"
                      onDragOver={(event) => {
                        const hasWidget = Boolean(event.dataTransfer.getData("widget-type"));
                        const hasBlock = Boolean(event.dataTransfer.getData("block-id"));
                        if (!hasWidget && !hasBlock) return;
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const widgetType = event.dataTransfer.getData("widget-type");
                        if (widgetType && onInsert) {
                          onInsert(block.id, slot.slotId, widgetType);
                          return;
                        }
                        const blockId = event.dataTransfer.getData("block-id");
                        if (blockId && onMoveToSlot) {
                          onMoveToSlot(blockId, block.id, slot.slotId);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>{slot.label}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {slotBlocks.length}
                        </Badge>
                      </div>
                      {slotBlocks.length ? (
                        <BlockList
                          blocks={slotBlocks}
                          pageDefaults={pageDefaults}
                          selectedId={selectedId}
                          highlightedId={highlightedId}
                          onSelect={onSelect}
                          onMove={onMove}
                          onDuplicate={onDuplicate}
                          onDelete={onDelete}
                          onInsert={onInsert}
                          onMoveToSlot={onMoveToSlot}
                          onOpenSlotInsert={onOpenSlotInsert}
                          previewStatesByBlockId={previewStatesByBlockId}
                          path={[...listPath, { index, slotId: slot.slotId }]}
                          depth={level + 1}
                          widgetRegistry={widgetRegistry}
                        />
                      ) : (
                        <div className="rounded-lg border border-dashed bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
                          {onOpenSlotInsert ? (
                            <button
                              type="button"
                              className="flex w-full items-start gap-3 rounded-md text-left transition hover:text-foreground"
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenSlotInsert({
                                  parentId: block.id,
                                  slotId: slot.slotId,
                                  slotLabel: slot.label,
                                  allowedTypes: slotDefinition?.allowedTypes,
                                });
                              }}
                            >
                              <span className="mt-0.5 rounded-full border bg-background p-1 text-muted-foreground">
                                <Plus className="h-3 w-3" />
                              </span>
                              <span className="space-y-1">
                                <span className="block font-medium text-foreground">
                                  Add widget to {slot.label}
                                </span>
                                <span className="block text-muted-foreground">
                                  Drag from the library or choose a widget from the widgets tab.
                                </span>
                              </span>
                            </button>
                          ) : (
                            <span>Empty slot. Drag from the library to add a widget.</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
