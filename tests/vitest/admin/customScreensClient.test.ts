import { afterEach, expect, test, vi } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys, cacheTtlMs } from "../../../core/admin/services/cachePolicy";
import {
  clearCustomScreensCache,
  createCustomScreen,
  deleteCustomScreen,
  getCachedScreenEntryOverrides,
  getCachedCustomScreens,
  getScreenEntryOverridesCached,
  invalidateScreenEntryOverrides,
  listCustomScreens,
  listCustomScreensCached,
  replaceScreenEntryOverrides,
  updateCustomScreen,
  type CustomScreenRecord,
} from "../../../core/admin/services/customScreensClient";
import {
  createCacheEventOperationToken,
  subscribeCacheEvents,
  type CacheEventOperationToken,
  type CacheEventOrigin,
} from "../../../core/admin/utils/cacheBus";

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

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const makeScreen = (overrides: Partial<CustomScreenRecord> = {}): CustomScreenRecord => ({
  id: "screen-1",
  name: "Catalog screen",
  contentTypeId: "ct-1",
  status: "draft",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: false,
  sidebarLabel: null,
  schemaVersion: 1,
  blocks: [],
  bindings: [],
  createdAt: "2026-03-05T00:00:00.000Z",
  updatedAt: "2026-03-05T00:00:00.000Z",
  ...overrides,
});

const transportOverride = (overrides: Record<string, unknown> = {}) => ({
  screenId: "screen-1",
  entryId: "entry-1",
  blockId: "field-1",
  propPath: "textSize",
  value: "xl",
  updatedBy: null,
  createdAt: "2026-06-25T00:00:00.000Z",
  updatedAt: "2026-06-25T00:00:00.000Z",
  ...overrides,
});

afterEach(() => {
  clearCustomScreensCache();
  invalidateScreenEntryOverrides("screen-1", "entry-1");
  vi.useRealTimers();
});

test("listCustomScreens hits GET /custom-screens and normalizes records", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      items: [
        {
          ...makeScreen(),
          showInSidebar: undefined,
          sidebarLabel: undefined,
        },
      ],
    });
  };

  try {
    const result = await listCustomScreens();

    expect(calls[0]?.input).toBe("/admin/api/custom-screens");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result[0]).toMatchObject({
      id: "screen-1",
      showInSidebar: false,
      sidebarLabel: null,
      capabilities: expect.objectContaining({ mode: "collection-only" }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listCustomScreensCached returns fresh memory-backed cache without fetch", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const cached = [makeScreen({ id: "cached-screen" })];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    clearCustomScreensCache();
    await listCustomScreensCached({ force: true });
    clearCustomScreensCache();
    const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
    const storage = createLocalStorage();
    (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
    try {
      storage.setItem(
        cacheKeys.customScreensList,
        JSON.stringify({ value: cached, savedAt: Date.now() })
      );
      const result = await listCustomScreensCached();
      expect(result).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: "cached-screen" })])
      );
      expect(calls).toHaveLength(1);
    } finally {
      if (originalLocal === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("expired custom screen memory yields to fresher storage before network fallback", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [makeScreen({ id: "network-screen" })] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-05T00:00:00.000Z"));
    clearCustomScreensCache();
    await listCustomScreensCached({ force: true });

    vi.setSystemTime(new Date(Date.now() + 1000));
    storage.setItem(
      cacheKeys.customScreensList,
      JSON.stringify({
        value: [makeScreen({ id: "storage-screen", name: "Storage screen" })],
        savedAt: Date.now(),
      })
    );

    vi.setSystemTime(new Date(Date.now() + cacheTtlMs.list));
    const result = await listCustomScreensCached();

    expect(result[0]?.id).toBe("storage-screen");
    expect(getCachedCustomScreens()?.[0]?.name).toBe("Storage screen");
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("custom screen mutations use CSRF and update cache", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/custom-screens") && init?.method === "POST") {
      return jsonResponse(makeScreen({ id: "created-screen" }));
    }
    if (url.endsWith("/custom-screens/created-screen") && init?.method === "PATCH") {
      return jsonResponse(makeScreen({ id: "created-screen", status: "active" }));
    }
    if (url.endsWith("/custom-screens/created-screen") && init?.method === "DELETE") {
      return jsonResponse({ ok: true });
    }
    return jsonResponse({}, 404);
  };

  try {
    resetCsrfToken();
    clearCustomScreensCache();

    await createCustomScreen({
      name: "Catalog screen",
      contentTypeId: "ct-1",
    });
    await updateCustomScreen("created-screen", { status: "active" });
    expect(getCachedCustomScreens()?.[0]?.status).toBe("active");
    await deleteCustomScreen("created-screen");
    expect(getCachedCustomScreens()).toEqual([]);

    const csrfHeaders = calls
      .slice(1)
      .map((call) => new Headers(call.init?.headers).get("X-CSRF-Token"));
    expect(csrfHeaders).toContain("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("custom screen mutations correlate only their local cache events without serializing tokens", async () => {
  const originalFetch = globalThis.fetch;
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const events: Array<{
    event: { key: string; action: string; sourceId: string; ts: number };
    origin: CacheEventOrigin;
    operationToken?: CacheEventOperationToken;
  }> = [];
  const createToken = createCacheEventOperationToken();
  const updateToken = createCacheEventOperationToken();

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  const unsubscribe = subscribeCacheEvents((event, origin, operationToken) => {
    events.push({ event, origin, operationToken });
  });
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/custom-screens") && init?.method === "POST") {
      return jsonResponse(makeScreen({ id: "correlated-screen" }));
    }
    if (url.endsWith("/custom-screens/correlated-screen") && init?.method === "PATCH") {
      return jsonResponse(makeScreen({ id: "correlated-screen", name: "Updated screen" }));
    }
    return jsonResponse({}, 404);
  };

  try {
    resetCsrfToken();
    clearCustomScreensCache();

    await createCustomScreen(
      { name: "Catalog screen", contentTypeId: "ct-1" },
      { cacheEventOperationToken: createToken }
    );
    await updateCustomScreen(
      "correlated-screen",
      { name: "Updated screen" },
      { cacheEventOperationToken: updateToken }
    );

    expect(events).toHaveLength(4);
    expect(
      events.map(({ event, origin, operationToken }) => ({
        key: event.key,
        origin,
        operationToken,
      }))
    ).toEqual([
      { key: cacheKeys.customScreensList, origin: "local", operationToken: createToken },
      {
        key: cacheKeys.customScreenDetail("correlated-screen"),
        origin: "local",
        operationToken: createToken,
      },
      { key: cacheKeys.customScreensList, origin: "local", operationToken: updateToken },
      {
        key: cacheKeys.customScreenDetail("correlated-screen"),
        origin: "local",
        operationToken: updateToken,
      },
    ]);
    expect(
      events.every(({ event }) => Object.keys(event).sort().join(",") === "action,key,sourceId,ts")
    ).toBe(true);

    const postCall = calls.find(
      (call) => String(call.input).endsWith("/custom-screens") && call.init?.method === "POST"
    );
    const patchCall = calls.find(
      (call) =>
        String(call.input).endsWith("/custom-screens/correlated-screen") &&
        call.init?.method === "PATCH"
    );
    expect(JSON.parse(String(postCall?.init?.body))).toEqual({
      name: "Catalog screen",
      contentTypeId: "ct-1",
    });
    expect(JSON.parse(String(patchCall?.init?.body))).toEqual({ name: "Updated screen" });

    const serializedEvent = storage.getItem("coderso.admin.cache.event");
    expect(Object.keys(JSON.parse(serializedEvent ?? "{}")).sort()).toEqual([
      "action",
      "key",
      "sourceId",
      "ts",
    ]);
    expect(serializedEvent).not.toContain("operationToken");
    expect(storage.getItem(cacheKeys.customScreensList)).not.toContain("operationToken");
    expect(storage.getItem(cacheKeys.customScreenDetail("correlated-screen"))).not.toContain(
      "operationToken"
    );
    expect(JSON.stringify(getCachedCustomScreens())).not.toContain("operationToken");
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
  }
});

test("screen entry override cache hydrates from local storage and respects TTL", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      overrides: [transportOverride()],
    });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-25T00:00:00.000Z"));
    storage.setItem(
      cacheKeys.customScreenEntryOverrides("screen-1", "entry-1"),
      JSON.stringify({
        value: [{ blockId: "field-1", propPath: "textSize", value: "lg" }],
        savedAt: Date.now(),
      })
    );

    const cached = await getScreenEntryOverridesCached("screen-1", "entry-1");
    expect(cached).toEqual([{ blockId: "field-1", propPath: "textSize", value: "lg" }]);
    expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toEqual(cached);
    expect(calls).toHaveLength(0);

    vi.setSystemTime(new Date(Date.now() + cacheTtlMs.detail + 1));
    const refreshed = await getScreenEntryOverridesCached("screen-1", "entry-1");

    expect(refreshed).toEqual([{ blockId: "field-1", propPath: "textSize", value: "xl" }]);
    expect(calls[0]?.input).toBe("/admin/api/custom-screens/screen-1/entries/entry-1/overrides");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("replaceScreenEntryOverrides uses CSRF, writes cache, and broadcasts update", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const events: Array<{ key: string; action: string }> = [];
  const unsubscribe = subscribeCacheEvents((event) => {
    events.push({ key: event.key, action: event.action });
  });

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/custom-screens/screen-1/entries/entry-1/overrides")) {
      return jsonResponse({
        overrides: [
          {
            screenId: "screen-1",
            entryId: "entry-1",
            blockId: "field-1",
            propPath: "tone",
            value: "muted",
            updatedBy: null,
            createdAt: "2026-06-25T00:00:00.000Z",
            updatedAt: "2026-06-25T00:00:00.000Z",
          },
        ],
      });
    }
    return jsonResponse({}, 404);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCsrfToken();
    const result = await replaceScreenEntryOverrides("screen-1", "entry-1", [
      { blockId: "field-1", propPath: "tone", value: "muted" },
    ]);

    const patchCall = calls.find((call) =>
      String(call.input).endsWith("/custom-screens/screen-1/entries/entry-1/overrides")
    );
    expect(patchCall?.init?.method).toBe("PATCH");
    expect(new Headers(patchCall?.init?.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(patchCall?.init?.body).toBe(
      JSON.stringify({ overrides: [{ blockId: "field-1", propPath: "tone", value: "muted" }] })
    );
    expect(result).toEqual([{ blockId: "field-1", propPath: "tone", value: "muted" }]);
    expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toEqual(result);
    expect(events).toEqual(
      expect.arrayContaining([
        {
          key: cacheKeys.customScreenEntryOverrides("screen-1", "entry-1"),
          action: "update",
        },
      ])
    );
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("screen entry override GET shares exact pending promise identity and retries after rejection", async () => {
  const originalFetch = globalThis.fetch;
  const first = deferred<Response>();
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) return first.promise;
    return jsonResponse({ overrides: [transportOverride({ value: "lg" })] });
  }) as typeof fetch;

  try {
    invalidateScreenEntryOverrides("screen-1", "entry-1");
    const requestA = getScreenEntryOverridesCached("screen-1", "entry-1");
    const requestB = getScreenEntryOverridesCached("screen-1", "entry-1");
    expect(requestB).toBe(requestA);
    first.reject(new Error("network down"));
    await expect(requestA).rejects.toThrow();

    await expect(getScreenEntryOverridesCached("screen-1", "entry-1")).resolves.toEqual([
      { blockId: "field-1", propPath: "textSize", value: "lg" },
    ]);
    expect(calls).toBe(2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test.each(["old-first", "new-first"] as const)(
  "forced replacement publishes only the newest override request (%s)",
  async (order) => {
    const originalFetch = globalThis.fetch;
    const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
    (globalThis as { localStorage?: unknown }).localStorage = createLocalStorage() as unknown;
    const requestA = deferred<Response>();
    const requestB = deferred<Response>();
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return calls === 1 ? requestA.promise : requestB.promise;
    }) as typeof fetch;

    try {
      invalidateScreenEntryOverrides("screen-1", "entry-1");
      const promiseA = getScreenEntryOverridesCached("screen-1", "entry-1", { force: true });
      const promiseB = getScreenEntryOverridesCached("screen-1", "entry-1", { force: true });
      const responseA = jsonResponse({ overrides: [transportOverride({ value: "lg" })] });
      const responseB = jsonResponse({ overrides: [transportOverride({ value: "2xl" })] });
      if (order === "old-first") {
        requestA.resolve(responseA);
        await promiseA;
        expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toBeNull();
        requestB.resolve(responseB);
        await promiseB;
      } else {
        requestB.resolve(responseB);
        await promiseB;
        requestA.resolve(responseA);
        await promiseA;
      }
      expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toEqual([
        { blockId: "field-1", propPath: "textSize", value: "2xl" },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalLocal === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
      }
    }
  }
);

test("malformed cached or transport rows fail closed without partial recovery", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  let response: unknown = { overrides: [transportOverride({ value: "lg" })] };
  globalThis.fetch = async () => jsonResponse(response);
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    const key = cacheKeys.customScreenEntryOverrides("screen-1", "entry-1");
    storage.setItem(
      key,
      JSON.stringify({
        value: [
          { blockId: "field-1", propPath: "tone", value: "muted" },
          { blockId: "unsafe", propPath: "tone", value: "muted", extra: true },
        ],
        savedAt: Date.now(),
      })
    );
    await expect(getScreenEntryOverridesCached("screen-1", "entry-1")).resolves.toEqual([
      { blockId: "field-1", propPath: "textSize", value: "lg" },
    ]);

    invalidateScreenEntryOverrides("screen-1", "entry-1");
    response = {
      overrides: [transportOverride(), transportOverride({ blockId: "__proto__" })],
    };
    await expect(
      getScreenEntryOverridesCached("screen-1", "entry-1", { force: true })
    ).rejects.toThrow("custom_screen_override_invalid");
    expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toBeNull();

    response = { overrides: [transportOverride()], extra: true };
    await expect(
      getScreenEntryOverridesCached("screen-1", "entry-1", { force: true })
    ).rejects.toThrow("custom_screen_override_invalid");
    expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toBeNull();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("media UUID overrides survive strict storage and transport cache round trips", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const mediaId = "55555555-5555-4555-8555-555555555555";
  const key = cacheKeys.customScreenEntryOverrides("screen-1", "entry-1");
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  globalThis.fetch = async () =>
    jsonResponse({
      overrides: [transportOverride({ propPath: "mediaAssetId", value: mediaId })],
    });

  try {
    storage.setItem(
      key,
      JSON.stringify({
        value: [{ blockId: "field-1", propPath: "mediaAssetId", value: mediaId }],
        savedAt: Date.now(),
      })
    );
    await expect(getScreenEntryOverridesCached("screen-1", "entry-1")).resolves.toEqual([
      { blockId: "field-1", propPath: "mediaAssetId", value: mediaId },
    ]);

    invalidateScreenEntryOverrides("screen-1", "entry-1");
    await expect(
      getScreenEntryOverridesCached("screen-1", "entry-1", { force: true })
    ).resolves.toEqual([{ blockId: "field-1", propPath: "mediaAssetId", value: mediaId }]);
    expect(JSON.parse(storage.getItem(key) ?? "null")).toMatchObject({
      value: [{ blockId: "field-1", propPath: "mediaAssetId", value: mediaId }],
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("every malformed override response rejects atomically without cache write or broadcast", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const key = cacheKeys.customScreenEntryOverrides("screen-1", "entry-1");
  const events: Array<{ key: string; action: string }> = [];
  const unsubscribe = subscribeCacheEvents((event) => {
    events.push({ key: event.key, action: event.action });
  });
  let response: unknown;
  globalThis.fetch = async () => jsonResponse(response);
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  const malformedResponses: unknown[] = [
    {},
    { overrides: null },
    { overrides: Array.from({ length: 201 }, () => transportOverride()) },
    { overrides: [transportOverride({ propPath: "unknown" })] },
    {
      overrides: [transportOverride({ propPath: "mediaAssetId", value: "not-a-media-uuid" })],
    },
    { overrides: [transportOverride({ createdAt: "2026-06-25T00:00:00Z" })] },
    { overrides: [transportOverride({ updatedBy: "not-a-uuid" })] },
    { overrides: [{ ...transportOverride(), updatedAt: undefined }] },
    { overrides: [transportOverride()], unknown: true },
  ];

  try {
    for (const malformed of malformedResponses) {
      invalidateScreenEntryOverrides("screen-1", "entry-1");
      storage.removeItem(key);
      events.length = 0;
      response = malformed;
      await expect(
        getScreenEntryOverridesCached("screen-1", "entry-1", { force: true })
      ).rejects.toThrow("custom_screen_override_invalid");
      expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toBeNull();
      expect(storage.getItem(key)).toBeNull();
      expect(events).toEqual([]);
    }
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("successful PATCH revokes a pre-write GET so its late result cannot overwrite", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  (globalThis as { localStorage?: unknown }).localStorage = createLocalStorage() as unknown;
  const pendingGet = deferred<Response>();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (init?.method === "GET") return pendingGet.promise;
    if (init?.method === "PATCH") {
      return jsonResponse({
        overrides: [transportOverride({ propPath: "tone", value: "strong" })],
      });
    }
    return jsonResponse({}, 404);
  }) as typeof fetch;

  try {
    resetCsrfToken();
    invalidateScreenEntryOverrides("screen-1", "entry-1");
    const oldRead = getScreenEntryOverridesCached("screen-1", "entry-1", { force: true });
    const saved = await replaceScreenEntryOverrides("screen-1", "entry-1", [
      { blockId: "field-1", propPath: "tone", value: "strong" },
    ]);
    expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toEqual(saved);

    pendingGet.resolve(
      jsonResponse({ overrides: [transportOverride({ propPath: "tone", value: "muted" })] })
    );
    await oldRead;
    expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toEqual(saved);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("successful PATCH revokes a forced pending GET over an already primed cache", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  (globalThis as { localStorage?: unknown }).localStorage = createLocalStorage() as unknown;
  const pendingGet = deferred<Response>();
  let getCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (init?.method === "GET") {
      getCalls += 1;
      if (getCalls === 1) {
        return jsonResponse({ overrides: [transportOverride({ value: "lg" })] });
      }
      return pendingGet.promise;
    }
    if (init?.method === "PATCH") {
      return jsonResponse({
        overrides: [transportOverride({ propPath: "tone", value: "strong" })],
      });
    }
    return jsonResponse({}, 404);
  }) as typeof fetch;

  try {
    resetCsrfToken();
    invalidateScreenEntryOverrides("screen-1", "entry-1");
    await getScreenEntryOverridesCached("screen-1", "entry-1", { force: true });
    expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toEqual([
      { blockId: "field-1", propPath: "textSize", value: "lg" },
    ]);
    const oldRead = getScreenEntryOverridesCached("screen-1", "entry-1", { force: true });
    const saved = await replaceScreenEntryOverrides("screen-1", "entry-1", [
      { blockId: "field-1", propPath: "tone", value: "strong" },
    ]);
    pendingGet.resolve(
      jsonResponse({ overrides: [transportOverride({ propPath: "tone", value: "muted" })] })
    );
    await oldRead;
    expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toEqual(saved);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("rejected PATCH neither revokes a pending GET nor primes or broadcasts a value", async () => {
  const originalFetch = globalThis.fetch;
  const pendingGet = deferred<Response>();
  const events: Array<{ key: string; action: string }> = [];
  const unsubscribe = subscribeCacheEvents((event) => {
    events.push({ key: event.key, action: event.action });
  });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (init?.method === "GET") return pendingGet.promise;
    if (init?.method === "PATCH") {
      return jsonResponse({ error: "custom_screen_override_conflict" }, 409);
    }
    return jsonResponse({}, 404);
  }) as typeof fetch;

  try {
    resetCsrfToken();
    invalidateScreenEntryOverrides("screen-1", "entry-1");
    events.length = 0;
    const pending = getScreenEntryOverridesCached("screen-1", "entry-1", { force: true });
    await expect(
      replaceScreenEntryOverrides("screen-1", "entry-1", [
        { blockId: "field-1", propPath: "tone", value: "strong" },
      ])
    ).rejects.toThrow();
    expect(getScreenEntryOverridesCached("screen-1", "entry-1")).toBe(pending);
    expect(getCachedScreenEntryOverrides("screen-1", "entry-1")).toBeNull();
    expect(events).toEqual([]);

    pendingGet.resolve(jsonResponse({ overrides: [transportOverride()] }));
    await pending;
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
  }
});
