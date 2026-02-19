import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedPopups,
  listPopupsCached,
  type PopupRecord,
} from "@/services/popupsClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const resolvePopupsError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load popups.";
};

export function usePopups(options?: { skip?: boolean }) {
  const [items, setItems] = useState<PopupRecord[]>(() => getCachedPopups() ?? []);
  const [isLoading, setIsLoading] = useState(() => !getCachedPopups());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force?: boolean) => {
    try {
      const nextItems = await listPopupsCached({ force });
      setItems(nextItems);
      setError(null);
    } catch (error) {
      setError(resolvePopupsError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    const cached = getCachedPopups();
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
      if (event.key !== cacheKeys.popupsList) return;
      refresh(true).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
