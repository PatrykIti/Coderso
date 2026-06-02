import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_SEARCH_DATE_RANGE,
  getCachedSearchResults,
  searchAllCached,
  type SearchDateRange,
  type SearchResponse,
  type SearchResponseMeta,
} from "@/services/searchClient";

import { groupResults, type SearchItem } from "./SearchResults";

type ApiSearchItem = SearchResponse["items"][number];
type ApiSearchCategory = NonNullable<SearchResponse["categories"]>[number];

const DEBOUNCE_MS = 250;

type UseSearchResultsOptions = {
  limit?: number;
  dateRange?: SearchDateRange;
};

type SearchResultState = {
  key: string;
  items: SearchItem[];
  categories: ApiSearchCategory[];
  meta: SearchResponseMeta | null;
};

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function mapSearchItem(item: ApiSearchItem): SearchItem {
  if (item.type === "media") {
    return {
      id: item.id,
      type: "media",
      title: item.title,
      subtitle: item.slug ?? undefined,
      categoryId: item.categoryId,
      categoryLabel: item.categoryLabel,
    };
  }

  if (item.type === "entry") {
    return {
      id: item.id,
      type: "entry",
      title: item.title,
      subtitle: item.slug ?? undefined,
      meta: item.categoryLabel ?? "Content item",
      categoryId: item.categoryId,
      categoryLabel: item.categoryLabel,
      entryTypeSlug: item.entryTypeSlug,
    };
  }

  if (item.type === "user") {
    const initials = item.title
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
    return {
      id: item.id,
      type: "user",
      title: item.title,
      subtitle: item.slug ?? undefined,
      initials: initials || undefined,
      categoryId: item.categoryId,
      categoryLabel: item.categoryLabel,
    };
  }

  return {
    id: item.id,
    type: "page",
    title: item.title,
    subtitle: item.slug ?? undefined,
    categoryId: item.categoryId,
    categoryLabel: item.categoryLabel,
  };
}

function normalizeOptions(
  options?: number | UseSearchResultsOptions
): Required<UseSearchResultsOptions> {
  if (typeof options === "number") {
    return { limit: options, dateRange: "all-time" };
  }

  return {
    limit: options?.limit ?? 20,
    dateRange: options?.dateRange ?? DEFAULT_SEARCH_DATE_RANGE,
  };
}

export function useSearchResults(query: string, options?: number | UseSearchResultsOptions) {
  const { limit, dateRange } = normalizeOptions(options);
  const normalizedQuery = useMemo(() => normalizeQuery(query), [query]);
  const shouldSearch = normalizedQuery.length >= 2;
  const requestKey = `${normalizedQuery}:${limit}:${dateRange}`;
  const [result, setResult] = useState<SearchResultState>({
    key: "",
    items: [],
    categories: [],
    meta: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!shouldSearch) {
      requestId.current += 1;
      return;
    }

    const current = ++requestId.current;
    const cached = getCachedSearchResults(normalizedQuery, { limit, dateRange });
    const timer = setTimeout(
      () => {
        if (cached) {
          setResult({
            key: requestKey,
            items: cached.items.map(mapSearchItem),
            categories: cached.categories ?? [],
            meta: cached.meta ?? null,
          });
          setError(null);
        }
        setLoading(!cached);
        setError(null);
        searchAllCached(normalizedQuery, {
          limit,
          dateRange,
          force: Boolean(cached),
        })
          .then((response) => {
            if (requestId.current !== current) return;
            setResult({
              key: requestKey,
              items: response.items.map(mapSearchItem),
              categories: response.categories ?? [],
              meta: response.meta ?? null,
            });
          })
          .catch(() => {
            if (requestId.current !== current) return;
            setResult({
              key: requestKey,
              items: [],
              categories: [],
              meta: null,
            });
            setError("search_failed");
          })
          .finally(() => {
            if (requestId.current === current) setLoading(false);
          });
      },
      cached ? 0 : DEBOUNCE_MS
    );

    return () => {
      clearTimeout(timer);
    };
  }, [normalizedQuery, shouldSearch, limit, dateRange, requestKey]);

  const hasCurrentResult = result.key === requestKey;
  const visibleItems = useMemo(
    () => (shouldSearch && hasCurrentResult ? result.items : []),
    [result.items, shouldSearch, hasCurrentResult]
  );
  const visibleCategories = useMemo(
    () => (shouldSearch && hasCurrentResult ? result.categories : []),
    [result.categories, shouldSearch, hasCurrentResult]
  );
  const groups = useMemo(() => groupResults(visibleItems), [visibleItems]);
  const hasCompletedSearch = shouldSearch && hasCurrentResult && !loading && error === null;

  return {
    normalizedQuery,
    shouldSearch,
    items: visibleItems,
    groups,
    categories: visibleCategories,
    meta: shouldSearch && hasCurrentResult ? result.meta : null,
    hasCompletedSearch,
    loading: shouldSearch ? loading : false,
    error: shouldSearch ? error : null,
  };
}
