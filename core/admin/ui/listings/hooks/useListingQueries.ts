import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedListingQueries,
  listListingQueriesCached,
  type ListingQueryRecord,
} from "@/services/listingsClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const resolveListingsError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load listing queries.";
};

export function useListingQueries(options?: { skip?: boolean }) {
  const [items, setItems] = useState<ListingQueryRecord[]>(
    () => getCachedListingQueries() ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !getCachedListingQueries());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force?: boolean) => {
    try {
      const nextItems = await listListingQueriesCached({ force });
      setItems(nextItems);
      setError(null);
    } catch (err) {
      setError(resolveListingsError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    const cached = getCachedListingQueries();
    if (cached) {
      setItems(cached);
      setIsLoading(false);
    }
    refresh(true).catch(() => undefined);
    return undefined;
  }, [options?.skip, refresh]);

  useEffect(() => {
    if (options?.skip) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.listingQueriesList) return;
      refresh(true).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
