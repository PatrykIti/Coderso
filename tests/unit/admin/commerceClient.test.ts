import { expect, test } from "bun:test";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import {
  clearCommerceCache,
  createCommerceProduct,
  listCommerceCollectionsCached,
  listCommerceProducts,
  listCommerceProductsCached,
  previewCommerceProductsQuery,
} from "../../../core/admin/services/commerceClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("listCommerceProducts hits GET /commerce/products", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearCommerceCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listCommerceProducts();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/commerce/products");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
    clearCommerceCache();
  }
});

test("createCommerceProduct uses CSRF and posts payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearCommerceCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "product-1",
      title: "Oak Residence",
      slug: "oak-residence",
      status: "draft",
      excerpt: null,
      description: null,
      pricing: { amount: 450000, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: 1 },
      collectionIds: [],
      mediaIds: [],
      variants: [],
      metadata: {},
      data: {},
      createdAt: "2026-02-19T00:00:00.000Z",
      updatedAt: "2026-02-19T00:00:00.000Z",
      publishedAt: null,
    });
  };

  try {
    resetCsrfToken();
    await createCommerceProduct({
      title: "Oak Residence",
      pricing: { amount: 450000, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: 1 },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/commerce/products");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
    clearCommerceCache();
  }
});

test("listCommerceProductsCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();
  clearCommerceCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.commerceProductsList,
      JSON.stringify({
        value: [
          {
            id: "product-1",
            title: "Cached Product",
            slug: "cached-product",
            status: "draft",
            excerpt: null,
            description: null,
            pricing: { amount: 1000, currency: "USD", compareAtAmount: null },
            stock: { state: "in_stock", quantity: 1 },
            collectionIds: [],
            mediaIds: [],
            variants: [],
            metadata: {},
            data: {},
            createdAt: "2026-02-19T00:00:00.000Z",
            updatedAt: "2026-02-19T00:00:00.000Z",
            publishedAt: null,
          },
        ],
        savedAt: Date.now(),
      })
    );

    const items = await listCommerceProductsCached();
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Cached Product");
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearCommerceCache();
  }
});

test("listCommerceCollectionsCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();
  clearCommerceCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.commerceCollectionsList,
      JSON.stringify({
        value: [
          {
            id: "collection-1",
            name: "Premium",
            slug: "premium",
            description: null,
            createdAt: "2026-02-19T00:00:00.000Z",
            updatedAt: "2026-02-19T00:00:00.000Z",
          },
        ],
        savedAt: Date.now(),
      })
    );

    const items = await listCommerceCollectionsCached();
    expect(items).toHaveLength(1);
    expect(items[0]?.slug).toBe("premium");
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearCommerceCache();
  }
});

test("previewCommerceProductsQuery posts query payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearCommerceCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      total: 0,
      limit: 10,
      offset: 0,
      query: {
        filters: [],
        sort: [{ field: "updatedAt", dir: "desc" }],
        pagination: { limit: 10, offset: 0 },
      },
      rows: [],
    });
  };

  try {
    await previewCommerceProductsQuery({
      filters: [],
      sort: [{ field: "updatedAt", dir: "desc" }],
      pagination: { limit: 10, offset: 0 },
    });
    expect(calls[0]?.input).toBe("/admin/api/commerce/products/query");
    expect(calls[0]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
    clearCommerceCache();
  }
});
