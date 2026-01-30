import { useEffect, useMemo, useRef, useState } from "react";

import { searchAll } from "@/services/searchClient";

import { groupResults, type SearchItem } from "./SearchResults";

type ApiSearchItem = Awaited<ReturnType<typeof searchAll>>["items"][number];

const DEBOUNCE_MS = 250;

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
    };
  }

  if (item.type === "entry") {
    return {
      id: item.id,
      type: "entry",
      title: item.title,
      subtitle: item.slug ?? undefined,
      meta: "Entry",
    };
  }

  return {
    id: item.id,
    type: "page",
    title: item.title,
    subtitle: item.slug ?? undefined,
  };
}

export function useSearchResults(query: string, limit?: number) {
  const normalizedQuery = useMemo(() => normalizeQuery(query), [query]);
  const shouldSearch = normalizedQuery.length >= 2;
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!shouldSearch) {
      requestId.current += 1;
      return;
    }

    const current = ++requestId.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      searchAll(normalizedQuery, { limit })
        .then((response) => {
          if (requestId.current !== current) return;
          setItems(response.items.map(mapSearchItem));
        })
        .catch(() => {
          if (requestId.current !== current) return;
          setItems([]);
          setError("search_failed");
        })
        .finally(() => {
          if (requestId.current === current) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [normalizedQuery, shouldSearch, limit]);

  const visibleItems = useMemo(
    () => (shouldSearch ? items : []),
    [items, shouldSearch]
  );
  const groups = useMemo(() => groupResults(visibleItems), [visibleItems]);

  return {
    normalizedQuery,
    shouldSearch,
    items: visibleItems,
    groups,
    loading: shouldSearch ? loading : false,
    error: shouldSearch ? error : null,
  };
}
