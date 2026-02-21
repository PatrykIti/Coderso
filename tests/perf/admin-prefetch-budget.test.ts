import { expect, test } from "bun:test";

import {
  createAdminPrefetcher,
  type AdminPrefetchEntry,
} from "../../core/admin/utils/adminPrefetch";

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

const readBudget = (envKey: string, fallback: number) => {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

test("performance gate: admin prefetch request count stays within budget per hover burst", async () => {
  const requestBudget = readBudget("CODERSO_PERF_ADMIN_PREFETCH_BURST_MAX", 6);

  await withWindow(async () => {
    let calls = 0;
    const entries: AdminPrefetchEntry[] = [
      { match: "/pages", run: () => void (calls += 1) },
      { match: "/menus", run: () => void (calls += 1) },
      { match: "/media", run: () => void (calls += 1) },
      { match: "/themes", run: () => void (calls += 1) },
      { match: "/coderso/entries", run: () => void (calls += 1) },
      { match: "/coderso/forms", run: () => void (calls += 1) },
    ];

    const prefetch = createAdminPrefetcher(entries, {
      cooldownMs: 15000,
      freshMs: 15000,
      maxConcurrency: 2,
      schedule: (callback) => callback(),
      now: () => 0,
    });

    for (let index = 0; index < 60; index += 1) {
      prefetch("/admin/pages", "/admin", { activeHref: "/admin/pages" });
      prefetch("/admin/menus", "/admin", { activeHref: "/admin/pages" });
      prefetch("/admin/media", "/admin", { activeHref: "/admin/pages" });
      prefetch("/admin/themes", "/admin", { activeHref: "/admin/pages" });
      prefetch("/admin/coderso/entries", "/admin", { activeHref: "/admin/pages" });
      prefetch("/admin/coderso/forms", "/admin", { activeHref: "/admin/pages" });
    }

    await flushAsync();
    expect(calls).toBeLessThanOrEqual(requestBudget);
  });
});
