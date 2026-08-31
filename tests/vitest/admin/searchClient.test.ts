import { expect, test } from "vitest";

import {
  clearSearchCache,
  clearSearchResultCache,
  getCachedRecentSearches,
  getCachedSearchResults,
  getSearchResultsCacheKey,
  listRecentSearches,
  listRecentSearchesCached,
  searchAll,
  searchAllCached,
} from "../../../core/admin/services/searchClient";
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
      clearSearchCache();
    },
  };
};

test("searchAll hits GET /search with query params", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await searchAll("homepage", { limit: 12 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/search?q=homepage&limit=12");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search response cache keys are deterministic and bounded", () => {
  const longQuery = "homepage ".repeat(80);
  const first = getSearchResultsCacheKey(longQuery, {
    limit: 12,
    dateRange: "last-30-days",
  });
  const second = getSearchResultsCacheKey(longQuery, {
    limit: 12,
    dateRange: "last-30-days",
  });

  expect(first).toBe(second);
  expect(first).toContain("limit:12");
  expect(first).toContain("date:last-30-days");
  expect(first.length).toBeLessThan(180);
});

test("listRecentSearchesCached reads from local storage", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const cached = [{ query: "homepage", createdAt: "2026-06-01T00:00:00.000Z" }];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    setCacheValue(storage, cacheKeys.searchRecent, cached);
    const result = await listRecentSearchesCached();
    expect(result).toEqual(cached);
    expect(getCachedRecentSearches()).toEqual(cached);
    expect(calls).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("searchAllCached reads cached responses and force refreshes by query options", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const cached = { items: [{ id: "cached", title: "Cached", type: "page", updatedAt: "now" }] };
  const refreshed = {
    items: [{ id: "fresh", title: "Fresh", type: "page", updatedAt: "later" }],
  };

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(refreshed);
  };

  try {
    const options = { limit: 12, dateRange: "last-30-days" as const };
    setCacheValue(storage, getSearchResultsCacheKey("homepage", options), cached);

    await expect(searchAllCached("homepage", options)).resolves.toEqual(cached);
    expect(calls).toHaveLength(0);
    expect(getCachedSearchResults("homepage", options)).toEqual(cached);

    await expect(searchAllCached("homepage", { ...options, force: true })).resolves.toEqual(
      refreshed
    );
    expect(calls[0]?.input).toBe("/admin/api/search?q=homepage&limit=12&dateRange=last-30-days");
    expect(getCachedSearchResults("homepage", options)).toEqual(refreshed);
    expect(getCachedRecentSearches()?.[0]?.query).toBe("homepage");
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("searchAll serializes dateRange", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [], meta: { dateRange: "last-30-days" } });
  };

  try {
    await searchAll("homepage", {
      limit: 12,
      dateRange: "last-30-days",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/search?q=homepage&limit=12&dateRange=last-30-days");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listRecentSearches hits GET /search/recent", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listRecentSearches();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/search/recent");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listRecentSearchesCached fetches, writes, and dedupes recent searches", async () => {
  const { restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const items = [{ query: "homepage", createdAt: "2026-06-01T00:00:00.000Z" }];

  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return jsonResponse({ items });
  };

  try {
    const [first, second] = await Promise.all([
      listRecentSearchesCached(),
      listRecentSearchesCached(),
    ]);
    expect(calls).toEqual(["/admin/api/search/recent"]);
    expect(first).toEqual(items);
    expect(second).toEqual(items);
    expect(getCachedRecentSearches()).toEqual(items);

    // The written cache serves the next read without another fetch.
    await listRecentSearchesCached();
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("clearSearchResultCache removes the memory and local response entries", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const payload = { items: [{ id: "p-1", title: "Home", type: "page", updatedAt: "now" }] };

  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return jsonResponse(payload);
  };

  try {
    const options = { limit: 12, dateRange: "last-30-days" as const };
    await searchAllCached("homepage", options);
    expect(getCachedSearchResults("homepage", options)).toEqual(payload);
    const key = getSearchResultsCacheKey("homepage", options);
    expect(storage.getItem(key)).toContain("Home");

    clearSearchResultCache("homepage", options);

    expect(getCachedSearchResults("homepage", options)).toBeNull();
    expect(storage.getItem(key)).toBeNull();
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});
