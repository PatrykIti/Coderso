import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedForms,
  listFormsCached,
  type FormRecord,
} from "@/services/formsClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const resolveFormsError = (err: unknown) => {
  if (isApiClientError(err)) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Failed to load forms.";
};

export function useForms(options?: { skip?: boolean }) {
  const [items, setItems] = useState<FormRecord[]>(() => getCachedForms() ?? []);
  const [isLoading, setIsLoading] = useState(() => !getCachedForms());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force?: boolean) => {
    try {
      const nextItems = await listFormsCached({ force });
      setItems(nextItems);
      setError(null);
    } catch (err) {
      setError(resolveFormsError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    const cached = getCachedForms();
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
      if (event.key !== cacheKeys.formsList) return;
      refresh(true).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
