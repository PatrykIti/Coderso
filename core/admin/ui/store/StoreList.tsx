import { Check, Puzzle, Search, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { StoreCatalogItem } from "./types";

export type StoreListProps = {
  items: StoreCatalogItem[];
  selectedId?: string;
  query: string;
  category?: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
};

export function StoreList({
  items,
  selectedId,
  query,
  category = "all",
  onQueryChange,
  onSelect,
}: StoreListProps) {
  const normalized = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const matchesQuery = normalized
      ? [item.name, item.description, item.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      : true;
    const matchesCategory = category === "all" || item.tags.includes(category);
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search plugins"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No plugins match your search.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((item) => {
            const isActive = item.id === selectedId;
            const isInstalled = Boolean(item.installedVersion);
            return (
              <div
                key={item.id}
                className={cn(
                  "group flex h-full flex-col rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5",
                  isActive ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
                )}
              >
                {/* Keyboard-accessible selectable region (the CTA below is a sibling,
                    not nested, so we keep a real <button> like the installed PluginList). */}
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-pressed={isActive}
                  className="flex flex-1 flex-col text-left"
                >
                  <div className="flex items-start justify-between">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                      <Puzzle className="size-6" />
                    </span>
                    {isInstalled ? (
                      <Badge variant="success">
                        <Check className="size-3" /> Installed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        {item.status}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 font-display text-[15px] font-semibold">{item.name}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-success" /> {item.securityScore}%
                    </span>
                    <span>{item.downloads}</span>
                  </div>
                </button>
                <Button
                  variant={isInstalled ? "outline" : "soft"}
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => onSelect(item.id)}
                >
                  {isInstalled ? "Manage" : "View"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
