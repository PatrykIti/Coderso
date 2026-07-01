import { Layers3, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EditorRailGroup } from "@/ui/shared/EditorRail";

import type { PostBlockType } from "../../../../../services/posts/editor/postBlockDocument";
import {
  BLOCK_CATEGORY_LABELS,
  groupPostBlockCatalogByCategory,
  POST_BLOCK_CATEGORY_ORDER,
  resolveMostUsedPostBlocks,
  searchPostBlockCatalog,
  type PostBlockCatalogItem,
  type PostBlockCategory,
} from "./blockCatalog";

type BlockInserterProps = {
  onInsertBlock: (type: PostBlockType) => void;
  disabled?: boolean;
  showHeader?: boolean;
  recentlyUsedTypes?: PostBlockType[];
};

type BlockCategoryFilter = PostBlockCategory | "all";

const BLOCK_CATEGORY_FILTERS: BlockCategoryFilter[] = ["all", ...POST_BLOCK_CATEGORY_ORDER];

const BLOCK_CATEGORY_FILTER_LABELS: Record<BlockCategoryFilter, string> = {
  all: "All",
  ...BLOCK_CATEGORY_LABELS,
};

const getNextRovingIndex = (currentIndex: number, count: number, direction: "next" | "prev") => {
  if (count <= 0) return -1;
  if (currentIndex < 0) return 0;
  if (direction === "next") return (currentIndex + 1) % count;
  return (currentIndex - 1 + count) % count;
};

export function BlockInserter({
  onInsertBlock,
  disabled = false,
  showHeader = true,
  recentlyUsedTypes = [],
}: BlockInserterProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BlockCategoryFilter>("all");
  const [activeItemType, setActiveItemType] = useState<PostBlockType | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filtered = useMemo(() => searchPostBlockCatalog(query, { category }), [category, query]);
  const grouped = useMemo(() => groupPostBlockCatalogByCategory(filtered), [filtered]);
  const mostUsed = useMemo(() => resolveMostUsedPostBlocks(recentlyUsedTypes), [recentlyUsedTypes]);
  const searchPlaceholder =
    category === "all"
      ? "Search blocks..."
      : `Search ${BLOCK_CATEGORY_FILTER_LABELS[category]} blocks...`;
  const searchAriaLabel =
    category === "all"
      ? "Search blocks"
      : `Search ${BLOCK_CATEGORY_FILTER_LABELS[category]} blocks`;

  const activeItemIndex = useMemo(() => {
    if (filtered.length === 0) return -1;
    if (!activeItemType) return 0;
    const index = filtered.findIndex((item) => item.type === activeItemType);
    return index >= 0 ? index : 0;
  }, [activeItemType, filtered]);

  const focusItemByIndex = (index: number) => {
    const target = itemRefs.current[index];
    if (target) target.focus();
  };

  const insertCatalogItem = (item: PostBlockCatalogItem) => {
    if (disabled) return;
    onInsertBlock(item.type);
  };

  const handleResultsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (filtered.length === 0 || disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = getNextRovingIndex(activeItemIndex, filtered.length, "next");
      setActiveItemType(filtered[nextIndex]?.type ?? null);
      focusItemByIndex(nextIndex);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = getNextRovingIndex(activeItemIndex, filtered.length, "prev");
      setActiveItemType(filtered[nextIndex]?.type ?? null);
      focusItemByIndex(nextIndex);
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && activeItemIndex >= 0) {
      event.preventDefault();
      const activeItem = filtered[activeItemIndex];
      if (activeItem) insertCatalogItem(activeItem);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showHeader ? (
        <div className="border-b px-4 py-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Block inserter</p>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveItemType(null);
              }}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label={searchAriaLabel}
            />
          </div>
        </div>
      ) : (
        <div className="border-b px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveItemType(null);
              }}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label={searchAriaLabel}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Block categories">
            {BLOCK_CATEGORY_FILTERS.map((filter) => (
              <Button
                key={filter}
                type="button"
                size="sm"
                variant={category === filter ? "secondary" : "outline"}
                onClick={() => {
                  setCategory(filter);
                  setActiveItemType(null);
                }}
                aria-pressed={category === filter}
                role="tab"
              >
                {BLOCK_CATEGORY_FILTER_LABELS[filter]}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div
        className="min-h-0 space-y-4 overflow-auto p-3"
        role="listbox"
        aria-label="Block library results"
        onKeyDown={handleResultsKeyDown}
      >
        {!query && category === "all" && mostUsed.length > 0 ? (
          <EditorRailGroup label="Most used">
            {mostUsed.map((item) => {
              const itemIndex = filtered.findIndex((candidate) => candidate.type === item.type);
              return (
                <Button
                  key={`most-used-${item.type}`}
                  ref={(element) => {
                    if (itemIndex >= 0) itemRefs.current[itemIndex] = element;
                  }}
                  type="button"
                  variant="ghost"
                  className={cn(
                    "flex h-auto w-full items-center justify-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                    itemIndex === activeItemIndex
                      ? "bg-primary-soft text-primary-soft-foreground"
                      : "hover:bg-accent"
                  )}
                  disabled={disabled}
                  onClick={() => insertCatalogItem(item)}
                  onFocus={() => setActiveItemType(item.type)}
                  role="option"
                  aria-selected={itemIndex === activeItemIndex}
                  tabIndex={itemIndex === activeItemIndex ? 0 : -1}
                >
                  <Layers3 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.label}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </Button>
              );
            })}
          </EditorRailGroup>
        ) : null}

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            No block matches this search.
          </div>
        ) : null}

        {grouped.map((group) =>
          group.items.length > 0 ? (
            <EditorRailGroup key={group.category} label={BLOCK_CATEGORY_LABELS[group.category]}>
              {group.items.map((item) => {
                const itemIndex = filtered.findIndex((candidate) => candidate.type === item.type);
                return (
                  <Button
                    key={item.type}
                    ref={(element) => {
                      if (itemIndex >= 0) itemRefs.current[itemIndex] = element;
                    }}
                    type="button"
                    variant="ghost"
                    className={cn(
                      "flex h-auto w-full items-center justify-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                      itemIndex === activeItemIndex
                        ? "bg-primary-soft text-primary-soft-foreground"
                        : "hover:bg-accent"
                    )}
                    disabled={disabled}
                    onClick={() => insertCatalogItem(item)}
                    onFocus={() => setActiveItemType(item.type)}
                    role="option"
                    aria-selected={itemIndex === activeItemIndex}
                    tabIndex={itemIndex === activeItemIndex ? 0 : -1}
                  >
                    <Layers3 className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.label}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </Button>
                );
              })}
            </EditorRailGroup>
          ) : null
        )}
      </div>
    </div>
  );
}
