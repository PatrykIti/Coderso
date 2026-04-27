import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedReviews,
  listReviewsCached,
  type ReviewRecord,
} from "@/services/reviewsClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const resolveReviewsError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load reviews.";
};

export function useReviews(options?: { skip?: boolean }) {
  const initialCached = getCachedReviews();
  const [items, setItems] = useState<ReviewRecord[]>(() => initialCached ?? []);
  const [isLoading, setIsLoading] = useState(() => !initialCached);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force?: boolean) => {
    try {
      const nextItems = await listReviewsCached({ force });
      setItems(nextItems);
      setError(null);
    } catch (error) {
      setError(resolveReviewsError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return undefined;
    let active = true;
    listReviewsCached({ force: true })
      .then((nextItems) => {
        if (!active) return;
        setItems(nextItems);
        setError(null);
      })
      .catch((error: unknown) => {
        if (active) setError(resolveReviewsError(error));
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
      if (event.key !== cacheKeys.reviewsList) return;
      refresh(true).catch(() => undefined);
    });
  }, [options?.skip, refresh]);

  return { items, isLoading, error, refresh };
}
