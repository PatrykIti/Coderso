import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedCustomScreens,
  listCustomScreensCached,
  type CustomScreenRecord,
} from "@/services/customScreensClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const resolveCustomScreensError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load custom screens.";
};

export function useCustomScreens(options?: { skip?: boolean }) {
  const [items, setItems] = useState<CustomScreenRecord[]>(
    () => getCachedCustomScreens() ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !getCachedCustomScreens());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force?: boolean) => {
    try {
      const nextItems = await listCustomScreensCached({ force });
      setItems(nextItems);
      setError(null);
    } catch (err) {
      setError(resolveCustomScreensError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    const cached = getCachedCustomScreens();
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
      if (event.key !== cacheKeys.customScreensList) return;
      refresh(true).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
