import { expect, test, vi } from "vitest";

import {
  createAdminPrefetcher,
  prefetchSettingsRoute,
  prefetchWarmupOptions,
  resolveCollectionWorkspacePrefetchTarget,
  resolveDetailTemplatePrefetchTarget,
  type AdminPrefetchEntry,
} from "../../../core/admin/utils/adminPrefetch";
import { clearContentTypesCache } from "../../../core/admin/services/contentTypesClient";
import { clearMenusCache } from "../../../core/admin/services/menusClient";
import { clearPagesCache } from "../../../core/admin/services/pagesClient";
import { clearPageTemplatesCache } from "../../../core/admin/services/pageTemplatesClient";
import { clearSiteSettingsCache } from "../../../core/admin/services/siteSettingsClient";

const withWindow = async (fn: () => Promise<void> | void) => {
  const original = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {};
  try {
    await fn();
  } finally {
    if (original === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = original;
    }
  }
};

const flushAsync = async () => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const createDeferred = () => {
  let resolver: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  return {
    promise,
    resolve: () => resolver?.(),
  };
};

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

const installLocalStorage = () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  return () => {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearSiteSettingsCache();
    clearPagesCache();
    clearContentTypesCache();
    clearMenusCache();
    clearPageTemplatesCache();
  };
};

const jsonResponse = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
  });

test("prefetch warmup options default to force false", () => {
  expect(prefetchWarmupOptions).toEqual({ force: false });
});

test("settings site prefetch warms settings and selector caches once", async () => {
  const restoreStorage = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/settings")) {
      return jsonResponse({
        "site.name": "Coderso",
        "site.locale": "en",
        "site.adminPath": "/admin",
        "site.cacheTtlSeconds": 30,
        "site.contentRoutes": [],
      });
    }
    if (url.endsWith("/pages")) {
      return jsonResponse([]);
    }
    if (url.endsWith("/content-types")) {
      return jsonResponse([]);
    }
    if (url.endsWith("/menus")) {
      return jsonResponse([]);
    }
    if (url.endsWith("/page-templates")) {
      return jsonResponse({ items: [] });
    }
    return jsonResponse({});
  };

  try {
    clearSiteSettingsCache();
    clearPagesCache();
    clearContentTypesCache();
    clearMenusCache();
    clearPageTemplatesCache();

    await prefetchSettingsRoute("/settings/site");
    await prefetchSettingsRoute("/settings/site");

    const paths = calls.map((call) => String(call.input));
    expect(paths.filter((path) => path.endsWith("/settings"))).toHaveLength(1);
    expect(paths.filter((path) => path.endsWith("/pages"))).toHaveLength(1);
    expect(paths.filter((path) => path.endsWith("/content-types"))).toHaveLength(1);
    // Site shell pickers moved to the Menus-surface SiteShellDialog
    // (TASK-458-01): the Site Settings prefetch no longer warms menus or
    // page-template caches.
    expect(paths.filter((path) => path.endsWith("/menus"))).toHaveLength(0);
    expect(paths.filter((path) => path.endsWith("/page-templates"))).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("collection workspace prefetch target resolves only canonical engine workspace paths", () => {
  expect(
    resolveCollectionWorkspacePrefetchTarget("/advanced/engine/ct-products/collection")
  ).toEqual({ contentTypeId: "ct-products" });
  expect(resolveCollectionWorkspacePrefetchTarget("/content-types/ct-products/collection")).toEqual(
    { contentTypeId: "ct-products" }
  );
  expect(resolveCollectionWorkspacePrefetchTarget("/advanced/engine")).toBeNull();
  expect(resolveCollectionWorkspacePrefetchTarget("/advanced/engine/ct-products")).toBeNull();
  expect(
    resolveCollectionWorkspacePrefetchTarget(
      "/advanced/engine/ct-products/collection/detail-template/detail-products"
    )
  ).toBeNull();
});

test("detail template prefetch target resolves only collection editor paths", () => {
  expect(
    resolveDetailTemplatePrefetchTarget(
      "/advanced/engine/ct-products/collection/detail-template/detail-products"
    )
  ).toEqual({ contentTypeId: "ct-products", detailPageId: "detail-products" });
  expect(resolveDetailTemplatePrefetchTarget("/advanced/engine/ct-products/collection")).toBeNull();
  expect(resolveDetailTemplatePrefetchTarget("/advanced/engine/ct-products")).toBeNull();
});

test("prefetcher runs matched route once per cooldown", async () => {
  await withWindow(async () => {
    let calls = 0;
    const entries: AdminPrefetchEntry[] = [
      {
        match: "/pages",
        run: () => {
          calls += 1;
        },
      },
    ];

    let now = 0;
    const prefetch = createAdminPrefetcher(entries, {
      cooldownMs: 1000,
      schedule: (callback) => callback(),
      now: () => now,
    });

    prefetch("/admin/pages", "/admin");
    await flushAsync();
    prefetch("/admin/pages", "/admin");
    await flushAsync();
    expect(calls).toBe(1);

    now = 1500;
    prefetch("/admin/pages", "/admin");
    await flushAsync();
    expect(calls).toBe(2);
  });
});

test("prefetcher skips active route module", async () => {
  await withWindow(async () => {
    let calls = 0;
    const entries: AdminPrefetchEntry[] = [
      {
        match: "/advanced/engine",
        run: () => {
          calls += 1;
        },
      },
    ];

    const prefetch = createAdminPrefetcher(entries, {
      schedule: (callback) => callback(),
      now: () => 0,
    });

    prefetch("/admin/content-types", "/admin", {
      activeHref: "/admin/advanced/engine?tab=schema",
    });
    await flushAsync();

    expect(calls).toBe(0);
  });
});

test("prefetcher treats recently successful route as fresh and skips reruns", async () => {
  await withWindow(async () => {
    let calls = 0;
    let now = 0;
    const entries: AdminPrefetchEntry[] = [
      {
        match: "/pages",
        run: () => {
          calls += 1;
        },
      },
    ];

    const prefetch = createAdminPrefetcher(entries, {
      cooldownMs: 0,
      freshMs: 1000,
      schedule: (callback) => callback(),
      now: () => now,
    });

    prefetch("/admin/pages", "/admin");
    await flushAsync();
    expect(calls).toBe(1);

    now = 400;
    prefetch("/admin/pages", "/admin");
    await flushAsync();
    expect(calls).toBe(1);

    now = 1400;
    prefetch("/admin/pages", "/admin");
    await flushAsync();
    expect(calls).toBe(2);
  });
});

test("prefetcher enforces max concurrency and drains queued work", async () => {
  await withWindow(async () => {
    const started: string[] = [];
    const finished: string[] = [];
    const pagesDeferred = createDeferred();
    const menusDeferred = createDeferred();
    const mediaDeferred = createDeferred();

    const entries: AdminPrefetchEntry[] = [
      {
        match: "/pages",
        run: async () => {
          started.push("pages");
          await pagesDeferred.promise;
          finished.push("pages");
        },
      },
      {
        match: "/menus",
        run: async () => {
          started.push("menus");
          await menusDeferred.promise;
          finished.push("menus");
        },
      },
      {
        match: "/media",
        run: async () => {
          started.push("media");
          await mediaDeferred.promise;
          finished.push("media");
        },
      },
    ];

    const prefetch = createAdminPrefetcher(entries, {
      schedule: (callback) => callback(),
      now: () => 0,
      maxConcurrency: 2,
      cooldownMs: 0,
      freshMs: 0,
    });

    prefetch("/admin/pages", "/admin");
    prefetch("/admin/menus", "/admin");
    prefetch("/admin/media", "/admin");
    await flushAsync();

    expect(started).toEqual(["pages", "menus"]);

    pagesDeferred.resolve();
    await flushAsync();
    expect(started).toEqual(["pages", "menus", "media"]);

    menusDeferred.resolve();
    mediaDeferred.resolve();
    await flushAsync();

    expect(finished).toEqual(["pages", "menus", "media"]);
  });
});

test("default entries prefetch warms content types and all entries", async () => {
  await withWindow(async () => {
    vi.resetModules();
    const listContentTypesCached = vi.fn().mockResolvedValue([]);
    const getContentTypeCollectionWorkspaceCached = vi.fn().mockResolvedValue(null);
    const listAllEntriesCached = vi.fn().mockResolvedValue([]);

    vi.doMock("@/services/contentTypesClient", () => ({
      getContentTypeCollectionWorkspaceCached,
      listContentTypesCached,
    }));
    vi.doMock("@/services/entriesClient", () => ({
      listAllEntriesCached,
    }));

    try {
      const module = await import("../../../core/admin/utils/adminPrefetch");
      module.prefetchAdminRoute("/admin/advanced/entries", "/admin", {
        activeHref: "/admin/pages",
      });
      await flushAsync();

      expect(listContentTypesCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
      expect(listAllEntriesCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
    } finally {
      vi.doUnmock("@/services/contentTypesClient");
      vi.doUnmock("@/services/entriesClient");
      vi.resetModules();
    }
  });
});

test("default custom screens prefetch warms screens and content type labels", async () => {
  await withWindow(async () => {
    vi.resetModules();
    const listContentTypesCached = vi.fn().mockResolvedValue([]);
    const getContentTypeCollectionWorkspaceCached = vi.fn().mockResolvedValue(null);
    const listCustomScreensCached = vi.fn().mockResolvedValue([]);

    vi.doMock("@/services/contentTypesClient", () => ({
      getContentTypeCollectionWorkspaceCached,
      listContentTypesCached,
    }));
    vi.doMock("@/services/customScreensClient", () => ({
      listCustomScreensCached,
    }));

    try {
      const module = await import("../../../core/admin/utils/adminPrefetch");
      module.prefetchAdminRoute("/admin/advanced/custom-screens", "/admin", {
        activeHref: "/admin/pages",
      });
      await flushAsync();
      await vi.dynamicImportSettled();
      await flushAsync();

      expect(listCustomScreensCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
      expect(listContentTypesCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
    } finally {
      vi.doUnmock("@/services/contentTypesClient");
      vi.doUnmock("@/services/customScreensClient");
      vi.resetModules();
    }
  });
});

test("default collection workspace prefetch warms workspace through the engine seam", async () => {
  await withWindow(async () => {
    vi.resetModules();
    const listContentTypesCached = vi.fn().mockResolvedValue([]);
    const getContentTypeCollectionWorkspaceCached = vi.fn().mockResolvedValue({
      contentType: { id: "ct-products" },
    });

    vi.doMock("@/services/contentTypesClient", () => ({
      getContentTypeCollectionWorkspaceCached,
      listContentTypesCached,
    }));

    try {
      const module = await import("../../../core/admin/utils/adminPrefetch");
      module.prefetchAdminRoute("/admin/advanced/engine/ct-products/collection", "/admin", {
        activeHref: "/admin/pages",
      });
      await flushAsync();

      expect(listContentTypesCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
      expect(getContentTypeCollectionWorkspaceCached).toHaveBeenCalledWith(
        "ct-products",
        module.prefetchWarmupOptions
      );
    } finally {
      vi.doUnmock("@/services/contentTypesClient");
      vi.resetModules();
    }
  });
});

test("default detail template prefetch warms workspace, detail template, and sample entries", async () => {
  await withWindow(async () => {
    vi.resetModules();
    const listContentTypesCached = vi.fn().mockResolvedValue([]);
    const getContentTypeCollectionWorkspaceCached = vi.fn().mockResolvedValue({
      contentType: { id: "ct-products" },
    });
    const getDetailPageCached = vi.fn().mockResolvedValue({
      id: "detail-products",
      contentTypeSlug: "products",
    });
    const listEntriesCached = vi.fn().mockResolvedValue([]);

    vi.doMock("@/services/contentTypesClient", () => ({
      getContentTypeCollectionWorkspaceCached,
      listContentTypesCached,
    }));
    vi.doMock("@/services/detailPagesClient", () => ({
      getDetailPageCached,
    }));
    vi.doMock("@/services/entriesClient", () => ({
      getEntryCached: vi.fn(),
      listAllEntriesCached: vi.fn(),
      listEntriesCached,
    }));

    try {
      const module = await import("../../../core/admin/utils/adminPrefetch");
      module.prefetchAdminRoute(
        "/admin/advanced/engine/ct-products/collection/detail-template/detail-products",
        "/admin",
        {
          activeHref: "/admin/pages",
        }
      );
      await flushAsync();

      expect(listContentTypesCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
      expect(getContentTypeCollectionWorkspaceCached).toHaveBeenCalledWith(
        "ct-products",
        module.prefetchWarmupOptions
      );
      expect(getDetailPageCached).toHaveBeenCalledWith(
        "detail-products",
        module.prefetchWarmupOptions
      );
      expect(listEntriesCached).toHaveBeenCalledWith("products", module.prefetchWarmupOptions);
    } finally {
      vi.doUnmock("@/services/contentTypesClient");
      vi.doUnmock("@/services/detailPagesClient");
      vi.doUnmock("@/services/entriesClient");
      vi.resetModules();
    }
  });
});

test("default forms prefetch warms canonical forms list with cached options", async () => {
  await withWindow(async () => {
    vi.resetModules();
    const listFormsCached = vi.fn().mockResolvedValue([]);

    vi.doMock("@/services/formsClient", () => ({
      listFormsCached,
    }));

    try {
      const module = await import("../../../core/admin/utils/adminPrefetch");
      module.prefetchAdminRoute("/admin/forms", "/admin", {
        activeHref: "/admin/pages",
      });
      await flushAsync();

      expect(listFormsCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
    } finally {
      vi.doUnmock("@/services/formsClient");
      vi.resetModules();
    }
  });
});

test("default commerce prefetch warms products and collections with cached options", async () => {
  await withWindow(async () => {
    vi.resetModules();
    const listCommerceProductsCached = vi.fn().mockResolvedValue([]);
    const listCommerceCollectionsCached = vi.fn().mockResolvedValue([]);

    vi.doMock("@/services/commerceClient", () => ({
      listCommerceProductsCached,
      listCommerceCollectionsCached,
    }));

    try {
      const module = await import("../../../core/admin/utils/adminPrefetch");
      module.prefetchAdminRoute("/admin/advanced/commerce", "/admin", {
        activeHref: "/admin/pages",
      });
      await flushAsync();

      expect(listCommerceProductsCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
      expect(listCommerceCollectionsCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
    } finally {
      vi.doUnmock("@/services/commerceClient");
      vi.resetModules();
    }
  });
});

test("default tools prefetch warms route-specific caches", async () => {
  await withWindow(async () => {
    vi.resetModules();
    const listRecentSearchesCached = vi.fn().mockResolvedValue([]);
    const listSeoCached = vi.fn().mockResolvedValue([]);
    const getOverviewCached = vi.fn().mockResolvedValue({});
    const getTopContentCached = vi.fn().mockResolvedValue([]);
    const getTrafficOverviewCached = vi.fn().mockResolvedValue({});
    const getTopPagesCached = vi.fn().mockResolvedValue([]);
    const listBackupsCached = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const getBackupScheduleCached = vi.fn().mockResolvedValue(null);
    const listImportHistoryCached = vi.fn().mockResolvedValue([]);
    const listRedirectsCached = vi.fn().mockResolvedValue({ items: [], total: 0 });

    vi.doMock("@/services/searchClient", () => ({
      listRecentSearchesCached,
    }));
    vi.doMock("@/services/seoClient", () => ({
      listSeoCached,
    }));
    vi.doMock("@/services/analyticsClient", () => ({
      getOverviewCached,
      getTopContentCached,
      getTrafficOverviewCached,
      getTopPagesCached,
    }));
    vi.doMock("@/services/backupsClient", () => ({
      getBackupScheduleCached,
      listBackupsCached,
    }));
    vi.doMock("@/services/importExportClient", () => ({
      listImportHistoryCached,
    }));
    vi.doMock("@/services/redirectsClient", () => ({
      listRedirectsCached,
    }));

    try {
      const module = await import("../../../core/admin/utils/adminPrefetch");
      const prefetchRoute = async (href: string) => {
        module.prefetchAdminRoute(href, "/admin", {
          activeHref: "/admin/pages",
        });
        await flushAsync();
      };

      await prefetchRoute("/admin/search");
      await prefetchRoute("/admin/seo");
      await prefetchRoute("/admin/analytics");
      await prefetchRoute("/admin/backups");
      await prefetchRoute("/admin/tools/import-export");
      await prefetchRoute("/admin/redirects");

      expect(listRecentSearchesCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
      expect(listSeoCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
      expect(getOverviewCached).toHaveBeenCalledWith(30, module.prefetchWarmupOptions);
      expect(getTopContentCached).toHaveBeenCalledWith({
        limit: 50,
        rangeDays: 30,
        ...module.prefetchWarmupOptions,
      });
      expect(getTrafficOverviewCached).toHaveBeenCalledWith(30, module.prefetchWarmupOptions);
      expect(getTopPagesCached).toHaveBeenCalledWith({
        rangeDays: 30,
        limit: 50,
        ...module.prefetchWarmupOptions,
      });
      expect(listBackupsCached).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        ...module.prefetchWarmupOptions,
      });
      expect(getBackupScheduleCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
      expect(listImportHistoryCached).toHaveBeenCalledWith();
      expect(listRedirectsCached).toHaveBeenCalledWith(module.prefetchWarmupOptions);
    } finally {
      vi.doUnmock("@/services/searchClient");
      vi.doUnmock("@/services/seoClient");
      vi.doUnmock("@/services/analyticsClient");
      vi.doUnmock("@/services/backupsClient");
      vi.doUnmock("@/services/importExportClient");
      vi.doUnmock("@/services/redirectsClient");
      vi.resetModules();
    }
  });
});
