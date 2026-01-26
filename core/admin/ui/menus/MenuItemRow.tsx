import { AlertTriangle, GripVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MenuItemNode } from "@/ui/menus/types";

type MenuItemRowProps = {
  item: MenuItemNode;
  depth?: number;
  active?: boolean;
  onEdit?: (item: MenuItemNode) => void;
  onDelete?: (item: MenuItemNode) => void;
};

export function MenuItemRow({
  item,
  depth = 0,
  active,
  onEdit,
  onDelete,
}: MenuItemRowProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-background px-3 py-3 shadow-sm transition",
        active && "border-primary/60 ring-1 ring-primary/20"
      )}
      style={{ marginLeft: depth * 24 }}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
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
          <span className="text-xs font-semibold">{item.label[0]}</span>
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{item.label}</div>
        <div className="text-xs text-muted-foreground">
          {item.pageTitle ? `Page: ${item.pageTitle}` : item.href}
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
      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <Button
          variant={active ? "secondary" : "ghost"}
          size="icon"
          onClick={() => onEdit?.(item)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete?.(item)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
