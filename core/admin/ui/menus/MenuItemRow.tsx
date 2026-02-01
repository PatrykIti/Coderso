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
  onDragStart?: (item: MenuItemDisplay) => void;
  onDragEnd?: () => void;
  onDrop?: (item: MenuItemDisplay) => void;
  onDragOver?: (item: MenuItemDisplay) => void;
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
        "group flex items-center gap-3 rounded-xl border bg-background px-3 py-3 shadow-sm transition",
        active && "border-primary/60 ring-1 ring-primary/20",
        isDragTarget && "border-primary/50 ring-2 ring-primary/10"
      )}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(item);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver?.(item);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop?.(item);
      }}
      style={{ marginLeft: depth * 24 }}
    >
      <button
        type="button"
        className="flex items-center justify-center rounded-md border bg-muted/40 p-2 text-muted-foreground"
        draggable
        aria-label={`Reorder ${label}`}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", item.id);
          event.dataTransfer.effectAllowed = "move";
          onDragStart?.(item);
        }}
        onDragEnd={() => onDragEnd?.()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground",
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
      <div className="flex-1">
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
          className="border-rose-200 bg-rose-500/10 text-rose-600"
        >
          Missing URL
        </Badge>
      ) : null}
      <div className="flex items-center gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
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
