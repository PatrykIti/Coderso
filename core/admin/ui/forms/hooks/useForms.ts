import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedForms,
  listFormsCached,
  type FormRecord,
} from "@/services/formsClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  resolveCacheRefreshBackground,
  resolveListMountRefreshOptions,
} from "@/utils/cacheRefresh";

const resolveFormsError = (err: unknown) => {
  if (isApiClientError(err)) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Failed to load forms.";
};

export function useForms(options?: { skip?: boolean }) {
  const initialCached = useMemo(() => getCachedForms(), []);
  const hasInitialCache = initialCached !== null;
  const [items, setItems] = useState<FormRecord[]>(() => initialCached ?? []);
  const [isLoading, setIsLoading] = useState(() => !hasInitialCache);
  const [error, setError] = useState<string | null>(null);
  const hasHydratedRef = useRef(hasInitialCache);

  const refresh = useCallback(async (options?: boolean | { force?: boolean; background?: boolean }) => {
    const force = typeof options === "boolean" ? options : options?.force ?? false;
    const background = resolveCacheRefreshBackground({
      explicitBackground: typeof options === "object" ? options.background : undefined,
      hasHydrated: hasHydratedRef.current,
    });
    if (!background) {
      setIsLoading(true);
    }
    try {
      const nextItems = await listFormsCached({ force });
      setItems(nextItems);
      hasHydratedRef.current = true;
      setError(null);
    } catch (err) {
      setError(resolveFormsError(err));
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    const mountOptions = resolveFormsListMountRefreshOptions(hasInitialCache);
    let active = true;
    listFormsCached({ force: mountOptions.force })
      .then((nextItems) => {
        if (!active) return;
        setItems(nextItems);
        hasHydratedRef.current = true;
        setError(null);
      })
      .catch((err: unknown) => {
        if (active) setError(resolveFormsError(err));
      })
      .finally(() => {
        if (active && !mountOptions.background) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hasInitialCache, options?.skip, refresh]);

  useEffect(() => {
    if (options?.skip) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.formsList) return;
      const cached = getCachedForms();
      if (cached) {
        setItems(cached);
        hasHydratedRef.current = true;
        setIsLoading(false);
      }
      refresh({ force: true, background: true }).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}

export function resolveFormsListMountRefreshOptions(hasInitialCache: boolean) {
  return resolveListMountRefreshOptions(hasInitialCache);
}
