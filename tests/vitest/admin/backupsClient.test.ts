import { expect, test } from "vitest";

import {
  clearBackupsCache,
  clearBackupScheduleCache,
  createBackup,
  deleteBackup,
  downloadBackup,
  getBackupSchedule,
  getBackupScheduleCached,
  getCachedBackups,
  getCachedBackupSchedule,
  listBackups,
  listBackupsCached,
  restoreBackup,
  updateBackupSchedule,
} from "../../../core/admin/services/backupsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys, createBoundedCacheKeySegment } from "../../../core/admin/services/cachePolicy";
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
  return {
    storage,
    restore: () => {
      if (originalLocal === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
      }
      clearBackupsCache();
      clearBackupScheduleCache();
    },
  };
};

const backupItem = (
  overrides: Partial<{
    id: string;
    status: "queued" | "running" | "complete" | "failed";
    artifactPath: string | null;
  }> = {}
) => ({
  id: overrides.id ?? "backup-1",
  status: overrides.status ?? "complete",
  kind: "manual" as const,
  storageDriver: "local" as const,
  artifactPath: overrides.artifactPath ?? "/backups/backup-1.zip",
  sizeBytes: 1024,
  error: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  finishedAt: "2026-06-01T00:01:00.000Z",
});

const backupListResult = (items = [backupItem()]) => ({
  items,
  page: 2,
  limit: 25,
  total: items.length,
  hasNext: false,
  hasPrevious: true,
  worker: {
    mode: "internal" as const,
    healthy: true,
    queuedCount: 0,
    oldestQueuedAt: null,
    message: "No jobs.",
  },
});

const backupSchedule = (
  overrides: Partial<{ id: string; frequency: "daily" | "weekly" | "monthly" }> = {}
) => ({
  id: overrides.id ?? "schedule-1",
  enabled: true,
  frequency: overrides.frequency ?? "daily",
  retentionDays: 30,
  storageDriver: "local" as const,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
});

test("listBackups hits GET /backups with pagination params", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      items: [],
      page: 2,
      limit: 25,
      total: 0,
      hasNext: false,
      hasPrevious: true,
      worker: {
        mode: "external",
        healthy: true,
        queuedCount: 0,
        oldestQueuedAt: null,
        message: "No jobs.",
      },
    });
  };

  try {
    await listBackups({ page: 2, limit: 25, query: "queued" });
    expect(calls[0]?.input).toBe("/admin/api/backups?page=2&limit=25&query=queued");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listBackupsCached reads local cache and force refreshes by page, limit, and query", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const options = { page: 2, limit: 25, query: "queued" };
  const cacheKey = cacheKeys.backupsList(2, 25, createBoundedCacheKeySegment("queued", "all"));
  const cached = backupListResult([backupItem({ id: "backup-cached" })]);
  const refreshed = backupListResult([backupItem({ id: "backup-fresh" })]);

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(refreshed);
  };

  try {
    setCacheValue(storage, cacheKey, cached);

    const sanitizedCached = backupListResult([
      backupItem({ id: "backup-cached", artifactPath: "local" }),
    ]);
    await expect(listBackupsCached(options)).resolves.toEqual(sanitizedCached);
    expect(calls).toHaveLength(0);
    expect(getCachedBackups(options)).toEqual(sanitizedCached);

    const sanitizedRefreshed = backupListResult([
      backupItem({ id: "backup-fresh", artifactPath: "local" }),
    ]);
    await expect(listBackupsCached({ ...options, force: true })).resolves.toEqual(
      sanitizedRefreshed
    );
    expect(calls[0]?.input).toBe("/admin/api/backups?page=2&limit=25&query=queued");
    expect(getCachedBackups(options)).toEqual(sanitizedRefreshed);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("createBackup sends include options with CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "backup-1" });
  };

  try {
    resetCsrfToken();
    await createBackup({ kind: "manual", include: ["database", "settings"] });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/backups");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBe(
      JSON.stringify({ kind: "manual", include: ["database", "settings"] })
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteBackup uses CSRF and DELETE", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true, id: "backup-1" });
  };

  try {
    resetCsrfToken();
    await deleteBackup("backup-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/backups/backup-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("restoreBackup uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "backup-1" });
  };

  try {
    resetCsrfToken();
    await restoreBackup("backup-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/backups/backup-1/restore");
    expect(calls[1]?.init?.method).toBe("POST");
    // The hardened route REQUIRES `confirm: true` in the body (restoreBackupSchema);
    // the client MUST send it or restore fails validation with a 400. Regression for
    // the client->route gap where restore was unreachable from the UI.
    expect(calls[1]?.init?.body).toBe(JSON.stringify({ confirm: true }));
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("content-type")).toBe("application/json");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("backup create/delete patch list caches and restore invalidates", async () => {
  const { restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));
  const pageOneOptions = { page: 1, limit: 25, query: "queued" };
  const pageTwoOptions = { page: 2, limit: 25, query: "queued" };
  const pageOneKey = cacheKeys.backupsList(1, 25, createBoundedCacheKeySegment("queued", "all"));
  const pageTwoKey = cacheKeys.backupsList(2, 25, createBoundedCacheKeySegment("queued", "all"));

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (url.startsWith("/admin/api/backups?")) {
      return jsonResponse(
        backupListResult([backupItem({ id: "backup-cached", status: "queued" })])
      );
    }
    if (url === "/admin/api/backups") {
      return jsonResponse(backupItem({ id: "backup-created", status: "queued" }));
    }
    if (url.endsWith("/restore")) {
      return jsonResponse(backupItem({ id: "backup-restored", status: "queued" }));
    }
    return jsonResponse({ ok: true, id: "backup-cached" });
  };

  try {
    resetCsrfToken();

    await listBackupsCached({ ...pageOneOptions, force: true });
    await listBackupsCached({ ...pageTwoOptions, force: true });
    await createBackup({ kind: "manual", include: ["database"] });
    expect(getCachedBackups(pageOneOptions)?.items[0]?.id).toBe("backup-created");
    expect(getCachedBackups(pageTwoOptions)).toBeNull();

    await listBackupsCached({ ...pageOneOptions, force: true });
    await deleteBackup("backup-cached");
    expect(
      getCachedBackups(pageOneOptions)?.items.some((item) => item.id === "backup-cached")
    ).toBe(false);

    await listBackupsCached({ ...pageOneOptions, force: true });
    await restoreBackup("backup-cached");
    expect(getCachedBackups(pageOneOptions)).toBeNull();

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: pageOneKey, action: "update" }),
        expect.objectContaining({ key: pageTwoKey, action: "invalidate" }),
        expect.objectContaining({ key: pageOneKey, action: "invalidate" }),
      ])
    );
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("downloadBackup hits GET /backups/:id/download", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ url: null, path: null });
  };

  try {
    await downloadBackup("backup-2");
    expect(calls[0]?.input).toBe("/admin/api/backups/backup-2/download");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getBackupSchedule hits GET /backups/schedule", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ id: "schedule-1" });
  };

  try {
    await getBackupSchedule();
    expect(calls[0]?.input).toBe("/admin/api/backups/schedule");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getBackupScheduleCached reads local cache", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const cached = backupSchedule({ frequency: "weekly" });

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(backupSchedule());
  };

  try {
    setCacheValue(storage, cacheKeys.backupSchedule, cached);
    await expect(getBackupScheduleCached()).resolves.toEqual(cached);
    expect(getCachedBackupSchedule()).toEqual(cached);
    expect(calls).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("updateBackupSchedule uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "schedule-1" });
  };

  try {
    resetCsrfToken();
    await updateBackupSchedule({ frequency: "weekly" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/backups/schedule");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateBackupSchedule patches schedule cache and broadcasts", async () => {
  const { storage, restore } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));
  const updated = backupSchedule({ frequency: "monthly" });

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    return jsonResponse(updated);
  };

  try {
    resetCsrfToken();
    setCacheValue(storage, cacheKeys.backupSchedule, backupSchedule({ frequency: "daily" }));

    await updateBackupSchedule({ frequency: "monthly" });

    expect(getCachedBackupSchedule()?.frequency).toBe("monthly");
    expect(events).toEqual([
      expect.objectContaining({ key: cacheKeys.backupSchedule, action: "update" }),
    ]);
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    restore();
  }
});
