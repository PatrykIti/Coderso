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
  const [items, setItems] = useState<SolutionKitSummary[]>(
    () => getCachedSolutionKits() ?? []
  );
  const [isLoading, setIsLoading] = useState(() => !getCachedSolutionKits());
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
    const cached = getCachedSolutionKits();
    if (cached) {
      setItems(cached);
      setIsLoading(false);
    }
    refresh(true).catch(() => undefined);
    return undefined;
  }, [options?.skip, refresh]);

  return {
    items,
    isLoading,
    error,
    refresh,
  };
}
