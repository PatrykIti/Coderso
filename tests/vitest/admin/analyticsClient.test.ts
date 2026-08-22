import { expect, test } from "vitest";

import {
  exportTopContent,
  getCachedOverview,
  getCachedTopContent,
  getOverview,
  getOverviewCached,
  getTopContent,
  getTopContentCached,
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

const overview = (rangeDays: number) => ({
  rangeDays,
  generatedAt: "2026-06-01T00:00:00.000Z",
  totals: { pages: 1, publishedPages: 1, entries: 1, media: 1, users: 1 },
  current: { pages: 1, publishedPages: 1, entries: 1, media: 1, users: 1 },
  previous: { pages: 0, publishedPages: 0, entries: 0, media: 0, users: 0 },
  trend: [{ date: "2026-06-01", value: 1 }],
});

test("getOverview hits /analytics/overview with rangeDays", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ rangeDays: 30, totals: {}, current: {}, previous: {}, trend: [] });
  };

  try {
    await getOverview(30);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/analytics/overview?rangeDays=30");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getOverviewCached reads local cache and force refreshes by range", async () => {
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
    setCacheValue(storage, cacheKeys.analyticsOverview(30), cached);
    await expect(getOverviewCached(30)).resolves.toEqual(cached);
    expect(calls).toHaveLength(0);
    expect(getCachedOverview(30)).toEqual(cached);

    await expect(getOverviewCached(30, { force: true })).resolves.toEqual(refreshed);
    expect(calls[0]?.input).toBe("/admin/api/analytics/overview?rangeDays=30");
    expect(getCachedOverview(30)).toEqual(refreshed);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("getTopContent hits /analytics/top-content with limit, range, and type", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await getTopContent({ limit: 5, rangeDays: 7, type: "page" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/analytics/top-content?limit=5&rangeDays=7&type=page");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getTopContentCached reads local cache by range, limit, and type", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const options = { limit: 5, rangeDays: 7, type: "page" as const };
  const cachedItem = {
    id: "page-1",
    type: "page" as const,
    title: "Home",
    slug: "/",
    updatedAt: "2026-06-01T00:00:00.000Z",
    score: 10,
  };
  const cached = [cachedItem];
  const refreshed = [{ ...cachedItem, score: 12 }];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(refreshed);
  };

  try {
    setCacheValue(
      storage,
      cacheKeys.analyticsTopContent(options.rangeDays, options.limit, options.type),
      cached
    );
    await expect(getTopContentCached(options)).resolves.toEqual(cached);
    expect(calls).toHaveLength(0);
    expect(getCachedTopContent(options)).toEqual(cached);

    await expect(getTopContentCached({ ...options, force: true })).resolves.toEqual(refreshed);
    expect(calls[0]?.input).toBe("/admin/api/analytics/top-content?limit=5&rangeDays=7&type=page");
    expect(getCachedTopContent(options)).toEqual(refreshed);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("exportTopContent hits the CSV export endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      fileName: "coderso-analytics-top-content-7d-2026-06-01.csv",
      contentType: "text/csv",
      content: "type,title,slug,updatedAt,score",
      rangeDays: 7,
      totalRows: 0,
    });
  };

  try {
    const result = await exportTopContent({ limit: 50, rangeDays: 7, type: "entry" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe(
      "/admin/api/analytics/top-content/export?limit=50&rangeDays=7&format=csv&type=entry"
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(result.contentType).toBe("text/csv");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("in-flight overview and top-content requests are deduped", async () => {
  const { restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  let resolveOverview!: (response: Response) => void;
  const overviewDeferred = new Promise<Response>((resolve) => {
    resolveOverview = resolve;
  });
  let overviewCalls = 0;
  let topContentCalls = 0;

  globalThis.fetch = (input) => {
    const url = String(input).split("?")[0];
    if (url.endsWith("/analytics/overview")) {
      overviewCalls += 1;
      return overviewDeferred;
    }
    if (url.endsWith("/analytics/top-content")) {
      topContentCalls += 1;
      return Promise.resolve(
        jsonResponse([
          {
            id: "page-home",
            type: "page",
            title: "Home",
            slug: "/",
            updatedAt: "2026-06-01T00:00:00.000Z",
            score: 1,
          },
        ])
      );
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  try {
    const first = getOverviewCached(45);
    const second = getOverviewCached(45);
    resolveOverview(jsonResponse(overview(45)));
    await expect(Promise.all([first, second])).resolves.toMatchObject([
      { rangeDays: 45 },
      { rangeDays: 45 },
    ]);
    expect(overviewCalls).toBe(1);

    const contentA = getTopContentCached({ limit: 5, rangeDays: 45, type: "page" });
    const contentB = getTopContentCached({ limit: 5, rangeDays: 45, type: "page" });
    await expect(contentA).resolves.toHaveLength(1);
    await expect(contentB).resolves.toHaveLength(1);
    expect(topContentCalls).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});
