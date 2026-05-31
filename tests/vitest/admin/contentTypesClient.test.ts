import { afterEach, expect, test, vi } from "vitest";

import {
  clearContentTypesCache,
  clearContentTypeCollectionWorkspaceCache,
  createContentType,
  deleteContentType,
  duplicateContentType,
  getCachedContentTypeCollectionWorkspace,
  getCachedContentTypes,
  getContentType,
  getContentTypeCached,
  getContentTypeCollectionWorkspace,
  getContentTypeCollectionWorkspaceCached,
  listContentTypes,
  listContentTypesCached,
  primeContentTypesCache,
  updateContentType,
} from "../../../core/admin/services/contentTypesClient";
import { cacheKeys, cacheTtlMs } from "../../../core/admin/services/cachePolicy";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

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

const workspaceSummary = {
  contentType: {
    id: "ct-1",
    name: "Products",
    slug: "products",
    status: "published",
    fieldCount: 3,
    updatedAt: "2026-05-10T08:00:00.000Z",
  },
  canonical: {
    contentRoute: {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
      detailPageId: "detail-products",
    },
    detailPage: {
      id: "detail-products",
      label: "Product Detail",
      status: "published",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    listPage: {
      id: "page-products",
      label: "Products",
      slug: "products",
      status: "published",
      role: "canonical-list-page",
      compositionKey: "products",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    listingQuery: {
      id: "query-products",
      label: "Products Query",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    listingTemplate: {
      id: "template-products",
      label: "Product Grid",
      slug: "product-grid",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    adminScreen: {
      id: "screen-products",
      label: "Products Admin",
      status: "active",
      role: "canonical-admin-screen",
      compositionKey: "products",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
  },
  linkedSecondary: {
    pages: [],
    adminScreens: [],
  },
  unresolved: [],
  candidates: {
    detailPages: [],
    pages: [],
    listingQueries: [],
    listingTemplates: [],
    adminScreens: [],
  },
};

const resetCaches = () => {
  clearContentTypesCache();
  clearContentTypeCollectionWorkspaceCache("ct-1");
  clearContentTypeCollectionWorkspaceCache("ct-3");
};

afterEach(() => {
  vi.useRealTimers();
  resetCaches();
});

test("listContentTypes hits GET /content-types", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listContentTypes();
    expect(calls[0]?.input).toBe("/admin/api/content-types");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getContentType hits GET /content-types/:id", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ id: "ct-1" });
  };

  try {
    await getContentType("ct-1");
    expect(calls[0]?.input).toBe("/admin/api/content-types/ct-1");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getContentTypeCollectionWorkspace hits the collection workspace endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(workspaceSummary);
  };

  try {
    await getContentTypeCollectionWorkspace("ct-1");
    expect(calls[0]?.input).toBe("/admin/api/content-types/ct-1/collection-workspace");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createContentType uses CSRF and posts payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "ct-1" });
  };

  try {
    resetCsrfToken();
    await createContentType({
      name: "Blog",
      slug: "blog",
      schema: { type: "object", additionalProperties: false, properties: {} },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content-types");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("duplicateContentType uses CSRF and posts duplicate payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "ct-copy",
      name: "Copy of Blog",
      slug: "blog-copy",
      status: "draft",
      schema: { type: "object", additionalProperties: false, properties: {} },
      createdAt: "2026-02-14T00:00:00.000Z",
      updatedAt: "2026-02-14T00:00:00.000Z",
    });
  };

  try {
    resetCsrfToken();
    resetCaches();
    await duplicateContentType("ct-1", { name: "Copy of Blog" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content-types/ct-1/duplicate");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({ name: "Copy of Blog" });
    expect(getCachedContentTypes()?.[0]?.id).toBe("ct-copy");
  } finally {
    globalThis.fetch = originalFetch;
    resetCaches();
  }
});

test("updateContentType uses CSRF and patches payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "ct-1" });
  };

  try {
    resetCsrfToken();
    await updateContentType("ct-1", { name: "Updated" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content-types/ct-1");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteContentType uses CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await deleteContentType("ct-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content-types/ct-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listContentTypesCached returns cached items without fetch", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    resetCaches();
    const cached = [
      {
        id: "ct-1",
        name: "Blog",
        slug: "blog",
        status: "published" as const,
        schema: { type: "object", additionalProperties: false as const, properties: {} },
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    // Prime cache and read without hitting fetch.
    clearContentTypesCache();
    primeContentTypesCache(cached as unknown as Parameters<typeof primeContentTypesCache>[0]);

    const result = await listContentTypesCached();
    expect(result).toEqual(cached);
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    resetCaches();
  }
});

test("getContentTypeCached returns cached entry by id", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ id: "ct-2" });
  };

  try {
    resetCaches();
    const cached = [
      {
        id: "ct-2",
        name: "Docs",
        slug: "docs",
        status: "draft" as const,
        schema: { type: "object", additionalProperties: false as const, properties: {} },
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    primeContentTypesCache(cached as unknown as Parameters<typeof primeContentTypesCache>[0]);

    const result = await getContentTypeCached("ct-2");
    expect(result?.id).toBe("ct-2");
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    resetCaches();
  }
});

test("updateContentType updates cached entries", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "ct-3",
      name: "Updated",
      slug: "updated",
      status: "published",
      schema: { type: "object", additionalProperties: false, properties: {} },
      createdAt: "2026-02-14T00:00:00.000Z",
      updatedAt: "2026-02-14T00:00:00.000Z",
    });
  };

  try {
    resetCaches();
    primeContentTypesCache([
      {
        id: "ct-3",
        name: "Old",
        slug: "old",
        status: "draft",
        schema: { type: "object", additionalProperties: false, properties: {} },
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ]);

    await updateContentType("ct-3", { name: "Updated" });
    const cached = getCachedContentTypes();
    expect(cached?.[0]?.name).toBe("Updated");
  } finally {
    globalThis.fetch = originalFetch;
    resetCaches();
  }
});

test("listContentTypesCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    const cached = [
      {
        id: "ct-9",
        name: "FAQ",
        slug: "faq",
        status: "draft" as const,
        schema: { type: "object", additionalProperties: false, properties: {} },
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    storage.setItem(
      cacheKeys.contentTypesList,
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listContentTypesCached();
    expect(result).toEqual(cached);
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches();
  }
});

test("getContentTypeCollectionWorkspaceCached reads from content-types namespace", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(workspaceSummary);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    storage.setItem(
      cacheKeys.contentTypeCollectionWorkspace("ct-1"),
      JSON.stringify({ value: workspaceSummary, savedAt: Date.now() })
    );

    const result = await getContentTypeCollectionWorkspaceCached("ct-1");
    expect(result.contentType.id).toBe("ct-1");
    expect(getCachedContentTypeCollectionWorkspace("ct-1")?.contentType.name).toBe("Products");
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches();
  }
});

test("updateContentType invalidates collection workspace cache", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "ct-1",
      name: "Products",
      slug: "products",
      status: "published",
      schema: { type: "object", additionalProperties: false, properties: {} },
      createdAt: "2026-05-10T08:00:00.000Z",
      updatedAt: "2026-05-10T08:00:00.000Z",
    });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCsrfToken();
    resetCaches();
    storage.setItem(
      cacheKeys.contentTypeCollectionWorkspace("ct-1"),
      JSON.stringify({ value: workspaceSummary, savedAt: Date.now() })
    );
    expect(getCachedContentTypeCollectionWorkspace("ct-1")).not.toBeNull();

    await updateContentType("ct-1", { name: "Products" });

    expect(storage.getItem(cacheKeys.contentTypeCollectionWorkspace("ct-1"))).toBeNull();
    expect(getCachedContentTypeCollectionWorkspace("ct-1")).toBeNull();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches();
  }
});

test("deleteContentType clears collection workspace cache even without list cache", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCsrfToken();
    resetCaches();
    storage.setItem(
      cacheKeys.contentTypeCollectionWorkspace("ct-1"),
      JSON.stringify({ value: workspaceSummary, savedAt: Date.now() })
    );
    storage.setItem(
      cacheKeys.contentTypeDetail("ct-1"),
      JSON.stringify({ value: { id: "ct-1" }, savedAt: Date.now() })
    );

    await deleteContentType("ct-1");

    expect(storage.getItem(cacheKeys.contentTypeCollectionWorkspace("ct-1"))).toBeNull();
    expect(storage.getItem(cacheKeys.contentTypeDetail("ct-1"))).toBeNull();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches();
  }
});

test("expired content type memory yields to fresher storage before network fallback", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([
      {
        id: "ct-network",
        name: "Network",
        slug: "network",
        status: "published",
        schema: { type: "object", additionalProperties: false, properties: {} },
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ]);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-14T00:00:00.000Z"));
    resetCaches();
    await listContentTypesCached({ force: true });

    vi.setSystemTime(new Date(Date.now() + 1000));
    storage.setItem(
      cacheKeys.contentTypesList,
      JSON.stringify({
        value: [
          {
            id: "ct-storage",
            name: "Storage",
            slug: "storage",
            status: "draft",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {},
            },
            createdAt: "2026-02-14T00:00:00.000Z",
            updatedAt: "2026-02-14T00:00:00.000Z",
          },
        ],
        savedAt: Date.now(),
      })
    );

    vi.setSystemTime(new Date(Date.now() + cacheTtlMs.list));
    const result = await listContentTypesCached();

    expect(result[0]?.id).toBe("ct-storage");
    expect(getCachedContentTypes()?.[0]?.name).toBe("Storage");
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches();
  }
});
