import { expect, test } from "vitest";

import {
  clearAllEntriesCache,
  createEntry,
  deleteEntry,
  duplicateEntry,
  getCachedAllEntries,
  getCachedEntries,
  getCachedEntryDetail,
  getEntry,
  getEntryCached,
  isEntryData,
  isEntryDataValue,
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
import type { EntryData, EntryMetadataPayload } from "../../../core/admin/services/entriesClient";
import { ApiClientError, resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { subscribeCacheEvents, type CacheEvent } from "../../../core/admin/utils/cacheBus";
import { createLocalStorage, jsonResponse, resetCaches } from "./support/entriesClientTestHarness";

test("EntryData preserves arbitrary JSON values across a JSON round trip", () => {
  const source: EntryData = {
    title: "Nested entry",
    published: true,
    score: 4.5,
    empty: null,
    tags: ["one", "two"],
    nested: { layout: { columns: 3 }, flags: [true, false] },
  };
  const parsed: unknown = JSON.parse(JSON.stringify(source));
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;

  expect(isEntryData(parsed)).toBe(true);
  expect(parsed).toEqual(source);
  expect(isEntryDataValue({ invalid: undefined })).toBe(false);
  expect(isEntryDataValue(Number.NaN)).toBe(false);
  expect(isEntryDataValue(Number.POSITIVE_INFINITY)).toBe(false);
  expect(isEntryDataValue(new Array(1))).toBe(false);
  expect(isEntryDataValue(new Date())).toBe(false);
  expect(isEntryDataValue(cyclic)).toBe(false);
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
      data: {
        featured: true,
        sections: [{ title: "Introduction", weight: 1.5 }],
      },
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content/blog/entries");
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({
        title: "Hello",
        slug: "hello",
        data: {
          featured: true,
          sections: [{ title: "Introduction", weight: 1.5 }],
        },
      })
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("entry mutations reject non-JSON-safe data before serialization, CSRF, fetch, or cache", async () => {
  const originalFetch = globalThis.fetch;
  const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const cacheEvents: CacheEvent[] = [];
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  let accessorReads = 0;
  const accessorData: Record<string, unknown> = {};
  Object.defineProperty(accessorData, "score", {
    enumerable: true,
    get() {
      accessorReads += 1;
      throw new Error("entry data accessors must not execute");
    },
  });
  const symbolData: Record<PropertyKey, unknown> = { visible: "kept" };
  symbolData[Symbol("omitted")] = "not serialized";
  const nonEnumerableData: Record<string, unknown> = { visible: "kept" };
  Object.defineProperty(nonEnumerableData, "omitted", {
    enumerable: false,
    value: "not serialized",
  });
  const arrayWithExtraProperty = ["kept"] as string[] & { omitted?: string };
  arrayWithExtraProperty.omitted = "not serialized";
  let customArrayToJsonCalls = 0;
  const customPrototypeArray = ["kept"];
  Object.setPrototypeOf(customPrototypeArray, {
    toJSON() {
      customArrayToJsonCalls += 1;
      return [];
    },
  });
  const invalidCases: Array<{ label: string; data: unknown }> = [
    { label: "missing data", data: undefined },
    { label: "NaN", data: { score: Number.NaN } },
    { label: "positive infinity", data: { score: Number.POSITIVE_INFINITY } },
    { label: "negative infinity", data: { score: Number.NEGATIVE_INFINITY } },
    { label: "sparse array", data: { sections: new Array(1) } },
    { label: "cyclic data", data: cyclic },
    { label: "non-plain data", data: { createdAt: new Date("2026-08-05T00:00:00.000Z") } },
    { label: "accessor data", data: accessorData },
    { label: "symbol-keyed data", data: symbolData },
    { label: "non-enumerable data", data: nonEnumerableData },
    { label: "array extra property", data: { sections: arrayWithExtraProperty } },
    { label: "custom array prototype", data: { sections: customPrototypeArray } },
  ];
  const unsubscribe = subscribeCacheEvents((event) => cacheEvents.push(event));
  globalThis.fetch = async (input, init) => {
    fetchCalls.push({ input, init });
    return jsonResponse({ id: "unexpected" });
  };

  try {
    resetCsrfToken();
    const expectInvalidEntryData = async (request: Promise<unknown>, label: string) => {
      const error = await request.catch((caught: unknown) => caught);
      expect(error, label).toBeInstanceOf(ApiClientError);
      expect(error, label).toMatchObject({
        name: "ApiClientError",
        message: "Entry data is invalid.",
        code: "entry_data_invalid",
        status: 400,
        details: { field: "data" },
        sharedFailureKind: "generic_error",
      });
    };
    for (const invalidCase of invalidCases) {
      const data = invalidCase.data as EntryData;
      await expectInvalidEntryData(
        createEntry("blog", { title: "Invalid", slug: "invalid", data }),
        `create: ${invalidCase.label}`
      );
      await expectInvalidEntryData(
        updateEntry("blog", "entry-1", { data }),
        `update: ${invalidCase.label}`
      );
    }

    expect(accessorReads).toBe(0);
    expect(customArrayToJsonCalls).toBe(0);
    expect(fetchCalls).toEqual([]);
    expect(cacheEvents).toEqual([]);
  } finally {
    unsubscribe();
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
