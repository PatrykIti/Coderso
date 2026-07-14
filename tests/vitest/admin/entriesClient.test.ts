import { expect, test } from "vitest";

import {
  clearAllEntriesCache,
  clearEntriesCache,
  createEntry,
  deleteEntry,
  duplicateEntry,
  getCachedAllEntries,
  getCachedEntries,
  getCachedEntryDetail,
  getEntry,
  getEntryCached,
  listAllEntries,
  listAllEntriesCached,
  listEntries,
  listEntriesCached,
  previewEntry,
  publishEntry,
  unpublishEntry,
  updateEntry,
  updateEntryMetadata,
} from "../../../core/admin/services/entriesClient";
import type {
  EntryDetail,
  EntryListItem,
  EntryMetadataPayload,
  EntryStatus,
  EntrySummary,
} from "../../../core/admin/services/entriesClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { subscribeCacheEvents, type CacheEvent } from "../../../core/admin/utils/cacheBus";

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

const installLocalStorage = () => {
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  return {
    restore: () => {
      if (original === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = original;
      }
    },
    storage,
  };
};

const resetCaches = (typeSlug: string) => {
  clearEntriesCache(typeSlug);
  clearAllEntriesCache();
};

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const entrySummary = (id: string, title = id, status: EntryStatus = "draft"): EntrySummary => ({
  id,
  typeId: "type-cache-authority",
  title,
  slug: id,
  status,
  visibility: "public",
  hasPassword: false,
  data: {},
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
});

const entryDetail = (id: string, title = id, status: EntryStatus = "draft"): EntryDetail => ({
  ...entrySummary(id, title, status),
  taxonomy: null,
});

const allEntryItem = (id: string, title = id): EntryListItem => ({
  ...entrySummary(id, title),
  contentType: {
    id: "type-cache-authority",
    slug: "cache-authority",
    name: "Cache authority",
    status: "published",
  },
});

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

test("listAllEntries hits GET /content-entries", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listAllEntries();
    expect(calls[0]?.input).toBe("/admin/api/content-entries");
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

test("successful updateEntryMetadata broadcasts exactly three cache events after the response", async () => {
  const originalFetch = globalThis.fetch;
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const events: Array<Pick<CacheEvent, "key" | "action"> & { responseResolved: boolean }> = [];
  let responseResolved = false;
  const updatedEntry = {
    id: "entry-cache-success",
    typeId: "type-cache-success",
    title: "Updated metadata",
    slug: "updated-metadata",
    status: "published" as const,
    data: {},
    tags: ["updated"],
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:01:00.000Z",
    taxonomy: null,
  };

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  const unsubscribe = subscribeCacheEvents((event) => {
    events.push({ key: event.key, action: event.action, responseResolved });
  });
  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    responseResolved = true;
    return jsonResponse(updatedEntry);
  };

  try {
    resetCsrfToken();
    resetCaches("cache-success");
    await updateEntryMetadata("cache-success", updatedEntry.id, {
      status: "published",
      tags: ["updated"],
    });

    expect(events).toEqual([
      {
        key: cacheKeys.entriesList("cache-success"),
        action: "update",
        responseResolved: true,
      },
      { key: cacheKeys.entriesAllList, action: "update", responseResolved: true },
      {
        key: cacheKeys.entryDetail("cache-success", updatedEntry.id),
        action: "update",
        responseResolved: true,
      },
    ]);
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches("cache-success");
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
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();
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
    const allEntries = [
      {
        ...duplicated,
        contentType: {
          id: "type-1",
          slug: "blog",
          name: "Blog",
          status: "published",
        },
      },
    ];
    (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
    storage.setItem(
      cacheKeys.entriesAllList,
      JSON.stringify({ value: allEntries, savedAt: Date.now() })
    );
    expect(getCachedAllEntries()).toEqual(allEntries);
    const result = await duplicateEntry("blog", "entry-1");
    expect(result.id).toBe("entry-copy");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content/blog/entries/entry-1/duplicate");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBe(JSON.stringify({}));
    expect(getCachedEntries("blog")?.[0]?.id).toBe("entry-copy");
    expect(getCachedAllEntries()).toBeNull();
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

test("failed updateEntryMetadata leaves cached list untouched", async () => {
  const originalFetch = globalThis.fetch;
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();
  const events: CacheEvent[] = [];
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

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));
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
    expect(events).toEqual([]);
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
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

test("listAllEntriesCached reads from local storage", async () => {
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
    clearAllEntriesCache();
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
        contentType: {
          id: "type-1",
          slug: "blog",
          name: "Blog",
          status: "published",
        },
      },
    ];
    storage.setItem(
      cacheKeys.entriesAllList,
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listAllEntriesCached();
    expect(result).toEqual(cached);
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearAllEntriesCache();
  }
});

test("EntryMetadataPayload accepts visibility and accessPassword", () => {
  const publicPayload: EntryMetadataPayload = { visibility: "public" };
  const passwordPayload: EntryMetadataPayload = {
    visibility: "password",
    accessPassword: "s3cret",
  };
  const clearPayload: EntryMetadataPayload = {
    visibility: "private",
    accessPassword: null,
  };
  expect(publicPayload.visibility).toBe("public");
  expect(passwordPayload.accessPassword).toBe("s3cret");
  expect(clearPayload.accessPassword).toBeNull();
});

test("updateEntryMetadata round-trips visibility/hasPassword and never caches accessPassword", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  let sentBody: string | undefined;
  const updatedDetail = {
    id: "entry-1",
    typeId: "type-1",
    title: "Guarded",
    slug: "guarded",
    status: "published" as const,
    visibility: "password" as const,
    hasPassword: true,
    data: {},
    createdAt: "2026-02-14T00:00:00.000Z",
    updatedAt: "2026-02-14T00:00:00.000Z",
    taxonomy: null,
  };

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    sentBody = init?.body as string | undefined;
    return jsonResponse(updatedDetail);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCsrfToken();
    resetCaches("blog");
    await updateEntryMetadata("blog", "entry-1", {
      visibility: "password",
      accessPassword: "s3cret",
    });
    // Plaintext password is sent to the server (write-only).
    expect(sentBody).toContain('"accessPassword":"s3cret"');
    expect(sentBody).toContain('"visibility":"password"');

    const cached = getCachedEntryDetail("blog", "entry-1");
    expect(cached?.visibility).toBe("password");
    expect(cached?.hasPassword).toBe(true);
    // accessPassword is send-only: it must never land on a cached entry object.
    expect(cached && "accessPassword" in cached).toBe(false);

    const cachedList = getCachedEntries("blog");
    expect(cachedList?.[0]?.visibility).toBe("password");
    expect(cachedList?.[0]?.hasPassword).toBe(true);
    expect(cachedList?.[0] && "accessPassword" in cachedList[0]).toBe(false);
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

test("listAllEntriesCached raw-primes visibility/hasPassword from server rows", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const serverRows = [
    {
      id: "entry-1",
      typeId: "type-1",
      title: "Public",
      slug: "public",
      status: "published" as const,
      visibility: "public" as const,
      hasPassword: false,
      data: {},
      createdAt: "2026-02-14T00:00:00.000Z",
      updatedAt: "2026-02-14T00:00:00.000Z",
      contentType: {
        id: "type-1",
        slug: "blog",
        name: "Blog",
        status: "published",
      },
    },
    {
      id: "entry-2",
      typeId: "type-1",
      title: "Guarded",
      slug: "guarded",
      status: "published" as const,
      visibility: "password" as const,
      hasPassword: true,
      data: {},
      createdAt: "2026-02-14T00:00:00.000Z",
      updatedAt: "2026-02-14T00:00:00.000Z",
      contentType: {
        id: "type-1",
        slug: "blog",
        name: "Blog",
        status: "published",
      },
    },
  ];

  globalThis.fetch = async () => jsonResponse(serverRows);
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    clearAllEntriesCache();
    const result = await listAllEntriesCached({ force: true });
    expect(result[0]?.visibility).toBe("public");
    expect(result[0]?.hasPassword).toBe(false);
    expect(result[1]?.visibility).toBe("password");
    expect(result[1]?.hasPassword).toBe(true);
    // The raw prime (no toEntrySummary) must round-trip both fields via cache.
    const cached = getCachedAllEntries();
    expect(cached?.[1]?.visibility).toBe("password");
    expect(cached?.[1]?.hasPassword).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearAllEntriesCache();
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

test("entry list caches expose one authoritative promise and reuse the published value", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const typeResponse = createDeferred<Response>();
  const allResponse = createDeferred<Response>();
  const calls: string[] = [];

  globalThis.fetch = (input) => {
    const url = String(input);
    calls.push(url);
    return url.endsWith("/content-entries") ? allResponse.promise : typeResponse.promise;
  };

  try {
    resetCaches("promise-identity");
    const typeFirst = listEntriesCached("promise-identity");
    const typeSecond = listEntriesCached("promise-identity");
    expect(typeSecond).toBe(typeFirst);
    expect(calls).toHaveLength(1);

    const typeRows = [entrySummary("type-authoritative")];
    typeResponse.resolve(jsonResponse(typeRows));
    await expect(typeFirst).resolves.toEqual(typeRows);
    await expect(listEntriesCached("promise-identity")).resolves.toEqual(typeRows);
    expect(calls).toHaveLength(1);

    const allFirst = listAllEntriesCached();
    const allSecond = listAllEntriesCached();
    expect(allSecond).toBe(allFirst);
    expect(calls).toHaveLength(2);

    const allRows = [allEntryItem("all-authoritative")];
    allResponse.resolve(jsonResponse(allRows));
    await expect(allFirst).resolves.toEqual(allRows);
    await expect(listAllEntriesCached()).resolves.toEqual(allRows);
    expect(calls).toHaveLength(2);
  } finally {
    resetCaches("promise-identity");
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("per-type entry reads publish only the latest forced request in both A/B settle orders", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];

  globalThis.fetch = () => {
    const response = responses.shift();
    if (!response) throw new Error("unexpected_entry_read");
    return response.promise;
  };

  try {
    const firstA = createDeferred<Response>();
    const firstB = createDeferred<Response>();
    responses.push(firstA, firstB);
    resetCaches("a-first");
    const requestA = listEntriesCached("a-first");
    const requestB = listEntriesCached("a-first", { force: true });
    expect(listEntriesCached("a-first")).toBe(requestB);

    firstA.resolve(jsonResponse([entrySummary("stale-a")]));
    await requestA;
    expect(getCachedEntries("a-first")).toBeNull();
    expect(listEntriesCached("a-first")).toBe(requestB);
    firstB.resolve(jsonResponse([entrySummary("fresh-b")]));
    await requestB;
    expect(getCachedEntries("a-first")?.map((entry) => entry.id)).toEqual(["fresh-b"]);

    const secondA = createDeferred<Response>();
    const secondB = createDeferred<Response>();
    responses.push(secondA, secondB);
    resetCaches("b-first");
    const lateA = listEntriesCached("b-first");
    const earlyB = listEntriesCached("b-first", { force: true });
    secondB.resolve(jsonResponse([entrySummary("fresh-b-first")]));
    await earlyB;
    secondA.resolve(jsonResponse([entrySummary("stale-a-late")]));
    await lateA;
    expect(getCachedEntries("b-first")?.map((entry) => entry.id)).toEqual(["fresh-b-first"]);
  } finally {
    resetCaches("a-first");
    clearEntriesCache("b-first");
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("all-entry reads publish only the latest forced request in both A/B settle orders", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];

  globalThis.fetch = () => {
    const response = responses.shift();
    if (!response) throw new Error("unexpected_all_entry_read");
    return response.promise;
  };

  try {
    clearAllEntriesCache();
    const firstA = createDeferred<Response>();
    const firstB = createDeferred<Response>();
    responses.push(firstA, firstB);
    const requestA = listAllEntriesCached();
    const requestB = listAllEntriesCached({ force: true });
    expect(listAllEntriesCached()).toBe(requestB);
    firstA.resolve(jsonResponse([allEntryItem("stale-a")]));
    await requestA;
    expect(getCachedAllEntries()).toBeNull();
    firstB.resolve(jsonResponse([allEntryItem("fresh-b")]));
    await requestB;
    expect(getCachedAllEntries()?.map((entry) => entry.id)).toEqual(["fresh-b"]);

    clearAllEntriesCache();
    const secondA = createDeferred<Response>();
    const secondB = createDeferred<Response>();
    responses.push(secondA, secondB);
    const lateA = listAllEntriesCached();
    const earlyB = listAllEntriesCached({ force: true });
    secondB.resolve(jsonResponse([allEntryItem("fresh-b-first")]));
    await earlyB;
    secondA.resolve(jsonResponse([allEntryItem("stale-a-late")]));
    await lateA;
    expect(getCachedAllEntries()?.map((entry) => entry.id)).toEqual(["fresh-b-first"]);
  } finally {
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("entry promise caches survive superseded rejection and retry authoritative rejection", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];

  globalThis.fetch = () => {
    const response = responses.shift();
    if (!response) throw new Error("unexpected_entry_retry");
    return response.promise;
  };

  try {
    resetCaches("entry-abc");
    const a = createDeferred<Response>();
    const b = createDeferred<Response>();
    const c = createDeferred<Response>();
    responses.push(a, b, c);
    const requestA = listEntriesCached("entry-abc");
    const requestB = listEntriesCached("entry-abc", { force: true });
    const requestC = listEntriesCached("entry-abc", { force: true });
    expect(listEntriesCached("entry-abc")).toBe(requestC);

    b.reject(new Error("superseded-b"));
    await expect(requestB).rejects.toThrow("superseded-b");
    expect(listEntriesCached("entry-abc")).toBe(requestC);
    a.resolve(jsonResponse([entrySummary("stale-a")]));
    await requestA;
    expect(getCachedEntries("entry-abc")).toBeNull();
    c.resolve(jsonResponse([entrySummary("authoritative-c")]));
    await requestC;
    expect(getCachedEntries("entry-abc")?.[0]?.id).toBe("authoritative-c");

    clearEntriesCache("entry-retry");
    const rejected = createDeferred<Response>();
    const retried = createDeferred<Response>();
    responses.push(rejected, retried);
    const failed = listEntriesCached("entry-retry");
    rejected.reject(new Error("authoritative-failure"));
    await expect(failed).rejects.toThrow("authoritative-failure");
    const retry = listEntriesCached("entry-retry");
    expect(retry).not.toBe(failed);
    retried.resolve(jsonResponse([entrySummary("retried")]));
    await retry;
    expect(getCachedEntries("entry-retry")?.[0]?.id).toBe("retried");

    clearAllEntriesCache();
    const allA = createDeferred<Response>();
    const allB = createDeferred<Response>();
    const allC = createDeferred<Response>();
    responses.push(allA, allB, allC);
    const allRequestA = listAllEntriesCached();
    const allRequestB = listAllEntriesCached({ force: true });
    const allRequestC = listAllEntriesCached({ force: true });
    allB.reject(new Error("superseded-all-b"));
    await expect(allRequestB).rejects.toThrow("superseded-all-b");
    expect(listAllEntriesCached()).toBe(allRequestC);
    allA.resolve(jsonResponse([allEntryItem("stale-all-a")]));
    await allRequestA;
    allC.resolve(jsonResponse([allEntryItem("authoritative-all-c")]));
    await allRequestC;
    expect(getCachedAllEntries()?.[0]?.id).toBe("authoritative-all-c");

    clearAllEntriesCache();
    const allRejected = createDeferred<Response>();
    const allRetried = createDeferred<Response>();
    responses.push(allRejected, allRetried);
    const allFailed = listAllEntriesCached();
    allRejected.reject(new Error("authoritative-all-failure"));
    await expect(allFailed).rejects.toThrow("authoritative-all-failure");
    const allRetry = listAllEntriesCached();
    expect(allRetry).not.toBe(allFailed);
    allRetried.resolve(jsonResponse([allEntryItem("all-retried")]));
    await allRetry;
    expect(getCachedAllEntries()?.[0]?.id).toBe("all-retried");
  } finally {
    clearEntriesCache("entry-abc");
    clearEntriesCache("entry-retry");
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("every entry upsert path revokes a late read with present and absent list caches", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();
  const operations = [
    {
      name: "create",
      run: (typeSlug: string) =>
        createEntry(typeSlug, { title: "Mutation", slug: "mutation", data: {} }),
    },
    {
      name: "update",
      run: (typeSlug: string) => updateEntry(typeSlug, "entry-target", { title: "Mutation" }),
    },
    {
      name: "metadata",
      run: (typeSlug: string) =>
        updateEntryMetadata(typeSlug, "entry-target", { status: "published" }),
    },
    {
      name: "duplicate",
      run: (typeSlug: string) => duplicateEntry(typeSlug, "entry-source"),
    },
  ];

  try {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        const typeSlug = `upsert-${cacheState}-${operation.name}`;
        const pendingRead = createDeferred<Response>();
        const mutated = entryDetail("entry-target", `Mutation ${operation.name}`, "published");
        let listReads = 0;
        resetCsrfToken();
        resetCaches(typeSlug);
        if (cacheState === "present") {
          storage.setItem(
            cacheKeys.entriesList(typeSlug),
            JSON.stringify({
              value: [entrySummary("entry-target", "Before"), entrySummary("entry-other")],
              savedAt: Date.now(),
            })
          );
          expect(getCachedEntries(typeSlug)).toHaveLength(2);
        }

        globalThis.fetch = (input, init) => {
          const url = String(input);
          if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
          if (init?.method === "GET" && url.endsWith(`/content/${typeSlug}/entries`)) {
            listReads += 1;
            return pendingRead.promise;
          }
          return Promise.resolve(jsonResponse(mutated));
        };

        const staleRead = listEntriesCached(typeSlug, { force: cacheState === "present" });
        await operation.run(typeSlug);
        expect(getCachedEntries(typeSlug)?.[0]?.title).toBe(`Mutation ${operation.name}`);
        if (cacheState === "present") expect(getCachedEntries(typeSlug)).toHaveLength(2);
        else expect(getCachedEntries(typeSlug)).toHaveLength(1);

        pendingRead.resolve(jsonResponse([entrySummary("stale-server-row")]));
        await staleRead;
        expect(getCachedEntries(typeSlug)?.some((entry) => entry.id === "stale-server-row")).toBe(
          false
        );
        await expect(listEntriesCached(typeSlug)).resolves.toEqual(getCachedEntries(typeSlug));
        expect(listReads).toBe(1);
        clearEntriesCache(typeSlug);
      }
    }
  } finally {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        clearEntriesCache(`upsert-${cacheState}-${operation.name}`);
      }
    }
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("publish and unpublish revoke late reads without inventing absent list caches", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();
  const operations = [
    { name: "publish", expected: "published" as const, run: publishEntry },
    { name: "unpublish", expected: "draft" as const, run: unpublishEntry },
  ];

  try {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        const typeSlug = `status-${cacheState}-${operation.name}`;
        const pendingRead = createDeferred<Response>();
        resetCsrfToken();
        resetCaches(typeSlug);
        if (cacheState === "present") {
          storage.setItem(
            cacheKeys.entriesList(typeSlug),
            JSON.stringify({
              value: [
                entrySummary(
                  "entry-target",
                  "Before",
                  operation.name === "publish" ? "draft" : "published"
                ),
              ],
              savedAt: Date.now(),
            })
          );
          expect(getCachedEntries(typeSlug)).toHaveLength(1);
        }

        globalThis.fetch = (input, init) => {
          const url = String(input);
          if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
          if (init?.method === "GET") return pendingRead.promise;
          return Promise.resolve(jsonResponse({ ok: true }));
        };

        const staleRead = listEntriesCached(typeSlug, { force: cacheState === "present" });
        await operation.run(typeSlug, "entry-target");
        if (cacheState === "present") {
          expect(getCachedEntries(typeSlug)?.[0]?.status).toBe(operation.expected);
        } else {
          expect(getCachedEntries(typeSlug)).toBeNull();
        }

        pendingRead.resolve(jsonResponse([entrySummary("stale-status-row")]));
        await staleRead;
        if (cacheState === "present") {
          expect(getCachedEntries(typeSlug)?.[0]?.status).toBe(operation.expected);
        } else {
          expect(getCachedEntries(typeSlug)).toBeNull();
        }
        clearEntriesCache(typeSlug);
      }
    }
  } finally {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        clearEntriesCache(`status-${cacheState}-${operation.name}`);
      }
    }
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("delete revokes late reads with and without a current entry list", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();

  try {
    for (const cacheState of ["present", "absent"] as const) {
      const typeSlug = `delete-${cacheState}`;
      const pendingRead = createDeferred<Response>();
      resetCsrfToken();
      resetCaches(typeSlug);
      if (cacheState === "present") {
        storage.setItem(
          cacheKeys.entriesList(typeSlug),
          JSON.stringify({
            value: [entrySummary("entry-target"), entrySummary("entry-keeper")],
            savedAt: Date.now(),
          })
        );
        expect(getCachedEntries(typeSlug)).toHaveLength(2);
      }

      globalThis.fetch = (input, init) => {
        const url = String(input);
        if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
        if (init?.method === "GET") return pendingRead.promise;
        return Promise.resolve(jsonResponse({ ok: true }));
      };

      const staleRead = listEntriesCached(typeSlug, { force: cacheState === "present" });
      await deleteEntry(typeSlug, "entry-target");
      if (cacheState === "present") {
        expect(getCachedEntries(typeSlug)?.map((entry) => entry.id)).toEqual(["entry-keeper"]);
      } else {
        expect(getCachedEntries(typeSlug)).toBeNull();
      }

      pendingRead.resolve(jsonResponse([entrySummary("stale-deleted-row")]));
      await staleRead;
      if (cacheState === "present") {
        expect(getCachedEntries(typeSlug)?.map((entry) => entry.id)).toEqual(["entry-keeper"]);
      } else {
        expect(getCachedEntries(typeSlug)).toBeNull();
      }
      clearEntriesCache(typeSlug);
    }
  } finally {
    clearEntriesCache("delete-present");
    clearEntriesCache("delete-absent");
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("a rejected entry mutation leaves the authoritative pending read untouched", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const pendingRead = createDeferred<Response>();
  const typeSlug = "rejected-mutation";

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
    if (init?.method === "GET") return pendingRead.promise;
    return Promise.resolve(
      jsonResponse({ error: { code: "entry_update_failed", message: "failed" } }, 500)
    );
  };

  try {
    resetCsrfToken();
    resetCaches(typeSlug);
    const pending = listEntriesCached(typeSlug);
    await expect(updateEntry(typeSlug, "entry-target", { title: "Rejected" })).rejects.toThrow(
      "failed"
    );
    expect(listEntriesCached(typeSlug)).toBe(pending);
    pendingRead.resolve(jsonResponse([entrySummary("authoritative-after-rejection")]));
    await pending;
    expect(getCachedEntries(typeSlug)?.[0]?.id).toBe("authoritative-after-rejection");
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("per-type entry A/B/C authority survives C-first success and C rejection followed by D", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];
  let transportCalls = 0;

  globalThis.fetch = () => {
    transportCalls += 1;
    const response = responses.shift();
    if (!response) throw new Error("unexpected_per_type_matrix_read");
    return response.promise;
  };

  try {
    const cFirstSlug = "entry-matrix-c-first";
    resetCaches(cFirstSlug);
    const firstA = createDeferred<Response>();
    const firstB = createDeferred<Response>();
    const firstC = createDeferred<Response>();
    responses.push(firstA, firstB, firstC);
    const firstRequestA = listEntriesCached(cFirstSlug);
    const firstRequestB = listEntriesCached(cFirstSlug, { force: true });
    const firstRequestC = listEntriesCached(cFirstSlug, { force: true });
    expect(listEntriesCached(cFirstSlug)).toBe(firstRequestC);

    firstC.resolve(jsonResponse([entrySummary("entry-c-first")]));
    await firstRequestC;
    expect(getCachedEntries(cFirstSlug)?.[0]?.id).toBe("entry-c-first");

    firstA.resolve(jsonResponse([entrySummary("entry-a-late-success")]));
    await firstRequestA;
    const firstBRejection = expect(firstRequestB).rejects.toThrow("entry-b-late-rejection");
    firstB.reject(new Error("entry-b-late-rejection"));
    await firstBRejection;
    expect(getCachedEntries(cFirstSlug)?.[0]?.id).toBe("entry-c-first");
    expect(transportCalls).toBe(3);

    const retrySlug = "entry-matrix-c-retry";
    clearEntriesCache(retrySlug);
    const retryA = createDeferred<Response>();
    const retryB = createDeferred<Response>();
    const retryC = createDeferred<Response>();
    const retryD = createDeferred<Response>();
    responses.push(retryA, retryB, retryC, retryD);
    const retryRequestA = listEntriesCached(retrySlug);
    const retryRequestB = listEntriesCached(retrySlug, { force: true });
    const retryRequestC = listEntriesCached(retrySlug, { force: true });
    expect(listEntriesCached(retrySlug)).toBe(retryRequestC);

    const cRejection = expect(retryRequestC).rejects.toThrow("entry-c-authoritative-rejection");
    retryC.reject(new Error("entry-c-authoritative-rejection"));
    await cRejection;
    const retryRequestD = listEntriesCached(retrySlug);
    expect(retryRequestD).not.toBe(retryRequestC);

    retryB.resolve(jsonResponse([entrySummary("entry-b-late-success")]));
    await retryRequestB;
    expect(getCachedEntries(retrySlug)).toBeNull();
    expect(listEntriesCached(retrySlug)).toBe(retryRequestD);
    const aRejection = expect(retryRequestA).rejects.toThrow("entry-a-late-rejection");
    retryA.reject(new Error("entry-a-late-rejection"));
    await aRejection;
    expect(getCachedEntries(retrySlug)).toBeNull();
    expect(listEntriesCached(retrySlug)).toBe(retryRequestD);

    retryD.resolve(jsonResponse([entrySummary("entry-d-authoritative")]));
    await retryRequestD;
    expect(getCachedEntries(retrySlug)?.[0]?.id).toBe("entry-d-authoritative");
    expect(transportCalls).toBe(7);
  } finally {
    clearEntriesCache("entry-matrix-c-first");
    clearEntriesCache("entry-matrix-c-retry");
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("all-entry A/B/C authority survives C-first success and C rejection followed by D", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];
  let transportCalls = 0;

  globalThis.fetch = () => {
    transportCalls += 1;
    const response = responses.shift();
    if (!response) throw new Error("unexpected_all_entry_matrix_read");
    return response.promise;
  };

  try {
    clearAllEntriesCache();
    const firstA = createDeferred<Response>();
    const firstB = createDeferred<Response>();
    const firstC = createDeferred<Response>();
    responses.push(firstA, firstB, firstC);
    const firstRequestA = listAllEntriesCached();
    const firstRequestB = listAllEntriesCached({ force: true });
    const firstRequestC = listAllEntriesCached({ force: true });
    expect(listAllEntriesCached()).toBe(firstRequestC);

    firstC.resolve(jsonResponse([allEntryItem("all-c-first")]));
    await firstRequestC;
    expect(getCachedAllEntries()?.[0]?.id).toBe("all-c-first");
    firstA.resolve(jsonResponse([allEntryItem("all-a-late-success")]));
    await firstRequestA;
    const firstBRejection = expect(firstRequestB).rejects.toThrow("all-b-late-rejection");
    firstB.reject(new Error("all-b-late-rejection"));
    await firstBRejection;
    expect(getCachedAllEntries()?.[0]?.id).toBe("all-c-first");
    expect(transportCalls).toBe(3);

    clearAllEntriesCache();
    const retryA = createDeferred<Response>();
    const retryB = createDeferred<Response>();
    const retryC = createDeferred<Response>();
    const retryD = createDeferred<Response>();
    responses.push(retryA, retryB, retryC, retryD);
    const retryRequestA = listAllEntriesCached();
    const retryRequestB = listAllEntriesCached({ force: true });
    const retryRequestC = listAllEntriesCached({ force: true });
    expect(listAllEntriesCached()).toBe(retryRequestC);

    const cRejection = expect(retryRequestC).rejects.toThrow("all-c-authoritative-rejection");
    retryC.reject(new Error("all-c-authoritative-rejection"));
    await cRejection;
    const retryRequestD = listAllEntriesCached();
    expect(retryRequestD).not.toBe(retryRequestC);

    retryB.resolve(jsonResponse([allEntryItem("all-b-late-success")]));
    await retryRequestB;
    expect(getCachedAllEntries()).toBeNull();
    expect(listAllEntriesCached()).toBe(retryRequestD);
    const aRejection = expect(retryRequestA).rejects.toThrow("all-a-late-rejection");
    retryA.reject(new Error("all-a-late-rejection"));
    await aRejection;
    expect(getCachedAllEntries()).toBeNull();
    expect(listAllEntriesCached()).toBe(retryRequestD);

    retryD.resolve(jsonResponse([allEntryItem("all-d-authoritative")]));
    await retryRequestD;
    expect(getCachedAllEntries()?.[0]?.id).toBe("all-d-authoritative");
    expect(transportCalls).toBe(7);
  } finally {
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});
