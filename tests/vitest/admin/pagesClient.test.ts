import { afterEach, expect, test, vi } from "vitest";

import {
  autosavePage,
  clearPagesCache,
  createPage,
  deletePage,
  duplicatePage,
  getCachedPageDetail,
  getCachedPages,
  getPageTemplateOptions,
  getPageCached,
  discardPageRevision,
  listPageRevisions,
  listPages,
  listPagesCached,
  previewPage,
  publishPage,
  restorePageRevision,
  unpublishPage,
  updatePage,
} from "../../../core/admin/services/pagesClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys, cacheTtlMs } from "../../../core/admin/services/cachePolicy";
import {
  subscribeCacheEvents,
  type CacheEvent,
} from "../../../core/admin/utils/cacheBus";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

const resetCaches = () => {
  clearPagesCache();
};

const setCacheValue = (
  storage: ReturnType<typeof createLocalStorage>,
  key: string,
  value: unknown
) => {
  storage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
};

const readCacheValue = (storage: ReturnType<typeof createLocalStorage>, key: string) => {
  const raw = storage.getItem(key);
  return raw ? (JSON.parse(raw) as { value: unknown }).value : null;
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
      resetCaches();
    },
  };
};

const installFetch = (
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
) => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return handler(input, init);
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
};

const pageSummary = (overrides: Partial<{
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "archived";
  updatedAt: string;
  author: null;
}> = {}) => ({
  id: overrides.id ?? "page-1",
  title: overrides.title ?? "Home",
  slug: overrides.slug ?? "/",
  status: overrides.status ?? "draft",
  updatedAt: overrides.updatedAt ?? "2026-02-14T00:00:00.000Z",
  author: overrides.author ?? null,
});

const pageDetail = (overrides: Partial<{
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "archived";
  currentData: Record<string, unknown>;
  updatedAt: string;
  author: null;
}> = {}) => ({
  id: overrides.id ?? "page-1",
  title: overrides.title ?? "Home",
  slug: overrides.slug ?? "/",
  status: overrides.status ?? "draft",
  updatedAt: overrides.updatedAt ?? "2026-02-14T00:00:00.000Z",
  currentData: overrides.currentData ?? { blocks: [] },
  ...(Object.prototype.hasOwnProperty.call(overrides, "author")
    ? { author: overrides.author ?? null }
    : {}),
});

afterEach(() => {
  vi.useRealTimers();
});

test("listPages hits GET /pages", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listPages();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/pages");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createPage uses CSRF and posts payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "page-1" });
  };

  try {
    resetCsrfToken();
    await createPage({
      title: "Home",
      slug: "/",
      data: { blocks: [] },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/pages");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.title).toBe("Home");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("previewPage posts ttlMinutes with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ token: "t", previewUrl: "https://example.com", expiresAt: "soon" });
  };

  try {
    resetCsrfToken();
    await previewPage("page-123", 30);

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/pages/page-123/preview");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.ttlMinutes).toBe(30);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("previewPage posts probe flag and normalizes redacted probe metadata", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      token: "t",
      previewUrl: "https://example.com/preview?type=page&token=secret-token",
      expiresAt: "soon",
      probe: {
        ok: false,
        status: 503,
        reason: "http_error",
        targetLabel:
          "https://example.com/preview?type=page&token=secret-token&device=mobile",
      },
    });
  };

  try {
    resetCsrfToken();
    const preview = await previewPage("page-123", {
      ttlMinutes: 30,
      probe: true,
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/pages/page-123/preview");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body).toEqual({ ttlMinutes: 30, probe: true });
    expect(preview.probe).toEqual({
      ok: false,
      status: 503,
      reason: "http_error",
      targetLabel: "https://example.com/preview",
    });
    expect(JSON.stringify(preview.probe)).not.toContain("secret-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("publishPage posts empty object payload when publishing from list", async () => {
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
    await publishPage("page-1");

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/pages/page-1/publish");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(calls[1]?.init?.body as string)).toEqual({});
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("duplicatePage posts to duplicate endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "page-copy" });
  };

  try {
    resetCsrfToken();
    await duplicatePage("page-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/pages/page-1/duplicate");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("autosavePage posts payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      savedAt: "2026-03-06T12:00:00.000Z",
      reusedRevision: false,
      revision: {
        id: "rev-1",
        pageId: "page-1",
        version: 2,
        kind: "autosave",
        data: { blocks: [] },
        createdAt: "2026-03-06T12:00:00.000Z",
        createdBy: null,
      },
    });
  };

  try {
    resetCsrfToken();
    await autosavePage("page-1", {
      title: "Draft title",
      slug: "/draft-title",
      data: { blocks: [] },
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/pages/page-1/autosave");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listPageRevisions calls revisions endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listPageRevisions("page-1");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/pages/page-1/revisions");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("restorePageRevision posts restore endpoint with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      ok: true,
      restored: true,
      revision: {
        id: "rev-1",
        pageId: "page-1",
        version: 2,
        kind: "autosave",
        data: { blocks: [] },
        createdAt: "2026-03-06T12:00:00.000Z",
        createdBy: null,
      },
      page: {
        id: "page-1",
        title: "Restored",
        slug: "/restored",
        status: "draft",
        currentData: { blocks: [] },
        updatedAt: "2026-03-06T12:00:00.000Z",
      },
    });
  };

  try {
    resetCsrfToken();
    await restorePageRevision("page-1", "rev-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/pages/page-1/revisions/rev-1/restore");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("discardPageRevision deletes autosave revision with CSRF", async () => {
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
    await discardPageRevision("page-1", "rev-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/pages/page-1/revisions/rev-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listPagesCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    const cached = [
      {
        id: "page-1",
        title: "Home",
        slug: "/",
        status: "draft" as const,
        updatedAt: "2026-02-14T00:00:00.000Z",
        author: null,
      },
    ];
    storage.setItem(
      cacheKeys.pagesList,
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listPagesCached();
    expect(result).toEqual(cached);
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches();
  }
});

test("getPageCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ id: "page-2" });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    const cached = {
      id: "page-2",
      title: "Docs",
      slug: "/docs",
      status: "draft" as const,
      currentData: { blocks: [] },
      updatedAt: "2026-02-14T00:00:00.000Z",
      author: null,
    };
    storage.setItem(
      cacheKeys.pageDetail("page-2"),
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await getPageCached("page-2");
    expect(result?.id).toBe("page-2");
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches();
  }
});

test("listPagesCached dedupes in-flight reads and force refreshes cache", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  let resolveFirst: ((response: Response) => void) | null = null;
  const firstResponse = new Promise<Response>((resolve) => {
    resolveFirst = resolve;
  });
  const fetchMock = installFetch(async () => firstResponse);

  try {
    resetCaches();
    const first = listPagesCached();
    const second = listPagesCached();
    expect(fetchMock.calls).toHaveLength(1);

    const finishFirst = resolveFirst as unknown as ((response: Response) => void) | null;
    if (finishFirst) {
      finishFirst(jsonResponse([pageSummary({ id: "page-1", title: "Cached" })]));
    }
    expect(await first).toEqual([pageSummary({ id: "page-1", title: "Cached" })]);
    expect(await second).toEqual([pageSummary({ id: "page-1", title: "Cached" })]);
    expect(readCacheValue(storage, cacheKeys.pagesList)).toEqual([
      pageSummary({ id: "page-1", title: "Cached" }),
    ]);

    fetchMock.restore();
    const forcedFetch = installFetch(async () =>
      jsonResponse([pageSummary({ id: "page-2", title: "Forced" })])
    );
    const forced = await listPagesCached({ force: true });
    expect(forcedFetch.calls).toHaveLength(1);
    expect(forced).toEqual([pageSummary({ id: "page-2", title: "Forced" })]);
    forcedFetch.restore();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("listPagesCached ignores expired in-memory list cache", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-24T10:00:00.000Z"));

  const { storage, restore: restoreStorage } = installLocalStorage();
  const stale = [pageSummary({ id: "page-stale", title: "Stale" })];
  const fresh = [pageSummary({ id: "page-fresh", title: "Fresh" })];
  const fetchMock = installFetch(async () => jsonResponse(fresh));

  try {
    resetCaches();
    setCacheValue(storage, cacheKeys.pagesList, stale);
    expect(await listPagesCached()).toEqual(stale);

    vi.setSystemTime(new Date(Date.now() + cacheTtlMs.list + 1000));

    expect(await listPagesCached()).toEqual(fresh);
    expect(fetchMock.calls).toHaveLength(1);
    expect(fetchMock.calls[0]?.input).toBe("/admin/api/pages");
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("getPageCached forced fetch primes detail cache without creating an authorless list entry", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch(async () =>
    jsonResponse(
      pageDetail({
        id: "page-7",
        title: "Fetched detail",
        slug: "/fetched-detail",
        currentData: { blocks: [{ id: "b1" }] },
      })
    )
  );

  try {
    resetCaches();
    const result = await getPageCached("page-7", { force: true });
    expect(fetchMock.calls[0]?.input).toBe("/admin/api/pages/page-7");
    expect(result.title).toBe("Fetched detail");
    expect(readCacheValue(storage, cacheKeys.pageDetail("page-7"))).toMatchObject({
      id: "page-7",
      title: "Fetched detail",
    });
    expect(readCacheValue(storage, cacheKeys.pagesList)).toBeNull();
    expect(getCachedPageDetail("page-7")?.title).toBe("Fetched detail");
    expect(getCachedPages()).toBeNull();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("detail-style page updates preserve existing author data in cached page lists", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    return jsonResponse(
      pageDetail({
        id: "page-1",
        title: "Updated Home",
        slug: "/updated-home",
      })
    );
  });

  try {
    resetCsrfToken();
    resetCaches();
    setCacheValue(storage, cacheKeys.pagesList, [
      {
        ...pageSummary({ id: "page-1", title: "Home", slug: "/" }),
        author: {
          id: "author-1",
          name: "Admin User",
          email: "admin@example.com",
        },
      },
    ]);

    await updatePage("page-1", { title: "Updated Home" });

    expect(readCacheValue(storage, cacheKeys.pagesList)).toEqual([
      {
        ...pageSummary({
          id: "page-1",
          title: "Updated Home",
          slug: "/updated-home",
        }),
        author: {
          id: "author-1",
          name: "Admin User",
          email: "admin@example.com",
        },
      },
    ]);
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("page mutations synchronize caches and invalidate list entries when create-style payloads lack author details", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));
  const responses = new Map<string, unknown>([
    ["/admin/api/pages/page-1/publish", { ok: true }],
    ["/admin/api/pages/page-1/unpublish", { ok: true }],
    [
      "/admin/api/pages/page-1/duplicate",
      pageDetail({
        id: "page-copy",
        title: "Updated Home (copy)",
        slug: "/copy",
      }),
    ],
    [
      "/admin/api/pages/page-1/revisions/rev-1/restore",
      {
        ok: true,
        restored: true,
        revision: {
          id: "rev-1",
          pageId: "page-1",
          version: 2,
          kind: "autosave",
          data: { blocks: [] },
          createdAt: "2026-02-14T00:00:00.000Z",
          createdBy: null,
        },
        page: pageDetail({
          id: "page-1",
          title: "Restored Home",
          slug: "/restored-home",
        }),
      },
    ],
    ["/admin/api/pages/page-1", { ok: true }],
  ]);
  const fetchMock = installFetch(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (url === "/admin/api/pages/page-1") {
      const method = init?.method ?? "GET";
      if (method === "DELETE") return jsonResponse({ ok: true });
      return jsonResponse(
        pageDetail({
          id: "page-1",
          title: "Updated Home",
          status: "draft",
          currentData: { blocks: [{ id: "updated" }] },
        })
      );
    }
    return jsonResponse(responses.get(url) ?? { ok: true });
  });

  try {
    resetCsrfToken();
    resetCaches();
    setCacheValue(storage, cacheKeys.pagesList, [
      pageSummary({ id: "page-1", title: "Home", status: "draft" }),
    ]);
    setCacheValue(
      storage,
      cacheKeys.pageDetail("page-1"),
      pageDetail({ id: "page-1", title: "Home", status: "draft" })
    );

    await updatePage("page-1", { title: "Updated Home" });
    expect(readCacheValue(storage, cacheKeys.pageDetail("page-1"))).toMatchObject({
      title: "Updated Home",
    });
    expect(readCacheValue(storage, cacheKeys.pagesList)).toEqual([
      pageSummary({ id: "page-1", title: "Updated Home", status: "draft" }),
    ]);

    await publishPage("page-1");
    expect(readCacheValue(storage, cacheKeys.pageDetail("page-1"))).toMatchObject({
      status: "published",
    });
    expect(readCacheValue(storage, cacheKeys.pagesList)).toEqual([
      pageSummary({ id: "page-1", title: "Updated Home", status: "published" }),
    ]);

    await unpublishPage("page-1");
    expect(readCacheValue(storage, cacheKeys.pageDetail("page-1"))).toMatchObject({
      status: "draft",
    });

    await duplicatePage("page-1");
    expect(readCacheValue(storage, cacheKeys.pagesList)).toBeNull();
    expect(readCacheValue(storage, cacheKeys.pageDetail("page-copy"))).toMatchObject({
      id: "page-copy",
      title: "Updated Home (copy)",
      slug: "/copy",
    });

    await restorePageRevision("page-1", "rev-1");
    expect(readCacheValue(storage, cacheKeys.pageDetail("page-1"))).toMatchObject({
      title: "Restored Home",
      slug: "/restored-home",
    });

    await deletePage("page-1");
    expect(readCacheValue(storage, cacheKeys.pagesList)).toBeNull();
    expect(storage.getItem(cacheKeys.pageDetail("page-1"))).toBeNull();

    const eventPairs = events.map((event) => `${event.action}:${event.key}`);
    expect(eventPairs).toEqual(
      expect.arrayContaining([
        `update:${cacheKeys.pagesList}`,
        `update:${cacheKeys.pageDetail("page-1")}`,
        `update:${cacheKeys.pageDetail("page-copy")}`,
        `invalidate:${cacheKeys.pagesList}`,
        `invalidate:${cacheKeys.pageDetail("page-1")}`,
      ])
    );
    expect(fetchMock.calls.some((call) => String(call.input).endsWith("/auth/csrf"))).toBe(true);
  } finally {
    unsubscribe();
    fetchMock.restore();
    restoreStorage();
  }
});

test("noop mutation responses do not corrupt existing page caches", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    return jsonResponse(null);
  });

  try {
    resetCsrfToken();
    resetCaches();
    const cachedList = [pageSummary({ id: "page-1", title: "Stable" })];
    const cachedDetail = pageDetail({ id: "page-1", title: "Stable" });
    setCacheValue(storage, cacheKeys.pagesList, cachedList);
    setCacheValue(storage, cacheKeys.pageDetail("page-1"), cachedDetail);

    await updatePage("page-1", { title: "Ignored" });
    await duplicatePage("page-1");
    await restorePageRevision("page-1", "rev-1");

    expect(readCacheValue(storage, cacheKeys.pagesList)).toEqual(cachedList);
    expect(readCacheValue(storage, cacheKeys.pageDetail("page-1"))).toEqual(
      cachedDetail
    );
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("clearPagesCache clears memory and local list cache", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch(async () =>
    jsonResponse([pageSummary({ id: "page-network", title: "Network" })])
  );

  try {
    resetCaches();
    setCacheValue(storage, cacheKeys.pagesList, [
      pageSummary({ id: "page-1", title: "Cached" }),
    ]);

    expect(await listPagesCached()).toEqual([
      pageSummary({ id: "page-1", title: "Cached" }),
    ]);
    clearPagesCache();
    expect(storage.getItem(cacheKeys.pagesList)).toBeNull();
    expect(await listPagesCached()).toEqual([
      pageSummary({ id: "page-network", title: "Network" }),
    ]);
    expect(fetchMock.calls).toHaveLength(1);
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("getPageTemplateOptions hits template options endpoint", async () => {
  const fetchMock = installFetch(async () =>
    jsonResponse({
      themeName: "default",
      templates: [{ key: "landing", label: "Landing" }],
    })
  );

  try {
    const result = await getPageTemplateOptions();
    expect(fetchMock.calls[0]?.input).toBe("/admin/api/pages/template-options");
    expect(fetchMock.calls[0]?.init?.method).toBe("GET");
    expect(result.templates[0]?.key).toBe("landing");
  } finally {
    fetchMock.restore();
  }
});
