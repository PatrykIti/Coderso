import { expect, test } from "bun:test";

import {
  clearContentTypesCache,
  createContentType,
  deleteContentType,
  getCachedContentTypes,
  getContentType,
  getContentTypeCached,
  listContentTypes,
  listContentTypesCached,
  primeContentTypesCache,
  updateContentType,
} from "../../../core/admin/services/contentTypesClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createSessionStorage = () => {
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

const resetCaches = () => {
  clearContentTypesCache();
};

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
        schema: { type: "object", additionalProperties: false, properties: {} },
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    // Prime cache and read without hitting fetch.
    clearContentTypesCache();
    primeContentTypesCache(cached);

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
        schema: { type: "object", additionalProperties: false, properties: {} },
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    primeContentTypesCache(cached);

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

test("listContentTypesCached reads from session storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalSession = (globalThis as { sessionStorage?: unknown }).sessionStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createSessionStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };
  (globalThis as { sessionStorage?: unknown }).sessionStorage = storage as unknown;

  try {
    resetCaches();
    const cached = [
      {
        id: "ct-9",
        name: "FAQ",
        slug: "faq",
        schema: { type: "object", additionalProperties: false, properties: {} },
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    storage.setItem(
      "nextless.contentTypesCache",
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listContentTypesCached();
    expect(result).toEqual(cached);
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSession === undefined) {
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    } else {
      (globalThis as { sessionStorage?: unknown }).sessionStorage = originalSession;
    }
    resetCaches();
  }
});
