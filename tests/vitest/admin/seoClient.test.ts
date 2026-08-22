import { expect, test } from "vitest";

import {
  clearSeoCache,
  getCachedSeo,
  getCachedSeoDetail,
  getCachedSeoOverview,
  getSearchPerformance,
  getSeoOverview,
  getSeoCached,
  listSeo,
  listSeoCached,
  runSeoAudit,
  submitSitemap,
  syncSearchPerformance,
  updateSeo,
} from "../../../core/admin/services/seoClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { subscribeCacheEvents, type CacheEvent } from "../../../core/admin/utils/cacheBus";

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
      clearSeoCache();
    },
  };
};

const seoItem = (
  overrides: Partial<{
    id: string;
    title: string | null;
    score: number | null;
    status: "ok" | "warning" | "issue";
  }> = {}
) => ({
  id: overrides.id ?? "seo-1",
  targetType: "page" as const,
  targetId: "page-1",
  targetTitle: "Home",
  slug: "/",
  title: overrides.title ?? "Home title",
  description: "Home description",
  canonicalUrl: null,
  robots: null,
  score: overrides.score ?? 90,
  status: overrides.status ?? "ok",
  issues: [],
  lastAuditAt: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
});

test("listSeo hits GET /seo", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listSeo();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/seo");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listSeoCached and getSeoCached read from local storage", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const cachedList = [seoItem({ id: "seo-list", title: "Cached list" })];
  const cachedDetail = seoItem({ id: "seo-detail", title: "Cached detail" });

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    setCacheValue(storage, cacheKeys.seoList, cachedList);
    setCacheValue(storage, cacheKeys.seoDetail("seo-detail"), cachedDetail);

    await expect(listSeoCached()).resolves.toEqual(cachedList);
    await expect(getSeoCached("seo-detail")).resolves.toEqual(cachedDetail);
    expect(getCachedSeo()).toEqual(cachedList);
    expect(getCachedSeoDetail("seo-detail")).toEqual(cachedDetail);
    expect(calls).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("updateSeo patches list and detail caches and broadcasts events", async () => {
  const { storage, restore } = installLocalStorage();
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));
  const originalFetch = globalThis.fetch;
  const updated = seoItem({ id: "seo-1", title: "Updated title", score: 96 });

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    return jsonResponse(updated);
  };

  try {
    resetCsrfToken();
    setCacheValue(storage, cacheKeys.seoList, [seoItem({ id: "seo-1", title: "Old" })]);
    setCacheValue(storage, cacheKeys.seoDetail("seo-1"), seoItem({ id: "seo-1", title: "Old" }));

    await updateSeo("seo-1", { title: "Updated title" });

    expect(getCachedSeo()?.[0]?.title).toBe("Updated title");
    expect(getCachedSeoDetail("seo-1")?.score).toBe(96);
    expect(events.map((event) => `${event.action}:${event.key}`)).toEqual(
      expect.arrayContaining([
        `update:${cacheKeys.seoList}`,
        `update:${cacheKeys.seoDetail("seo-1")}`,
      ])
    );
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("runSeoAudit clears known SEO caches and broadcasts invalidation", async () => {
  const { storage, restore } = installLocalStorage();
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    return jsonResponse({ audited: 1 });
  };

  try {
    resetCsrfToken();
    setCacheValue(storage, cacheKeys.seoList, [seoItem({ id: "seo-1" })]);
    setCacheValue(storage, cacheKeys.seoDetail("seo-1"), seoItem({ id: "seo-1" }));
    expect(getCachedSeoDetail("seo-1")).not.toBeNull();

    await runSeoAudit({ targetType: "page", targetId: "page-1" });

    expect(getCachedSeo()).toBeNull();
    expect(getCachedSeoDetail("seo-1")).toBeNull();
    expect(events.map((event) => `${event.action}:${event.key}`)).toEqual(
      expect.arrayContaining([
        `invalidate:${cacheKeys.seoList}`,
        `invalidate:${cacheKeys.seoDetail("seo-1")}`,
      ])
    );
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("updateSeo uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "seo-1" });
  };

  try {
    resetCsrfToken();
    await updateSeo("seo-1", { title: "Title", description: "Desc" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/seo/seo-1");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runSeoAudit uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ audited: 1 });
  };

  try {
    resetCsrfToken();
    await runSeoAudit({ targetType: "page", targetId: "page-1", checks: ["meta", "links"] });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/seo/audit");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({ targetType: "page", targetId: "page-1", checks: ["meta", "links"] })
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listSeoCached fetches, primes the cache, and dedupes concurrent reads", async () => {
  const { restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const items = [seoItem(), seoItem({ id: "seo-2", title: "About title" })];

  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return jsonResponse(items);
  };

  try {
    const [first, second] = await Promise.all([listSeoCached(), listSeoCached()]);
    expect(calls).toEqual(["/admin/api/seo"]);
    expect(first).toEqual(items);
    expect(second).toEqual(items);
    expect(getCachedSeo()).toEqual(items);

    // The primed cache serves the third read without another fetch.
    await listSeoCached();
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("getSeoCached fetches and upserts the detail when nothing is cached", async () => {
  const { restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const item = seoItem({ id: "seo-1", title: "Fetched title" });

  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return jsonResponse(item);
  };

  try {
    const result = await getSeoCached("seo-1");
    expect(calls).toEqual(["/admin/api/seo/seo-1"]);
    expect(result).toEqual(item);
    expect(getCachedSeoDetail("seo-1")?.title).toBe("Fetched title");
    expect(getCachedSeo()?.some((listed) => listed.id === "seo-1")).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("getCachedSeoDetail falls back to the primed list cache", async () => {
  const { restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const items = [seoItem({ id: "seo-1", title: "List title" })];

  globalThis.fetch = async () => jsonResponse(items);

  try {
    await listSeoCached();
    // No memory detail and no local detail: the primed list row is the source.
    expect(getCachedSeoDetail("seo-1")?.title).toBe("List title");
    // The fallback write makes the detail directly readable afterwards.
    expect(getCachedSeoDetail("seo-1")?.title).toBe("List title");
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("syncSearchPerformance posts the sync window with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await syncSearchPerformance({ startDate: "2026-06-01", endDate: "2026-06-30" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/seo/search-performance/sync");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({ startDate: "2026-06-01", endDate: "2026-06-30" })
    );
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("submitSitemap posts the sitemap path with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await submitSitemap({ sitemapPath: "/sitemap.xml" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/seo/sitemap/submit");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBe(JSON.stringify({ sitemapPath: "/sitemap.xml" }));
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSeoOverview reads through the overview cache", async () => {
  const { restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  const overview = { pages: 4, entries: 8, issues: 2, averageScore: 87.5 };

  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return jsonResponse(overview);
  };

  try {
    const first = await getSeoOverview();
    expect(calls).toEqual(["/admin/api/seo/overview"]);
    expect(first).toEqual(overview);
    expect(getCachedSeoOverview()).toEqual(overview);

    // The overview cache serves the second read without another fetch.
    const second = await getSeoOverview();
    expect(calls).toHaveLength(1);
    expect(second).toEqual(overview);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("getSearchPerformance serializes only the provided params", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return jsonResponse({});
  };

  try {
    await getSearchPerformance({
      targetId: "page-1",
      startDate: "2026-06-01",
      limit: 25,
    });
    expect(calls[0]).toBe(
      "/admin/api/seo/search-performance?targetId=page-1&startDate=2026-06-01&limit=25"
    );

    // Undefined params are omitted entirely.
    await getSearchPerformance({ endDate: "2026-06-30" });
    expect(calls[1]).toBe("/admin/api/seo/search-performance?endDate=2026-06-30");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
