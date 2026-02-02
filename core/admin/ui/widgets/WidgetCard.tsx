import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type WidgetCardProps = {
  name: string;
  categoryLabel: string;
  preview: React.ReactNode;
  badge?: string;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  onInsert?: () => void;
  onSelect?: () => void;
  className?: string;
};

export function WidgetCard({
  name,
  categoryLabel,
  preview,
  badge,
  isFavorite = false,
  onFavoriteToggle,
  onInsert,
  onSelect,
  className,
}: WidgetCardProps) {
  return (
    <Card
      className={cn(
        "group flex h-full flex-col gap-0 overflow-hidden border-border/60 py-0 shadow-sm transition hover:border-primary/40 hover:shadow-lg",
        className
      )}
      role={onSelect ? "button" : undefined}
      onClick={onSelect}
    >
      <div className="relative mx-4 mt-4 aspect-video overflow-hidden rounded-xl border border-border/70 bg-muted/30">
        <div className="absolute inset-0">{preview}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={(event) => {
            event.stopPropagation();
            onFavoriteToggle?.();
          }}
          aria-pressed={isFavorite}
          className={cn(
            "absolute right-2 top-2 rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur",
            isFavorite && "text-yellow-500"
          )}
        >
          <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-400")} />
        </Button>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] uppercase">
            {categoryLabel}
          </Badge>
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
              onInsert?.();
            }}
          >
            Insert
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
