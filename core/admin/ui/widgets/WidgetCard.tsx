import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  onSelect,
  variant = "default",
  draggable,
  onDragStart,
  className,
}: WidgetCardProps) {
  const resolvedAction = onAction ?? onInsert;
  const resolvedLabel = actionLabel ?? "Insert";
  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "group flex h-16 items-center justify-center rounded-xl border-border/60 bg-muted/20 px-3 text-center text-xs font-semibold text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-primary",
          className
        )}
        role={onSelect ? "button" : undefined}
        onClick={onSelect}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        <span className="truncate">{name}</span>
      </Card>
    );
  }
  return (
    <Card
      className={cn(
        "group flex h-full flex-col gap-0 overflow-hidden border-border/60 py-0 shadow-sm transition hover:border-primary/40 hover:shadow-lg",
        className
      )}
      role={onSelect ? "button" : undefined}
      onClick={onSelect}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="relative mx-4 mt-4 aspect-video overflow-hidden rounded-xl border border-border/70 bg-muted/30">
        {preview ? <div className="absolute inset-0">{preview}</div> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {onFavoriteToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation();
              onFavoriteToggle();
            }}
            aria-pressed={isFavorite}
            className={cn(
              "absolute right-2 top-2 rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur",
              isFavorite && "text-yellow-500"
            )}
          >
            <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-400")} />
          </Button>
        ) : null}
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-4">
        <div className="flex items-center gap-2">
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
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-sm font-semibold text-foreground">{name}</h3>
          <Button
            variant="outline"
            size="xs"
            onClick={(event) => {
              event.stopPropagation();
              resolvedAction?.();
            }}
          >
            {resolvedLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
