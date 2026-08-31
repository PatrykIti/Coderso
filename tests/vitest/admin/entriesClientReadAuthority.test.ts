import { expect, test } from "vitest";

import {
  clearAllEntriesCache,
  clearEntriesCache,
  getCachedAllEntries,
  getCachedEntries,
  getCachedEntryDetail,
  getEntryCached,
  listAllEntriesCached,
  listEntriesCached,
  listEntryRevisionsCached,
  publishEntry,
  updateEntry,
} from "../../../core/admin/services/entriesClient";
import type { EntryDetail, EntrySummary } from "../../../core/admin/services/entriesClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import {
  allEntryItem,
  createDeferred,
  entryDetail,
  entrySummary,
  installLocalStorage,
  jsonResponse,
  resetCaches,
} from "./support/entriesClientTestHarness";

test.each(["first-resolves-first", "replacement-resolves-first"] as const)(
  "entry detail reads publish only the newest forced request (%s)",
  async (settleOrder) => {
    const originalFetch = globalThis.fetch;
    const { restore } = installLocalStorage();
    const first = createDeferred<Response>();
    const replacement = createDeferred<Response>();
    let calls = 0;
    const typeSlug = `detail-authority-${settleOrder}`;

    globalThis.fetch = () => {
      calls += 1;
      return calls === 1 ? first.promise : replacement.promise;
    };

    try {
      resetCaches(typeSlug);
      const requestA = getEntryCached(typeSlug, "entry-1", { force: true });
      const requestB = getEntryCached(typeSlug, "entry-1", { force: true });
      expect(requestB).not.toBe(requestA);
      if (settleOrder === "first-resolves-first") {
        first.resolve(jsonResponse(entryDetail("entry-1", "Stale A")));
        await requestA;
        expect(getCachedEntryDetail(typeSlug, "entry-1")).toBeNull();
        replacement.resolve(jsonResponse(entryDetail("entry-1", "Current B")));
        await requestB;
      } else {
        replacement.resolve(jsonResponse(entryDetail("entry-1", "Current B")));
        await requestB;
        first.resolve(jsonResponse(entryDetail("entry-1", "Stale A")));
        await requestA;
      }
      expect(getCachedEntryDetail(typeSlug, "entry-1")?.title).toBe("Current B");
    } finally {
      resetCaches(typeSlug);
      restore();
      globalThis.fetch = originalFetch;
    }
  }
);

test("entry detail requests share identity, clear rejected authority, and retry", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const first = createDeferred<Response>();
  const second = createDeferred<Response>();
  let calls = 0;
  const typeSlug = "detail-retry";

  globalThis.fetch = () => {
    calls += 1;
    return calls === 1 ? first.promise : second.promise;
  };

  try {
    resetCaches(typeSlug);
    const requestA = getEntryCached(typeSlug, "entry-1");
    expect(getEntryCached(typeSlug, "entry-1")).toBe(requestA);
    first.reject(new Error("temporary"));
    await expect(requestA).rejects.toThrow("temporary");
    const retry = getEntryCached(typeSlug, "entry-1");
    expect(retry).not.toBe(requestA);
    second.resolve(jsonResponse(entryDetail("entry-1", "Recovered")));
    await expect(retry).resolves.toMatchObject({ title: "Recovered" });
    expect(calls).toBe(2);
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("successful entry mutation revokes only its matching late detail read", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const staleTarget = createDeferred<Response>();
  const other = createDeferred<Response>();
  const typeSlug = "detail-mutation-authority";

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
    if (init?.method === "GET") {
      return url.endsWith("/entry-target") ? staleTarget.promise : other.promise;
    }
    return Promise.resolve(jsonResponse(entryDetail("entry-target", "Mutation wins")));
  };

  try {
    resetCsrfToken();
    resetCaches(typeSlug);
    const staleRequest = getEntryCached(typeSlug, "entry-target", { force: true });
    const otherRequest = getEntryCached(typeSlug, "entry-other", { force: true });
    await updateEntry(typeSlug, "entry-target", { title: "Mutation wins" });
    staleTarget.resolve(jsonResponse(entryDetail("entry-target", "Stale read")));
    other.resolve(jsonResponse(entryDetail("entry-other", "Other remains authoritative")));
    await Promise.all([staleRequest, otherRequest]);
    expect(getCachedEntryDetail(typeSlug, "entry-target")?.title).toBe("Mutation wins");
    expect(getCachedEntryDetail(typeSlug, "entry-other")?.title).toBe(
      "Other remains authoritative"
    );
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("rejected entry mutation leaves the matching detail read authoritative", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const pending = createDeferred<Response>();
  const typeSlug = "detail-rejected-mutation";

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
    if (init?.method === "GET") return pending.promise;
    return Promise.resolve(
      jsonResponse({ error: { code: "entry_update_failed", message: "failed" } }, 500)
    );
  };

  try {
    resetCsrfToken();
    resetCaches(typeSlug);
    const read = getEntryCached(typeSlug, "entry-1");
    await expect(updateEntry(typeSlug, "entry-1", { title: "Rejected" })).rejects.toThrow();
    expect(getEntryCached(typeSlug, "entry-1")).toBe(read);
    pending.resolve(jsonResponse(entryDetail("entry-1", "Authoritative read")));
    await read;
    expect(getCachedEntryDetail(typeSlug, "entry-1")?.title).toBe("Authoritative read");
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});

test.each([
  { startOrder: "detail-then-list", settleOrder: "first-started-first" },
  { startOrder: "detail-then-list", settleOrder: "second-started-first" },
  { startOrder: "list-then-detail", settleOrder: "first-started-first" },
  { startOrder: "list-then-detail", settleOrder: "second-started-first" },
] as const)(
  "entry list/detail reconciliation is order-independent ($startOrder, $settleOrder)",
  async ({ startOrder, settleOrder }) => {
    const originalFetch = globalThis.fetch;
    const { restore, storage } = installLocalStorage();
    const detailResponse = createDeferred<Response>();
    const listResponse = createDeferred<Response>();
    const typeSlug = `cross-channel-${startOrder}-${settleOrder}`;

    globalThis.fetch = (input) => {
      const url = String(input);
      if (url.endsWith(`/content/${typeSlug}/entries/entry-target`)) {
        return detailResponse.promise;
      }
      if (url.endsWith(`/content/${typeSlug}/entries`)) return listResponse.promise;
      throw new Error(`unexpected_cross_channel_read:${url}`);
    };

    try {
      resetCaches(typeSlug);
      storage.setItem(
        cacheKeys.entryDetail(typeSlug, "entry-omitted"),
        JSON.stringify({
          value: entryDetail("entry-omitted", "Observed before list"),
          savedAt: Date.now(),
        })
      );
      expect(getCachedEntryDetail(typeSlug, "entry-omitted")?.title).toBe("Observed before list");
      let detailRequest!: Promise<EntryDetail>;
      let listRequest!: Promise<EntrySummary[]>;
      if (startOrder === "detail-then-list") {
        detailRequest = getEntryCached(typeSlug, "entry-target", { force: true });
        listRequest = listEntriesCached(typeSlug, { force: true });
      } else {
        listRequest = listEntriesCached(typeSlug, { force: true });
        detailRequest = getEntryCached(typeSlug, "entry-target", { force: true });
      }

      const settleDetail = async () => {
        detailResponse.resolve(jsonResponse(entryDetail("entry-target", "Detail authority")));
        await detailRequest;
      };
      const settleList = async () => {
        listResponse.resolve(
          jsonResponse([
            entrySummary("entry-target", "List authority"),
            entrySummary("entry-unrelated", "Unrelated"),
          ])
        );
        await listRequest;
      };

      const firstSettlement = startOrder === "detail-then-list" ? settleDetail : settleList;
      const secondSettlement = startOrder === "detail-then-list" ? settleList : settleDetail;
      if (settleOrder === "first-started-first") {
        await firstSettlement();
        await secondSettlement();
      } else {
        await secondSettlement();
        await firstSettlement();
      }

      expect(getCachedEntries(typeSlug)?.map((entry) => entry.id)).toEqual([
        "entry-target",
        "entry-unrelated",
      ]);
      const expectedTitle =
        startOrder === "detail-then-list" ? "List authority" : "Detail authority";
      expect(getCachedEntries(typeSlug)?.[0]?.title).toBe(expectedTitle);
      expect(getCachedEntryDetail(typeSlug, "entry-omitted")).toBeNull();
      if (startOrder === "detail-then-list") {
        expect(getCachedEntryDetail(typeSlug, "entry-target")).toBeNull();
      } else {
        expect(getCachedEntryDetail(typeSlug, "entry-target")?.title).toBe(expectedTitle);
      }
    } finally {
      resetCaches(typeSlug);
      restore();
      globalThis.fetch = originalFetch;
    }
  }
);

test("a rejected newer list leaves an older detail request publishable", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const detailResponse = createDeferred<Response>();
  const listResponse = createDeferred<Response>();
  const typeSlug = "rejected-list-keeps-detail";

  globalThis.fetch = (input) => {
    const url = String(input);
    return url.endsWith("/entry-target") ? detailResponse.promise : listResponse.promise;
  };

  try {
    resetCaches(typeSlug);
    const detailRequest = getEntryCached(typeSlug, "entry-target", { force: true });
    const listRequest = listEntriesCached(typeSlug, { force: true });
    const listFailure = expect(listRequest).rejects.toThrow("newer-list-rejected");
    listResponse.reject(new Error("newer-list-rejected"));
    await listFailure;
    expect(getEntryCached(typeSlug, "entry-target")).toBe(detailRequest);

    detailResponse.resolve(jsonResponse(entryDetail("entry-target", "Detail survives")));
    await detailRequest;
    expect(getCachedEntries(typeSlug)?.map((entry) => entry.id)).toEqual(["entry-target"]);
    expect(getCachedEntryDetail(typeSlug, "entry-target")?.title).toBe("Detail survives");
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("scoped clear invalidates captured entry list/detail publishers and known detail storage", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();
  const detailResponse = createDeferred<Response>();
  const listResponse = createDeferred<Response>();
  const typeSlug = "scoped-clear-authority";

  globalThis.fetch = (input) => {
    const url = String(input);
    return url.endsWith("/entry-target") ? detailResponse.promise : listResponse.promise;
  };

  try {
    resetCaches(typeSlug);
    storage.setItem(
      cacheKeys.entryDetail(typeSlug, "entry-known"),
      JSON.stringify({
        value: entryDetail("entry-known", "Known before clear"),
        savedAt: Date.now(),
      })
    );
    expect(getCachedEntryDetail(typeSlug, "entry-known")?.title).toBe("Known before clear");

    const listRequest = listEntriesCached(typeSlug, { force: true });
    const detailRequest = getEntryCached(typeSlug, "entry-target", { force: true });
    clearEntriesCache(typeSlug);
    expect(storage.getItem(cacheKeys.entryDetail(typeSlug, "entry-known"))).toBeNull();

    listResponse.resolve(jsonResponse([entrySummary("entry-list-late")]));
    detailResponse.resolve(jsonResponse(entryDetail("entry-target", "Detail late")));
    await Promise.all([listRequest, detailRequest]);
    expect(getCachedEntries(typeSlug)).toBeNull();
    expect(getCachedEntryDetail(typeSlug, "entry-target")).toBeNull();
    expect(getCachedEntryDetail(typeSlug, "entry-known")).toBeNull();
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("entry list caches expose one authoritative promise and reuse the published value", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const typeResponse = createDeferred<Response>();
  const allResponse = createDeferred<Response>();
  const calls: string[] = [];

  globalThis.fetch = (input) => {
    const url = String(input);
    calls.push(url);
    return url.endsWith("/content-entries") ? allResponse.promise : typeResponse.promise;
  };

  try {
    resetCaches("promise-identity");
    const typeFirst = listEntriesCached("promise-identity");
    const typeSecond = listEntriesCached("promise-identity");
    expect(typeSecond).toBe(typeFirst);
    expect(calls).toHaveLength(1);

    const typeRows = [entrySummary("type-authoritative")];
    typeResponse.resolve(jsonResponse(typeRows));
    await expect(typeFirst).resolves.toEqual(typeRows);
    await expect(listEntriesCached("promise-identity")).resolves.toEqual(typeRows);
    expect(calls).toHaveLength(1);

    const allFirst = listAllEntriesCached();
    const allSecond = listAllEntriesCached();
    expect(allSecond).toBe(allFirst);
    expect(calls).toHaveLength(2);

    const allRows = [allEntryItem("all-authoritative")];
    allResponse.resolve(jsonResponse(allRows));
    await expect(allFirst).resolves.toEqual(allRows);
    await expect(listAllEntriesCached()).resolves.toEqual(allRows);
    expect(calls).toHaveLength(2);
  } finally {
    resetCaches("promise-identity");
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("per-type entry reads publish only the latest forced request in both A/B settle orders", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];

  globalThis.fetch = () => {
    const response = responses.shift();
    if (!response) throw new Error("unexpected_entry_read");
    return response.promise;
  };

  try {
    const firstA = createDeferred<Response>();
    const firstB = createDeferred<Response>();
    responses.push(firstA, firstB);
    resetCaches("a-first");
    const requestA = listEntriesCached("a-first");
    const requestB = listEntriesCached("a-first", { force: true });
    expect(listEntriesCached("a-first")).toBe(requestB);

    firstA.resolve(jsonResponse([entrySummary("stale-a")]));
    await requestA;
    expect(getCachedEntries("a-first")).toBeNull();
    expect(listEntriesCached("a-first")).toBe(requestB);
    firstB.resolve(jsonResponse([entrySummary("fresh-b")]));
    await requestB;
    expect(getCachedEntries("a-first")?.map((entry) => entry.id)).toEqual(["fresh-b"]);

    const secondA = createDeferred<Response>();
    const secondB = createDeferred<Response>();
    responses.push(secondA, secondB);
    resetCaches("b-first");
    const lateA = listEntriesCached("b-first");
    const earlyB = listEntriesCached("b-first", { force: true });
    secondB.resolve(jsonResponse([entrySummary("fresh-b-first")]));
    await earlyB;
    secondA.resolve(jsonResponse([entrySummary("stale-a-late")]));
    await lateA;
    expect(getCachedEntries("b-first")?.map((entry) => entry.id)).toEqual(["fresh-b-first"]);
  } finally {
    resetCaches("a-first");
    clearEntriesCache("b-first");
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("all-entry reads publish only the latest forced request in both A/B settle orders", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];

  globalThis.fetch = () => {
    const response = responses.shift();
    if (!response) throw new Error("unexpected_all_entry_read");
    return response.promise;
  };

  try {
    clearAllEntriesCache();
    const firstA = createDeferred<Response>();
    const firstB = createDeferred<Response>();
    responses.push(firstA, firstB);
    const requestA = listAllEntriesCached();
    const requestB = listAllEntriesCached({ force: true });
    expect(listAllEntriesCached()).toBe(requestB);
    firstA.resolve(jsonResponse([allEntryItem("stale-a")]));
    await requestA;
    expect(getCachedAllEntries()).toBeNull();
    firstB.resolve(jsonResponse([allEntryItem("fresh-b")]));
    await requestB;
    expect(getCachedAllEntries()?.map((entry) => entry.id)).toEqual(["fresh-b"]);

    clearAllEntriesCache();
    const secondA = createDeferred<Response>();
    const secondB = createDeferred<Response>();
    responses.push(secondA, secondB);
    const lateA = listAllEntriesCached();
    const earlyB = listAllEntriesCached({ force: true });
    secondB.resolve(jsonResponse([allEntryItem("fresh-b-first")]));
    await earlyB;
    secondA.resolve(jsonResponse([allEntryItem("stale-a-late")]));
    await lateA;
    expect(getCachedAllEntries()?.map((entry) => entry.id)).toEqual(["fresh-b-first"]);
  } finally {
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("entry promise caches survive superseded rejection and retry authoritative rejection", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];

  globalThis.fetch = () => {
    const response = responses.shift();
    if (!response) throw new Error("unexpected_entry_retry");
    return response.promise;
  };

  try {
    resetCaches("entry-abc");
    const a = createDeferred<Response>();
    const b = createDeferred<Response>();
    const c = createDeferred<Response>();
    responses.push(a, b, c);
    const requestA = listEntriesCached("entry-abc");
    const requestB = listEntriesCached("entry-abc", { force: true });
    const requestC = listEntriesCached("entry-abc", { force: true });
    expect(listEntriesCached("entry-abc")).toBe(requestC);

    b.reject(new Error("superseded-b"));
    await expect(requestB).rejects.toThrow("superseded-b");
    expect(listEntriesCached("entry-abc")).toBe(requestC);
    a.resolve(jsonResponse([entrySummary("stale-a")]));
    await requestA;
    expect(getCachedEntries("entry-abc")).toBeNull();
    c.resolve(jsonResponse([entrySummary("authoritative-c")]));
    await requestC;
    expect(getCachedEntries("entry-abc")?.[0]?.id).toBe("authoritative-c");

    clearEntriesCache("entry-retry");
    const rejected = createDeferred<Response>();
    const retried = createDeferred<Response>();
    responses.push(rejected, retried);
    const failed = listEntriesCached("entry-retry");
    rejected.reject(new Error("authoritative-failure"));
    await expect(failed).rejects.toThrow("authoritative-failure");
    const retry = listEntriesCached("entry-retry");
    expect(retry).not.toBe(failed);
    retried.resolve(jsonResponse([entrySummary("retried")]));
    await retry;
    expect(getCachedEntries("entry-retry")?.[0]?.id).toBe("retried");

    clearAllEntriesCache();
    const allA = createDeferred<Response>();
    const allB = createDeferred<Response>();
    const allC = createDeferred<Response>();
    responses.push(allA, allB, allC);
    const allRequestA = listAllEntriesCached();
    const allRequestB = listAllEntriesCached({ force: true });
    const allRequestC = listAllEntriesCached({ force: true });
    allB.reject(new Error("superseded-all-b"));
    await expect(allRequestB).rejects.toThrow("superseded-all-b");
    expect(listAllEntriesCached()).toBe(allRequestC);
    allA.resolve(jsonResponse([allEntryItem("stale-all-a")]));
    await allRequestA;
    allC.resolve(jsonResponse([allEntryItem("authoritative-all-c")]));
    await allRequestC;
    expect(getCachedAllEntries()?.[0]?.id).toBe("authoritative-all-c");

    clearAllEntriesCache();
    const allRejected = createDeferred<Response>();
    const allRetried = createDeferred<Response>();
    responses.push(allRejected, allRetried);
    const allFailed = listAllEntriesCached();
    allRejected.reject(new Error("authoritative-all-failure"));
    await expect(allFailed).rejects.toThrow("authoritative-all-failure");
    const allRetry = listAllEntriesCached();
    expect(allRetry).not.toBe(allFailed);
    allRetried.resolve(jsonResponse([allEntryItem("all-retried")]));
    await allRetry;
    expect(getCachedAllEntries()?.[0]?.id).toBe("all-retried");
  } finally {
    clearEntriesCache("entry-abc");
    clearEntriesCache("entry-retry");
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("an in-flight list refresh reconciles a newer status authority when the server omits the item", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const refresh = createDeferred<Response>();
  const typeSlug = "reconcile-status-unshift";
  let listCalls = 0;

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith(`/content/${typeSlug}/entries`)) {
      listCalls += 1;
      return listCalls === 1
        ? Promise.resolve(jsonResponse([entrySummary("e1"), entrySummary("e2")]))
        : refresh.promise;
    }
    if (url.endsWith(`/content/${typeSlug}/entries/e1/publish`)) {
      return Promise.resolve(jsonResponse({ ok: true }));
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  try {
    resetCaches(typeSlug);
    await listEntriesCached(typeSlug);
    const refreshRequest = listEntriesCached(typeSlug, { force: true });
    await publishEntry(typeSlug, "e1");
    refresh.resolve(jsonResponse([entrySummary("e2")]));
    await refreshRequest;

    const reconciled = getCachedEntries(typeSlug) ?? [];
    expect(reconciled.map((entry) => entry.id)).toEqual(["e1", "e2"]);
    expect(reconciled.find((entry) => entry.id === "e1")?.status).toBe("published");
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("getCachedEntryDetail drops stale storage details after a list commit", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();
  const typeSlug = "stale-storage-detail";

  globalThis.fetch = () => Promise.resolve(jsonResponse([entrySummary("e1")]));

  try {
    resetCaches(typeSlug);
    await listEntriesCached(typeSlug);
    storage.setItem(
      cacheKeys.entryDetail(typeSlug, "ghost"),
      JSON.stringify({ value: entryDetail("ghost", "Stale"), savedAt: Date.now() })
    );

    expect(getCachedEntryDetail(typeSlug, "ghost")).toBeNull();
    expect(storage.getItem(cacheKeys.entryDetail(typeSlug, "ghost"))).toBeNull();
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("listEntryRevisionsCached reads cached revisions from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();
  const typeSlug = "revisions-storage";
  const revisions = [
    {
      id: "rev-2",
      entryId: "e1",
      version: 2,
      createdAt: "2026-07-14T00:00:00.000Z",
      createdBy: { id: "user-1", name: "Ada", email: "ada@example.com" },
    },
    {
      id: "rev-1",
      entryId: "e1",
      version: 1,
      createdAt: "2026-07-13T00:00:00.000Z",
      createdBy: null,
    },
  ];

  globalThis.fetch = () => {
    throw new Error("revisions storage hit must not fetch");
  };

  try {
    resetCaches(typeSlug);
    storage.setItem(
      cacheKeys.entryRevisions("e1"),
      JSON.stringify({ value: revisions, savedAt: Date.now() })
    );

    const result = await listEntryRevisionsCached(typeSlug, "e1");
    expect(result).toEqual(revisions);
    expect(result[0]?.version).toBe(2);
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});
