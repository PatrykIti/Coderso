import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type WidgetCardProps = {
  name: string;
  categoryLabel: string;
  preview?: React.ReactNode;
  badge?: string;
  metaBadges?: string[];
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  onInsert?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actions?: React.ReactNode;
  selected?: boolean;
  onSelectionChange?: (checked: boolean) => void;
  onSelect?: () => void;
  variant?: "default" | "compact";
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLDivElement>;
  className?: string;
};

export function WidgetCard({
  name,
  categoryLabel,
  preview,
  badge,
  metaBadges,
  isFavorite = false,
  onFavoriteToggle,
  onInsert,
  onAction,
  actionLabel,
  actions,
  selected = false,
  onSelectionChange,
  onSelect,
  variant = "default",
  draggable,
  onDragStart,
  className,
}: WidgetCardProps) {
  const resolvedAction = onAction ?? onInsert;
  const resolvedLabel = actionLabel ?? "Configure";
  const favoriteLabel = isFavorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`;
  const handleCardKeyDown = (event: React.KeyboardEvent) => {
    if (!onSelect) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };
  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "group flex h-16 items-center justify-center rounded-xl border-border/60 bg-muted/20 px-3 text-center text-xs font-semibold text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-primary",
          className
        )}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onClick={onSelect}
        onKeyDown={handleCardKeyDown}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        <span className="truncate">{name}</span>
      </Card>
    );
  }
  return (
    // TASK-479-22-L01: soft & friendly gallery card ported from the prototype —
    // rounded-2xl, soft shadow + subtle hover lift. Controls are re-skinned in
    // place (preview frame + pinned actions/checkbox, category/meta badges, name
    // beside the inline Configure button); no control is added or removed.
    <Card
      className={cn(
        "group flex h-full flex-col gap-3 rounded-2xl border-border/60 p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card",
        className
      )}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={handleCardKeyDown}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="relative h-28">
        {preview ? <div className="absolute inset-0">{preview}</div> : null}
        {onSelectionChange ? (
          <div
            className="absolute left-2 top-2 rounded-md bg-card/85 p-1 shadow-soft backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <Checkbox
              aria-label={`Select ${name}`}
              checked={selected}
              onCheckedChange={(checked) => onSelectionChange(checked === true)}
            />
          </div>
        ) : null}
        {actions ? (
          <div
            className="absolute right-2 top-2 rounded-md bg-card/85 shadow-soft backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            {actions}
          </div>
        ) : onFavoriteToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation();
              onFavoriteToggle();
            }}
            aria-label={favoriteLabel}
            aria-pressed={isFavorite}
            title={favoriteLabel}
            className={cn(
              "absolute right-2 top-2 rounded-full bg-card/80 text-muted-foreground shadow-soft backdrop-blur",
              isFavorite && "text-yellow-500"
            )}
          >
            <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-400")} />
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-[10px] uppercase">
          {categoryLabel}
        </Badge>
        {metaBadges?.map((item) => (
          <Badge key={item} variant="outline" className="text-[10px] uppercase">
            {item}
          </Badge>
        ))}
        {badge ? (
          <Badge variant="outline" className="text-[10px] uppercase">
            {badge}
          </Badge>
        ) : null}
      </div>
      <div className="mt-auto flex items-start justify-between gap-4">
        <h3 className="font-display text-[15px] font-semibold text-foreground">{name}</h3>
        {resolvedAction ? (
          <Button
            variant="outline"
            size="xs"
            onClick={(event) => {
              event.stopPropagation();
              resolvedAction();
            }}
          >
            {resolvedLabel}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
