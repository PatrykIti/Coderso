import { expect, test, vi } from "vitest";

import {
  createAdminPrefetcher,
  prefetchWarmupOptions,
  resolveCollectionWorkspacePrefetchTarget,
  type AdminPrefetchEntry,
} from "../../../core/admin/utils/adminPrefetch";

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

test("prefetch warmup options default to force false", () => {
  expect(prefetchWarmupOptions).toEqual({ force: false });
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
