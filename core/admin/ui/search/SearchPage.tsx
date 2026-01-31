import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { listRecentSearches } from "@/services/searchClient";
import { AdminShell } from "@/ui/layouts/AdminShell";

import {
  SearchResults,
  groupResults,
  type SearchGroup,
  type SearchItemType,
} from "./SearchResults";
import { useSearchResults } from "./useSearchResults";

type ContentFilter = "all" | SearchItemType;

const contentFilters: { value: ContentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "page", label: "Pages" },
  { value: "entry", label: "Entries" },
  { value: "media", label: "Media" },
  { value: "user", label: "Users" },
];

function filterGroups(groups: SearchGroup[], value: ContentFilter) {
  if (value === "all") return groups;
  return groups.filter((group) => group.type === value);
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [categorySelection, setCategorySelection] = useState<string[]>([]);
  const { normalizedQuery, shouldSearch, items, categories, loading, error } =
    useSearchResults(query, 50);

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

  const filteredItems = useMemo(() => {
    if (!shouldSearch) return [];
    if (categorySelection.length === 0) return items;
    return items.filter(
      (item) => item.categoryId && categorySelection.includes(item.categoryId)
    );
  }, [items, categorySelection, shouldSearch]);

  const filteredGroups = useMemo(
    () => groupResults(filteredItems),
    [filteredItems]
  );

  const handleSelect = (item: SearchGroup["items"][number]) => {
    if (typeof window === "undefined") return;
    if (item.type === "page") {
      window.location.assign(`/admin/pages/${encodeURIComponent(item.id)}`);
      return;
    }
    if (item.type === "entry") {
      const typeSlug =
        item.entryTypeSlug ??
        (item.categoryId?.startsWith("entry:")
          ? item.categoryId.split(":")[1]
          : null);
      if (typeSlug) {
        window.location.assign(
          `/admin/entries/${encodeURIComponent(typeSlug)}/${encodeURIComponent(item.id)}`
        );
      } else {
        window.location.assign("/admin/entries");
      }
      return;
    }
    if (item.type === "media") {
      window.location.assign(
        `/admin/media?selected=${encodeURIComponent(item.id)}`
      );
    }
  };

  const renderResults = (filter: ContentFilter) => {
    if (!shouldSearch) {
      return (
        <Card className="items-center border-dashed py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Type at least 2 characters to search.
          </p>
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
        onSelect={handleSelect}
        onViewAll={(type) => setContentFilter(type)}
      />
    );
  };

  return (
    <AdminShell
      activeHref="/admin/search"
      showSearch={false}
      breadcrumbs={<span className="text-sm text-muted-foreground">Search</span>}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="gap-4 py-5">
            <div className="space-y-4 px-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Recent Searches
                </p>
                <ScrollArea className="max-h-40 pr-2">
                  <div className="space-y-2">
                    {recentError ? (
                      <p className="text-xs text-destructive">{recentError}</p>
                    ) : null}
                    {recentSearches.length === 0 && !recentError ? (
                      <p className="text-xs text-muted-foreground">
                        No recent searches yet.
                      </p>
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
                </ScrollArea>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Filters
                  </p>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setCategorySelection([])}
                  >
                    Clear
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Date Range
                  </p>
                  <Select defaultValue="last-7-days">
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
                      <p className="text-xs text-muted-foreground">
                        Categories will appear after you search.
                      </p>
                    ) : (
                      categories.map((category) => (
                        <label
                          key={category.id}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Checkbox
                            checked={categorySelection.includes(category.id)}
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
                {recentSearches.map((item) => (
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
