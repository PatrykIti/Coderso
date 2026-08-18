import { expect, test } from "vitest";

import {
  getCachedEntryDetail,
  getCachedEntryRevisions,
  getEntryRevisionData,
  listEntryRevisions,
  listEntryRevisionsCached,
  restoreEntryRevision,
} from "../../../core/admin/services/entriesClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { subscribeCacheEvents, type CacheEvent } from "../../../core/admin/utils/cacheBus";
import { createLocalStorage, jsonResponse, resetCaches } from "./support/entriesClientTestHarness";

const revisionsFixture = [
  {
    id: "rev-1",
    entryId: "entry-1",
    version: 1,
    createdAt: "2026-02-21T10:00:00.000Z",
    createdBy: null,
  },
  {
    id: "rev-2",
    entryId: "entry-1",
    version: 2,
    createdAt: "2026-02-22T10:00:00.000Z",
    createdBy: null,
  },
];

const revisionDetailFixture = { ...revisionsFixture[0]!, data: { title: "v1" } };

test("listEntryRevisions hits GET revisions endpoint without CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [], nextCursor: null });
  };

  try {
    await listEntryRevisions("blog", "entry-1");
    expect(calls[0]?.input).toBe("/admin/api/content/blog/entries/entry-1/revisions");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getEntryRevisionData fetches the narrow detail endpoint without CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(revisionDetailFixture);
  };

  try {
    const detail = await getEntryRevisionData("blog", "entry-1", "rev-1");
    expect(detail).toEqual(revisionDetailFixture);
    expect(calls[0]?.input).toBe("/admin/api/content/blog/entries/entry-1/revisions/rev-1");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listEntryRevisionsCached reads from shared revisions cache and force refetches", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [...revisionsFixture].reverse(), nextCursor: null });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches("blog");

    const first = await listEntryRevisionsCached("blog", "entry-1");
    expect(first.map((revision) => revision.version)).toEqual([2, 1]);
    expect(getCachedEntryRevisions("entry-1")?.map((revision) => revision.version)).toEqual([2, 1]);
    expect(storage.getItem(cacheKeys.entryRevisions("entry-1"))).toContain("rev-2");

    const second = await listEntryRevisionsCached("blog", "entry-1");
    expect(second).toEqual(first);
    expect(calls).toHaveLength(1);

    const forced = await listEntryRevisionsCached("blog", "entry-1", { force: true });
    expect(forced.map((revision) => revision.version)).toEqual([2, 1]);
    expect(calls).toHaveLength(2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches("blog");
  }
});

test("restoreEntryRevision posts with CSRF, patches detail cache, and broadcasts", async () => {
  const originalFetch = globalThis.fetch;
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const events: Array<Pick<CacheEvent, "key" | "action">> = [];
  const restoredEntry = {
    id: "entry-1",
    typeId: "type-1",
    title: "Restored title",
    slug: "restored",
    status: "draft" as const,
    data: { title: "Restored title" },
    tags: [],
    createdAt: "2026-02-21T10:00:00.000Z",
    updatedAt: "2026-02-23T10:00:00.000Z",
    taxonomy: null,
  };

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  const unsubscribe = subscribeCacheEvents((event) => {
    events.push({ key: event.key, action: event.action });
  });
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      ok: true,
      restored: true,
      revision: revisionDetailFixture,
      entry: restoredEntry,
    });
  };

  try {
    resetCsrfToken();
    resetCaches("blog");

    const result = await restoreEntryRevision("blog", "entry-1", "rev-1");
    expect(result.restored).toBe(true);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/content/blog/entries/entry-1/revisions/rev-1/restore");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(getCachedEntryDetail("blog", "entry-1")?.title).toBe("Restored title");
    expect(getCachedEntryDetail("blog", "entry-1")?.data).toEqual({ title: "Restored title" });
    expect(events).toEqual([
      { key: cacheKeys.entryRevisions("entry-1"), action: "invalidate" },
      { key: cacheKeys.entriesList("blog"), action: "update" },
      { key: cacheKeys.entriesAllList, action: "update" },
      { key: cacheKeys.entryDetail("blog", "entry-1"), action: "update" },
    ]);
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches("blog");
  }
});
