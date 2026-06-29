import { AlertTriangle, FileAudio, FileText, Image as ImageIcon, Video } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import type { MediaItem, MediaKind } from "./types";
import { formatBytes, hasMissingImageAlt, resolveMediaDisplayName } from "./utils";

type MediaCardProps = {
  item: MediaItem;
  selected?: boolean;
  variant?: "grid" | "list";
  selectionMode?: boolean;
  onSelect?: (id: string) => void;
  onToggleSelect?: (id: string) => void;
};

const typeIconMap = {
  image: ImageIcon,
  document: FileText,
  audio: FileAudio,
  video: Video,
};

// TASK-479-11-L01: type tone mapped from the prototype KINDS[] (image=violet,
// video=info, document=warning, audio=success) — all token-driven Badge variants.
const typeToneMap: Record<MediaKind, "soft" | "info" | "warning" | "success"> = {
  image: "soft",
  video: "info",
  document: "warning",
  audio: "success",
};

export function MediaCard({
  item,
  selected,
  variant = "grid",
  selectionMode = false,
  onSelect,
  onToggleSelect,
}: MediaCardProps) {
  const Icon = typeIconMap[item.type];
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const displayName = resolveMediaDisplayName(item);
  const missingAlt = hasMissingImageAlt(item);
  const hasPreview = item.type === "image" && Boolean(item.url);
  const showImage = hasPreview && !isError;
  const showSkeleton = showImage && !isLoaded;

  const preview = (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-muted text-muted-foreground",
        variant === "grid" ? "aspect-[4/3] rounded-xl" : "h-16 w-20 shrink-0 rounded-lg",
        selected && "ring-2 ring-primary/40"
      )}
    >
      {!showImage ? <Icon className="h-8 w-8 text-muted-foreground" /> : null}
      {showImage ? (
        <img
          src={item.url}
          alt={item.alt ?? displayName}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setIsError(true);
            setIsLoaded(true);
          }}
        />
      ) : null}
      {showSkeleton ? (
        <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
      ) : null}
      {selected && !selectionMode ? (
        <span className="absolute right-2 top-2 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
          Selected
        </span>
      ) : null}
      {missingAlt ? (
        <span className="absolute right-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-md bg-warning-soft text-warning shadow-soft">
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </div>
  );

  const details = (
    <div className={cn("min-w-0 space-y-1", variant === "grid" ? "px-1" : "flex-1")}>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
        {missingAlt ? (
          <Badge variant="warning" className="shrink-0 text-[10px]">
            Missing alt
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{formatBytes(item.sizeBytes)}</span>
        <Badge variant={typeToneMap[item.type]} className="text-[10px] capitalize">
          {item.type}
        </Badge>
        {item.originalName ? <span className="truncate">{item.originalName}</span> : null}
      </div>
    </div>
  );

  if (variant === "list") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition-all hover:shadow-card",
          selected && "ring-2 ring-primary/40"
        )}
      >
        {selectionMode ? (
          <Checkbox
            checked={Boolean(selected)}
            aria-label={`Select ${displayName}`}
            onCheckedChange={() => onToggleSelect?.(item.id)}
          />
        ) : null}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => onSelect?.(item.id)}
        >
          {preview}
          {details}
        </button>
      </div>
    );
  }

  return (
    <Card className="group relative gap-2 overflow-hidden p-2 transition-all hover:-translate-y-0.5 hover:shadow-card">
      {selectionMode ? (
        <div className="absolute left-2 top-2 z-10 rounded-md bg-card/90 p-1 shadow-soft backdrop-blur">
          <Checkbox
            checked={Boolean(selected)}
            aria-label={`Select ${displayName}`}
            onCheckedChange={() => onToggleSelect?.(item.id)}
          />
        </div>
      ) : null}
      <button
        type="button"
        className="flex flex-col gap-2 text-left"
        onClick={() => onSelect?.(item.id)}
      >
        {preview}
        {details}
      </button>
    </Card>
  );
}
