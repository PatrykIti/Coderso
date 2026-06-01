import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isApiClientError } from "@/services/apiClient";
import {
  DEFAULT_SEARCH_DATE_RANGE,
  listRecentSearches,
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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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

  const refreshRecent = useCallback(async () => {
    try {
      const rows = await listRecentSearches();
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
      void refreshRecent();
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
        <Card className="items-center border-dashed py-8 text-center">
          <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
        </Card>
      );
    }
    if (loading) {
      return (
        <Card className="items-center border-dashed py-8 text-center">
          <p className="text-sm text-muted-foreground">Searching...</p>
        </Card>
      );
    }
    if (error) {
      return (
        <Card className="items-center border-dashed py-8 text-center">
          <p className="text-sm text-destructive">Search failed. Try again.</p>
        </Card>
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="gap-4 py-5">
            <div className="space-y-4 px-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Recent Searches
                </p>
                <div className="max-h-40 overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {recentError ? <p className="text-xs text-destructive">{recentError}</p> : null}
                    {recentSearches.length === 0 && !recentError ? (
                      <p className="text-xs text-muted-foreground">No recent searches yet.</p>
                    ) : null}
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                        onClick={() => setQuery(item)}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground/70" />
                        <span className="font-medium">{item}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Filters
                  </p>
                  <Button variant="ghost" size="xs" onClick={() => setCategorySelection([])}>
                    Clear
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="gap-4 py-4">
              <div className="relative px-6">
                <Search className="absolute left-10 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for pages, entries, files, or users..."
                  className="h-14 rounded-2xl bg-muted/40 pl-12 pr-20 text-base font-medium"
                />
                <Badge
                  variant="outline"
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide"
                >
                  Cmd K
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-6 text-xs text-muted-foreground">
                <span>Try:</span>
                {suggestionItems.map((item) => (
                  <Button
                    key={item}
                    variant="ghost"
                    size="xs"
                    className="h-6 px-2 text-xs font-medium"
                    onClick={() => setQuery(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </Card>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Content Type
              </p>
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
        </div>
      </div>
    </AdminShell>
  );
}
