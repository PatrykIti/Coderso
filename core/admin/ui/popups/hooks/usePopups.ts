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
  const initialCached = getCachedPopups();
  const [items, setItems] = useState<PopupRecord[]>(() => initialCached ?? []);
  const [isLoading, setIsLoading] = useState(() => !initialCached);
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
    let active = true;
    listPopupsCached({ force: true })
      .then((nextItems) => {
        if (!active) return;
        setItems(nextItems);
        setError(null);
      })
      .catch((error: unknown) => {
        if (active) setError(resolvePopupsError(error));
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
      if (event.key !== cacheKeys.popupsList) return;
      refresh(true).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
