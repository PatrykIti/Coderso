import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  apiRequest,
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  broadcastCacheEvent,
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
    broadcastCacheEvent: vi.fn(),
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
}));

vi.mock("@/utils/cacheBus", () => ({ broadcastCacheEvent }));

import {
  clearPopupsCache,
  deletePopup,
  getCachedPopups,
  updatePopup,
  getCachedPopup,
  getPopupCached,
  listPopups,
  listPopupsCached,
} from "../../../core/admin/services/popupsClient";
import { cacheKeys, cacheTtlMs } from "../../../core/admin/services/cachePolicy";

const popupRecord = {
  id: "pop-1",
  name: "Welcome",
  slug: "welcome",
  status: "published",
  trigger: { type: "exit_intent" },
  targeting: { includePaths: [], excludePaths: [], audience: "all" },
  frequency: { strategy: "always", cooldownMinutes: null },
  content: { title: "Hi", body: null, templateId: null, ctaLabel: null, ctaHref: null },
  settings: { placement: "center", dismissible: true, showOverlay: true },
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z",
  publishedAt: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  resetLocalCache();
  clearPopupsCache();
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

describe("listPopups query strings", () => {
  test("omits the query string for empty params", async () => {
    apiRequest.mockResolvedValueOnce({ items: [] });
    await listPopups();
    expect(apiRequest).toHaveBeenCalledWith("/popups", { method: "GET" });
  });

  test("serializes status, trimmed search, floored limit and offset", async () => {
    apiRequest.mockResolvedValueOnce({ items: [] });
    await listPopups({
      status: "draft",
      search: "  news  ",
      limit: 10.9,
      offset: 2.7,
    });
    expect(apiRequest).toHaveBeenCalledWith("/popups?status=draft&search=news&limit=10&offset=2", {
      method: "GET",
    });
  });

  test("skips blank search and non-positive limit or offset", async () => {
    apiRequest.mockResolvedValueOnce({ items: [] });
    await listPopups({ search: "   ", limit: 0, offset: -1 });
    expect(apiRequest).toHaveBeenCalledWith("/popups", { method: "GET" });
  });

  test("returns payload items or an empty array", async () => {
    apiRequest.mockResolvedValueOnce({ items: [popupRecord] });
    await expect(listPopups()).resolves.toEqual([popupRecord]);
    apiRequest.mockResolvedValueOnce({});
    await expect(listPopups()).resolves.toEqual([]);
  });
});

describe("listPopupsCached in-flight dedupe", () => {
  test("shares a single pending request", async () => {
    let resolveRequest!: (value: { items: unknown[] }) => void;
    apiRequest.mockImplementationOnce(
      () =>
        new Promise<{ items: unknown[] }>((resolve) => {
          resolveRequest = resolve;
        })
    );
    const first = listPopupsCached();
    const second = listPopupsCached();
    resolveRequest({ items: [popupRecord] });
    await expect(first).resolves.toEqual([popupRecord]);
    await expect(second).resolves.toEqual([popupRecord]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});

describe("getPopupCached", () => {
  test("returns a cached detail without fetching", async () => {
    primeLocalCache(cacheKeys.popupDetail("pop-1"), popupRecord);
    await expect(getPopupCached("pop-1")).resolves.toEqual(popupRecord);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  test("falls back to the refreshed list on fetch failure", async () => {
    apiRequest.mockRejectedValueOnce(new Error("boom"));
    apiRequest.mockResolvedValueOnce({ items: [popupRecord] });
    await expect(getPopupCached("pop-1")).resolves.toEqual(popupRecord);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.popupDetail("pop-1"), popupRecord);
  });

  test("returns null when the fallback list has no match", async () => {
    apiRequest.mockRejectedValueOnce(new Error("boom"));
    apiRequest.mockResolvedValueOnce({ items: [] });
    await expect(getPopupCached("missing")).resolves.toBeNull();
  });

  test("caches a successful fetch", async () => {
    apiRequest.mockResolvedValueOnce(popupRecord);
    await expect(getPopupCached("pop-1")).resolves.toEqual(popupRecord);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.popupsList, [popupRecord]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.popupDetail("pop-1"), popupRecord);
  });

  test("replaces an existing cached entry on refetch", async () => {
    primeLocalCache(cacheKeys.popupsList, [popupRecord]);
    getCachedPopups();
    const updated = { ...popupRecord, name: "Updated" };
    apiRequest.mockResolvedValueOnce(updated);
    await expect(getPopupCached("pop-1", { force: true })).resolves.toEqual(updated);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.popupsList, [updated]);
  });
});

describe("updatePopup", () => {
  test("patches a popup and refreshes caches", async () => {
    const updated = { ...popupRecord, name: "Renamed" };
    apiRequest.mockResolvedValueOnce(updated);
    await expect(updatePopup("pop-1", { name: "Renamed" })).resolves.toEqual(updated);
    expect(apiRequest).toHaveBeenCalledWith(
      "/popups/pop-1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed" }),
      },
      { withCsrf: true }
    );
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.popupsList, [updated]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.popupDetail("pop-1"), updated);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.popupsList,
      action: "update",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.popupDetail("pop-1"),
      action: "update",
    });
  });
});

describe("deletePopup", () => {
  test("removes the popup from caches and broadcasts invalidation", async () => {
    primeLocalCache(cacheKeys.popupsList, [
      { ...popupRecord, id: "pop-1" },
      { ...popupRecord, id: "pop-2", slug: "two" },
    ]);
    apiRequest.mockResolvedValueOnce({ ok: true });
    await expect(deletePopup("pop-1")).resolves.toEqual({ ok: true });
    expect(apiRequest).toHaveBeenCalledWith(
      "/popups/pop-1",
      { method: "DELETE" },
      { withCsrf: true }
    );
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.popupsList, [
      { ...popupRecord, id: "pop-2", slug: "two" },
    ]);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.popupDetail("pop-1"));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.popupsList,
      action: "invalidate",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.popupDetail("pop-1"),
      action: "invalidate",
    });
  });

  test("does nothing when the server reports not ok", async () => {
    apiRequest.mockResolvedValueOnce({ ok: false });
    await expect(deletePopup("pop-1")).resolves.toEqual({ ok: false });
    expect(broadcastCacheEvent).not.toHaveBeenCalled();
  });

  test("getCachedPopup finds an item from the memory list", () => {
    primeLocalCache(cacheKeys.popupsList, [popupRecord]);
    getCachedPopups();
    expect(getCachedPopup("pop-1")).toEqual(popupRecord);
  });
});
