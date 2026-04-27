import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import {
  getCachedSolutionKits,
  listSolutionKitsCached,
  type SolutionKitSummary,
} from "@/services/solutionKitsClient";

const resolveError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load solution kits.";
};

export function useSolutionKits(options?: { skip?: boolean }) {
  const initialCached = getCachedSolutionKits();
  const [items, setItems] = useState<SolutionKitSummary[]>(
    () => initialCached ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !initialCached);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force?: boolean) => {
    try {
      const next = await listSolutionKitsCached({ force });
      setItems(next);
      setError(null);
    } catch (error) {
      setError(resolveError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    let active = true;
    listSolutionKitsCached({ force: true })
      .then((next) => {
        if (!active) return;
        setItems(next);
        setError(null);
      })
      .catch((error: unknown) => {
        if (active) setError(resolveError(error));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [options?.skip]);

  return {
    items,
    isLoading,
    error,
    refresh,
  };
}
