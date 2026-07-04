import { File, FileText, Image, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type SearchItemType = "page" | "entry" | "media" | "user";

export type SearchItem = {
  id: string;
  title: string;
  type: SearchItemType;
  subtitle?: string;
  meta?: string;
  image?: string;
  initials?: string;
  categoryId?: string;
  categoryLabel?: string;
  entryTypeSlug?: string;
};

export type SearchGroup = {
  type: SearchItemType;
  label: string;
  items: SearchItem[];
};

export type SearchEmptyStateCopy = {
  title: string;
  description?: string;
};

const typeLabels: Record<SearchItemType, string> = {
  page: "Pages",
  entry: "Content",
  media: "Media",
  user: "Users",
};

const typeOrder: SearchItemType[] = ["page", "entry", "media", "user"];

const typeStyles: Record<SearchItemType, { icon: typeof FileText }> = {
  page: { icon: FileText },
  entry: { icon: File },
  media: { icon: Image },
  user: { icon: User },
};

export function groupResults(items: SearchItem[]): SearchGroup[] {
  const buckets = items.reduce<Record<SearchItemType, SearchItem[]>>(
    (acc, item) => {
      acc[item.type].push(item);
      return acc;
    },
    { page: [], entry: [], media: [], user: [] }
  );

  return typeOrder
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({
      type: key,
      label: typeLabels[key],
      items: buckets[key],
    }));
}

type SearchResultsProps = {
  query: string;
  groups: SearchGroup[];
  activeIndex?: number;
  onSelect?: (item: SearchItem) => void;
  onPrefetch?: (item: SearchItem) => void;
  onViewAll?: (type: SearchItemType) => void;
  emptyState?: SearchEmptyStateCopy;
  variant?: "dropdown" | "page";
};

function highlight(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const terms = trimmed.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const matcher = new RegExp(`(${escaped.join("|")})`, "ig");
  const parts = text.split(matcher);
  return parts.map((part, index) => {
    const isMatch = terms.some((term) => term.toLowerCase() === part.toLowerCase());
    if (!isMatch) return part;
    return (
      <span key={`${part}-${index}`} className="rounded bg-primary/10 px-1 text-primary">
        {part}
      </span>
    );
  });
}

function renderMediaCard(
  item: SearchItem,
  query: string,
  onSelect?: (item: SearchItem) => void,
  onPrefetch?: (item: SearchItem) => void
) {
  return (
    <button
      key={item.id}
      type="button"
      className="text-left"
      onMouseEnter={() => onPrefetch?.(item)}
      onFocus={() => onPrefetch?.(item)}
      onClick={() => onSelect?.(item)}
    >
      <Card className="overflow-hidden border-muted/60 p-0 transition hover:border-primary/30">
        <div className="relative aspect-video bg-muted">
          {item.image ? (
            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Image className="h-6 w-6" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
            <p className="text-xs font-semibold text-white">{highlight(item.title, query)}</p>
          </div>
        </div>
      </Card>
    </button>
  );
}

function renderListCard(
  item: SearchItem,
  query: string,
  onSelect?: (item: SearchItem) => void,
  onPrefetch?: (item: SearchItem) => void
) {
  const { icon: Icon } = typeStyles[item.type];
  return (
    <button
      key={item.id}
      type="button"
      className="w-full text-left"
      onMouseEnter={() => onPrefetch?.(item)}
      onFocus={() => onPrefetch?.(item)}
      onClick={() => onSelect?.(item)}
    >
      <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors hover:bg-muted">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {highlight(item.title, query)}
          </span>
          {item.subtitle ? (
            <span className="block truncate text-xs text-muted-foreground">
              {highlight(item.subtitle, query)}
            </span>
          ) : null}
        </span>
        {item.meta ? (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {item.meta}
          </Badge>
        ) : null}
      </div>
    </button>
  );
}

function renderUserCard(
  item: SearchItem,
  query: string,
  onSelect?: (item: SearchItem) => void,
  onPrefetch?: (item: SearchItem) => void
) {
  return (
    <button
      key={item.id}
      type="button"
      className="text-left"
      onMouseEnter={() => onPrefetch?.(item)}
      onFocus={() => onPrefetch?.(item)}
      onClick={() => onSelect?.(item)}
    >
      <Card className="gap-0 border-muted/60 py-3 shadow-sm transition hover:border-primary/30 hover:bg-muted/30">
        <div className="flex items-center gap-3 px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-primary">
            {item.initials ?? "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{highlight(item.title, query)}</p>
            {item.subtitle ? (
              <p className="text-xs text-muted-foreground">{highlight(item.subtitle, query)}</p>
            ) : null}
          </div>
        </div>
      </Card>
    </button>
  );
}

export function SearchResults({
  query,
  groups,
  activeIndex = 0,
  onSelect,
  onPrefetch,
  onViewAll,
  emptyState,
  variant = "dropdown",
}: SearchResultsProps) {
  if (groups.length === 0) {
    const title = emptyState?.title ?? `No results for "${query}".`;
    const description = emptyState?.description;
    return variant === "page" ? (
      <Card className="items-center border-dashed py-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </Card>
    ) : (
      <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground shadow-lg">
        {title}
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div className="space-y-10">
        {groups.map((group, index) => (
          <div key={group.label} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {group.label}
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs font-semibold uppercase tracking-wide"
                onClick={() => onViewAll?.(group.type)}
              >
                View All
              </Button>
            </div>
            {group.type === "media" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => renderMediaCard(item, query, onSelect, onPrefetch))}
              </div>
            ) : group.type === "user" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {group.items.map((item) => renderUserCard(item, query, onSelect, onPrefetch))}
              </div>
            ) : (
              <div className="grid gap-3">
                {group.items.map((item) => renderListCard(item, query, onSelect, onPrefetch))}
              </div>
            )}
            {index < groups.length - 1 ? <Separator className="mt-8" /> : null}
          </div>
        ))}
      </div>
    );
  }

  const groupOffsets = groups.map((_, index) =>
    groups.slice(0, index).reduce((sum, group) => sum + group.items.length, 0)
  );

  return (
    <div className="rounded-xl border bg-background shadow-lg">
      {groups.map((group, groupIndex) => (
        <div key={group.label} className="border-b last:border-b-0">
          <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <div className="px-2 pb-3 pt-2">
            {group.items.map((item, itemIndex) => {
              const index = groupOffsets[groupIndex] + itemIndex;
              const isActive = index === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-active={isActive}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/40"
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onMouseEnter={() => onPrefetch?.(item)}
                  onFocus={() => onPrefetch?.(item)}
                  onClick={() => onSelect?.(item)}
                >
                  <div>
                    <p className="font-medium">{highlight(item.title, query)}</p>
                    {item.subtitle ? (
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    ) : null}
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {item.type}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
