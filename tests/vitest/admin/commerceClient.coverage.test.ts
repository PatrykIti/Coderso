import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  apiRequest,
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  broadcastCacheEvent,
  resetLocalCache,
  primeLocalCache,
  readLocalCacheValue,
} = vi.hoisted(() => {
  const localCacheStore = new Map<string, unknown>();
  return {
    apiRequest: vi.fn(),
    readLocalCache: vi.fn(),
    writeLocalCache: vi.fn(),
    clearLocalCache: vi.fn(),
    broadcastCacheEvent: vi.fn(),
    resetLocalCache: () => {
      localCacheStore.clear();
    },
    primeLocalCache: (key: string, value: unknown) => {
      localCacheStore.set(key, value);
    },
    readLocalCacheValue: (key: string) => localCacheStore.get(key) ?? null,
  };
});

vi.mock("@/services/apiClient", () => ({
  apiRequest,
  ApiClientError: class ApiClientError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  getCsrfToken: vi.fn(() => Promise.resolve("csrf-token")),
  isApiClientError: (error: unknown) => error instanceof Error && error.name === "ApiClientError",
}));

vi.mock("@/utils/storageCache", () => ({
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  createMemoryBackedLocalCache: () => ({
    read: readLocalCache,
    write: writeLocalCache,
    clear: clearLocalCache,
  }),
}));

vi.mock("@/utils/cacheBus", () => ({ broadcastCacheEvent }));

import {
  clearCommerceCache,
  createCommerceCollection,
  createCommerceProduct,
  deleteCommerceCollection,
  deleteCommerceProduct,
  getCachedCommerceCollections,
  getCachedCommerceProduct,
  getCachedCommerceProducts,
  getCommerceProduct,
  getCommerceProductCached,
  listCommerceCollections,
  listCommerceCollectionsCached,
  listCommerceProducts,
  listCommerceProductsCached,
  previewCommerceProductsQuery,
  setCommerceProductCollections,
  updateCommerceCollection,
  updateCommerceProduct,
} from "../../../core/admin/services/commerceClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const product = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "product-1",
  title: "Brake pads",
  slug: "brake-pads",
  status: "published",
  excerpt: null,
  description: null,
  pricing: { amount: 4900, currency: "PLN", compareAtAmount: null },
  stock: { state: "in_stock", quantity: 5 },
  collectionIds: [],
  mediaIds: [],
  variants: [],
  metadata: {},
  data: {},
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  publishedAt: null,
  ...overrides,
});

const collection = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "collection-1",
  name: "Brakes",
  slug: "brakes",
  description: null,
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const json = (init: Record<string, unknown>) => ({
  headers: { "Content-Type": "application/json" },
  ...init,
});

beforeEach(() => {
  vi.resetAllMocks();
  resetLocalCache();
  readLocalCache.mockImplementation(
    (key: string, _ttlMs: number, validate?: (value: unknown) => boolean) => {
      const value = readLocalCacheValue(key);
      if (value === null) return null;
      if (validate && !validate(value)) return null;
      return value;
    }
  );
  writeLocalCache.mockImplementation((key: string, value: unknown) => {
    primeLocalCache(key, value);
  });
  clearLocalCache.mockImplementation((key: string) => {
    primeLocalCache(key, undefined);
  });
  clearCommerceCache();
});

describe("commerce cache helpers", () => {
  test("getCachedCommerceProducts hydrates from local cache and returns null on miss", () => {
    expect(getCachedCommerceProducts()).toBeNull();
    writeLocalCache(cacheKeys.commerceProductsList, [product()]);
    expect(getCachedCommerceProducts()).toEqual([product()]);
    expect(getCachedCommerceProducts()).toEqual([product()]);
  });

  test("getCachedCommerceProduct prefers memory then the detail cache", () => {
    writeLocalCache(cacheKeys.commerceProductsList, [product({ id: "product-1" })]);
    writeLocalCache(cacheKeys.commerceProductDetail("product-2"), product({ id: "product-2" }));
    getCachedCommerceProducts();
    expect(getCachedCommerceProduct("product-1")).toEqual(product({ id: "product-1" }));
    expect(getCachedCommerceProduct("product-2")).toEqual(product({ id: "product-2" }));
    expect(getCachedCommerceProduct("product-3")).toBeNull();
  });

  test("getCachedCommerceCollections hydrates from local cache and returns null on miss", () => {
    expect(getCachedCommerceCollections()).toBeNull();
    writeLocalCache(cacheKeys.commerceCollectionsList, [collection()]);
    expect(getCachedCommerceCollections()).toEqual([collection()]);
    expect(getCachedCommerceCollections()).toEqual([collection()]);
  });

  test("clearCommerceCache drops all in-memory state and local keys", () => {
    writeLocalCache(cacheKeys.commerceProductsList, [product()]);
    writeLocalCache(cacheKeys.commerceCollectionsList, [collection()]);
    getCachedCommerceProducts();
    getCachedCommerceCollections();
    clearCommerceCache();
    expect(getCachedCommerceProducts()).toBeNull();
    expect(getCachedCommerceCollections()).toBeNull();
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.commerceProductsList);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.commerceCollectionsList);
  });
});

describe("commerce products", () => {
  test("listCommerceProducts issues GET and defaults missing items", async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(listCommerceProducts()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/commerce/products", { method: "GET" });
  });

  test("listCommerceProductsCached hits cache, in-flight and fetch paths", async () => {
    writeLocalCache(cacheKeys.commerceProductsList, [product()]);
    await expect(listCommerceProductsCached()).resolves.toEqual([product()]);
    expect(apiRequest).not.toHaveBeenCalled();
    clearCommerceCache();

    apiRequest.mockResolvedValueOnce({ items: [product()] });
    const first = listCommerceProductsCached();
    const second = listCommerceProductsCached();
    await expect(Promise.all([first, second])).resolves.toEqual([[product()], [product()]]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    // primed list and per-product detail writes
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.commerceProductsList, [product()]);
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.commerceProductDetail("product-1"),
      product()
    );

    apiRequest.mockResolvedValueOnce({ items: [product({ id: "product-9" })] });
    await expect(listCommerceProductsCached({ force: true })).resolves.toEqual([
      product({ id: "product-9" }),
    ]);
  });

  test("getCommerceProduct fetches a single product", async () => {
    apiRequest.mockResolvedValueOnce(product());
    await expect(getCommerceProduct("product-1")).resolves.toEqual(product());
    expect(apiRequest).toHaveBeenCalledWith("/commerce/products/product-1", { method: "GET" });
  });

  test("getCommerceProductCached reads cache and upserts after fetch", async () => {
    writeLocalCache(cacheKeys.commerceProductsList, [product()]);
    getCachedCommerceProducts();
    await expect(getCommerceProductCached("product-1")).resolves.toEqual(product());
    expect(apiRequest).not.toHaveBeenCalled();

    apiRequest.mockResolvedValueOnce(product({ title: "Remote" }));
    await expect(getCommerceProductCached("product-1", { force: true })).resolves.toEqual(
      product({ title: "Remote" })
    );
    expect(getCachedCommerceProducts()).toEqual([product({ title: "Remote" })]);
  });

  test("createCommerceProduct posts with CSRF, upserts and broadcasts", async () => {
    const created = product();
    apiRequest.mockResolvedValueOnce(created);
    await createCommerceProduct({
      title: "Brake pads",
      pricing: { amount: 4900, currency: "PLN", compareAtAmount: null },
      stock: { state: "in_stock", quantity: 5 },
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/commerce/products",
      json({
        method: "POST",
        body: JSON.stringify({
          title: "Brake pads",
          pricing: { amount: 4900, currency: "PLN", compareAtAmount: null },
          stock: { state: "in_stock", quantity: 5 },
        }),
      }),
      { withCsrf: true }
    );
    expect(getCachedCommerceProducts()).toEqual([created]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.commerceProductsList,
      action: "update",
    });
  });

  test("upsertProduct merges existing entries and sorts by updatedAt desc", async () => {
    writeLocalCache(cacheKeys.commerceProductsList, [
      product({ id: "product-old", updatedAt: "2026-01-01T00:00:00.000Z" }),
      product({ id: "product-new", updatedAt: "2026-03-01T00:00:00.000Z" }),
    ]);
    apiRequest.mockResolvedValueOnce(product({ title: "Renamed" }));
    await updateCommerceProduct("product-1", { title: "Renamed" });
    const cached = getCachedCommerceProducts();
    expect(cached?.[0]?.id).toBe("product-new");
    expect(cached?.[1]?.id).toBe("product-1");
    expect(cached?.[1]?.title).toBe("Renamed");
  });

  test("updateCommerceProduct patches and broadcasts", async () => {
    apiRequest.mockResolvedValueOnce(product({ title: "Renamed" }));
    await updateCommerceProduct("product-1", { title: "Renamed" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/commerce/products/product-1",
      json({ method: "PATCH", body: JSON.stringify({ title: "Renamed" }) }),
      { withCsrf: true }
    );
    expect(getCachedCommerceProduct("product-1")).toEqual(product({ title: "Renamed" }));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.commerceProductsList,
      action: "update",
    });
  });

  test("deleteCommerceProduct removes the entry and broadcasts", async () => {
    writeLocalCache(cacheKeys.commerceProductsList, [product(), product({ id: "product-2" })]);
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteCommerceProduct("product-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/commerce/products/product-1",
      { method: "DELETE" },
      { withCsrf: true }
    );
    expect(getCachedCommerceProducts()).toEqual([product({ id: "product-2" })]);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.commerceProductDetail("product-1"));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.commerceProductsList,
      action: "invalidate",
    });
  });

  test("setCommerceProductCollections puts collections, upserts and broadcasts", async () => {
    apiRequest.mockResolvedValueOnce(product({ collectionIds: ["collection-1"] }));
    await setCommerceProductCollections("product-1", ["collection-1"]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/commerce/products/product-1/collections",
      json({ method: "PUT", body: JSON.stringify({ collectionIds: ["collection-1"] }) }),
      { withCsrf: true }
    );
    expect(getCachedCommerceProduct("product-1")).toEqual(
      product({ collectionIds: ["collection-1"] })
    );
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.commerceProductsList,
      action: "update",
    });
  });

  test("previewCommerceProductsQuery posts the query without CSRF", async () => {
    const result = { total: 1, limit: 10, offset: 0, query: {} as never, rows: [product()] };
    apiRequest.mockResolvedValueOnce(result);
    await expect(
      previewCommerceProductsQuery({
        filters: [],
        sort: [],
        pagination: { limit: 10, offset: 0 },
      })
    ).resolves.toEqual(result);
    expect(apiRequest).toHaveBeenCalledWith(
      "/commerce/products/query",
      json({
        method: "POST",
        body: JSON.stringify({ filters: [], sort: [], pagination: { limit: 10, offset: 0 } }),
      })
    );
  });
});

describe("commerce collections", () => {
  test("listCommerceCollections issues GET and defaults missing items", async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(listCommerceCollections()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/commerce/collections", { method: "GET" });
  });

  test("listCommerceCollectionsCached hits cache, in-flight and fetch paths", async () => {
    writeLocalCache(cacheKeys.commerceCollectionsList, [collection()]);
    await expect(listCommerceCollectionsCached()).resolves.toEqual([collection()]);
    expect(apiRequest).not.toHaveBeenCalled();
    clearCommerceCache();

    apiRequest.mockResolvedValueOnce({ items: [collection()] });
    const first = listCommerceCollectionsCached();
    const second = listCommerceCollectionsCached();
    await expect(Promise.all([first, second])).resolves.toEqual([[collection()], [collection()]]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.commerceCollectionsList, [collection()]);

    apiRequest.mockResolvedValueOnce({ items: [collection({ name: "Fresh" })] });
    await expect(listCommerceCollectionsCached({ force: true })).resolves.toEqual([
      collection({ name: "Fresh" }),
    ]);
  });

  test("createCommerceCollection posts with CSRF, upserts and broadcasts", async () => {
    apiRequest.mockResolvedValueOnce(collection());
    await createCommerceCollection({ name: "Brakes" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/commerce/collections",
      json({ method: "POST", body: JSON.stringify({ name: "Brakes" }) }),
      { withCsrf: true }
    );
    expect(getCachedCommerceCollections()).toEqual([collection()]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.commerceCollectionsList,
      action: "update",
    });
  });

  test("upsertCollection sorts by name and merges existing entries", async () => {
    writeLocalCache(cacheKeys.commerceCollectionsList, [
      collection({ id: "collection-z", name: "Zulu" }),
      collection({ id: "collection-a", name: "Alpha" }),
    ]);
    // New entry takes the push branch.
    apiRequest.mockResolvedValueOnce(collection({ name: "Mango" }));
    await updateCommerceCollection("collection-1", { name: "Mango" });
    // Existing entry takes the replace branch.
    apiRequest.mockResolvedValueOnce(collection({ id: "collection-a", name: "Aardvark" }));
    await updateCommerceCollection("collection-a", { name: "Aardvark" });
    const cached = getCachedCommerceCollections();
    expect(cached?.map((entry) => entry.name)).toEqual(["Aardvark", "Mango", "Zulu"]);
  });

  test("updateCommerceCollection patches and broadcasts", async () => {
    apiRequest.mockResolvedValueOnce(collection({ name: "Renamed" }));
    await updateCommerceCollection("collection-1", { name: "Renamed" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/commerce/collections/collection-1",
      json({ method: "PATCH", body: JSON.stringify({ name: "Renamed" }) }),
      { withCsrf: true }
    );
    expect(getCachedCommerceCollections()).toEqual([collection({ name: "Renamed" })]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.commerceCollectionsList,
      action: "update",
    });
  });

  test("deleteCommerceCollection removes the entry and broadcasts", async () => {
    writeLocalCache(cacheKeys.commerceCollectionsList, [
      collection(),
      collection({ id: "collection-2" }),
    ]);
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteCommerceCollection("collection-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/commerce/collections/collection-1",
      { method: "DELETE" },
      { withCsrf: true }
    );
    expect(getCachedCommerceCollections()).toEqual([collection({ id: "collection-2" })]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.commerceCollectionsList,
      action: "invalidate",
    });
  });
});
