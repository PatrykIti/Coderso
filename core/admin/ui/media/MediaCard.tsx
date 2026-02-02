import { FileAudio, FileText, Image as ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { MediaItem } from "./types";
import { formatBytes } from "./utils";

type MediaCardProps = {
  item: MediaItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

const typeIconMap = {
  image: ImageIcon,
  document: FileText,
  audio: FileAudio,
};

export function MediaCard({ item, selected, onSelect }: MediaCardProps) {
  const Icon = typeIconMap[item.type];
  const hasPreview = item.type === "image" && Boolean(item.url);
  return (
    <button
      type="button"
      className="group flex flex-col gap-2 text-left"
      onClick={() => onSelect?.(item.id)}
    >
      <div
        className={cn(
          "relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border bg-muted/30",
          selected && "border-primary ring-2 ring-primary/10"
        )}
      >
        {hasPreview ? (
          <img
            src={item.url}
            alt={item.alt ?? item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Icon className="h-10 w-10 text-muted-foreground" />
        )}
        {selected ? (
          <span className="absolute right-2 top-2 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
            Selected
          </span>
        ) : null}
      </div>
      <div className="space-y-1 px-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatBytes(item.sizeBytes)}</span>
          <Badge variant="outline" className="text-[10px]">
            {item.type}
          </Badge>
        </div>
      </div>
    </button>
  );
}
