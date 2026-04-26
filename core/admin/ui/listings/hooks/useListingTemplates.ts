import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedListingTemplates,
  listListingTemplatesCached,
  type ListingTemplateRecord,
} from "@/services/listingsClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  resolveCacheRefreshBackground,
  resolveListMountRefreshOptions,
} from "@/utils/cacheRefresh";

const resolveTemplatesError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load listing templates.";
};

export function useListingTemplates(options?: { skip?: boolean }) {
  const initialCached = useMemo(() => getCachedListingTemplates(), []);
  const hasInitialCache = initialCached != null;
  const [items, setItems] = useState<ListingTemplateRecord[]>(
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
      const nextItems = await listListingTemplatesCached({ force });
      setItems(nextItems);
      hasHydratedRef.current = true;
      setError(null);
    } catch (err) {
      setError(resolveTemplatesError(err));
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    refresh(resolveListMountRefreshOptions(hasInitialCache)).catch(
      () => undefined
    );
    return undefined;
  }, [hasInitialCache, options?.skip, refresh]);

  useEffect(() => {
    if (options?.skip) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.listingTemplatesList) return;
      refresh({ force: true, background: true }).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
