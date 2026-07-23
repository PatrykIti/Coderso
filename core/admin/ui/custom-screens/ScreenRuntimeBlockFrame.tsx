import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { selectionBorder } from "@/ui/authoring";
import type { ScreenBlockV1 } from "../../../services/customScreens/customScreenSchemas";
import type { ScreenInsertTarget } from "../../../services/customScreens/screenDocumentOps";
import {
  insertTargetsEqual,
  isSelectionInteractiveOrigin,
  resolveBlockLabel,
  resolveBlockTypeLabel,
  resolveScreenBlockPresentation,
  type RenderBlockContext,
  type ScreenRuntimeContext,
} from "./screenRuntimeRendererModel";
import type { ScreenRuntimeInteractions } from "./useScreenRuntimeInteractions";

type ScreenRuntimeBlockFrameProps = {
  block: ScreenBlockV1;
  blockContext: RenderBlockContext;
  context: ScreenRuntimeContext;
  interactions: ScreenRuntimeInteractions;
  children: ReactNode;
};

export function ScreenRuntimeBlockFrame({
  block,
  blockContext,
  context,
  interactions,
  children,
}: ScreenRuntimeBlockFrameProps) {
  const selected = context.selectedBlockId === block.id;
  const isInteractive = context.mode !== "preview" && Boolean(context.onSelectBlock);
  const selectionLabel = resolveBlockLabel(block);
  const wrapperClass = cn(
    "group relative transition",
    context.mode === "preview"
      ? "rounded-xl border bg-background shadow-sm"
      : context.mode === "builder"
        ? cn(
            selectionBorder({ level: "item", selected, interactive: isInteractive }),
            "rounded-2xl bg-card p-5"
          )
        : cn(
            "rounded-xl bg-card",
            selectionBorder({ level: "item", selected, interactive: isInteractive })
          )
  );
  const { widthClass, alignClass, boxStyle } = resolveScreenBlockPresentation(block.style);
  const cardDropTargets =
    interactions.canDrag && !blockContext.suppressed ? blockContext.dropTargets : undefined;

  const selectBlockFromContainer = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (isSelectionInteractiveOrigin(event.target, event.currentTarget)) return;
    context.onSelectBlock?.(block.id);
  };

  return (
    <div
      className={cn(wrapperClass, widthClass, alignClass)}
      style={boxStyle}
      data-screen-block-id={block.id}
      data-screen-block-type={block.type}
      data-screen-presentation-override={
        context.presentation.blocksWithOverrides.has(block.id) ? "true" : undefined
      }
      data-selected={selected ? "true" : "false"}
      onDragOver={
        cardDropTargets ? (event) => interactions.onCardDragOver(event, cardDropTargets) : undefined
      }
      onDrop={
        cardDropTargets ? (event) => interactions.onCardDrop(event, cardDropTargets) : undefined
      }
      onClick={isInteractive ? selectBlockFromContainer : undefined}
    >
      {isInteractive ? (
        <button
          type="button"
          aria-label={`Select ${selectionLabel} block`}
          aria-pressed={selected}
          data-screen-select-block={block.id}
          className="absolute -left-3 top-3 z-20 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            context.onSelectBlock?.(block.id);
          }}
        >
          Select
        </button>
      ) : null}
      {context.mode === "builder" ? (
        <>
          <Badge
            variant="outline"
            data-screen-drag-handle={interactions.canDrag ? block.id : undefined}
            draggable={interactions.canDrag ? true : undefined}
            onDragStart={
              interactions.canDrag
                ? (event) => interactions.onBlockDragStart(event, block.id)
                : undefined
            }
            onDragEnd={interactions.canDrag ? interactions.clearDragState : undefined}
            className={cn(
              "absolute -top-2 left-3 z-10 px-1.5 py-0 text-[10px] font-medium",
              interactions.canDrag && "cursor-grab active:cursor-grabbing"
            )}
          >
            {resolveBlockTypeLabel(block)}
          </Badge>
          {context.renderBuilderActions ? (
            <div className="absolute -top-2 right-3 z-10">
              {context.renderBuilderActions(block)}
            </div>
          ) : null}
        </>
      ) : null}
      {children}
    </div>
  );
}

type ScreenRuntimeInsertGapProps = {
  target: Extract<ScreenInsertTarget, { kind: "section-index" | "slot-index" }>;
  context: ScreenRuntimeContext;
  interactions: ScreenRuntimeInteractions;
  fullRow?: boolean;
};

export function ScreenRuntimeInsertGap({
  target,
  context,
  interactions,
  fullRow,
}: ScreenRuntimeInsertGapProps) {
  if (!interactions.canInsert) return null;
  const armed = context.insertPoint ? insertTargetsEqual(context.insertPoint, target) : false;
  const dragHover = interactions.isDragHover(target);
  const dragging = interactions.draggingBlockId !== null;

  return (
    <button
      type="button"
      aria-label="Insert here"
      data-screen-insert-gap="true"
      data-insert-kind={target.kind}
      data-insert-section={target.sectionId}
      data-insert-parent={target.kind === "slot-index" ? target.parentId : undefined}
      data-insert-slot={target.kind === "slot-index" ? target.slotId : undefined}
      data-insert-index={target.index}
      data-armed={armed ? "true" : "false"}
      data-drag-hover={dragHover ? "true" : undefined}
      className={cn(
        "group/gap relative z-10 -my-2 flex h-4 w-full items-center justify-center rounded-md transition",
        armed
          ? "bg-primary/10 ring-1 ring-primary"
          : dragHover
            ? "bg-primary/10 opacity-100 ring-2 ring-primary"
            : dragging
              ? "bg-primary/5 opacity-60"
              : "opacity-0 hover:bg-primary/5 hover:opacity-100 focus-visible:opacity-100"
      )}
      style={fullRow ? { gridColumn: "1 / -1" } : undefined}
      onClick={(event) => {
        event.stopPropagation();
        context.onSetInsertPoint?.(armed ? null : target);
      }}
      {...interactions.dropHandlers(target)}
    >
      <span className="pointer-events-none text-[10px] font-medium text-primary">
        ＋ insert here
      </span>
    </button>
  );
}
