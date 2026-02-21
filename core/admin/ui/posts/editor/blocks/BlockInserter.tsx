import { Layers3, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import {
  BLOCK_CATEGORY_LABELS,
  searchPostBlockCatalog,
  type PostBlockCatalogItem,
  type PostBlockCategory,
} from "./blockCatalog";

type BlockInserterProps = {
  onInsertBlock: (type: PostBlockType) => void;
  disabled?: boolean;
};

const categoryOrder: PostBlockCategory[] = ["text", "media", "interactive"];

const groupByCategory = (items: PostBlockCatalogItem[]) =>
  categoryOrder.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));

export function BlockInserter({ onInsertBlock, disabled = false }: BlockInserterProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => searchPostBlockCatalog(query), [query]);
  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Block inserter</p>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search blocks..."
            className="pl-9"
            aria-label="Search blocks"
          />
        </div>
      </div>

      <div className="min-h-0 space-y-4 overflow-auto p-3">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            No block matches this search.
          </div>
        ) : null}

        {grouped.map((group) =>
          group.items.length > 0 ? (
            <section key={group.category} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                  {BLOCK_CATEGORY_LABELS[group.category]}
                </Badge>
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <Button
                    key={item.type}
                    type="button"
                    variant="outline"
                    className="h-auto w-full justify-start px-3 py-2 text-left"
                    disabled={disabled}
                    onClick={() => onInsertBlock(item.type)}
                  >
                    <Layers3 className="mr-2 mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.label}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </section>
          ) : null
        )}
      </div>
    </div>
  );
}
