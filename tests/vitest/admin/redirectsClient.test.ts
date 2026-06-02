import { expect, test } from "vitest";

import {
  clearRedirectsCache,
  createRedirect,
  deleteRedirect,
  getCachedRedirects,
  listRedirects,
  listRedirectsCached,
  updateRedirect,
} from "../../../core/admin/services/redirectsClient";
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
  clearRedirectsCache();
  return {
    storage,
    restore: () => {
      if (originalLocal === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
      }
      clearRedirectsCache();
    },
  };
};

const redirectItem = (
  overrides: Partial<{
    id: string;
    fromPath: string;
    toPath: string;
    enabled: boolean;
  }> = {}
) => ({
  id: overrides.id ?? "redirect-1",
  fromPath: overrides.fromPath ?? "/old",
  toPath: overrides.toPath ?? "/new",
  statusCode: 301 as const,
  enabled: overrides.enabled ?? true,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
});

test("listRedirects hits GET /redirects", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listRedirects();
    expect(calls[0]?.input).toBe("/admin/api/redirects");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listRedirectsCached reads from local storage", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const cached = [redirectItem({ id: "redirect-cached" })];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    setCacheValue(storage, cacheKeys.redirectsList, cached);
    await expect(listRedirectsCached()).resolves.toEqual(cached);
    expect(getCachedRedirects()).toEqual(cached);
    expect(calls).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("createRedirect uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "redirect-1" });
  };

  try {
    resetCsrfToken();
    await createRedirect({
      fromPath: "/old",
      toPath: "/new",
      statusCode: 301,
      enabled: true,
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/redirects");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateRedirect uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "redirect-1" });
  };

  try {
    resetCsrfToken();
    await updateRedirect("redirect-1", { enabled: false });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/redirects/redirect-1");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteRedirect uses CSRF and DELETE", async () => {
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
    await deleteRedirect("redirect-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/redirects/redirect-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("redirect mutations patch cached list and broadcast", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));
  const created = redirectItem({ id: "redirect-2", fromPath: "/legacy" });
  const updated = redirectItem({ id: "redirect-1", enabled: false });

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (url === "/admin/api/redirects" && init?.method === "POST") {
      return jsonResponse(created);
    }
    if (url === "/admin/api/redirects/redirect-1" && init?.method === "PATCH") {
      return jsonResponse(updated);
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    setCacheValue(storage, cacheKeys.redirectsList, [redirectItem({ id: "redirect-1" })]);

    await createRedirect({
      fromPath: "/legacy",
      toPath: "/new",
      statusCode: 301,
      enabled: true,
    });
    expect(getCachedRedirects()?.map((item) => item.id)).toEqual(["redirect-2", "redirect-1"]);

    await updateRedirect("redirect-1", { enabled: false });
    expect(getCachedRedirects()?.find((item) => item.id === "redirect-1")?.enabled).toBe(false);

    await deleteRedirect("redirect-2");
    expect(getCachedRedirects()?.map((item) => item.id)).toEqual(["redirect-1"]);
    expect(events.filter((event) => event.key === cacheKeys.redirectsList)).toEqual([
      expect.objectContaining({ key: cacheKeys.redirectsList, action: "update" }),
      expect.objectContaining({ key: cacheKeys.redirectsList, action: "update" }),
      expect.objectContaining({ key: cacheKeys.redirectsList, action: "update" }),
    ]);
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    restore();
  }
});
