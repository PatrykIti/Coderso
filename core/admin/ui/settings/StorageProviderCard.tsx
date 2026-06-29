import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StorageProviderId = "local" | "s3" | "azure";

type StorageProviderCardProps = {
  id: StorageProviderId;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  isActive?: boolean;
  onSelect?: (id: StorageProviderId) => void;
};

export function StorageProviderCard({
  id,
  title,
  description,
  icon: Icon,
  badge,
  isActive = false,
  onSelect,
}: StorageProviderCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  };

  return (
    <Card
      role="radio"
      aria-checked={isActive}
      tabIndex={0}
      className={cn(
        "cursor-pointer border-border/60 bg-card/80 p-0 transition-all",
        isActive ? "border-primary/50 shadow-sm ring-2 ring-primary/15" : "hover:border-border"
      )}
      onClick={() => onSelect?.(id)}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              isActive ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          {badge ? (
            <Badge variant={isActive ? "default" : "secondary"} className="text-[11px]">
              {badge}
            </Badge>
          ) : null}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
