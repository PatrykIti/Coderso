import { expect, test } from "vitest";

import {
  exportTopPages,
  getCachedTopPages,
  getCachedTrafficOverview,
  getTopPages,
  getTopPagesCached,
  getTrafficOverview,
  getTrafficOverviewCached,
  type TrafficOverview,
} from "../../../core/admin/services/analyticsClient";
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

const setCacheValue = (
  storage: ReturnType<typeof createLocalStorage>,
  key: string,
  value: unknown
) => {
  storage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
};

const installLocalStorage = () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  return {
    storage,
    restore: () => {
      if (originalLocal === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
      }
    },
  };
};

const overview = (rangeDays: number): TrafficOverview => ({
  rangeDays,
  generatedAt: "2026-06-01T00:00:00.000Z",
  totals: { pageviews: 10, visitors: 6, sessions: 8, bounceRate: 0.25, avgPagesPerSession: 1.25 },
  previous: { pageviews: 5, visitors: 3, sessions: 4, bounceRate: 0.5, avgPagesPerSession: 1.25 },
  trend: [{ date: "2026-06-01", value: 10 }],
  sources: [{ key: "direct", label: "Direct", value: 6 }],
  devices: [{ key: "desktop", label: "Desktop", value: 6 }],
  referrers: [{ key: "example.com", label: "example.com", value: 2 }],
  topPages: [{ path: "/", views: 10, visitors: 6 }],
});

test("cache key encodes rangeDays and limit", () => {
  expect(cacheKeys.analyticsTrafficOverview(30)).toBe("analytics:traffic:overview:30");
  expect(cacheKeys.analyticsTopPages(30, 10)).toBe("analytics:traffic:topPages:30:10");
});

test("getTrafficOverview hits /analytics/traffic/overview with rangeDays", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(overview(30));
  };

  try {
    await getTrafficOverview(30);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/analytics/traffic/overview?rangeDays=30");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("caches overview and serves it on second call without refetch", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const cached = overview(30);

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(overview(30));
  };

  try {
    setCacheValue(storage, cacheKeys.analyticsTrafficOverview(30), cached);
    await expect(getTrafficOverviewCached(30)).resolves.toEqual(cached);
    expect(calls).toHaveLength(0);
    expect(getCachedTrafficOverview(30)).toEqual(cached);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("force bypasses cache and rewrites it", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const cached = overview(30);
  const refreshed = { ...overview(30), generatedAt: "2026-06-01T00:05:00.000Z" };

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(refreshed);
  };

  try {
    setCacheValue(storage, cacheKeys.analyticsTrafficOverview(30), cached);
    await expect(getTrafficOverviewCached(30, { force: true })).resolves.toEqual(refreshed);
    expect(calls[0]?.input).toBe("/admin/api/analytics/traffic/overview?rangeDays=30");
    expect(getCachedTrafficOverview(30)).toEqual(refreshed);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("getTopPages hits /analytics/traffic/top-pages with limit and rangeDays", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await getTopPages({ limit: 5, rangeDays: 7 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/analytics/traffic/top-pages?limit=5&rangeDays=7");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getTopPagesCached reads local cache by range and limit", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const options = { limit: 5, rangeDays: 7 };
  const cached = [{ path: "/", views: 10, visitors: 6 }];
  const refreshed = [{ path: "/", views: 12, visitors: 7 }];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(refreshed);
  };

  try {
    setCacheValue(storage, cacheKeys.analyticsTopPages(options.rangeDays, options.limit), cached);
    await expect(getTopPagesCached(options)).resolves.toEqual(cached);
    expect(calls).toHaveLength(0);
    expect(getCachedTopPages(options)).toEqual(cached);

    await expect(getTopPagesCached({ ...options, force: true })).resolves.toEqual(refreshed);
    expect(calls[0]?.input).toBe("/admin/api/analytics/traffic/top-pages?limit=5&rangeDays=7");
    expect(getCachedTopPages(options)).toEqual(refreshed);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("exportTopPages hits the CSV export endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      fileName: "coderso-traffic-top-pages-7d-2026-06-01.csv",
      contentType: "text/csv",
      content: "path,views,visitors",
      rangeDays: 7,
      totalRows: 0,
    });
  };

  try {
    const result = await exportTopPages({ limit: 50, rangeDays: 7 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe(
      "/admin/api/analytics/traffic/top-pages/export?limit=50&rangeDays=7&format=csv"
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result.contentType).toBe("text/csv");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("in-flight traffic overview and top-pages requests are deduped", async () => {
  const { restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  let resolveOverview!: (response: Response) => void;
  const overviewDeferred = new Promise<Response>((resolve) => {
    resolveOverview = resolve;
  });
  let overviewCalls = 0;
  let topPagesCalls = 0;

  globalThis.fetch = (input) => {
    const url = String(input).split("?")[0];
    if (url.endsWith("/analytics/traffic/overview")) {
      overviewCalls += 1;
      return overviewDeferred;
    }
    if (url.endsWith("/analytics/traffic/top-pages")) {
      topPagesCalls += 1;
      return Promise.resolve(jsonResponse([{ path: "/", views: 10, visitors: 6 }]));
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  try {
    const first = getTrafficOverviewCached(23);
    const second = getTrafficOverviewCached(23);
    resolveOverview(jsonResponse(overview(23)));
    await expect(Promise.all([first, second])).resolves.toMatchObject([
      { rangeDays: 23 },
      { rangeDays: 23 },
    ]);
    expect(overviewCalls).toBe(1);

    const pagesA = getTopPagesCached({ rangeDays: 23, limit: 5 });
    const pagesB = getTopPagesCached({ rangeDays: 23, limit: 5 });
    await expect(pagesA).resolves.toHaveLength(1);
    await expect(pagesB).resolves.toHaveLength(1);
    expect(topPagesCalls).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});
