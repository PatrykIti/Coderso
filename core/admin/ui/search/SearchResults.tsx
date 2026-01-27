import { cn } from "@/lib/utils";

export type SearchItemType = "page" | "entry" | "media";

export type SearchItem = {
  id: string;
  title: string;
  type: SearchItemType;
  subtitle?: string;
};

export type SearchGroup = {
  label: string;
  items: SearchItem[];
};

const typeLabels: Record<SearchItemType, string> = {
  page: "Pages",
  entry: "Entries",
  media: "Media",
};

export function groupResults(items: SearchItem[]): SearchGroup[] {
  const buckets = items.reduce<Record<SearchItemType, SearchItem[]>>(
    (acc, item) => {
      acc[item.type].push(item);
      return acc;
    },
    { page: [], entry: [], media: [] }
  );

  return (Object.keys(buckets) as SearchItemType[])
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({
      label: typeLabels[key],
      items: buckets[key],
    }));
}

type SearchResultsProps = {
  query: string;
  groups: SearchGroup[];
  activeIndex?: number;
  onSelect?: (item: SearchItem) => void;
};

function highlight(text: string, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return text;
  const index = text.toLowerCase().indexOf(normalized);
  if (index === -1) return text;
  const before = text.slice(0, index);
  const match = text.slice(index, index + normalized.length);
  const after = text.slice(index + normalized.length);
  return (
    <>
      {before}
      <span className="rounded bg-primary/10 px-1 text-primary">{match}</span>
      {after}
    </>
  );
}

export function SearchResults({
  query,
  groups,
  activeIndex = 0,
  onSelect,
}: SearchResultsProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground shadow-lg">
        No results for &quot;{query}&quot;.
      </div>
    );
  }

  const groupOffsets = groups.map((_, index) =>
    groups
      .slice(0, index)
      .reduce((sum, group) => sum + group.items.length, 0)
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
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/40"
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect?.(item);
                  }}
                >
                  <div>
                    <p className="font-medium">{highlight(item.title, query)}</p>
                    {item.subtitle ? (
                      <p className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                    {item.type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
