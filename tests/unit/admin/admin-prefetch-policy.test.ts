import { expect, test } from "bun:test";

import {
  createAdminPrefetcher,
  prefetchWarmupOptions,
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

test("prefetcher skips active route module", async () => {
  await withWindow(async () => {
    let calls = 0;
    const entries: AdminPrefetchEntry[] = [
      {
        match: "/coderso/engine",
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
      activeHref: "/admin/coderso/engine?tab=schema",
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
