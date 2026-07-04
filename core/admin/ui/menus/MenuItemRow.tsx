import type { DragEvent } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CornerDownRight,
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
  // TASK-499-01: compact row (mono link subline) — the redundant text
  // "Sub-item of X" hint is dropped; `pl-8` + the CornerDownRight below are the
  // only nesting cue, matching the prototype.
  const linkSubline = item.pageTitle ? `Page: ${item.pageTitle}` : item.href || "Missing link";
  const toneClass =
    settings.badge?.tone === "accent"
      ? "border-info/30 bg-info-soft text-info"
      : settings.badge?.tone === "success"
        ? "border-success/30 bg-success-soft text-success"
        : settings.badge?.tone === "warning"
          ? "border-[var(--admin-state-warning)] bg-card text-[var(--admin-state-warning)]"
          : settings.badge?.tone === "danger"
            ? "border-destructive bg-card text-destructive"
            : "border-border bg-muted/40 text-foreground";
  return (
    <div
      className={cn(
        "group relative flex items-stretch gap-3 rounded-xl border bg-card px-3 shadow-sm transition-colors select-none hover:bg-accent",
        active && "border-primary bg-primary-soft/40 ring-1 ring-primary/20",
        isDragTarget && dropIntent === "child"
          ? "border-primary bg-primary/5 ring-2 ring-primary/40"
          : isDragTarget && "border-primary/50 ring-2 ring-primary/10"
      )}
      data-menu-depth={depth}
      data-menu-row-active={active ? "true" : undefined}
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
      {isDragTarget && dropIntent === "child" ? (
        <div
          className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-primary/60 bg-background px-2 py-0.5 text-[11px] font-semibold text-primary shadow-sm"
          aria-hidden="true"
        >
          Drop as sub-menu
        </div>
      ) : null}
      <button
        type="button"
        className="flex shrink-0 cursor-grab items-center self-center rounded-md text-muted-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        <GripVertical aria-hidden="true" focusable="false" className="size-4" />
      </button>
      {depth > 0 ? (
        <CornerDownRight
          aria-hidden="true"
          focusable="false"
          data-menu-nested-indent=""
          className="size-4 shrink-0 self-center text-muted-foreground"
        />
      ) : null}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left"
        draggable={false}
        aria-label={`Open menu item details for ${label}`}
        title={`Open menu item details for ${label}.`}
        onClick={(event) => onSelect?.(item, event.timeStamp)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect?.(item, event.timeStamp);
          }
        }}
      >
        {item.status === "error" ? (
          <AlertTriangle className="pointer-events-none size-4 shrink-0 text-destructive" />
        ) : null}
        <div className="pointer-events-none min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{label}</div>
          <div className="truncate font-mono text-xs text-muted-foreground">{linkSubline}</div>
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
