import { expect, test } from "bun:test";

import {
  createAdminPrefetcher,
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

test("prefetcher ignores unmatched or external routes", async () => {
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

    const prefetch = createAdminPrefetcher(entries, {
      schedule: (callback) => callback(),
      now: () => 0,
    });

    prefetch("/admin/widgets", "/admin");
    prefetch("https://example.com", "/admin");
    await flushAsync();
    expect(calls).toBe(0);
  });
});

test("prefetcher resolves legacy paths through coderso aliases", async () => {
  await withWindow(async () => {
    let calls = 0;
    const entries: AdminPrefetchEntry[] = [
      {
        match: "/coderso/widgets",
        run: () => {
          calls += 1;
        },
      },
    ];

    const prefetch = createAdminPrefetcher(entries, {
      schedule: (callback) => callback(),
      now: () => 0,
    });

    prefetch("/admin/widgets", "/admin");
    await flushAsync();
    expect(calls).toBe(1);
  });
});
