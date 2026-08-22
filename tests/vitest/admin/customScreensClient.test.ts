import { afterEach, expect, test, vi } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys, cacheTtlMs } from "../../../core/admin/services/cachePolicy";
import {
  clearCustomScreensCache,
  createCustomScreen,
  deleteCustomScreen,
  getCachedCustomScreen,
  getCachedCustomScreens,
  getCustomScreenRawCached,
  invalidateScreenEntryOverrides,
  listCustomScreens,
  listCustomScreensCached,
  updateCustomScreen,
  type CustomScreenSummaryRecord,
} from "../../../core/admin/services/customScreensClient";
import {
  createCacheEventOperationToken,
  subscribeCacheEvents,
  type CacheEventOperationToken,
  type CacheEventOrigin,
} from "../../../core/admin/utils/cacheBus";
import { writeLocalCache } from "../../../core/admin/utils/storageCache";
import {
  createLocalStorage,
  deferred,
  jsonResponse,
  makeScreen,
  resetCustomScreensClientTestState,
} from "./support/customScreensClientTestHarness";

afterEach(() => {
  resetCustomScreensClientTestState({
    clearCustomScreensCache,
    invalidateScreenEntryOverrides,
    restoreRealTimers: () => vi.useRealTimers(),
  });
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
          capabilities: {
            mode: "collection-only",
            hasBlocks: false,
            hasBindings: false,
            hasReadableBindings: false,
            hasWritableBindings: false,
            supportsDedicatedPreview: false,
            supportsDedicatedEditor: false,
            bindingCounts: { total: 0, readable: 0, writable: 0 },
          },
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

test.each(["first-resolves-first", "replacement-resolves-first"] as const)(
  "custom screen detail reads publish only the newest forced request (%s)",
  async (settleOrder) => {
    const originalFetch = globalThis.fetch;
    const first = deferred<Response>();
    const replacement = deferred<Response>();
    let calls = 0;

    globalThis.fetch = () => {
      calls += 1;
      return calls === 1 ? first.promise : replacement.promise;
    };

    try {
      clearCustomScreensCache();
      const requestA = getCustomScreenRawCached("screen-1", { force: true });
      const requestB = getCustomScreenRawCached("screen-1", { force: true });
      expect(requestB).not.toBe(requestA);
      if (settleOrder === "first-resolves-first") {
        first.resolve(jsonResponse(makeScreen({ name: "Stale A" })));
        await requestA;
        expect(getCachedCustomScreens()).toBeNull();
        replacement.resolve(jsonResponse(makeScreen({ name: "Current B" })));
        await requestB;
      } else {
        replacement.resolve(jsonResponse(makeScreen({ name: "Current B" })));
        await requestB;
        first.resolve(jsonResponse(makeScreen({ name: "Stale A" })));
        await requestA;
      }
      expect(getCachedCustomScreens()?.[0]?.name).toBe("Current B");
    } finally {
      clearCustomScreensCache();
      globalThis.fetch = originalFetch;
    }
  }
);

test("successful screen mutation revokes a matching late detail read", async () => {
  const originalFetch = globalThis.fetch;
  const pendingDetail = deferred<Response>();

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
    if (init?.method === "GET") return pendingDetail.promise;
    return Promise.resolve(jsonResponse(makeScreen({ name: "Mutation wins" })));
  };

  try {
    resetCsrfToken();
    clearCustomScreensCache();
    const staleRead = getCustomScreenRawCached("screen-1", { force: true });
    await updateCustomScreen("screen-1", { name: "Mutation wins" });
    pendingDetail.resolve(jsonResponse(makeScreen({ name: "Stale read" })));
    await staleRead;
    expect(getCachedCustomScreens()?.[0]?.name).toBe("Mutation wins");
  } finally {
    clearCustomScreensCache();
    globalThis.fetch = originalFetch;
  }
});

test("custom screen list authority is retryable and ignores superseded forced reads", async () => {
  const originalFetch = globalThis.fetch;
  const first = deferred<Response>();
  const replacement = deferred<Response>();
  const retry = deferred<Response>();
  let calls = 0;

  globalThis.fetch = () => {
    calls += 1;
    if (calls === 1) return first.promise;
    if (calls === 2) return replacement.promise;
    return retry.promise;
  };

  try {
    clearCustomScreensCache();
    const requestA = listCustomScreensCached();
    expect(listCustomScreensCached()).toBe(requestA);
    const requestB = listCustomScreensCached({ force: true });
    first.resolve(jsonResponse({ items: [makeScreen({ name: "Stale A" })] }));
    await requestA;
    expect(getCachedCustomScreens()).toBeNull();
    replacement.reject(new Error("temporary"));
    await expect(requestB).rejects.toThrow("temporary");
    const requestC = listCustomScreensCached();
    retry.resolve(jsonResponse({ items: [makeScreen({ name: "Recovered C" })] }));
    await requestC;
    expect(getCachedCustomScreens()?.[0]?.name).toBe("Recovered C");
    expect(calls).toBe(3);
  } finally {
    clearCustomScreensCache();
    globalThis.fetch = originalFetch;
  }
});

test("custom screen detail authority shares non-force work and retries after rejection", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = () => {
    calls += 1;
    if (calls <= 2) return Promise.reject(new Error("temporary detail failure"));
    return Promise.resolve(jsonResponse(makeScreen({ id: "screen-retry", name: "Recovered" })));
  };

  try {
    clearCustomScreensCache();
    const failed = getCustomScreenRawCached("screen-retry");
    expect(getCustomScreenRawCached("screen-retry")).toBe(failed);
    await expect(failed).rejects.toThrow("temporary detail failure");

    const retried = getCustomScreenRawCached("screen-retry");
    await expect(retried).resolves.toMatchObject({ id: "screen-retry", name: "Recovered" });
    expect(getCachedCustomScreen("screen-retry")?.name).toBe("Recovered");
    expect(calls).toBe(3);
  } finally {
    clearCustomScreensCache();
    globalThis.fetch = originalFetch;
  }
});

test.each([
  ["detail-first", "older-first"],
  ["detail-first", "newer-first"],
  ["list-first", "older-first"],
  ["list-first", "newer-first"],
] as const)(
  "list/detail publication is start-ordered and preserves unrelated screens (%s, %s)",
  async (startOrder, settleOrder) => {
    const originalFetch = globalThis.fetch;
    const detailTransport = deferred<Response>();
    const listTransport = deferred<Response>();
    const targetId = "Screen-MiXeD-123";
    const detailValue = makeScreen({ id: targetId, name: "Detail authority" });
    const listValue = makeScreen({ id: targetId, name: "List authority" });
    const unrelated = makeScreen({ id: "screen-unrelated", name: "Unrelated" });

    globalThis.fetch = (input) =>
      String(input).endsWith(`/custom-screens/${targetId}`)
        ? detailTransport.promise
        : listTransport.promise;

    try {
      clearCustomScreensCache();
      const detailRequest =
        startOrder === "detail-first"
          ? getCustomScreenRawCached(targetId, { force: true })
          : undefined;
      const listRequest = listCustomScreensCached({ force: true });
      const startedDetail = detailRequest ?? getCustomScreenRawCached(targetId, { force: true });

      const firstRequest = startOrder === "detail-first" ? startedDetail : listRequest;
      const secondRequest = startOrder === "detail-first" ? listRequest : startedDetail;
      const resolveFirst = () => {
        if (startOrder === "detail-first") detailTransport.resolve(jsonResponse(detailValue));
        else listTransport.resolve(jsonResponse({ items: [listValue, unrelated] }));
      };
      const resolveSecond = () => {
        if (startOrder === "detail-first") {
          listTransport.resolve(jsonResponse({ items: [listValue, unrelated] }));
        } else {
          detailTransport.resolve(jsonResponse(detailValue));
        }
      };

      if (settleOrder === "older-first") {
        resolveFirst();
        await firstRequest;
        resolveSecond();
        await secondRequest;
      } else {
        resolveSecond();
        await secondRequest;
        resolveFirst();
        await firstRequest;
      }

      const expectedTargetName =
        startOrder === "detail-first" ? "List authority" : "Detail authority";
      expect(getCachedCustomScreens()?.find((item) => item.id === targetId)?.name).toBe(
        expectedTargetName
      );
      expect(getCachedCustomScreens()?.find((item) => item.id === unrelated.id)?.name).toBe(
        "Unrelated"
      );
      expect(getCachedCustomScreen(targetId)?.name).toBe(expectedTargetName);
    } finally {
      clearCustomScreensCache();
      globalThis.fetch = originalFetch;
    }
  }
);

test.each([
  ["create", "target-present"],
  ["create", "target-absent"],
  ["update", "target-present"],
  ["update", "target-absent"],
  ["delete", "target-present"],
  ["delete", "target-absent"],
] as const)(
  "successful %s authority survives an older list and a newer rejected detail (%s)",
  async (operation, targetState) => {
    const originalFetch = globalThis.fetch;
    const oldList = deferred<Response>();
    const targetId = "Screen-MiXeD-Mutation";
    const mutationValue = makeScreen({ id: targetId, name: `${operation} authority` });
    const staleTarget = makeScreen({ id: targetId, name: "Stale list target" });
    const unrelated = makeScreen({ id: "screen-mutation-unrelated", name: "Unrelated" });
    let listGetCalls = 0;

    globalThis.fetch = (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
      if (url.endsWith("/custom-screens") && init?.method === "GET") {
        listGetCalls += 1;
        return listGetCalls === 1
          ? oldList.promise
          : Promise.reject(new Error("detail fallback rejected"));
      }
      if (url.endsWith(`/custom-screens/${targetId}`) && (init?.method ?? "GET") === "GET") {
        return Promise.reject(new Error("detail rejected"));
      }
      if (operation === "create" && url.endsWith("/custom-screens") && init?.method === "POST") {
        return Promise.resolve(jsonResponse(mutationValue));
      }
      if (
        operation === "update" &&
        url.endsWith(`/custom-screens/${targetId}`) &&
        init?.method === "PATCH"
      ) {
        return Promise.resolve(jsonResponse(mutationValue));
      }
      if (
        operation === "delete" &&
        url.endsWith(`/custom-screens/${targetId}`) &&
        init?.method === "DELETE"
      ) {
        return Promise.resolve(jsonResponse({ ok: true }));
      }
      return Promise.resolve(jsonResponse({}, 404));
    };

    try {
      resetCsrfToken();
      clearCustomScreensCache();
      const listRequest = listCustomScreensCached({ force: true });
      if (operation === "create") {
        await createCustomScreen({ name: mutationValue.name, contentTypeId: "ct-1" });
      } else if (operation === "update") {
        await updateCustomScreen(targetId, { name: mutationValue.name });
      } else {
        await deleteCustomScreen(targetId);
      }

      const rejectedDetail = getCustomScreenRawCached(targetId, { force: true });
      oldList.resolve(
        jsonResponse({
          items: targetState === "target-present" ? [staleTarget, unrelated] : [unrelated],
        })
      );
      await listRequest;
      await expect(rejectedDetail).rejects.toThrow("detail fallback rejected");

      const cached = getCachedCustomScreens() ?? [];
      expect(cached.find((item) => item.id === unrelated.id)?.name).toBe("Unrelated");
      if (operation === "delete") {
        expect(cached.some((item) => item.id === targetId)).toBe(false);
        expect(getCachedCustomScreen(targetId)).toBeNull();
      } else {
        expect(cached.find((item) => item.id === targetId)?.name).toBe(mutationValue.name);
        expect(getCachedCustomScreen(targetId)?.name).toBe(mutationValue.name);
      }
    } finally {
      clearCustomScreensCache();
      globalThis.fetch = originalFetch;
    }
  }
);

test("rejected screen mutation preserves pending list/detail authority and publishes nothing", async () => {
  const originalFetch = globalThis.fetch;
  const oldList = deferred<Response>();
  const newerDetail = deferred<Response>();
  const targetId = "screen-rejected-mutation";
  const events: Array<{ key: string; action: string }> = [];
  const unsubscribe = subscribeCacheEvents((event) => {
    events.push({ key: event.key, action: event.action });
  });

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
    if (url.endsWith("/custom-screens") && init?.method === "GET") return oldList.promise;
    if (url.endsWith(`/custom-screens/${targetId}`) && (init?.method ?? "GET") === "GET") {
      return newerDetail.promise;
    }
    if (url.endsWith(`/custom-screens/${targetId}`) && init?.method === "PATCH") {
      return Promise.resolve(jsonResponse({ error: "conflict" }, 409));
    }
    return Promise.resolve(jsonResponse({}, 404));
  };

  try {
    resetCsrfToken();
    clearCustomScreensCache();
    events.length = 0;
    const listRequest = listCustomScreensCached({ force: true });
    const detailRequest = getCustomScreenRawCached(targetId, { force: true });

    await expect(updateCustomScreen(targetId, { name: "Rejected" })).rejects.toThrow();
    expect(listCustomScreensCached()).toBe(listRequest);
    expect(getCustomScreenRawCached(targetId)).toBe(detailRequest);
    expect(getCachedCustomScreens()).toBeNull();
    expect(events).toEqual([]);

    oldList.resolve(
      jsonResponse({ items: [makeScreen({ id: "screen-unrelated", name: "Unrelated" })] })
    );
    await listRequest;
    newerDetail.resolve(jsonResponse(makeScreen({ id: targetId, name: "Detail wins" })));
    await detailRequest;

    expect(getCachedCustomScreens()?.find((item) => item.id === targetId)?.name).toBe(
      "Detail wins"
    );
    expect(getCachedCustomScreens()?.find((item) => item.id === "screen-unrelated")?.name).toBe(
      "Unrelated"
    );
    expect(events).toEqual([]);
  } finally {
    unsubscribe();
    clearCustomScreensCache();
    globalThis.fetch = originalFetch;
  }
});

test("explicit custom screen cache clear invalidates every captured publisher", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const listTransport = deferred<Response>();
  const detailTransport = deferred<Response>();
  const targetId = "screen-cleared";

  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  globalThis.fetch = (input) =>
    String(input).endsWith(`/custom-screens/${targetId}`)
      ? detailTransport.promise
      : listTransport.promise;

  try {
    clearCustomScreensCache();
    const listRequest = listCustomScreensCached({ force: true });
    const detailRequest = getCustomScreenRawCached(targetId, { force: true });
    clearCustomScreensCache();

    listTransport.resolve(jsonResponse({ items: [makeScreen({ id: "late-list" })] }));
    detailTransport.resolve(jsonResponse(makeScreen({ id: targetId, name: "Late detail" })));
    await Promise.all([listRequest, detailRequest]);

    expect(getCachedCustomScreens()).toBeNull();
    expect(getCachedCustomScreen(targetId)).toBeNull();
    expect(storage.getItem(cacheKeys.customScreensList)).toBeNull();
    expect(storage.getItem(cacheKeys.customScreenDetail(targetId))).toBeNull();
  } finally {
    clearCustomScreensCache();
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("custom screen cache clear remains fail-safe when stored list reads are corrupt", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const removed: string[] = [];
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: () => {
      throw new Error("corrupt storage read");
    },
    setItem: () => undefined,
    removeItem: (key: string) => {
      removed.push(key);
    },
  } as unknown;

  try {
    expect(() => clearCustomScreensCache()).not.toThrow();
    expect(removed).toContain(cacheKeys.customScreensList);
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test.each(["matched", "missing"] as const)(
  "detail fallback publishes the complete list and evicts omitted detail cache (%s)",
  async (targetState) => {
    const originalFetch = globalThis.fetch;
    const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
    const storage = createLocalStorage();
    const targetId = "screen-fallback";
    const omittedId = "screen-omitted";
    const target = makeScreen({ id: targetId, name: "Fallback target" });
    const unrelated = makeScreen({ id: "screen-fallback-unrelated", name: "Fallback unrelated" });
    let calls = 0;

    (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
    globalThis.fetch = () => {
      calls += 1;
      if (calls === 1) return Promise.resolve(jsonResponse({ error: "not_found" }, 404));
      return Promise.resolve(
        jsonResponse({ items: targetState === "matched" ? [target, unrelated] : [unrelated] })
      );
    };

    try {
      clearCustomScreensCache();
      storage.setItem(
        cacheKeys.customScreenDetail(omittedId),
        JSON.stringify({
          value: makeScreen({ id: omittedId, name: "Omitted stale detail" }),
          savedAt: Date.now(),
        })
      );
      expect(getCachedCustomScreen(omittedId)?.name).toBe("Omitted stale detail");

      const result = await getCustomScreenRawCached(targetId, { force: true });

      if (targetState === "matched") {
        expect(result).toMatchObject({ id: targetId, name: "Fallback target" });
      } else {
        expect(result).toBeNull();
      }
      expect(getCachedCustomScreens()?.map((item) => item.id)).toEqual(
        targetState === "matched" ? [targetId, unrelated.id] : [unrelated.id]
      );
      expect(getCachedCustomScreens()?.find((item) => item.id === unrelated.id)?.name).toBe(
        "Fallback unrelated"
      );
      expect(storage.getItem(cacheKeys.customScreenDetail(omittedId))).toBeNull();
      expect(getCachedCustomScreen(omittedId)).toBeNull();
      expect(calls).toBe(2);
    } finally {
      clearCustomScreensCache();
      globalThis.fetch = originalFetch;
      if (originalLocal === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
      }
    }
  }
);

test.each([
  ["fallback-first", "older-first"],
  ["fallback-first", "newer-first"],
  ["regular-first", "older-first"],
  ["regular-first", "newer-first"],
] as const)(
  "fallback and regular full lists obey committed start authority (%s, %s)",
  async (startOrder, settleOrder) => {
    const originalFetch = globalThis.fetch;
    const listTransports: Array<ReturnType<typeof deferred<Response>>> = [];
    const targetId = "screen-fallback-race";
    const fallbackItems = [
      makeScreen({ id: targetId, name: "Fallback target" }),
      makeScreen({ id: "fallback-unrelated", name: "Fallback unrelated" }),
    ];
    const regularItems = [
      makeScreen({ id: targetId, name: "Regular target" }),
      makeScreen({ id: "regular-unrelated", name: "Regular unrelated" }),
    ];

    globalThis.fetch = (input) => {
      const url = String(input);
      if (url.endsWith(`/custom-screens/${targetId}`)) {
        return Promise.resolve(jsonResponse({ error: "not_found" }, 404));
      }
      const transport = deferred<Response>();
      listTransports.push(transport);
      return transport.promise;
    };

    try {
      clearCustomScreensCache();
      let firstRequest: Promise<CustomScreenSummaryRecord[] | CustomScreenSummaryRecord | null>;
      let secondRequest: Promise<CustomScreenSummaryRecord[] | CustomScreenSummaryRecord | null>;
      if (startOrder === "fallback-first") {
        firstRequest = getCustomScreenRawCached(targetId, { force: true });
        await vi.waitFor(() => expect(listTransports).toHaveLength(1));
        secondRequest = listCustomScreensCached({ force: true });
      } else {
        firstRequest = listCustomScreensCached({ force: true });
        secondRequest = getCustomScreenRawCached(targetId, { force: true });
      }
      await vi.waitFor(() => expect(listTransports).toHaveLength(2));

      const firstItems = startOrder === "fallback-first" ? fallbackItems : regularItems;
      const secondItems = startOrder === "fallback-first" ? regularItems : fallbackItems;
      if (settleOrder === "older-first") {
        listTransports[0]?.resolve(jsonResponse({ items: firstItems }));
        await firstRequest;
        listTransports[1]?.resolve(jsonResponse({ items: secondItems }));
        await secondRequest;
      } else {
        listTransports[1]?.resolve(jsonResponse({ items: secondItems }));
        await secondRequest;
        listTransports[0]?.resolve(jsonResponse({ items: firstItems }));
        await firstRequest;
      }

      const expectedItems = secondItems;
      expect(getCachedCustomScreens()?.map((item) => item.id)).toEqual(
        expectedItems.map((item) => item.id)
      );
      expect(getCachedCustomScreens()?.find((item) => item.id === targetId)?.name).toBe(
        expectedItems[0]?.name
      );
    } finally {
      clearCustomScreensCache();
      globalThis.fetch = originalFetch;
    }
  }
);

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

test("TASK-569 server revision is stored in the cached record and expectedRevision round-trips in the PATCH body", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearCustomScreensCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/custom-screens/revision-screen") && init?.method === "PATCH") {
      return jsonResponse(makeScreen({ id: "revision-screen", name: "Updated", revision: 5 }));
    }
    if (url.endsWith("/custom-screens") && init?.method === "GET") {
      return jsonResponse({ items: [makeScreen({ id: "revision-screen", revision: 4 })] });
    }
    return jsonResponse({}, 404);
  };

  try {
    const listed = await listCustomScreens();
    expect(listed[0]?.revision).toBe(4);
    await listCustomScreensCached({ force: true });
    expect(getCachedCustomScreens()?.[0]?.revision).toBe(4);

    await updateCustomScreen("revision-screen", { name: "Updated", expectedRevision: 4 });
    const patchCall = calls.find(
      (call) =>
        String(call.input).endsWith("/custom-screens/revision-screen") &&
        call.init?.method === "PATCH"
    );
    expect(JSON.parse(String(patchCall?.init?.body))).toEqual({
      name: "Updated",
      expectedRevision: 4,
    });
    expect(getCachedCustomScreens()?.find((item) => item.id === "revision-screen")?.revision).toBe(
      5
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("client registers a memory invalidator with the TASK-467-01 registry", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
    return Promise.resolve(jsonResponse({ items: [makeScreen()] }));
  };

  try {
    clearCustomScreensCache();
    await listCustomScreensCached();
    expect(getCachedCustomScreens()).toHaveLength(1);

    // TASK-467-01 registry invalidation (lightweight) must reach this client's
    // memory family through the registered invalidator.
    const { clearCustomScreensCacheLightweight } =
      await import("../../../core/admin/services/customScreensCache");
    clearCustomScreensCacheLightweight();
    expect(getCachedCustomScreens()).toBeNull();
  } finally {
    clearCustomScreensCache();
    globalThis.fetch = originalFetch;
  }
});

test("a storage-only detail without a committed version is evicted once a list commit exists", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  globalThis.fetch = async () => jsonResponse({ items: [makeScreen()] });

  try {
    clearCustomScreensCache();
    await listCustomScreensCached({ force: true });
    writeLocalCache(
      cacheKeys.customScreenDetail("screen-orphan"),
      makeScreen({ id: "screen-orphan", name: "Orphan detail" })
    );
    expect(getCachedCustomScreen("screen-orphan")).toBeNull();
    expect(storage.getItem(cacheKeys.customScreenDetail("screen-orphan"))).toBeNull();
  } finally {
    clearCustomScreensCache();
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
