import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedListingTemplates,
  listListingTemplatesCached,
  type ListingTemplateRecord,
} from "@/services/listingsClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const resolveTemplatesError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load listing templates.";
};

export function useListingTemplates(options?: { skip?: boolean }) {
  const [items, setItems] = useState<ListingTemplateRecord[]>(
    () => getCachedListingTemplates() ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !getCachedListingTemplates());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force?: boolean) => {
    try {
      const nextItems = await listListingTemplatesCached({ force });
      setItems(nextItems);
      setError(null);
    } catch (err) {
      setError(resolveTemplatesError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    const cached = getCachedListingTemplates();
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
      if (event.key !== cacheKeys.listingTemplatesList) return;
      refresh(true).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
