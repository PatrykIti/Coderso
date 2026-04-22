import { expect, test } from "vitest";

import {
  createMenu,
  clearMenusCache,
  getCachedMenus,
  getMenuWithItems,
  getMenuWithItemsCached,
  listMenus,
  listMenusCached,
} from "../../../core/admin/services/menusClient";
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

const resetCaches = () => {
  clearMenusCache();
};

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
    return jsonResponse({ menu: { id: "menu-1", name: "Main", location: null, createdAt: "" }, items: [] });
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
    const cached = [
      {
        id: "menu-1",
        name: "Main",
        location: null,
        createdAt: "2026-02-16T00:00:00.000Z",
      },
    ];
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
    return jsonResponse({ menu: { id: "menu-1" }, items: [] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    const cached = {
      menu: {
        id: "menu-1",
        name: "Main",
        location: null,
        createdAt: "2026-02-16T00:00:00.000Z",
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
