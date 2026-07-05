import { expect, test } from "vitest";

import {
  clearDashboardCaches,
  getCachedDashboardLayout,
  getDashboardData,
  getDashboardLayoutCached,
  resolveDashboardWidgetData,
  saveDashboardLayout,
} from "../../../core/admin/services/dashboardClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("getDashboardData hits /dashboard with GET", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      generatedAt: "2026-02-09T10:00:00.000Z",
      totals: { pages: 1, entries: 1, media: 1, users: 1 },
      storage: { usedBytes: 0, limitBytes: null, usedPercent: null },
      security: { status: "ok", issues: 0, checks: [] },
      recentEdits: [],
    });
  };

  try {
    await getDashboardData();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/dashboard");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
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
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  return {
    storage,
    restore: () => {
      clearDashboardCaches();
      if (originalLocal === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
      }
    },
  };
};

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

test("getDashboardLayoutCached reads validated local cache before fetching", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const cached = { layout, updatedAt: "2026-07-05T00:00:00.000Z" };
  storage.setItem(
    cacheKeys.dashboardLayout,
    JSON.stringify({ value: cached, savedAt: Date.now() })
  );
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(cached);
  };

  try {
    await expect(getDashboardLayoutCached()).resolves.toEqual(cached);
    expect(getCachedDashboardLayout()).toEqual(cached);
    expect(calls).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("saveDashboardLayout uses csrf, writes layout cache, and invalidates widget data cache", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ layout, updatedAt: "2026-07-05T00:00:00.000Z" });
  };

  try {
    storage.setItem(
      cacheKeys.dashboardWidgetData,
      JSON.stringify({ value: { generatedAt: "x", widgets: [] }, savedAt: Date.now() })
    );
    await saveDashboardLayout(layout);

    expect(calls[1]?.input).toBe("/admin/api/dashboard/layout");
    expect(calls[1]?.init?.method).toBe("PUT");
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(calls[1]?.init?.body).toBe(JSON.stringify(layout));
    expect(storage.getItem(cacheKeys.dashboardWidgetData)).toBeNull();
    expect(getCachedDashboardLayout()?.layout.widgets[0]?.id).toBe("default-storage");
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("resolveDashboardWidgetData posts draft widgets without touching saved-layout cache", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    return jsonResponse({ generatedAt: "2026-07-05T00:00:00.000Z", widgets: [] });
  };

  try {
    await resolveDashboardWidgetData([
      { id: "draft", type: "storage-usage", config: { kind: "storage-usage" } },
    ]);

    const request = calls.find((call) => call.input === "/admin/api/dashboard/widget-data");
    expect(request?.init?.method).toBe("POST");
    expect(storage.getItem(cacheKeys.dashboardWidgetData)).toBeNull();
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});
