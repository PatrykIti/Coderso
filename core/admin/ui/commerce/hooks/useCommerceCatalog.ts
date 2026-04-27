import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import {
  resolveCacheRefreshBackground,
  resolveListMountRefreshOptions,
} from "@/utils/cacheRefresh";

const resolveCommerceError = (error: unknown) => {
  if (isApiClientError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load commerce catalog.";
};

export function useCommerceCatalog(options?: { skip?: boolean }) {
  const initialCachedProducts = useMemo(() => getCachedCommerceProducts(), []);
  const initialCachedCollections = useMemo(
    () => getCachedCommerceCollections(),
    []
  );
  const hasInitialProductCache = initialCachedProducts !== null;
  const hasInitialCollectionCache = initialCachedCollections !== null;
  const [products, setProducts] = useState<CommerceProductRecord[]>(
    () => initialCachedProducts ?? []
  );
  const [collections, setCollections] = useState<CommerceCollectionRecord[]>(
    () => initialCachedCollections ?? []
  );
  const [isLoadingProducts, setIsLoadingProducts] = useState(
    () => !hasInitialProductCache
  );
  const [isLoadingCollections, setIsLoadingCollections] = useState(
    () => !hasInitialCollectionCache
  );
  const [error, setError] = useState<string | null>(null);
  const hasHydratedProductsRef = useRef(hasInitialProductCache);
  const hasHydratedCollectionsRef = useRef(hasInitialCollectionCache);

  const refreshProducts = useCallback(
    async (options?: boolean | { force?: boolean; background?: boolean }) => {
      const force =
        typeof options === "boolean" ? options : options?.force ?? false;
      const background = resolveCacheRefreshBackground({
        explicitBackground:
          typeof options === "object" ? options.background : undefined,
        hasHydrated: hasHydratedProductsRef.current,
      });
      if (!background) {
        setIsLoadingProducts(true);
      }
      try {
        const items = await listCommerceProductsCached({ force });
        setProducts(items);
        hasHydratedProductsRef.current = true;
        setError(null);
      } catch (error) {
        setError(resolveCommerceError(error));
      } finally {
        if (!background) {
          setIsLoadingProducts(false);
        }
      }
    },
    []
  );

  const refreshCollections = useCallback(
    async (options?: boolean | { force?: boolean; background?: boolean }) => {
      const force =
        typeof options === "boolean" ? options : options?.force ?? false;
      const background = resolveCacheRefreshBackground({
        explicitBackground:
          typeof options === "object" ? options.background : undefined,
        hasHydrated: hasHydratedCollectionsRef.current,
      });
      if (!background) {
        setIsLoadingCollections(true);
      }
      try {
        const items = await listCommerceCollectionsCached({ force });
        setCollections(items);
        hasHydratedCollectionsRef.current = true;
        setError(null);
      } catch (error) {
        setError(resolveCommerceError(error));
      } finally {
        if (!background) {
          setIsLoadingCollections(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (options?.skip) return;
    const productMountOptions =
      resolveCommerceListMountRefreshOptions(hasInitialProductCache);
    const collectionMountOptions =
      resolveCommerceListMountRefreshOptions(hasInitialCollectionCache);
    let active = true;
    listCommerceProductsCached({ force: productMountOptions.force })
      .then((items) => {
        if (!active) return;
        setProducts(items);
        hasHydratedProductsRef.current = true;
        setError(null);
      })
      .catch((error: unknown) => {
        if (active) setError(resolveCommerceError(error));
      })
      .finally(() => {
        if (active && !productMountOptions.background) {
          setIsLoadingProducts(false);
        }
      });
    listCommerceCollectionsCached({ force: collectionMountOptions.force })
      .then((items) => {
        if (!active) return;
        setCollections(items);
        hasHydratedCollectionsRef.current = true;
        setError(null);
      })
      .catch((error: unknown) => {
        if (active) setError(resolveCommerceError(error));
      })
      .finally(() => {
        if (active && !collectionMountOptions.background) {
          setIsLoadingCollections(false);
        }
      });
    return () => {
      active = false;
    };
  }, [hasInitialCollectionCache, hasInitialProductCache, options?.skip]);

  useEffect(() => {
    if (options?.skip) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.commerceProductsList) {
        const cached = getCachedCommerceProducts();
        if (cached) {
          setProducts(cached);
          hasHydratedProductsRef.current = true;
          setIsLoadingProducts(false);
        }
        refreshProducts({ force: true, background: true }).catch(
          () => undefined
        );
      }
      if (event.key === cacheKeys.commerceCollectionsList) {
        const cached = getCachedCommerceCollections();
        if (cached) {
          setCollections(cached);
          hasHydratedCollectionsRef.current = true;
          setIsLoadingCollections(false);
        }
        refreshCollections({ force: true, background: true }).catch(
          () => undefined
        );
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

export function resolveCommerceListMountRefreshOptions(hasInitialCache: boolean) {
  return resolveListMountRefreshOptions(hasInitialCache);
}
