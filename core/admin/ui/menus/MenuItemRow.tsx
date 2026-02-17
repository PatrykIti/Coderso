import type { DragEvent } from "react";
import { AlertTriangle, GripVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MenuItemDisplay } from "@/ui/menus/types";

type MenuItemRowProps = {
  item: MenuItemDisplay;
  depth?: number;
  active?: boolean;
  isDragTarget?: boolean;
  onEdit?: (item: MenuItemDisplay) => void;
  onDelete?: (item: MenuItemDisplay) => void;
  onSelect?: (item: MenuItemDisplay) => void;
  onDragStart?: (item: MenuItemDisplay, event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  onDrop?: (item: MenuItemDisplay, event: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (item: MenuItemDisplay, event: DragEvent<HTMLDivElement>) => void;
};

export function MenuItemRow({
  item,
  depth = 0,
  active,
  isDragTarget,
  onEdit,
  onDelete,
  onSelect,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
}: MenuItemRowProps) {
  const label = item.label || "Untitled";
  return (
    <div
      className={cn(
        "group flex items-stretch gap-3 rounded-xl border bg-background px-3 shadow-sm transition select-none cursor-grab active:cursor-grabbing",
        active && "border-primary/60 ring-1 ring-primary/20",
        isDragTarget && "border-primary/50 ring-2 ring-primary/10"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.(item, event);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.(item, event);
      }}
      style={{ marginLeft: depth * 24 }}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left cursor-grab active:cursor-grabbing"
        draggable
        onClick={() => onSelect?.(item)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect?.(item);
          }
        }}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", item.id);
          event.dataTransfer.effectAllowed = "move";
          onDragStart?.(item, event);
        }}
        onDragEnd={() => onDragEnd?.()}
      >
        <div
          className="pointer-events-none flex items-center justify-center rounded-md border bg-muted/40 p-2 text-muted-foreground"
          aria-hidden="true"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div
          className={cn(
            "pointer-events-none flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            item.status === "error" &&
              "bg-rose-500/10 text-rose-500 border border-rose-200"
          )}
        >
          {item.status === "error" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <span className="text-xs font-semibold">{label[0] ?? "?"}</span>
          )}
        </div>
        <div className="pointer-events-none flex-1">
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs text-muted-foreground">
            {item.pageTitle
              ? `Page: ${item.pageTitle}`
              : item.href || "Missing link"}
          </div>
        </div>
        {item.status === "error" ? (
          <Badge
            variant="outline"
            className="pointer-events-none border-rose-200 bg-rose-500/10 text-rose-600"
          >
            Missing URL
          </Badge>
        ) : null}
      </button>
      <div className="flex items-center gap-1 py-3 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
        <Button
          variant={active ? "secondary" : "ghost"}
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onEdit?.(item);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.(item);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
