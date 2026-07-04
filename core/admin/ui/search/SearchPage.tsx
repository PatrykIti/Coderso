import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/ui/shared/EmptyState";
import { isApiClientError } from "@/services/apiClient";
import {
  DEFAULT_SEARCH_DATE_RANGE,
  getCachedRecentSearches,
  listRecentSearchesCached,
  normalizeSearchDateRange,
  type SearchDateRange,
  type SearchResponseMeta,
} from "@/services/searchClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";

import {
  SearchResults,
  groupResults,
  type SearchEmptyStateCopy,
  type SearchGroup,
  type SearchItemType,
} from "./SearchResults";
import { resolveSearchDestination } from "./searchNavigation";
import { useSearchResults } from "./useSearchResults";

type ContentFilter = "all" | SearchItemType;

const contentFilters: { value: ContentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "page", label: "Pages" },
  { value: "entry", label: "Content" },
  { value: "media", label: "Media" },
  { value: "user", label: "Users" },
];

const fallbackSuggestions = ["pages", "content", "media", "users"];

const dateRangeLabels: Record<SearchDateRange, string> = {
  "last-7-days": "Last 7 days",
  "last-30-days": "Last 30 days",
  "last-12-months": "Last 12 months",
  "all-time": "All time",
};

function filterGroups(groups: SearchGroup[], value: ContentFilter) {
  if (value === "all") return groups;
  return groups.filter((group) => group.type === value);
}

function filterItemsByContentType(items: SearchGroup["items"], value: ContentFilter) {
  if (value === "all") return items;
  return items.filter((item) => item.type === value);
}

function resolveSearchEmptyState(input: {
  contentFilter: ContentFilter;
  filteredItems: SearchGroup["items"];
  items: SearchGroup["items"];
  activeCategoryLabels: string[];
  meta: SearchResponseMeta | null;
  normalizedQuery: string;
}): SearchEmptyStateCopy {
  const tabItems = filterItemsByContentType(input.filteredItems, input.contentFilter);

  if (input.meta?.hasSearchableContent === false) {
    return {
      title: "No searchable content yet.",
      description: "Create or publish content before using admin Search.",
    };
  }

  if (input.meta?.hasMatchesOutsideDateRange) {
    return {
      title: `No results for "${input.normalizedQuery}" in ${
        dateRangeLabels[input.meta.dateRange]
      }.`,
      description: "Switch Date Range to All time or use a broader range.",
    };
  }

  if (input.items.length === 0) {
    return {
      title: `No results for "${input.normalizedQuery}".`,
      description: "Try a more specific title, slug, filename, or user name.",
    };
  }

  if (input.activeCategoryLabels.length > 0 && input.filteredItems.length === 0) {
    return {
      title: "No results match the active category filters.",
      description: `Active categories: ${input.activeCategoryLabels.join(", ")}.`,
    };
  }

  if (tabItems.length === 0 && input.contentFilter !== "all") {
    const label =
      contentFilters.find((filter) => filter.value === input.contentFilter)?.label ??
      "selected type";
    return {
      title: `No ${label.toLowerCase()} results for "${input.normalizedQuery}".`,
      description: "Switch back to All or choose another content type.",
    };
  }

  return {
    title: `No results for "${input.normalizedQuery}".`,
  };
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const { navigate, prefetch } = useAdminRouter();
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    (getCachedRecentSearches() ?? []).map((row) => row.query)
  );
  const [recentError, setRecentError] = useState<string | null>(null);
  const [categorySelection, setCategorySelection] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<SearchDateRange>(DEFAULT_SEARCH_DATE_RANGE);
  const {
    normalizedQuery,
    shouldSearch,
    items,
    categories,
    meta,
    hasCompletedSearch,
    loading,
    error,
  } = useSearchResults(query, { limit: 50, dateRange });

  const refreshRecent = useCallback(async (options?: { force?: boolean }) => {
    try {
      const rows = await listRecentSearchesCached(options);
      setRecentSearches(rows.map((row) => row.query));
      setRecentError(null);
    } catch (err) {
      if (isApiClientError(err)) {
        setRecentError(err.message);
      } else {
        setRecentError("Failed to load recent searches.");
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshRecent();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshRecent]);

  useEffect(() => {
    if (!shouldSearch || !normalizedQuery) return;
    const timer = setTimeout(() => {
      void refreshRecent({ force: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [normalizedQuery, shouldSearch, refreshRecent]);

  const categoryIds = useMemo(
    () => new Set(categories.map((category) => category.id)),
    [categories]
  );

  const activeCategorySelection = useMemo(
    () => categorySelection.filter((id) => categoryIds.has(id)),
    [categorySelection, categoryIds]
  );

  const activeCategoryLabels = useMemo(
    () =>
      activeCategorySelection.flatMap((id) => {
        const category = categories.find((item) => item.id === id);
        return category ? [category.label] : [];
      }),
    [activeCategorySelection, categories]
  );

  const filteredItems = useMemo(() => {
    if (!shouldSearch) return [];
    if (activeCategorySelection.length === 0) return items;
    return items.filter(
      (item) => item.categoryId && activeCategorySelection.includes(item.categoryId)
    );
  }, [items, activeCategorySelection, shouldSearch]);

  const filteredGroups = useMemo(() => groupResults(filteredItems), [filteredItems]);
  const suggestionItems = recentSearches.length > 0 ? recentSearches : fallbackSuggestions;

  const categoryHelper = useMemo(() => {
    if (!shouldSearch) return "Categories appear after a completed search.";
    if (loading) return "Categories update after this search completes.";
    if (error) return "Categories are unavailable while Search is failing.";
    if (!hasCompletedSearch) return "Categories update after this search completes.";
    if (categories.length > 0) return "Use categories to narrow the current results.";
    if (meta?.hasSearchableContent === false) {
      return "No categories yet because there is no searchable content.";
    }
    if (items.length === 0) return "No categories match this search.";
    return "No categories are available for the current results.";
  }, [categories.length, error, hasCompletedSearch, items.length, loading, meta, shouldSearch]);

  const handlePrefetch = (item: SearchGroup["items"][number]) => {
    const destination = resolveSearchDestination(item);
    if (destination) {
      prefetch(destination);
    }
  };

  const handleSelect = (item: SearchGroup["items"][number]) => {
    const destination = resolveSearchDestination(item);
    if (destination) {
      navigate(destination);
    }
  };

  const renderResults = (filter: ContentFilter) => {
    if (!shouldSearch) {
      return (
        <EmptyState
          icon={<Search />}
          title="Type at least 2 characters to search."
          description="Search across pages, content, media, and people."
        />
      );
    }
    if (loading) {
      return <EmptyState icon={<Search />} title="Searching..." />;
    }
    if (error) {
      return (
        <EmptyState
          icon={<Search />}
          title="Search failed. Try again."
          className="border-destructive/30"
        />
      );
    }
    return (
      <SearchResults
        variant="page"
        query={normalizedQuery}
        groups={filterGroups(filteredGroups, filter)}
        emptyState={resolveSearchEmptyState({
          contentFilter: filter,
          filteredItems,
          items,
          activeCategoryLabels,
          meta,
          normalizedQuery,
        })}
        onSelect={handleSelect}
        onPrefetch={handlePrefetch}
        onViewAll={(type) => setContentFilter(type)}
      />
    );
  };

  return (
    <AdminShell activeHref="/admin/search" showSearch={false} breadcrumbs={["Search"]}>
      <div className="mx-auto w-full max-w-2xl">
        {/* Centered search hero */}
        <header className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Search
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find anything across pages, content, media, and people.
          </p>
        </header>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages, content, media, users…"
            className="h-12 rounded-2xl pl-12 pr-16 text-base shadow-card"
          />
          <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        {/* Recent searches chip row (binds to the existing recentSearches state) */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Recent</span>
          {recentError ? <span className="text-xs text-destructive">{recentError}</span> : null}
          {suggestionItems.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className="cursor-pointer hover:bg-muted"
              onClick={() => setQuery(item)}
            >
              {item}
            </Badge>
          ))}
        </div>

        {/* Filters — relocated Date Range + Category controls (wiring preserved) */}
        <Card className="mt-4 gap-4 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Filters
            </p>
            <Button variant="ghost" size="xs" onClick={() => setCategorySelection([])}>
              Clear
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Date Range
              </p>
              <Select
                value={dateRange}
                onValueChange={(value) => setDateRange(normalizeSearchDateRange(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-7-days">Last 7 days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 days</SelectItem>
                  <SelectItem value="last-12-months">Last 12 months</SelectItem>
                  <SelectItem value="all-time">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Category
              </p>
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{categoryHelper}</p>
                ) : (
                  categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Checkbox
                        checked={activeCategorySelection.includes(category.id)}
                        onCheckedChange={(checked) => {
                          setCategorySelection((prev) => {
                            if (!checked) {
                              return prev.filter((id) => id !== category.id);
                            }
                            return [...prev, category.id];
                          });
                        }}
                      />
                      <span>{category.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {category.count}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Grouped results */}
        <div className="mt-6 space-y-3">
          <Tabs
            value={contentFilter}
            onValueChange={(value) => setContentFilter(value as ContentFilter)}
            className="space-y-4"
          >
            <TabsList variant="line">
              {contentFilters.map((filter) => (
                <TabsTrigger key={filter.value} value={filter.value}>
                  {filter.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {contentFilters.map((filter) => (
              <TabsContent key={filter.value} value={filter.value}>
                {renderResults(filter.value)}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </AdminShell>
  );
}
