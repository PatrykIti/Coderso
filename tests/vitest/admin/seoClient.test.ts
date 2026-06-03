import { expect, test } from "vitest";

import {
  clearSeoCache,
  getCachedSeo,
  getCachedSeoDetail,
  getSeoCached,
  listSeo,
  listSeoCached,
  runSeoAudit,
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
