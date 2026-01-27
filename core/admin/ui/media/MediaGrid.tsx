import { MediaCard } from "@/ui/media/MediaCard";

import type { MediaItem } from "./types";

type MediaGridProps = {
  items: MediaItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function MediaGrid({ items, selectedId, onSelect }: MediaGridProps) {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
