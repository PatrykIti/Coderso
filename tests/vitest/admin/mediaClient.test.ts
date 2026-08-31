import { afterEach, expect, test, vi } from "vitest";

import {
  createClipboardImageFilename,
  clearMediaCache,
  deleteMedia,
  getCachedMedia,
  getCachedMediaForEvent,
  getMediaUsage,
  listMedia,
  listMediaCached,
  normalizeClipboardImageFile,
  recoverMediaDimensions,
  replaceMedia,
  updateMedia,
  uploadClipboardImage,
  uploadMedia,
  type MediaRecord,
} from "../../../core/admin/services/mediaClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys, cacheTtlMs } from "../../../core/admin/services/cachePolicy";
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

const installLocalStorage = () => {
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  return {
    restore: () => {
      if (original === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = original;
      }
    },
    storage,
  };
};

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const resetCaches = () => {
  clearMediaCache();
};

const mediaRecord = (overrides: Partial<MediaRecord> = {}): MediaRecord => ({
  id: overrides.id ?? "media-1",
  key: overrides.key ?? "key-1",
  url: overrides.url ?? "https://example.com/1.png",
  type: overrides.type ?? "image",
  mimeType: overrides.mimeType ?? "image/png",
  size: overrides.size ?? 1200,
  width: overrides.width ?? null,
  height: overrides.height ?? null,
  alt: overrides.alt ?? null,
  title: overrides.title ?? null,
  caption: overrides.caption ?? null,
  originalName: overrides.originalName ?? "image.png",
  createdAt: overrides.createdAt ?? "2026-02-14T00:00:00.000Z",
  createdBy: overrides.createdBy ?? null,
});

const setCacheValue = (
  storage: ReturnType<typeof createLocalStorage>,
  value: unknown,
  savedAt = Date.now()
) => {
  storage.setItem(cacheKeys.mediaList, JSON.stringify({ value, savedAt }));
};

afterEach(() => {
  resetCaches();
  resetCsrfToken();
  vi.useRealTimers();
});

test("listMedia hits GET /media", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listMedia();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/media");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uploadMedia uses CSRF and multipart body", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "media-1", url: "/media/1", key: "1" });
  };

  try {
    resetCsrfToken();
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    await uploadMedia(file);

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/media");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBeInstanceOf(FormData);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uploadClipboardImage rejects non-image files", async () => {
  const file = new File(["hello"], "hello.txt", { type: "text/plain" });
  await expect(uploadClipboardImage(file)).rejects.toThrow("clipboard_image_type_invalid");
});

test("uploadClipboardImage generates deterministic filename when clipboard file has no name", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "media-2", url: "/media/2", key: "2" });
  };

  try {
    resetCsrfToken();
    const file = new File(["img"], "", { type: "image/png" });
    await uploadClipboardImage(file);

    const formData = calls[1]?.init?.body as FormData;
    const uploaded = formData.get("file");
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name.startsWith("clipboard-image-")).toBe(true);
    expect((uploaded as File).name.endsWith(".png")).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("clipboard filename helpers keep stable naming rules", () => {
  const fixedDate = new Date("2026-02-22T21:15:20.100Z");
  expect(createClipboardImageFilename("image/webp", fixedDate)).toBe(
    "clipboard-image-2026-02-22T21-15-20-100Z.webp"
  );

  const unnamed = new File(["img"], "", { type: "image/jpeg" });
  const normalized = normalizeClipboardImageFile(unnamed, fixedDate);
  expect(normalized.name).toBe("clipboard-image-2026-02-22T21-15-20-100Z.jpg");
});

test("updateMedia posts JSON with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "media-1" });
  };

  try {
    resetCsrfToken();
    await updateMedia("media-1", { title: "Hero" });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/media/media-1");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.title).toBe("Hero");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getMediaUsage reads tracked usage with limit query", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([
      {
        id: "page:page-1",
        type: "page",
        title: "Homepage",
        context: "Page builder content",
        targetId: "page-1",
        adminHref: "/pages/page-1",
      },
    ]);
  };

  try {
    const result = await getMediaUsage("media-1", { limit: 10 });
    expect(result).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/media/media-1/usage?limit=10");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("recoverMediaDimensions posts empty JSON with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "media-1", key: "key", url: "/media/key" });
  };

  try {
    resetCsrfToken();
    await recoverMediaDimensions("media-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/media/media-1/dimensions/recover");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[1]?.init?.body as string)).toEqual({});
  } finally {
    globalThis.fetch = originalFetch;
    resetCaches();
  }
});

test("replaceMedia uploads replacement file with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "media-1", key: "key", url: "/media/key" });
  };

  try {
    resetCsrfToken();
    const file = new File(["img"], "replacement.png", { type: "image/png" });
    await replaceMedia("media-1", file);

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/media/media-1/replace");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBeInstanceOf(FormData);
    expect((calls[1]?.init?.body as FormData).get("file")).toBeInstanceOf(File);
  } finally {
    globalThis.fetch = originalFetch;
    resetCaches();
  }
});

test("deleteMedia sends DELETE with CSRF", async () => {
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
    await deleteMedia("media-1");

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/media/media-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listMediaCached reads from local storage", async () => {
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
        id: "media-1",
        key: "key-1",
        url: "https://example.com/1.png",
        type: "image" as const,
        mimeType: "image/png",
        size: 1200,
        createdAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    storage.setItem(cacheKeys.mediaList, JSON.stringify({ value: cached, savedAt: Date.now() }));

    const result = await listMediaCached();
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

test("listMediaCached ignores expired in-memory list cache", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-24T10:00:00.000Z"));

  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();
  const stale = [mediaRecord({ id: "media-stale", key: "stale" })];
  const fresh = [mediaRecord({ id: "media-fresh", key: "fresh" })];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(fresh);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    setCacheValue(storage, stale);
    expect(await listMediaCached()).toEqual(stale);

    vi.setSystemTime(new Date(Date.now() + cacheTtlMs.list + 1000));

    const result = await listMediaCached();
    expect(result).toEqual(fresh);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/media");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("getCachedMediaForEvent prefers fresh storage over in-memory list", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const memoryRows = [mediaRecord({ id: "media-memory", title: "Memory" })];
  const storageRows = [mediaRecord({ id: "media-storage", title: "Storage" })];

  globalThis.fetch = async () => jsonResponse([]);
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    setCacheValue(storage, memoryRows);
    expect(await listMediaCached()).toEqual(memoryRows);

    setCacheValue(storage, storageRows);

    expect(getCachedMediaForEvent()).toEqual(storageRows);
    expect(getCachedMedia()).toEqual(storageRows);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("getCachedMediaForEvent returns null after storage and memory expire", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-24T10:00:00.000Z"));

  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const rows = [mediaRecord({ id: "media-expired" })];

  globalThis.fetch = async () => jsonResponse([]);
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    setCacheValue(storage, rows);
    expect(await listMediaCached()).toEqual(rows);

    vi.setSystemTime(new Date(Date.now() + cacheTtlMs.list + 1000));

    expect(getCachedMediaForEvent()).toBeNull();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("media mutations patch the cached list and broadcast update events", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));
  const rows = [
    mediaRecord({ id: "media-1", title: "One" }),
    mediaRecord({ id: "media-2", title: "Two" }),
  ];
  const responses = [
    jsonResponse({ token: "csrf-token" }),
    jsonResponse(mediaRecord({ id: "media-1", title: "Updated" })),
    jsonResponse(mediaRecord({ id: "media-1", title: "Recovered", width: 320 })),
    jsonResponse(mediaRecord({ id: "media-1", title: "Replaced", key: "replaced" })),
    jsonResponse(mediaRecord({ id: "media-3", title: "Uploaded", key: "uploaded" })),
    jsonResponse({ ok: true }),
  ];

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return responses.shift() ?? jsonResponse({ token: "csrf-token" });
    }
    return responses.shift() ?? jsonResponse({});
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCsrfToken();
    setCacheValue(storage, rows);
    expect(await listMediaCached()).toEqual(rows);

    await updateMedia("media-1", { title: "Updated" });
    expect(getCachedMedia()?.map((item) => item.title)).toEqual(["Updated", "Two"]);

    await recoverMediaDimensions("media-1");
    expect(getCachedMedia()?.[0]?.title).toBe("Recovered");
    expect(getCachedMedia()?.[0]?.width).toBe(320);

    const file = new File(["img"], "replacement.png", { type: "image/png" });
    await replaceMedia("media-1", file);
    expect(getCachedMedia()?.[0]?.key).toBe("replaced");

    const uploaded = await uploadMedia(new File(["img"], "upload.png", { type: "image/png" }));
    expect(uploaded.title).toBe("Uploaded");
    expect(getCachedMedia()?.map((item) => item.id)).toEqual(["media-3", "media-1", "media-2"]);

    await deleteMedia("media-1");
    expect(getCachedMedia()?.map((item) => item.id)).toEqual(["media-3", "media-2"]);
    expect(events.filter((event) => event.key === cacheKeys.mediaList)).toHaveLength(5);
    expect(events.filter((event) => event.key === cacheKeys.mediaList)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: cacheKeys.mediaList, action: "update" }),
      ])
    );
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("mutating an asset while the list cache is expired does not poison it to a single item (TASK-512 smoke regression)", async () => {
  // Live-smoke regression: tagging/foldering one asset AFTER the media:list
  // cache had TTL-expired collapsed the whole library to that one row (the
  // upsert seeded `[item]` as if it were the complete list, then reload read
  // that fresh single-item cache). upsertCachedMedia now guards on an empty
  // cache and leaves it unset so the update event forces a full refetch.
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const rows = [
    mediaRecord({ id: "media-1", title: "One" }),
    mediaRecord({ id: "media-2", title: "Two" }),
    mediaRecord({ id: "media-3", title: "Three" }),
  ];
  const responses = [
    jsonResponse({ token: "csrf-token" }),
    jsonResponse(mediaRecord({ id: "media-1", title: "Tagged" })),
    jsonResponse([
      mediaRecord({ id: "media-1", title: "Tagged" }),
      mediaRecord({ id: "media-2", title: "Two" }),
      mediaRecord({ id: "media-3", title: "Three" }),
    ]),
  ];
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf"))
      return responses.shift() ?? jsonResponse({ token: "csrf-token" });
    return responses.shift() ?? jsonResponse({});
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCsrfToken();
    // Seed a list cache that is already TTL-expired.
    setCacheValue(storage, rows, Date.now() - cacheTtlMs.list - 60_000);
    expect(getCachedMedia()).toBeNull();

    // Mutate one asset (e.g. assign a folder / add a tag) while the cache is expired.
    await updateMedia("media-1", { title: "Tagged" });

    // GUARD: the cache must NOT be seeded with just the mutated item.
    expect(getCachedMedia()).toBeNull();

    // A subsequent cached fetch rebuilds the FULL list (3 items), not 1.
    const refetched = await listMediaCached();
    expect(refetched.map((item) => item.id)).toEqual(["media-1", "media-2", "media-3"]);
    expect(refetched.find((item) => item.id === "media-1")?.title).toBe("Tagged");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("media list callers share the authoritative promise and reuse its published value", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const response = createDeferred<Response>();
  let calls = 0;

  globalThis.fetch = () => {
    calls += 1;
    return response.promise;
  };

  try {
    resetCaches();
    const first = listMediaCached();
    const second = listMediaCached();
    expect(second).toBe(first);
    expect(calls).toBe(1);

    const rows = [mediaRecord({ id: "media-authoritative" })];
    response.resolve(jsonResponse(rows));
    await expect(first).resolves.toEqual(rows);
    await expect(listMediaCached()).resolves.toEqual(rows);
    expect(calls).toBe(1);
  } finally {
    resetCaches();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("media reads publish only the latest forced request in both A/B settle orders", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];

  globalThis.fetch = () => {
    const response = responses.shift();
    if (!response) throw new Error("unexpected_media_read");
    return response.promise;
  };

  try {
    const firstA = createDeferred<Response>();
    const firstB = createDeferred<Response>();
    responses.push(firstA, firstB);
    resetCaches();
    const requestA = listMediaCached();
    const requestB = listMediaCached({ force: true });
    expect(listMediaCached()).toBe(requestB);
    firstA.resolve(jsonResponse([mediaRecord({ id: "stale-a" })]));
    await requestA;
    expect(getCachedMedia()).toBeNull();
    expect(listMediaCached()).toBe(requestB);
    firstB.resolve(jsonResponse([mediaRecord({ id: "fresh-b" })]));
    await requestB;
    expect(getCachedMedia()?.map((item) => item.id)).toEqual(["fresh-b"]);

    resetCaches();
    const secondA = createDeferred<Response>();
    const secondB = createDeferred<Response>();
    responses.push(secondA, secondB);
    const lateA = listMediaCached();
    const earlyB = listMediaCached({ force: true });
    secondB.resolve(jsonResponse([mediaRecord({ id: "fresh-b-first" })]));
    await earlyB;
    secondA.resolve(jsonResponse([mediaRecord({ id: "stale-a-late" })]));
    await lateA;
    expect(getCachedMedia()?.map((item) => item.id)).toEqual(["fresh-b-first"]);
  } finally {
    resetCaches();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("media promise cache survives superseded rejection and retries authoritative rejection", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];

  globalThis.fetch = () => {
    const response = responses.shift();
    if (!response) throw new Error("unexpected_media_retry");
    return response.promise;
  };

  try {
    resetCaches();
    const a = createDeferred<Response>();
    const b = createDeferred<Response>();
    const c = createDeferred<Response>();
    responses.push(a, b, c);
    const requestA = listMediaCached();
    const requestB = listMediaCached({ force: true });
    const requestC = listMediaCached({ force: true });
    expect(listMediaCached()).toBe(requestC);

    b.reject(new Error("superseded-media-b"));
    await expect(requestB).rejects.toThrow("superseded-media-b");
    expect(listMediaCached()).toBe(requestC);
    a.resolve(jsonResponse([mediaRecord({ id: "stale-media-a" })]));
    await requestA;
    expect(getCachedMedia()).toBeNull();
    c.resolve(jsonResponse([mediaRecord({ id: "authoritative-media-c" })]));
    await requestC;
    expect(getCachedMedia()?.[0]?.id).toBe("authoritative-media-c");

    resetCaches();
    const rejected = createDeferred<Response>();
    const retried = createDeferred<Response>();
    responses.push(rejected, retried);
    const failed = listMediaCached();
    rejected.reject(new Error("authoritative-media-failure"));
    await expect(failed).rejects.toThrow("authoritative-media-failure");
    const retry = listMediaCached();
    expect(retry).not.toBe(failed);
    retried.resolve(jsonResponse([mediaRecord({ id: "media-retried" })]));
    await retry;
    expect(getCachedMedia()?.[0]?.id).toBe("media-retried");
  } finally {
    resetCaches();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("every media upsert path revokes a late read with present and absent full-list caches", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();
  const operations = [
    {
      name: "upload",
      run: () => uploadMedia(new File(["image"], "upload.png", { type: "image/png" })),
    },
    { name: "update", run: () => updateMedia("media-target", { title: "Mutation" }) },
    { name: "recover", run: () => recoverMediaDimensions("media-target") },
    {
      name: "replace",
      run: () =>
        replaceMedia("media-target", new File(["image"], "replacement.png", { type: "image/png" })),
    },
  ];

  try {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        const pendingRead = createDeferred<Response>();
        const mutated = mediaRecord({ id: "media-target", title: `Mutation ${operation.name}` });
        let listReads = 0;
        resetCsrfToken();
        resetCaches();
        if (cacheState === "present") {
          setCacheValue(storage, [
            mediaRecord({ id: "media-target", title: "Before" }),
            mediaRecord({ id: "media-other", title: "Other" }),
          ]);
          expect(getCachedMedia()).toHaveLength(2);
        }

        globalThis.fetch = (input, init) => {
          const url = String(input);
          if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
          if (url.endsWith("/media") && init?.method === "GET") {
            listReads += 1;
            return pendingRead.promise;
          }
          return Promise.resolve(jsonResponse(mutated));
        };

        const staleRead = listMediaCached({ force: cacheState === "present" });
        await operation.run();
        if (cacheState === "present") {
          expect(getCachedMedia()?.[0]?.title).toBe(`Mutation ${operation.name}`);
          expect(getCachedMedia()).toHaveLength(2);
        } else {
          expect(getCachedMedia()).toBeNull();
        }

        pendingRead.resolve(jsonResponse([mediaRecord({ id: "stale-media-row" })]));
        await staleRead;
        if (cacheState === "present") {
          expect(getCachedMedia()?.some((item) => item.id === "stale-media-row")).toBe(false);
          await expect(listMediaCached()).resolves.toEqual(getCachedMedia());
          expect(listReads).toBe(1);
        } else {
          expect(getCachedMedia()).toBeNull();
        }
      }
    }
  } finally {
    resetCaches();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("media removal revokes a late read with and without a current full list", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();

  try {
    for (const cacheState of ["present", "absent"] as const) {
      const pendingRead = createDeferred<Response>();
      resetCsrfToken();
      resetCaches();
      if (cacheState === "present") {
        setCacheValue(storage, [
          mediaRecord({ id: "media-target" }),
          mediaRecord({ id: "media-keeper" }),
        ]);
        expect(getCachedMedia()).toHaveLength(2);
      }

      globalThis.fetch = (input, init) => {
        const url = String(input);
        if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
        if (init?.method === "GET") return pendingRead.promise;
        return Promise.resolve(jsonResponse({ ok: true }));
      };

      const staleRead = listMediaCached({ force: cacheState === "present" });
      await deleteMedia("media-target");
      if (cacheState === "present") {
        expect(getCachedMedia()?.map((item) => item.id)).toEqual(["media-keeper"]);
      } else {
        expect(getCachedMedia()).toBeNull();
      }

      pendingRead.resolve(jsonResponse([mediaRecord({ id: "stale-removed-media" })]));
      await staleRead;
      if (cacheState === "present") {
        expect(getCachedMedia()?.map((item) => item.id)).toEqual(["media-keeper"]);
      } else {
        expect(getCachedMedia()).toBeNull();
      }
    }
  } finally {
    resetCaches();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("a rejected media mutation leaves the authoritative pending read untouched", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const pendingRead = createDeferred<Response>();

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
    if (init?.method === "GET") return pendingRead.promise;
    return Promise.resolve(
      jsonResponse({ error: { code: "media_update_failed", message: "failed" } }, 500)
    );
  };

  try {
    resetCsrfToken();
    resetCaches();
    const pending = listMediaCached();
    await expect(updateMedia("media-target", { title: "Rejected" })).rejects.toThrow("failed");
    expect(listMediaCached()).toBe(pending);
    pendingRead.resolve(jsonResponse([mediaRecord({ id: "media-after-rejection" })]));
    await pending;
    expect(getCachedMedia()?.[0]?.id).toBe("media-after-rejection");
  } finally {
    resetCaches();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("media A/B/C authority survives C-first success and C rejection followed by D", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];
  let transportCalls = 0;

  globalThis.fetch = () => {
    transportCalls += 1;
    const response = responses.shift();
    if (!response) throw new Error("unexpected_media_matrix_read");
    return response.promise;
  };

  try {
    resetCaches();
    const firstA = createDeferred<Response>();
    const firstB = createDeferred<Response>();
    const firstC = createDeferred<Response>();
    responses.push(firstA, firstB, firstC);
    const firstRequestA = listMediaCached();
    const firstRequestB = listMediaCached({ force: true });
    const firstRequestC = listMediaCached({ force: true });
    expect(listMediaCached()).toBe(firstRequestC);

    firstC.resolve(jsonResponse([mediaRecord({ id: "media-c-first" })]));
    await firstRequestC;
    expect(getCachedMedia()?.[0]?.id).toBe("media-c-first");
    firstA.resolve(jsonResponse([mediaRecord({ id: "media-a-late-success" })]));
    await firstRequestA;
    const firstBRejection = expect(firstRequestB).rejects.toThrow("media-b-late-rejection");
    firstB.reject(new Error("media-b-late-rejection"));
    await firstBRejection;
    expect(getCachedMedia()?.[0]?.id).toBe("media-c-first");
    expect(transportCalls).toBe(3);

    resetCaches();
    const retryA = createDeferred<Response>();
    const retryB = createDeferred<Response>();
    const retryC = createDeferred<Response>();
    const retryD = createDeferred<Response>();
    responses.push(retryA, retryB, retryC, retryD);
    const retryRequestA = listMediaCached();
    const retryRequestB = listMediaCached({ force: true });
    const retryRequestC = listMediaCached({ force: true });
    expect(listMediaCached()).toBe(retryRequestC);

    const cRejection = expect(retryRequestC).rejects.toThrow("media-c-authoritative-rejection");
    retryC.reject(new Error("media-c-authoritative-rejection"));
    await cRejection;
    const retryRequestD = listMediaCached();
    expect(retryRequestD).not.toBe(retryRequestC);

    retryB.resolve(jsonResponse([mediaRecord({ id: "media-b-late-success" })]));
    await retryRequestB;
    expect(getCachedMedia()).toBeNull();
    expect(listMediaCached()).toBe(retryRequestD);
    const aRejection = expect(retryRequestA).rejects.toThrow("media-a-late-rejection");
    retryA.reject(new Error("media-a-late-rejection"));
    await aRejection;
    expect(getCachedMedia()).toBeNull();
    expect(listMediaCached()).toBe(retryRequestD);

    retryD.resolve(jsonResponse([mediaRecord({ id: "media-d-authoritative" })]));
    await retryRequestD;
    expect(getCachedMedia()?.[0]?.id).toBe("media-d-authoritative");
    expect(transportCalls).toBe(7);
  } finally {
    resetCaches();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("clipboard helpers map gif, avif, svg and unknown mimes and keep well-named files", () => {
  const fixedDate = new Date("2026-03-01T10:20:30.400Z");
  expect(createClipboardImageFilename("image/gif", fixedDate)).toBe(
    "clipboard-image-2026-03-01T10-20-30-400Z.gif"
  );
  expect(createClipboardImageFilename("image/avif", fixedDate)).toBe(
    "clipboard-image-2026-03-01T10-20-30-400Z.avif"
  );
  expect(createClipboardImageFilename("image/svg+xml", fixedDate)).toBe(
    "clipboard-image-2026-03-01T10-20-30-400Z.svg"
  );
  expect(createClipboardImageFilename("application/octet-stream", fixedDate)).toBe(
    "clipboard-image-2026-03-01T10-20-30-400Z.png"
  );
  expect(createClipboardImageFilename("  image/gif  ", fixedDate)).toBe(
    "clipboard-image-2026-03-01T10-20-30-400Z.gif"
  );

  const wellNamed = new File(["img"], "logo.png", { type: "image/png" });
  expect(normalizeClipboardImageFile(wellNamed)).toBe(wellNamed);
});
