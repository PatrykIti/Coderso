import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  apiRequest,
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  broadcastCacheEvent,
  subscribeCacheEvents,
  emitCacheEvent,
  resetLocalCache,
  primeLocalCache,
  readLocalCacheValue,
} = vi.hoisted(() => {
  const localCacheStore = new Map<string, unknown>();
  const cacheEventHandlers = new Set<(event: { key: string; action: string }) => void>();
  return {
    apiRequest: vi.fn(),
    readLocalCache: vi.fn(),
    writeLocalCache: vi.fn(),
    clearLocalCache: vi.fn(),
    broadcastCacheEvent: vi.fn(),
    subscribeCacheEvents: vi.fn((handler: (event: { key: string; action: string }) => void) => {
      cacheEventHandlers.add(handler);
      return () => {
        cacheEventHandlers.delete(handler);
      };
    }),
    emitCacheEvent: (event: { key: string; action: string }) => {
      for (const handler of cacheEventHandlers) handler(event);
    },
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

vi.mock("@/utils/cacheBus", () => ({ broadcastCacheEvent, subscribeCacheEvents }));

import {
  clearDashboardCaches,
  getCachedDashboardLayout,
  getCachedDashboardWidgetData,
  getDashboardData,
  getDashboardLayout,
  getDashboardLayoutCached,
  getDashboardWidgetData,
  getDashboardWidgetDataCached,
  previewDashboardWidgetData,
  resetDashboardLayout,
  saveDashboardLayout,
  subscribeDashboardCache,
} from "../../../core/admin/services/dashboardClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const layout = {
  version: 1 as const,
  widgets: [
    {
      id: "default-storage",
      type: "storage-usage" as const,
      title: "Storage",
      config: { kind: "storage-usage" as const },
      position: { x: 0, y: 0, w: 4, h: 2 },
    },
  ],
};

const layoutResponse = { layout, updatedAt: "2026-07-05T00:00:00.000Z" };

const widgetDataResponse = {
  generatedAt: "2026-07-05T00:00:00.000Z",
  widgets: [{ id: "w1", type: "storage-usage", data: { usedBytes: 0 } }],
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
  clearDashboardCaches();
});

describe("dashboard layout", () => {
  test("getDashboardData fetches the overview with GET", async () => {
    const overview = {
      generatedAt: "2026-02-09T10:00:00.000Z",
      totals: { pages: 1, entries: 1, media: 1, users: 1 },
      storage: { usedBytes: 0, limitBytes: null, usedPercent: null },
      security: { status: "ok", issues: 0, checks: [] },
      recentEdits: [],
    };
    apiRequest.mockResolvedValueOnce(overview);
    await expect(getDashboardData()).resolves.toEqual(overview);
    expect(apiRequest).toHaveBeenCalledWith("/dashboard", { method: "GET" });
  });

  test("getDashboardLayout fetches the layout with GET", async () => {
    apiRequest.mockResolvedValueOnce(layoutResponse);
    await expect(getDashboardLayout()).resolves.toEqual(layoutResponse);
    expect(apiRequest).toHaveBeenCalledWith("/dashboard/layout", { method: "GET" });
  });

  test("getDashboardLayoutCached reads validated cache, in-flight and fetch paths", async () => {
    writeLocalCache(cacheKeys.dashboardLayout, layoutResponse);
    await expect(getDashboardLayoutCached()).resolves.toEqual(layoutResponse);
    expect(getCachedDashboardLayout()).toEqual(layoutResponse);
    expect(apiRequest).not.toHaveBeenCalled();
    clearDashboardCaches();

    apiRequest.mockResolvedValueOnce(layoutResponse);
    const first = getDashboardLayoutCached();
    const second = getDashboardLayoutCached();
    await expect(Promise.all([first, second])).resolves.toEqual([layoutResponse, layoutResponse]);
    expect(apiRequest).toHaveBeenCalledTimes(1);

    apiRequest.mockResolvedValueOnce({ layout, updatedAt: "2026-07-06T00:00:00.000Z" });
    await expect(getDashboardLayoutCached({ force: true })).resolves.toEqual({
      layout,
      updatedAt: "2026-07-06T00:00:00.000Z",
    });
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.dashboardLayout, {
      layout,
      updatedAt: "2026-07-06T00:00:00.000Z",
    });
  });

  test("saveDashboardLayout puts with CSRF, writes cache and broadcasts", async () => {
    apiRequest.mockResolvedValueOnce(layoutResponse);
    await expect(saveDashboardLayout(layout)).resolves.toEqual(layoutResponse);
    expect(apiRequest).toHaveBeenCalledWith(
      "/dashboard/layout",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      },
      { withCsrf: true }
    );
    expect(getCachedDashboardLayout()).toEqual(layoutResponse);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.dashboardWidgetData);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.dashboardLayout,
      action: "update",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.dashboardWidgetData,
      action: "invalidate",
    });
  });

  test("resetDashboardLayout posts with CSRF, writes cache and broadcasts", async () => {
    apiRequest.mockResolvedValueOnce(layoutResponse);
    await expect(resetDashboardLayout()).resolves.toEqual(layoutResponse);
    expect(apiRequest).toHaveBeenCalledWith(
      "/dashboard/layout/reset",
      { method: "POST" },
      { withCsrf: true }
    );
    expect(getCachedDashboardLayout()).toEqual(layoutResponse);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.dashboardWidgetData);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.dashboardLayout,
      action: "update",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.dashboardWidgetData,
      action: "invalidate",
    });
  });
});

describe("dashboard widget data", () => {
  test("getDashboardWidgetData fetches widget data with GET", async () => {
    apiRequest.mockResolvedValueOnce(widgetDataResponse);
    await expect(getDashboardWidgetData()).resolves.toEqual(widgetDataResponse);
    expect(apiRequest).toHaveBeenCalledWith("/dashboard/widget-data", { method: "GET" });
  });

  test("getDashboardWidgetDataCached reads validated cache, in-flight and fetch paths", async () => {
    writeLocalCache(cacheKeys.dashboardWidgetData, widgetDataResponse);
    await expect(getDashboardWidgetDataCached()).resolves.toEqual(widgetDataResponse);
    expect(getCachedDashboardWidgetData()).toEqual(widgetDataResponse);
    expect(apiRequest).not.toHaveBeenCalled();
    clearDashboardCaches();

    apiRequest.mockResolvedValueOnce(widgetDataResponse);
    const first = getDashboardWidgetDataCached();
    const second = getDashboardWidgetDataCached();
    await expect(Promise.all([first, second])).resolves.toEqual([
      widgetDataResponse,
      widgetDataResponse,
    ]);
    expect(apiRequest).toHaveBeenCalledTimes(1);

    apiRequest.mockResolvedValueOnce({
      generatedAt: "2026-07-06T00:00:00.000Z",
      widgets: [{ id: "w2", type: "traffic", data: {} }],
    });
    await expect(getDashboardWidgetDataCached({ force: true })).resolves.toEqual({
      generatedAt: "2026-07-06T00:00:00.000Z",
      widgets: [{ id: "w2", type: "traffic", data: {} }],
    });
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.dashboardWidgetData, {
      generatedAt: "2026-07-06T00:00:00.000Z",
      widgets: [{ id: "w2", type: "traffic", data: {} }],
    });
  });

  test("previewDashboardWidgetData maps widgets into a resolve request", async () => {
    apiRequest.mockResolvedValueOnce(widgetDataResponse);
    await expect(previewDashboardWidgetData(layout.widgets)).resolves.toEqual(widgetDataResponse);
    expect(apiRequest).toHaveBeenCalledWith(
      "/dashboard/widget-data",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgets: [
            {
              id: "default-storage",
              type: "storage-usage",
              title: "Storage",
              config: { kind: "storage-usage" },
            },
          ],
        }),
      },
      { withCsrf: true }
    );
  });
});

describe("dashboard cache subscriptions", () => {
  test("subscribeDashboardCache forwards only dashboard family events", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeDashboardCache(handler);
    expect(subscribeCacheEvents).toHaveBeenCalledTimes(1);

    emitCacheEvent({ key: cacheKeys.dashboardLayout, action: "update" });
    emitCacheEvent({ key: cacheKeys.dashboardWidgetData, action: "invalidate" });
    emitCacheEvent({ key: "pages:list", action: "update" });
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({ key: cacheKeys.dashboardLayout, action: "update" });
    expect(handler).toHaveBeenCalledWith({
      key: cacheKeys.dashboardWidgetData,
      action: "invalidate",
    });

    unsubscribe();
  });
});
