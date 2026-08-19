import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedCustomScreens,
  listCustomScreensCached,
  type CustomScreenSummaryRecord,
} from "@/services/customScreensClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  resolveCacheRefreshBackground,
  resolveListMountRefreshOptions,
} from "@/utils/cacheRefresh";

export type CustomScreensRefreshOptions = {
  force?: boolean;
  background?: boolean;
};

const resolveCustomScreensError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load custom screens.";
};

export function useCustomScreens(options?: { skip?: boolean }) {
  const initialCached = useMemo(() => getCachedCustomScreens(), []);
  const hasInitialCache = initialCached !== null;
  const [items, setItems] = useState<CustomScreenSummaryRecord[]>(() => initialCached ?? []);
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [error, setError] = useState<string | null>(null);
  const hasHydratedRef = useRef(hasInitialCache);

  const refresh = useCallback(async (refreshOptions?: CustomScreensRefreshOptions) => {
    const force = refreshOptions?.force ?? false;
    const background = resolveCacheRefreshBackground({
      explicitBackground: refreshOptions?.background,
      hasHydrated: hasHydratedRef.current,
    });
    if (!background) {
      setIsLoading(true);
    }
    try {
      const nextItems = await listCustomScreensCached({ force });
      setItems(nextItems);
      setError(null);
      hasHydratedRef.current = true;
    } catch (err) {
      setError(resolveCustomScreensError(err));
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
    listCustomScreensCached({ force: mountOptions.force })
      .then((nextItems) => {
        if (!active) return;
        setItems(nextItems);
        setError(null);
        hasHydratedRef.current = true;
      })
      .catch((err: unknown) => {
        if (active) setError(resolveCustomScreensError(err));
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
      if (event.key !== cacheKeys.customScreensList) return;
      refresh({ force: true, background: true }).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
