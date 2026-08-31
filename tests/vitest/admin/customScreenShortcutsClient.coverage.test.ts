import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  apiRequest,
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
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
  createMemoryBackedLocalCache: (config: {
    key: string;
    ttlMs: number;
    validate?: (value: unknown) => boolean;
  }) => ({
    read: () => {
      const value = readLocalCacheValue(config.key);
      if (value === null) return null;
      if (config.validate && !config.validate(value)) return null;
      return value;
    },
    write: (value: unknown) => {
      writeLocalCache(config.key, value);
    },
    clear: () => {
      clearLocalCache(config.key);
    },
  }),
}));

import {
  clearCustomScreenShortcutsCache,
  getCachedCustomScreenShortcuts,
  listCustomScreenShortcuts,
  listCustomScreenShortcutsCached,
} from "../../../core/admin/services/customScreenShortcutsClient";
import { clearCustomScreensCacheLightweight } from "../../../core/admin/services/customScreensCache";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const fullRecord = {
  id: "scr-1",
  name: "Analytics",
  contentTypeId: "page",
  status: "active",
  collectionRole: "viewer",
  compositionKey: "analytics",
  showInSidebar: true,
  sidebarLabel: "Stats",
  schemaVersion: 2,
  definition: { kind: "custom" },
  capabilities: { supportsDedicatedEditor: false, extra: 1 },
  blocks: [{ type: "section" }],
  bindings: [{ id: "b1", widgetId: "w1", propPath: "data", field: "value", mode: "bind" }],
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-02T00:00:00.000Z",
};

const minimalRecord = {
  id: "scr-2",
  name: "Plain",
  status: "draft",
  blocks: [],
};

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
});

describe("listCustomScreenShortcuts", () => {
  test("fetches and normalizes records", async () => {
    apiRequest.mockResolvedValueOnce({ items: [fullRecord, minimalRecord] });
    const result = await listCustomScreenShortcuts();
    expect(result).toEqual([
      { ...fullRecord },
      {
        id: "scr-2",
        name: "Plain",
        status: "draft",
        blocks: [],
        showInSidebar: false,
        sidebarLabel: null,
      },
    ]);
    expect(apiRequest).toHaveBeenCalledWith("/custom-screens", { method: "GET" });
  });

  test("defaults missing items to an empty list", async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(listCustomScreenShortcuts()).resolves.toEqual([]);
  });

  test("returns an empty list for a non-array payload", async () => {
    apiRequest.mockResolvedValueOnce({ items: { id: "not-a-list" } });
    await expect(listCustomScreenShortcuts()).resolves.toEqual([]);
  });

  test("rejects invalid records instead of surfacing them", async () => {
    apiRequest.mockResolvedValueOnce({ items: [{ id: "scr-x", name: 42, status: "draft" }] });
    await expect(listCustomScreenShortcuts()).resolves.toEqual([]);
  });

  test("rejects records with invalid status", async () => {
    apiRequest.mockResolvedValueOnce({ items: [{ id: "scr-x", name: "X", status: "archived" }] });
    await expect(listCustomScreenShortcuts()).resolves.toEqual([]);
  });

  test("rejects non-object list elements", async () => {
    apiRequest.mockResolvedValueOnce({ items: [null] });
    await expect(listCustomScreenShortcuts()).resolves.toEqual([]);
  });

  test("rejects records with invalid capabilities", async () => {
    apiRequest.mockResolvedValueOnce({
      items: [
        {
          id: "scr-x",
          name: "X",
          status: "active",
          capabilities: { supportsDedicatedEditor: "yes" },
        },
      ],
    });
    await expect(listCustomScreenShortcuts()).resolves.toEqual([]);
  });

  test("rejects records with invalid bindings", async () => {
    apiRequest.mockResolvedValueOnce({
      items: [
        {
          id: "scr-x",
          name: "X",
          status: "active",
          bindings: [{ id: "b1", widgetId: "w1", mode: 7 }],
        },
      ],
    });
    await expect(listCustomScreenShortcuts()).resolves.toEqual([]);
  });

  test("rejects records with invalid sidebar fields", async () => {
    apiRequest.mockResolvedValueOnce({
      items: [{ id: "scr-x", name: "X", status: "active", sidebarLabel: 9 }],
    });
    await expect(listCustomScreenShortcuts()).resolves.toEqual([]);
  });

  test("propagates api errors", async () => {
    const apiError = new Error("Request failed (500)");
    apiRequest.mockRejectedValueOnce(apiError);
    await expect(listCustomScreenShortcuts()).rejects.toThrow("Request failed (500)");
  });
});

describe("custom screen shortcuts cache", () => {
  test("returns null when nothing is cached", () => {
    expect(getCachedCustomScreenShortcuts()).toBeNull();
  });

  test("returns normalized cached records", () => {
    primeLocalCache(cacheKeys.customScreensList, [minimalRecord]);
    expect(getCachedCustomScreenShortcuts()).toEqual([
      {
        id: "scr-2",
        name: "Plain",
        status: "draft",
        blocks: [],
        showInSidebar: false,
        sidebarLabel: null,
      },
    ]);
  });

  test("drops invalid cached values", () => {
    primeLocalCache(cacheKeys.customScreensList, [{ id: "bad" }]);
    expect(getCachedCustomScreenShortcuts()).toBeNull();
  });

  test("listCustomScreenShortcutsCached returns a cache hit without fetching", async () => {
    primeLocalCache(cacheKeys.customScreensList, [fullRecord]);
    await expect(listCustomScreenShortcutsCached()).resolves.toEqual([{ ...fullRecord }]);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  test("listCustomScreenShortcutsCached shares an in-flight request", async () => {
    let resolveRequest: (value: { items: unknown[] }) => void;
    apiRequest.mockImplementationOnce(
      () =>
        new Promise<{ items: unknown[] }>((resolve) => {
          resolveRequest = resolve;
        })
    );
    const first = listCustomScreenShortcutsCached();
    const second = listCustomScreenShortcutsCached();
    resolveRequest!({ items: [fullRecord] });
    await expect(first).resolves.toEqual([{ ...fullRecord }]);
    await expect(second).resolves.toEqual([{ ...fullRecord }]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("listCustomScreenShortcutsCached fetches and primes the cache", async () => {
    apiRequest.mockResolvedValueOnce({ items: [minimalRecord] });
    const result = await listCustomScreenShortcutsCached();
    expect(result).toEqual([
      {
        id: "scr-2",
        name: "Plain",
        status: "draft",
        blocks: [],
        showInSidebar: false,
        sidebarLabel: null,
      },
    ]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.customScreensList, result);
    // A second call now hits the cache.
    await expect(listCustomScreenShortcutsCached()).resolves.toEqual(result);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("force bypasses a cache hit", async () => {
    primeLocalCache(cacheKeys.customScreensList, [fullRecord]);
    apiRequest.mockResolvedValueOnce({ items: [minimalRecord] });
    await expect(listCustomScreenShortcutsCached({ force: true })).resolves.toEqual([
      {
        id: "scr-2",
        name: "Plain",
        status: "draft",
        blocks: [],
        showInSidebar: false,
        sidebarLabel: null,
      },
    ]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("clearCustomScreenShortcutsCache drops cache and in-flight promise", async () => {
    let resolveRequest: (value: { items: unknown[] }) => void;
    apiRequest.mockImplementationOnce(
      () =>
        new Promise<{ items: unknown[] }>((resolve) => {
          resolveRequest = resolve;
        })
    );
    apiRequest.mockResolvedValueOnce({ items: [fullRecord] });
    const pending = listCustomScreenShortcutsCached();
    clearCustomScreenShortcutsCache();
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.customScreensList);
    // The in-flight promise was reset, so a new call fetches again.
    await expect(listCustomScreenShortcutsCached()).resolves.toEqual([{ ...fullRecord }]);
    expect(apiRequest).toHaveBeenCalledTimes(2);
    resolveRequest!({ items: [fullRecord] });
    await pending;
  });

  test("the registered invalidator clears the shortcuts cache", () => {
    primeLocalCache(cacheKeys.customScreensList, [fullRecord]);
    expect(getCachedCustomScreenShortcuts()).not.toBeNull();
    clearCustomScreensCacheLightweight();
    expect(getCachedCustomScreenShortcuts()).toBeNull();
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.customScreensList);
  });
});
