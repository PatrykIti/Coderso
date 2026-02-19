import { useCallback, useEffect, useState } from "react";

import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedCommerceCollections,
  getCachedCommerceProducts,
  listCommerceCollectionsCached,
  listCommerceProductsCached,
  type CommerceCollectionRecord,
  type CommerceProductRecord,
} from "@/services/commerceClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const resolveCommerceError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load commerce catalog.";
};

export function useCommerceCatalog(options?: { skip?: boolean }) {
  const [products, setProducts] = useState<CommerceProductRecord[]>(
    () => getCachedCommerceProducts() ?? []
  );
  const [collections, setCollections] = useState<CommerceCollectionRecord[]>(
    () => getCachedCommerceCollections() ?? []
  );
  const [isLoadingProducts, setIsLoadingProducts] = useState(
    () => !getCachedCommerceProducts()
  );
  const [isLoadingCollections, setIsLoadingCollections] = useState(
    () => !getCachedCommerceCollections()
  );
  const [error, setError] = useState<string | null>(null);

  const refreshProducts = useCallback(async (force?: boolean) => {
    try {
      const items = await listCommerceProductsCached({ force });
      setProducts(items);
      setError(null);
    } catch (error) {
      setError(resolveCommerceError(error));
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const refreshCollections = useCallback(async (force?: boolean) => {
    try {
      const items = await listCommerceCollectionsCached({ force });
      setCollections(items);
      setError(null);
    } catch (error) {
      setError(resolveCommerceError(error));
    } finally {
      setIsLoadingCollections(false);
    }
  }, []);

  useEffect(() => {
    if (options?.skip) return;
    refreshProducts(true).catch(() => undefined);
    refreshCollections(true).catch(() => undefined);
  }, [options?.skip, refreshCollections, refreshProducts]);

  useEffect(() => {
    if (options?.skip) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.commerceProductsList) {
        refreshProducts(true).catch(() => undefined);
      }
      if (event.key === cacheKeys.commerceCollectionsList) {
        refreshCollections(true).catch(() => undefined);
      }
    });
  }, [options?.skip, refreshCollections, refreshProducts]);

  return {
    products,
    collections,
    isLoadingProducts,
    isLoadingCollections,
    error,
    refreshProducts,
    refreshCollections,
  };
}
