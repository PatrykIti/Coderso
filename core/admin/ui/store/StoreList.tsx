import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { StoreCatalogItem } from "./types";

export type StoreListProps = {
  items: StoreCatalogItem[];
  selectedId?: string;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
};

export function StoreList({
  items,
  selectedId,
  query,
  onQueryChange,
  onSelect,
}: StoreListProps) {
  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? items.filter((item) =>
        [item.name, item.description, item.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      )
    : items;

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search plugins"
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="h-[520px] pr-2">
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plugins match your search.</p>
          ) : (
            filtered.map((item) => {
              const isActive = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left transition",
                    isActive
                      ? "border-primary/40 bg-primary/5"
                      : "border-muted/60 hover:border-primary/30 hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>v{item.latestVersion}</span>
                    <span>•</span>
                    <span>{item.downloads}</span>
                    {item.installedVersion && (
                      <Badge variant="secondary" className="text-[11px]">
                        Installed
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
