import { AlertTriangle, FileAudio, FileText, Image as ImageIcon, Video } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import type { MediaItem, MediaKind } from "./types";
import {
  formatBytes,
  hasMissingImageAlt,
  resolveFocalPosition,
  resolveMediaDisplayName,
} from "./utils";

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

// TASK-512-05: tone class for the bottom-right size-5 chip, by MediaKind — the
// prototype's KINDS[] tone strings (`_docs/_PROTOTYPE/src/pages/media/
// MediaLibraryPage.tsx:30-36`, applied at line 142). This is the ONE surviving
// tone map: the old Badge-variant `typeToneMap` + colored footer type text Badge
// (proto footer 137-147 has neither) are retired.
const KIND_TONE: Record<MediaKind, string> = {
  image: "bg-primary-soft text-primary-soft-foreground", // proto "Image" → violet
  video: "bg-info-soft text-info", // proto "Video" → blue
  document: "bg-warning-soft text-warning", // proto "Doc"   → amber
  audio: "bg-success-soft text-success", // proto "Audio" → green
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
  const hasFocal =
    item.type === "image" && (typeof item.focalX === "number" || typeof item.focalY === "number");
  const focal = hasFocal ? resolveFocalPosition(item) : null;

  const toneChip = (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-md [&_svg]:size-3",
        KIND_TONE[item.type]
      )}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );

  const preview = (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-muted text-muted-foreground",
        variant === "grid" ? "aspect-square rounded-xl" : "h-16 w-20 shrink-0 rounded-lg",
        selected && "ring-2 ring-primary/40"
      )}
    >
      {!showImage ? <Icon className="size-8 text-muted-foreground" /> : null}
      {showImage ? (
        <img
          src={item.url}
          alt={item.alt ?? displayName}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={focal ? { objectPosition: `${focal.x * 100}% ${focal.y * 100}%` } : undefined}
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
      {/* top-left: neutral TYPE badge (proto) */}
      {variant === "grid" ? (
        <Badge
          variant="outline"
          className="absolute left-2 top-2 bg-card/80 capitalize backdrop-blur"
        >
          {item.type}
        </Badge>
      ) : null}
      {/* bottom-right: missing-alt marker (own corner) */}
      {missingAlt ? (
        <span className="absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-md bg-warning-soft text-warning shadow-soft">
          <AlertTriangle className="size-3.5" />
        </span>
      ) : null}
    </div>
  );

  const details = (
    <div className={cn("min-w-0", variant === "grid" ? "px-1 pb-1 pt-2.5" : "flex-1 space-y-1")}>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
        {missingAlt ? (
          <Badge variant="warning" className="shrink-0 text-[10px]">
            Missing alt
          </Badge>
        ) : null}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0">{formatBytes(item.sizeBytes)}</span>
          {item.originalName && item.originalName !== displayName ? (
            <span className="truncate">{item.originalName}</span>
          ) : null}
        </span>
        {toneChip}
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
    <Card className="group relative gap-0 overflow-hidden p-2 transition-all hover:-translate-y-0.5 hover:shadow-card">
      {/* top-right selection affordance — sibling of the click button so the
          checkbox toggle never doubles as an item-select click. selectionMode
          Checkbox and the non-selectionMode "Selected" pill are mutually
          exclusive states, so they never co-occupy the corner. */}
      {selectionMode ? (
        <div className="absolute right-3 top-3 z-10 rounded-md bg-card/90 p-1 shadow-soft backdrop-blur">
          <Checkbox
            checked={Boolean(selected)}
            aria-label={`Select ${displayName}`}
            onCheckedChange={() => onToggleSelect?.(item.id)}
          />
        </div>
      ) : selected ? (
        <span className="absolute right-3 top-3 z-10 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
          Selected
        </span>
      ) : null}
      <button type="button" className="flex flex-col text-left" onClick={() => onSelect?.(item.id)}>
        {preview}
        {details}
      </button>
    </Card>
  );
}
