import { beforeEach, expect, test } from "vitest";

import {
  createMenu,
  clearMenusCache,
  deleteMenu,
  getCachedMenus,
  getMenuWithItems,
  getMenuWithItemsCached,
  listMenus,
  listMenusCached,
  moveMenuToDraft,
  publishMenu,
  type MenuSummary,
} from "../../../core/admin/services/menusClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

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

const resetCaches = () => {
  clearMenusCache();
};

const makeMenuSummary = (overrides: Partial<MenuSummary> = {}): MenuSummary => ({
  id: "menu-1",
  name: "Main",
  location: null,
  status: "published",
  publishedAt: "2026-02-16T00:00:00.000Z",
  createdAt: "2026-02-16T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  resetCaches();
  resetCsrfToken();
});

test("listMenus hits /menus", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listMenus();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/menus");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getMenuWithItems hits /menus/:id", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ menu: makeMenuSummary(), items: [] });
  };

  try {
    await getMenuWithItems("menu-1");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/menus/menu-1");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listMenusCached reads from local storage", async () => {
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
    const cached = [makeMenuSummary()];
    storage.setItem(
      cacheKeys.menusList,
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listMenusCached();
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

test("getMenuWithItemsCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ menu: makeMenuSummary(), items: [] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    const cached = {
      menu: {
        ...makeMenuSummary(),
      },
      items: [],
    };
    storage.setItem(
      cacheKeys.menuDetail("menu-1"),
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await getMenuWithItemsCached("menu-1");
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

test("createMenu primes list cache for immediate list rendering", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();

  globalThis.fetch = async () =>
    jsonResponse({
      id: "menu-2",
      name: "Footer",
      location: "footer",
      status: "draft",
      publishedAt: null,
      createdAt: "2026-04-22T00:00:00.000Z",
    });
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    await createMenu({ name: "Footer", location: "footer" });
    expect(getCachedMenus()).toEqual([
      {
        id: "menu-2",
        name: "Footer",
        location: "footer",
        status: "draft",
        publishedAt: null,
        createdAt: "2026-04-22T00:00:00.000Z",
      },
    ]);
    expect(storage.getItem(cacheKeys.menusList)).toContain("Footer");
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

test("listMenusCached ignores stale cached summaries without lifecycle fields", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([makeMenuSummary({ id: "menu-fresh", name: "Fresh" })]);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.menusList,
      JSON.stringify({
        value: [
          {
            id: "menu-stale",
            name: "Stale",
            location: null,
            createdAt: "2026-02-16T00:00:00.000Z",
          },
        ],
        savedAt: Date.now(),
      })
    );

    const result = await listMenusCached();
    expect(result.map((item) => item.id)).toEqual(["menu-fresh"]);
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("publishMenu and moveMenuToDraft send lifecycle PATCH requests with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const responses = [
    jsonResponse({ token: "csrf-token" }),
    jsonResponse(makeMenuSummary({ status: "published" })),
    jsonResponse(makeMenuSummary({ status: "draft", publishedAt: null })),
  ];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return responses.shift() ?? jsonResponse(makeMenuSummary());
  };

  try {
    await publishMenu("menu-1");
    await moveMenuToDraft("menu-1");

    expect(calls.map((call) => call.input)).toEqual([
      "/admin/api/auth/csrf",
      "/admin/api/menus/menu-1",
      "/admin/api/menus/menu-1",
    ]);
    expect(calls[1]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[1]?.init?.body as string)).toEqual({
      status: "published",
    });
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe(
      "csrf-token"
    );
    expect(JSON.parse(calls[2]?.init?.body as string)).toEqual({
      status: "draft",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteMenu removes list and detail cache entries", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();

  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.menusList,
      JSON.stringify({ value: [makeMenuSummary()], savedAt: Date.now() })
    );
    storage.setItem(
      cacheKeys.menuDetail("menu-1"),
      JSON.stringify({
        value: { menu: makeMenuSummary(), items: [] },
        savedAt: Date.now(),
      })
    );

    await deleteMenu("menu-1");

    expect(getCachedMenus()).toEqual([]);
    expect(storage.getItem(cacheKeys.menuDetail("menu-1"))).toBeNull();
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
