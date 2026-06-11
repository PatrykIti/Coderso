import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedPageTemplates,
  listPageTemplatesCached,
  type PageTemplateSummary,
} from "@/services/pageTemplatesClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const resolvePageTemplatesError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load page templates.";
};

export function usePageTemplates(options?: { skip?: boolean }) {
  const initialCached = getCachedPageTemplates();
  const [items, setItems] = useState<PageTemplateSummary[]>(() => initialCached ?? []);
  const [isLoading, setIsLoading] = useState(() => !initialCached);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force?: boolean) => {
    try {
      const nextItems = await listPageTemplatesCached({ force });
      setItems(nextItems);
      setError(null);
    } catch (refreshError) {
      setError(resolvePageTemplatesError(refreshError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    let active = true;
    listPageTemplatesCached({ force: true })
      .then((nextItems) => {
        if (!active) return;
        setItems(nextItems);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (active) setError(resolvePageTemplatesError(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [options?.skip]);

  useEffect(() => {
    if (options?.skip) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.pageTemplatesList) return;
      refresh(true).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
