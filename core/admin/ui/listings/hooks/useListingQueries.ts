import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isApiClientError, type ApiClientError } from "@/services/apiClient";
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
  return "Failed to load listing queries.";
};

const isRetryableListingQueriesError = (error: ApiClientError) =>
  error.status === 401 ||
  error.code === "auth_required" ||
  /not authenticated/i.test(error.message);

const waitForListingQuerySessionSettling = () =>
  new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });

const readListingQueries = async (options?: { force?: boolean; retryAuthOnce?: boolean }) => {
  const force = options?.force ?? false;
  try {
    return await listListingQueriesCached({ force });
  } catch (error) {
    if (
      !options?.retryAuthOnce ||
      !isApiClientError(error) ||
      !isRetryableListingQueriesError(error)
    ) {
      throw error;
    }
    await waitForListingQuerySessionSettling();
    return listListingQueriesCached({ force: true });
  }
};

type UseListingQueriesOptions = {
  skip?: boolean;
  retryAuthOnce?: boolean;
};

export function useListingQueries(options?: UseListingQueriesOptions) {
  const initialCached = useMemo(() => getCachedListingQueries(), []);
  const hasInitialCache = initialCached != null;
  const [items, setItems] = useState<ListingQueryRecord[]>(() => initialCached ?? []);
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [error, setError] = useState<string | null>(null);
  const hasHydratedRef = useRef(hasInitialCache);

  const refresh = useCallback(
    async (
      refreshOptions?: boolean | { force?: boolean; background?: boolean; retryAuthOnce?: boolean }
    ) => {
      const force =
        typeof refreshOptions === "boolean" ? refreshOptions : (refreshOptions?.force ?? false);
      const background = resolveCacheRefreshBackground({
        explicitBackground:
          typeof refreshOptions === "object" ? refreshOptions.background : undefined,
        hasHydrated: hasHydratedRef.current,
      });
      const retryAuthOnce =
        typeof refreshOptions === "object"
          ? (refreshOptions.retryAuthOnce ?? options?.retryAuthOnce ?? false)
          : (options?.retryAuthOnce ?? false);
      if (!background) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const nextItems = await readListingQueries({ force, retryAuthOnce });
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
    },
    [options?.retryAuthOnce]
  );

  useEffect(() => {
    if (options?.skip) return undefined;
    const mountOptions = resolveListMountRefreshOptions(hasInitialCache);
    let active = true;
    readListingQueries({
      force: mountOptions.force,
      retryAuthOnce: options?.retryAuthOnce,
    })
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
  }, [hasInitialCache, options?.retryAuthOnce, options?.skip]);

  useEffect(() => {
    if (options?.skip) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.listingQueriesList) return;
      refresh({ force: true, background: true, retryAuthOnce: options?.retryAuthOnce }).catch(
        () => undefined
      );
    });
  }, [options?.retryAuthOnce, options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
