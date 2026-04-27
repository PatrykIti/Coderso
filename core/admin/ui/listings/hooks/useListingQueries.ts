import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedListingQueries,
  listListingQueriesCached,
  type ListingQueryRecord,
} from "@/services/listingsClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  resolveCacheRefreshBackground,
  resolveListMountRefreshOptions,
} from "@/utils/cacheRefresh";

const resolveListingsError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load listing queries.";
};

export function useListingQueries(options?: { skip?: boolean }) {
  const initialCached = useMemo(() => getCachedListingQueries(), []);
  const hasInitialCache = initialCached != null;
  const [items, setItems] = useState<ListingQueryRecord[]>(
    () => initialCached ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [error, setError] = useState<string | null>(null);
  const hasHydratedRef = useRef(hasInitialCache);

  const refresh = useCallback(async (
    options?: boolean | { force?: boolean; background?: boolean }
  ) => {
    const force =
      typeof options === "boolean" ? options : options?.force ?? false;
    const background = resolveCacheRefreshBackground({
      explicitBackground:
        typeof options === "object" ? options.background : undefined,
      hasHydrated: hasHydratedRef.current,
    });
    if (!background) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const nextItems = await listListingQueriesCached({ force });
      setItems(nextItems);
      hasHydratedRef.current = true;
      setError(null);
    } catch (err) {
      setError(resolveListingsError(err));
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    const mountOptions = resolveListMountRefreshOptions(hasInitialCache);
    let active = true;
    listListingQueriesCached({ force: mountOptions.force })
      .then((nextItems) => {
        if (!active) return;
        setItems(nextItems);
        hasHydratedRef.current = true;
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(resolveListingsError(err));
      })
      .finally(() => {
        if (active && !mountOptions.background) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasInitialCache, options?.skip]);

  useEffect(() => {
    if (options?.skip) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.listingQueriesList) return;
      refresh({ force: true, background: true }).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
