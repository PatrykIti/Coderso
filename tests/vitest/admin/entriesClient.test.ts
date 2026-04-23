import { expect, test } from "vitest";

import {
  clearEntriesCache,
  createEntry,
  deleteEntry,
  duplicateEntry,
  getCachedEntries,
  getEntry,
  getEntryCached,
  listEntries,
  listEntriesCached,
  previewEntry,
  publishEntry,
  unpublishEntry,
  updateEntry,
  updateEntryMetadata,
} from "../../../core/admin/services/entriesClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

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

const resetCaches = (typeSlug: string) => {
  clearEntriesCache(typeSlug);
};
test("listEntries hits GET /content/:type/entries", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listEntries("blog");
    expect(calls[0]?.input).toBe("/admin/api/content/blog/entries");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getEntry hits GET /content/:type/entries/:id", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ id: "entry-1" });
  };

  try {
    await getEntry("blog", "entry-1");
    expect(calls[0]?.input).toBe("/admin/api/content/blog/entries/entry-1");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createEntry uses CSRF and posts payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "entry-1" });
  };

  try {
    resetCsrfToken();
    await createEntry("blog", {
      title: "Hello",
      slug: "hello",
      data: {},
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content/blog/entries");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateEntry uses CSRF and patches payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "entry-1" });
  };

  try {
    resetCsrfToken();
    await updateEntry("blog", "entry-1", { title: "Updated" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content/blog/entries/entry-1");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateEntryMetadata uses CSRF and PATCH /metadata", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "entry-1" });
  };

  try {
    resetCsrfToken();
    await updateEntryMetadata("blog", "entry-1", {
      status: "scheduled",
      scheduledAt: "2026-02-01T10:00:00Z",
      tags: ["news"],
      seo: { description: "Meta" },
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content/blog/entries/entry-1/metadata");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("previewEntry posts ttlMinutes with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ token: "t", previewUrl: "https://example.com", expiresAt: "soon" });
  };

  try {
    resetCsrfToken();
    await previewEntry("blog", "entry-1", 15);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content/blog/entries/entry-1/preview");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("publishEntry uses CSRF", async () => {
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
    await publishEntry("blog", "entry-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content/blog/entries/entry-1/publish");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unpublishEntry uses CSRF", async () => {
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
    await unpublishEntry("blog", "entry-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content/blog/entries/entry-1/unpublish");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteEntry uses CSRF and DELETE", async () => {
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
    await deleteEntry("blog", "entry-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content/blog/entries/entry-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("duplicateEntry uses CSRF and primes list/detail caches", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const duplicated = {
    id: "entry-copy",
    typeId: "type-1",
    title: "Hello (Copy)",
    slug: "hello-copy",
    status: "draft" as const,
    data: {},
    tags: ["news"],
    createdAt: "2026-02-14T00:00:00.000Z",
    updatedAt: "2026-02-14T00:00:00.000Z",
    taxonomy: null,
  };

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse(duplicated);
  };

  try {
    resetCsrfToken();
    resetCaches("blog");
    const result = await duplicateEntry("blog", "entry-1");
    expect(result.id).toBe("entry-copy");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe(
      "/admin/api/content/blog/entries/entry-1/duplicate"
    );
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBe(JSON.stringify({}));
    expect(getCachedEntries("blog")?.[0]?.id).toBe("entry-copy");
  } finally {
    globalThis.fetch = originalFetch;
    resetCaches("blog");
  }
});

test("failed updateEntryMetadata leaves cached list untouched", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const originalEntry = {
    id: "entry-1",
    typeId: "type-1",
    title: "Original",
    slug: "original",
    status: "draft" as const,
    data: {},
    createdAt: "2026-02-14T00:00:00.000Z",
    updatedAt: "2026-02-14T00:00:00.000Z",
  };

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/content/blog/entries") && init?.method === "GET") {
      return jsonResponse([originalEntry]);
    }
    return jsonResponse({ error: { message: "metadata failed" } }, 500);
  };

  try {
    resetCsrfToken();
    resetCaches("blog");
    await listEntriesCached("blog", { force: true });
    await expect(
      updateEntryMetadata("blog", "entry-1", { seo: { description: "Updated" } })
    ).rejects.toThrow();
    expect(getCachedEntries("blog")?.[0]?.title).toBe("Original");
  } finally {
    globalThis.fetch = originalFetch;
    resetCaches("blog");
  }
});


test("listEntriesCached reads from local storage", async () => {
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
    resetCaches("blog");
    const cached = [
      {
        id: "entry-9",
        typeId: "type-1",
        title: "Hello",
        slug: "hello",
        status: "draft" as const,
        data: {},
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    storage.setItem(
      cacheKeys.entriesList("blog"),
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listEntriesCached("blog");
    expect(result).toEqual(cached);
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches("blog");
  }
});

test("getEntryCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ id: "entry-10" });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches("blog");
    const cached = {
      id: "entry-10",
      typeId: "type-1",
      title: "Cached",
      slug: "cached",
      status: "draft" as const,
      data: {},
      createdAt: "2026-02-14T00:00:00.000Z",
      updatedAt: "2026-02-14T00:00:00.000Z",
      taxonomy: null,
    };
    storage.setItem(
      cacheKeys.entryDetail("blog", "entry-10"),
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await getEntryCached("blog", "entry-10");
    expect(result?.id).toBe("entry-10");
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches("blog");
  }
});
