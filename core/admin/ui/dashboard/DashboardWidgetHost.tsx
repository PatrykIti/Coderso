import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronsDownUp,
  ChevronsUpDown,
  GripVertical,
  Maximize2,
  Minimize2,
  Settings,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getWidgetRenderer } from "./widgetRegistry";
import { UnavailableWidget } from "./widgetRenderers";
import type {
  DashboardWidget,
  DashboardWidgetResolution,
} from "../../../services/dashboard/dashboardTypes";

type WidgetAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "wider"
  | "narrower"
  | "taller"
  | "shorter"
  | "configure"
  | "remove";

type DashboardWidgetHostProps = {
  widget: DashboardWidget;
  data?: DashboardWidgetResolution;
  editMode: boolean;
  selected?: boolean;
  onAction?: (action: WidgetAction) => void;
  // Pointer drag-and-drop (TASK-480-05-L01). These wire the grip + corner handles
  // to the builder's pointer arrange/resize; when omitted the handles are hidden
  // and only the keyboard-operable nudge buttons remain (the a11y fallback).
  onReorderPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  onResizePointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  dragging?: boolean;
  dropTarget?: boolean;
};

function IconAction({
  label,
  icon,
  onClick,
  variant = "ghost",
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "destructive";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant={variant}
          className="size-8"
          aria-label={label}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// Dispatch through the exhaustive renderer registry. The host owns the two
// cross-cutting cases the registry does not: an error resolution and a
// data/widget-type mismatch. Each renderer receives its own narrowed data
// variant (or `undefined`, which the renderer handles per its contract).
function renderWidget(widget: DashboardWidget, data?: DashboardWidgetResolution) {
  if (data && "error" in data) return <UnavailableWidget widget={widget} />;
  const payload = data && data.type === widget.type ? data : undefined;
  const Renderer = getWidgetRenderer(widget.type);
  return <Renderer widget={widget} data={payload} />;
}

export function DashboardWidgetHost({
  widget,
  data,
  editMode,
  selected,
  onAction,
  onReorderPointerDown,
  onResizePointerDown,
  dragging,
  dropTarget,
}: DashboardWidgetHostProps) {
  return (
    <div
      className={cn(
        "relative h-full min-h-40 rounded-lg transition-[opacity,box-shadow]",
        editMode && "outline outline-1 outline-dashed outline-border",
        selected && "outline-2 outline-primary",
        dragging && "opacity-60",
        dropTarget && "outline-2 outline-primary ring-2 ring-primary/40"
      )}
      data-widget-id={widget.id}
      data-widget-type={widget.type}
      data-dragging={dragging ? "true" : undefined}
      data-drop-target={dropTarget ? "true" : undefined}
      aria-grabbed={editMode ? Boolean(dragging) : undefined}
    >
      {editMode ? (
        <div className="absolute right-2 top-2 z-10 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-soft">
          {onReorderPointerDown ? (
            <div
              role="presentation"
              aria-hidden="true"
              data-testid="widget-drag-handle"
              title="Drag to rearrange (or use the move buttons)"
              onPointerDown={onReorderPointerDown}
              className={cn(
                "flex size-8 touch-none items-center justify-center rounded-md text-muted-foreground",
                "cursor-grab hover:bg-muted active:cursor-grabbing"
              )}
            >
              <GripVertical className="size-4" />
            </div>
          ) : null}
          <IconAction
            label="Move left"
            icon={<ArrowLeft className="size-4" />}
            onClick={() => onAction?.("left")}
          />
          <IconAction
            label="Move right"
            icon={<ArrowRight className="size-4" />}
            onClick={() => onAction?.("right")}
          />
          <IconAction
            label="Move up"
            icon={<ArrowUp className="size-4" />}
            onClick={() => onAction?.("up")}
          />
          <IconAction
            label="Move down"
            icon={<ArrowDown className="size-4" />}
            onClick={() => onAction?.("down")}
          />
          <IconAction
            label="Wider"
            icon={<Maximize2 className="size-4" />}
            onClick={() => onAction?.("wider")}
          />
          <IconAction
            label="Narrower"
            icon={<Minimize2 className="size-4" />}
            onClick={() => onAction?.("narrower")}
          />
          <IconAction
            label="Taller"
            icon={<ChevronsUpDown className="size-4" />}
            onClick={() => onAction?.("taller")}
          />
          <IconAction
            label="Shorter"
            icon={<ChevronsDownUp className="size-4" />}
            onClick={() => onAction?.("shorter")}
          />
          <IconAction
            label="Configure"
            icon={<Settings className="size-4" />}
            onClick={() => onAction?.("configure")}
          />
          <IconAction
            label="Remove"
            icon={<Trash2 className="size-4" />}
            variant="destructive"
            onClick={() => onAction?.("remove")}
          />
        </div>
      ) : null}
      <div className={cn("h-full", editMode && "pt-11")}>{renderWidget(widget, data)}</div>
      {editMode && onResizePointerDown ? (
        <div
          role="presentation"
          aria-hidden="true"
          data-testid="widget-resize-handle"
          title="Drag to resize (or use the wider/taller buttons)"
          onPointerDown={onResizePointerDown}
          className={cn(
            "absolute bottom-1 right-1 z-10 size-4 touch-none cursor-nwse-resize rounded-sm",
            "border-b-2 border-r-2 border-primary/50 hover:border-primary"
          )}
        />
      ) : null}
    </div>
  );
}
