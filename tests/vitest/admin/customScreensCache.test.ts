import { afterEach, describe, expect, test, vi } from "vitest";
import { readFile } from "node:fs/promises";

import {
  clearCustomScreensCacheLightweight,
  clearCustomScreenDetailBrowserCache,
  clearCustomScreensBrowserCache,
  registerCustomScreensCacheInvalidator,
} from "../../../core/admin/services/customScreensCache";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const read = (path: string) => readFile(path, "utf8");

let originalLocalStorage: unknown;

const installStorage = () => {
  originalLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  } as unknown;
};

afterEach(() => {
  if (originalLocalStorage === undefined) {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  } else {
    (globalThis as { localStorage?: unknown }).localStorage = originalLocalStorage;
  }
  originalLocalStorage = undefined;
});

describe("customScreensCache lightweight invalidation owner", () => {
  test("registerCustomScreensCacheInvalidator adds and unregisters invalidators", () => {
    const invalidator = vi.fn();
    const unregister = registerCustomScreensCacheInvalidator(invalidator);

    clearCustomScreensCacheLightweight();
    expect(invalidator).toHaveBeenCalledTimes(1);

    unregister();
    clearCustomScreensCacheLightweight();
    expect(invalidator).toHaveBeenCalledTimes(1);
  });

  test("clearCustomScreensCacheLightweight clears the browser list key", () => {
    installStorage();
    const invalidator = vi.fn();
    const unregister = registerCustomScreensCacheInvalidator(invalidator);

    localStorage.setItem(cacheKeys.customScreensList, JSON.stringify({ items: [] }));
    clearCustomScreensCacheLightweight();
    expect(localStorage.getItem(cacheKeys.customScreensList)).toBeNull();
    expect(invalidator).toHaveBeenCalledTimes(1);

    unregister();
  });

  test("a failing invalidator does not prevent later invalidators", () => {
    const failing = vi.fn(() => {
      throw new Error("boom");
    });
    const healthy = vi.fn();
    const unregisterFailing = registerCustomScreensCacheInvalidator(failing);
    const unregisterHealthy = registerCustomScreensCacheInvalidator(healthy);

    expect(() => clearCustomScreensCacheLightweight()).not.toThrow();
    expect(healthy).toHaveBeenCalledTimes(1);

    unregisterFailing();
    unregisterHealthy();
  });

  test("browser-key helpers stay backward compatible", () => {
    installStorage();
    localStorage.setItem(cacheKeys.customScreensList, JSON.stringify({ items: [] }));
    localStorage.setItem(cacheKeys.customScreenDetail("screen-1"), JSON.stringify({}));

    clearCustomScreensBrowserCache();
    expect(localStorage.getItem(cacheKeys.customScreensList)).toBeNull();

    clearCustomScreenDetailBrowserCache("screen-1");
    expect(localStorage.getItem(cacheKeys.customScreenDetail("screen-1"))).toBeNull();
  });

  test("module stays lightweight: no full client, domain, or runtime imports", async () => {
    const source = await read("core/admin/services/customScreensCache.ts");

    expect(source).not.toContain("./customScreensClient");
    expect(source).not.toContain("customScreenSchemas");
    expect(source).not.toContain("capabilities");
    expect(source).not.toContain("bindingResolver");
    expect(source).not.toContain("widgets/runtime");
    expect(source).toContain('from "@/utils/storageCache"');
    expect(source).toContain('from "@/services/cachePolicy"');
  });

  test("assistant custom screen invalidation stays lightweight", async () => {
    const source = await read("core/admin/services/assistantClient.ts");

    expect(source).not.toContain("./customScreensClient");
    expect(source).toContain("./customScreensCache");
  });
});
