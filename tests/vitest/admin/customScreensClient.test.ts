import { afterEach, expect, test, vi } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys, cacheTtlMs } from "../../../core/admin/services/cachePolicy";
import {
  clearCustomScreensCache,
  createCustomScreen,
  deleteCustomScreen,
  getCachedCustomScreens,
  listCustomScreens,
  listCustomScreensCached,
  updateCustomScreen,
  type CustomScreenRecord,
} from "../../../core/admin/services/customScreensClient";

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

const makeScreen = (
  overrides: Partial<CustomScreenRecord> = {}
): CustomScreenRecord => ({
  id: "screen-1",
  name: "Catalog screen",
  contentTypeId: "ct-1",
  status: "draft",
  showInSidebar: false,
  sidebarLabel: null,
  schemaVersion: 1,
  blocks: [],
  bindings: [],
  createdAt: "2026-03-05T00:00:00.000Z",
  updatedAt: "2026-03-05T00:00:00.000Z",
  ...overrides,
});

afterEach(() => {
  clearCustomScreensCache();
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
        expect.arrayContaining([
          expect.objectContaining({ id: "cached-screen" }),
        ])
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
      blocks: [],
      bindings: [],
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
