import { MediaCard } from "@/ui/media/MediaCard";

import type { MediaItem } from "./types";

type MediaGridProps = {
  items: MediaItem[];
  selectedId?: string | null;
  selectedIds?: string[];
  view?: "grid" | "list";
  selectionMode?: boolean;
  onSelect?: (id: string) => void;
  onToggleSelect?: (id: string) => void;
};

export function MediaGrid({
  items,
  selectedId,
  selectedIds,
  view = "grid",
  selectionMode = false,
  onSelect,
  onToggleSelect,
}: MediaGridProps) {
  return (
    <div
      className={
        view === "grid"
          ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          : "flex flex-col gap-2"
      }
    >
      {items.map((item) => (
        <MediaCard
          key={`${item.id}-${item.url}`}
          item={item}
          selected={selectedIds ? selectedIds.includes(item.id) : item.id === selectedId}
          variant={view}
          selectionMode={selectionMode}
          onSelect={onSelect}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
