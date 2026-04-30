import type { DragEvent } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  GripVertical,
  IndentDecrease,
  IndentIncrease,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MenuDropIntent } from "@/ui/menus/menuDnD";
import type { MenuItemDisplay } from "@/ui/menus/types";
import { normalizeMenuItemSettings } from "../../../services/menus/menuItemSettings";

export type MenuKeyboardAction = {
  id: "move-up" | "move-down" | "indent" | "outdent";
  label: string;
  disabled: boolean;
  onSelect: () => void;
};

type MenuItemRowProps = {
  item: MenuItemDisplay;
  depth?: number;
  active?: boolean;
  isDragTarget?: boolean;
  dropIntent?: MenuDropIntent | null;
  keyboardActions?: MenuKeyboardAction[];
  onEdit?: (item: MenuItemDisplay) => void;
  onDelete?: (item: MenuItemDisplay) => void;
  onSelect?: (item: MenuItemDisplay, eventTimeStamp: number) => void;
  onDragStart?: (item: MenuItemDisplay, event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop?: (item: MenuItemDisplay, event: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (item: MenuItemDisplay, event: DragEvent<HTMLDivElement>) => void;
};

const keyboardActionIcons: Record<MenuKeyboardAction["id"], typeof ArrowUp> = {
  "move-up": ArrowUp,
  "move-down": ArrowDown,
  indent: IndentIncrease,
  outdent: IndentDecrease,
};

function RowDropIndicator({
  item,
  intent,
}: {
  item: MenuItemDisplay;
  intent: Exclude<MenuDropIntent, "child">;
}) {
  const label = intent === "before" ? "Drop before" : "Drop after";
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-2 right-2 z-10 flex h-7 items-center gap-2",
        intent === "before" ? "-top-3" : "-bottom-3"
      )}
      data-menu-drop-line={`${item.id}:${intent}`}
      data-menu-target-id={item.id}
      data-menu-drop-intent={intent}
      aria-hidden="true"
    >
      <span className="h-0.5 flex-1 rounded-full bg-primary" />
      <span className="rounded-full border border-primary/60 bg-background px-2 py-0.5 text-[11px] font-semibold text-primary shadow-sm">
        {label}
      </span>
      <span className="h-0.5 flex-1 rounded-full bg-primary" />
    </div>
  );
}

export function MenuItemRow({
  item,
  depth = 0,
  active,
  isDragTarget,
  dropIntent,
  keyboardActions = [],
  onEdit,
  onDelete,
  onSelect,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
}: MenuItemRowProps) {
  const label = item.label || "Untitled";
  const settings = normalizeMenuItemSettings(item.settings);
  const hasMetadataBadge = Boolean(settings.badge);
  const hasRestrictedVisibility = Boolean(settings.visibility) && settings.visibility !== "all";
  const nestedHint = depth > 0 && item.parentLabel ? `Sub-item of ${item.parentLabel}` : null;
  const toneClass =
    settings.badge?.tone === "accent"
      ? "border-sky-200 bg-sky-500/10 text-sky-700"
      : settings.badge?.tone === "success"
        ? "border-emerald-200 bg-emerald-500/10 text-emerald-700"
        : settings.badge?.tone === "warning"
          ? "border-[var(--admin-state-warning)] bg-card text-[var(--admin-state-warning)]"
          : settings.badge?.tone === "danger"
            ? "border-destructive bg-card text-destructive"
            : "border-border bg-muted/40 text-foreground";
  return (
    <div
      className={cn(
        "group relative flex items-stretch gap-3 rounded-xl border bg-background px-3 shadow-sm transition select-none",
        active && "border-primary/60 ring-1 ring-primary/20",
        isDragTarget && "border-primary/50 ring-2 ring-primary/10"
      )}
      data-menu-depth={depth}
      data-menu-row-id={item.id}
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
      {isDragTarget && dropIntent && dropIntent !== "child" ? (
        <RowDropIndicator item={item} intent={dropIntent} />
      ) : null}
      <button
        type="button"
        className="flex h-12 w-12 shrink-0 cursor-grab items-center justify-center self-center rounded-md border bg-muted/40 text-muted-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-none"
        draggable
        aria-label={`Drag ${label}`}
        title={`Drag ${label}`}
        data-menu-drag-handle={item.id}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", item.id);
          event.dataTransfer.effectAllowed = "move";
          onDragStart?.(item, event);
        }}
        onDragEnd={(event) => onDragEnd?.(event)}
      >
        <GripVertical
          aria-hidden="true"
          focusable="false"
          className="h-4 w-4 pointer-events-none"
        />
      </button>
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
        draggable={false}
        aria-label={`Open menu item details for ${label}`}
        title={
          nestedHint
            ? `Open menu item details for ${label}. ${nestedHint}.`
            : `Open menu item details for ${label}.`
        }
        onClick={(event) => onSelect?.(item, event.timeStamp)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect?.(item, event.timeStamp);
          }
        }}
      >
        <div
          className={cn(
            "pointer-events-none flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            item.status === "error" && "border border-destructive bg-card text-destructive"
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
            {settings.description
              ? settings.description
              : item.pageTitle
                ? `Page: ${item.pageTitle}`
                : item.href || "Missing link"}
          </div>
          {nestedHint ? (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <span aria-hidden="true">↳</span>
              <span>{nestedHint}</span>
            </div>
          ) : null}
          {isDragTarget && dropIntent ? (
            <div className="mt-1 text-[11px] font-medium text-primary">
              {dropIntent === "child"
                ? "Drop as sub-menu"
                : dropIntent === "before"
                  ? "Drop before this item"
                  : "Drop after this item"}
            </div>
          ) : null}
        </div>
        {hasMetadataBadge ? (
          <Badge variant="outline" className={cn("pointer-events-none", toneClass)}>
            {settings.badge?.label}
          </Badge>
        ) : null}
        {hasRestrictedVisibility ? (
          <Badge variant="outline" className="pointer-events-none">
            {settings.visibility === "logged_in" ? "Members" : "Guests"}
          </Badge>
        ) : null}
        {item.status === "error" ? (
          <Badge
            variant="outline"
            className="pointer-events-none border-destructive bg-card text-destructive"
          >
            Missing URL
          </Badge>
        ) : null}
      </button>
      <div className="flex items-center gap-1 py-3 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
        {keyboardActions.map((action) => {
          const Icon = keyboardActionIcons[action.id];
          return (
            <Button
              key={action.id}
              variant="ghost"
              size="icon"
              aria-label={`${action.label} ${label}`}
              title={`${action.label} ${label}`}
              disabled={action.disabled}
              onClick={(event) => {
                event.stopPropagation();
                action.onSelect();
              }}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
        <Button
          variant={active ? "secondary" : "ghost"}
          size="icon"
          aria-label={`Open details for ${label}`}
          title={`Open details for ${label}`}
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
          className="text-destructive hover:text-destructive"
          aria-label={`Delete ${label}`}
          title={`Delete ${label}`}
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
