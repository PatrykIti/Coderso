import { expect, test } from "vitest";

import {
  clearAllEntriesCache,
  clearEntriesCache,
  createEntry,
  deleteEntry,
  duplicateEntry,
  getCachedAllEntries,
  getCachedEntries,
  getCachedEntryDetail,
  getEntryCached,
  listAllEntriesCached,
  listEntriesCached,
  publishEntry,
  unpublishEntry,
  updateEntry,
  updateEntryMetadata,
} from "../../../core/admin/services/entriesClient";
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

test("every entry upsert path reconciles an older list with present and absent caches", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();
  const operations = [
    {
      name: "create",
      run: (typeSlug: string) =>
        createEntry(typeSlug, { title: "Mutation", slug: "mutation", data: {} }),
    },
    {
      name: "update",
      run: (typeSlug: string) => updateEntry(typeSlug, "entry-target", { title: "Mutation" }),
    },
    {
      name: "metadata",
      run: (typeSlug: string) =>
        updateEntryMetadata(typeSlug, "entry-target", { status: "published" }),
    },
    {
      name: "duplicate",
      run: (typeSlug: string) => duplicateEntry(typeSlug, "entry-source"),
    },
  ];

  try {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        const typeSlug = `upsert-${cacheState}-${operation.name}`;
        const pendingRead = createDeferred<Response>();
        const mutated = entryDetail("entry-target", `Mutation ${operation.name}`, "published");
        let listReads = 0;
        resetCsrfToken();
        resetCaches(typeSlug);
        if (cacheState === "present") {
          storage.setItem(
            cacheKeys.entriesList(typeSlug),
            JSON.stringify({
              value: [entrySummary("entry-target", "Before"), entrySummary("entry-other")],
              savedAt: Date.now(),
            })
          );
          expect(getCachedEntries(typeSlug)).toHaveLength(2);
        }

        globalThis.fetch = (input, init) => {
          const url = String(input);
          if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
          if (init?.method === "GET" && url.endsWith(`/content/${typeSlug}/entries`)) {
            listReads += 1;
            return pendingRead.promise;
          }
          return Promise.resolve(jsonResponse(mutated));
        };

        const staleRead = listEntriesCached(typeSlug, { force: cacheState === "present" });
        await operation.run(typeSlug);
        expect(getCachedEntries(typeSlug)?.[0]?.title).toBe(`Mutation ${operation.name}`);
        if (cacheState === "present") expect(getCachedEntries(typeSlug)).toHaveLength(2);
        else expect(getCachedEntries(typeSlug)).toHaveLength(1);

        pendingRead.resolve(
          jsonResponse([
            entrySummary("entry-target", "Stale server target"),
            entrySummary("server-unrelated", "Server unrelated"),
          ])
        );
        await staleRead;
        expect(getCachedEntries(typeSlug)?.map((entry) => entry.id)).toEqual([
          "entry-target",
          "server-unrelated",
        ]);
        expect(getCachedEntries(typeSlug)?.[0]?.title).toBe(`Mutation ${operation.name}`);
        await expect(listEntriesCached(typeSlug)).resolves.toEqual(getCachedEntries(typeSlug));
        expect(listReads).toBe(1);
        clearEntriesCache(typeSlug);
      }
    }
  } finally {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        clearEntriesCache(`upsert-${cacheState}-${operation.name}`);
      }
    }
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("publish and unpublish reconcile exact status over an older complete list", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();
  const operations = [
    { name: "publish", expected: "published" as const, run: publishEntry },
    { name: "unpublish", expected: "draft" as const, run: unpublishEntry },
  ];

  try {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        const typeSlug = `status-${cacheState}-${operation.name}`;
        const pendingRead = createDeferred<Response>();
        resetCsrfToken();
        resetCaches(typeSlug);
        if (cacheState === "present") {
          storage.setItem(
            cacheKeys.entriesList(typeSlug),
            JSON.stringify({
              value: [
                entrySummary(
                  "entry-target",
                  "Before",
                  operation.name === "publish" ? "draft" : "published"
                ),
              ],
              savedAt: Date.now(),
            })
          );
          expect(getCachedEntries(typeSlug)).toHaveLength(1);
        }

        globalThis.fetch = (input, init) => {
          const url = String(input);
          if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
          if (init?.method === "GET") return pendingRead.promise;
          return Promise.resolve(jsonResponse({ ok: true }));
        };

        const staleRead = listEntriesCached(typeSlug, { force: cacheState === "present" });
        await operation.run(typeSlug, "entry-target");
        if (cacheState === "present") {
          expect(getCachedEntries(typeSlug)?.[0]?.status).toBe(operation.expected);
        } else {
          expect(getCachedEntries(typeSlug)).toBeNull();
        }

        pendingRead.resolve(
          jsonResponse([
            entrySummary(
              "entry-target",
              "Stale status target",
              operation.name === "publish" ? "draft" : "published"
            ),
            entrySummary("status-server-unrelated"),
          ])
        );
        await staleRead;
        expect(getCachedEntries(typeSlug)?.map((entry) => entry.id)).toEqual([
          "entry-target",
          "status-server-unrelated",
        ]);
        expect(getCachedEntries(typeSlug)?.[0]?.status).toBe(operation.expected);
        clearEntriesCache(typeSlug);
      }
    }
  } finally {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        clearEntriesCache(`status-${cacheState}-${operation.name}`);
      }
    }
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("delete reconciles its tombstone over an older list with and without a cache", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();

  try {
    for (const cacheState of ["present", "absent"] as const) {
      const typeSlug = `delete-${cacheState}`;
      const pendingRead = createDeferred<Response>();
      resetCsrfToken();
      resetCaches(typeSlug);
      if (cacheState === "present") {
        storage.setItem(
          cacheKeys.entriesList(typeSlug),
          JSON.stringify({
            value: [entrySummary("entry-target"), entrySummary("entry-keeper")],
            savedAt: Date.now(),
          })
        );
        expect(getCachedEntries(typeSlug)).toHaveLength(2);
      }

      globalThis.fetch = (input, init) => {
        const url = String(input);
        if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
        if (init?.method === "GET") return pendingRead.promise;
        return Promise.resolve(jsonResponse({ ok: true }));
      };

      const staleRead = listEntriesCached(typeSlug, { force: cacheState === "present" });
      await deleteEntry(typeSlug, "entry-target");
      if (cacheState === "present") {
        expect(getCachedEntries(typeSlug)?.map((entry) => entry.id)).toEqual(["entry-keeper"]);
      } else {
        expect(getCachedEntries(typeSlug)).toBeNull();
      }

      pendingRead.resolve(
        jsonResponse([entrySummary("entry-target"), entrySummary("entry-keeper")])
      );
      await staleRead;
      expect(getCachedEntries(typeSlug)?.map((entry) => entry.id)).toEqual(["entry-keeper"]);
      clearEntriesCache(typeSlug);
    }
  } finally {
    clearEntriesCache("delete-present");
    clearEntriesCache("delete-absent");
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("settled replace/status/delete survives an older list and newer rejected detail", async () => {
  const originalFetch = globalThis.fetch;
  const { restore, storage } = installLocalStorage();
  const operations = [
    {
      name: "replace",
      run: (typeSlug: string) =>
        updateEntry(typeSlug, "entry-target", { title: "Mutation replace" }),
    },
    {
      name: "status",
      run: (typeSlug: string) => publishEntry(typeSlug, "entry-target"),
    },
    {
      name: "delete",
      run: (typeSlug: string) => deleteEntry(typeSlug, "entry-target"),
    },
  ] as const;

  try {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        const typeSlug = `settled-vs-pending-${cacheState}-${operation.name}`;
        const listResponse = createDeferred<Response>();
        const detailResponse = createDeferred<Response>();
        resetCsrfToken();
        resetCaches(typeSlug);
        if (cacheState === "present") {
          storage.setItem(
            cacheKeys.entriesList(typeSlug),
            JSON.stringify({
              value: [entrySummary("entry-target", "Cached target"), entrySummary("cached-only")],
              savedAt: Date.now(),
            })
          );
          storage.setItem(
            cacheKeys.entryDetail(typeSlug, "entry-target"),
            JSON.stringify({
              value: entryDetail("entry-target", "Cached target"),
              savedAt: Date.now(),
            })
          );
          expect(getCachedEntryDetail(typeSlug, "entry-target")?.title).toBe("Cached target");
        }

        globalThis.fetch = (input, init) => {
          const url = String(input);
          if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
          if (init?.method === "GET" && url.endsWith(`/content/${typeSlug}/entries`)) {
            return listResponse.promise;
          }
          if (init?.method === "GET" && url.endsWith("/entry-target")) {
            return detailResponse.promise;
          }
          if (operation.name === "replace") {
            return Promise.resolve(
              jsonResponse(entryDetail("entry-target", "Mutation replace", "published"))
            );
          }
          return Promise.resolve(jsonResponse({ ok: true }));
        };

        const olderList = listEntriesCached(typeSlug, { force: cacheState === "present" });
        await operation.run(typeSlug);
        const newerDetail = getEntryCached(typeSlug, "entry-target", { force: true });
        const detailFailure = expect(newerDetail).rejects.toThrow("newer-detail-rejected");

        listResponse.resolve(
          jsonResponse([
            entrySummary("entry-target", "Stale server target", "draft"),
            entrySummary("server-unrelated"),
          ])
        );
        await olderList;
        detailResponse.reject(new Error("newer-detail-rejected"));
        await detailFailure;

        const cached = getCachedEntries(typeSlug);
        if (operation.name === "delete") {
          expect(cached?.map((entry) => entry.id)).toEqual(["server-unrelated"]);
          expect(getCachedEntryDetail(typeSlug, "entry-target")).toBeNull();
        } else {
          expect(cached?.map((entry) => entry.id)).toEqual(["entry-target", "server-unrelated"]);
          if (operation.name === "replace") {
            expect(cached?.[0]?.title).toBe("Mutation replace");
            expect(getCachedEntryDetail(typeSlug, "entry-target")?.title).toBe("Mutation replace");
          } else {
            expect(cached?.[0]?.status).toBe("published");
            if (cacheState === "present") {
              expect(getCachedEntryDetail(typeSlug, "entry-target")?.status).toBe("published");
            } else {
              expect(getCachedEntryDetail(typeSlug, "entry-target")).toBeNull();
            }
          }
        }
        clearEntriesCache(typeSlug);
      }
    }
  } finally {
    for (const cacheState of ["present", "absent"] as const) {
      for (const operation of operations) {
        clearEntriesCache(`settled-vs-pending-${cacheState}-${operation.name}`);
      }
    }
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("a status mutation composes with an earlier replacement over an older list", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const listResponse = createDeferred<Response>();
  const typeSlug = "composed-replace-status";

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
    if (init?.method === "GET") return listResponse.promise;
    if (init?.method === "PATCH") {
      return Promise.resolve(jsonResponse(entryDetail("entry-target", "Replacement", "draft")));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  };

  try {
    resetCsrfToken();
    resetCaches(typeSlug);
    const olderList = listEntriesCached(typeSlug);
    await updateEntry(typeSlug, "entry-target", { title: "Replacement" });
    await publishEntry(typeSlug, "entry-target");

    listResponse.resolve(
      jsonResponse([
        entrySummary("entry-target", "Stale server target", "draft"),
        entrySummary("entry-unrelated"),
      ])
    );
    await olderList;
    expect(getCachedEntries(typeSlug)?.map((entry) => entry.id)).toEqual([
      "entry-target",
      "entry-unrelated",
    ]);
    expect(getCachedEntries(typeSlug)?.[0]).toMatchObject({
      status: "published",
      title: "Replacement",
    });
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("a rejected entry mutation leaves the authoritative pending read untouched", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const pendingRead = createDeferred<Response>();
  const typeSlug = "rejected-mutation";

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return Promise.resolve(jsonResponse({ token: "csrf" }));
    if (init?.method === "GET") return pendingRead.promise;
    return Promise.resolve(
      jsonResponse({ error: { code: "entry_update_failed", message: "failed" } }, 500)
    );
  };

  try {
    resetCsrfToken();
    resetCaches(typeSlug);
    const pending = listEntriesCached(typeSlug);
    await expect(updateEntry(typeSlug, "entry-target", { title: "Rejected" })).rejects.toThrow(
      "failed"
    );
    expect(listEntriesCached(typeSlug)).toBe(pending);
    pendingRead.resolve(jsonResponse([entrySummary("authoritative-after-rejection")]));
    await pending;
    expect(getCachedEntries(typeSlug)?.[0]?.id).toBe("authoritative-after-rejection");
  } finally {
    resetCaches(typeSlug);
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("per-type entry A/B/C authority survives C-first success and C rejection followed by D", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];
  let transportCalls = 0;

  globalThis.fetch = () => {
    transportCalls += 1;
    const response = responses.shift();
    if (!response) throw new Error("unexpected_per_type_matrix_read");
    return response.promise;
  };

  try {
    const cFirstSlug = "entry-matrix-c-first";
    resetCaches(cFirstSlug);
    const firstA = createDeferred<Response>();
    const firstB = createDeferred<Response>();
    const firstC = createDeferred<Response>();
    responses.push(firstA, firstB, firstC);
    const firstRequestA = listEntriesCached(cFirstSlug);
    const firstRequestB = listEntriesCached(cFirstSlug, { force: true });
    const firstRequestC = listEntriesCached(cFirstSlug, { force: true });
    expect(listEntriesCached(cFirstSlug)).toBe(firstRequestC);

    firstC.resolve(jsonResponse([entrySummary("entry-c-first")]));
    await firstRequestC;
    expect(getCachedEntries(cFirstSlug)?.[0]?.id).toBe("entry-c-first");

    firstA.resolve(jsonResponse([entrySummary("entry-a-late-success")]));
    await firstRequestA;
    const firstBRejection = expect(firstRequestB).rejects.toThrow("entry-b-late-rejection");
    firstB.reject(new Error("entry-b-late-rejection"));
    await firstBRejection;
    expect(getCachedEntries(cFirstSlug)?.[0]?.id).toBe("entry-c-first");
    expect(transportCalls).toBe(3);

    const retrySlug = "entry-matrix-c-retry";
    clearEntriesCache(retrySlug);
    const retryA = createDeferred<Response>();
    const retryB = createDeferred<Response>();
    const retryC = createDeferred<Response>();
    const retryD = createDeferred<Response>();
    responses.push(retryA, retryB, retryC, retryD);
    const retryRequestA = listEntriesCached(retrySlug);
    const retryRequestB = listEntriesCached(retrySlug, { force: true });
    const retryRequestC = listEntriesCached(retrySlug, { force: true });
    expect(listEntriesCached(retrySlug)).toBe(retryRequestC);

    const cRejection = expect(retryRequestC).rejects.toThrow("entry-c-authoritative-rejection");
    retryC.reject(new Error("entry-c-authoritative-rejection"));
    await cRejection;
    const retryRequestD = listEntriesCached(retrySlug);
    expect(retryRequestD).not.toBe(retryRequestC);

    retryB.resolve(jsonResponse([entrySummary("entry-b-late-success")]));
    await retryRequestB;
    expect(getCachedEntries(retrySlug)).toBeNull();
    expect(listEntriesCached(retrySlug)).toBe(retryRequestD);
    const aRejection = expect(retryRequestA).rejects.toThrow("entry-a-late-rejection");
    retryA.reject(new Error("entry-a-late-rejection"));
    await aRejection;
    expect(getCachedEntries(retrySlug)).toBeNull();
    expect(listEntriesCached(retrySlug)).toBe(retryRequestD);

    retryD.resolve(jsonResponse([entrySummary("entry-d-authoritative")]));
    await retryRequestD;
    expect(getCachedEntries(retrySlug)?.[0]?.id).toBe("entry-d-authoritative");
    expect(transportCalls).toBe(7);
  } finally {
    clearEntriesCache("entry-matrix-c-first");
    clearEntriesCache("entry-matrix-c-retry");
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});

test("all-entry A/B/C authority survives C-first success and C rejection followed by D", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = installLocalStorage();
  const responses: Array<ReturnType<typeof createDeferred<Response>>> = [];
  let transportCalls = 0;

  globalThis.fetch = () => {
    transportCalls += 1;
    const response = responses.shift();
    if (!response) throw new Error("unexpected_all_entry_matrix_read");
    return response.promise;
  };

  try {
    clearAllEntriesCache();
    const firstA = createDeferred<Response>();
    const firstB = createDeferred<Response>();
    const firstC = createDeferred<Response>();
    responses.push(firstA, firstB, firstC);
    const firstRequestA = listAllEntriesCached();
    const firstRequestB = listAllEntriesCached({ force: true });
    const firstRequestC = listAllEntriesCached({ force: true });
    expect(listAllEntriesCached()).toBe(firstRequestC);

    firstC.resolve(jsonResponse([allEntryItem("all-c-first")]));
    await firstRequestC;
    expect(getCachedAllEntries()?.[0]?.id).toBe("all-c-first");
    firstA.resolve(jsonResponse([allEntryItem("all-a-late-success")]));
    await firstRequestA;
    const firstBRejection = expect(firstRequestB).rejects.toThrow("all-b-late-rejection");
    firstB.reject(new Error("all-b-late-rejection"));
    await firstBRejection;
    expect(getCachedAllEntries()?.[0]?.id).toBe("all-c-first");
    expect(transportCalls).toBe(3);

    clearAllEntriesCache();
    const retryA = createDeferred<Response>();
    const retryB = createDeferred<Response>();
    const retryC = createDeferred<Response>();
    const retryD = createDeferred<Response>();
    responses.push(retryA, retryB, retryC, retryD);
    const retryRequestA = listAllEntriesCached();
    const retryRequestB = listAllEntriesCached({ force: true });
    const retryRequestC = listAllEntriesCached({ force: true });
    expect(listAllEntriesCached()).toBe(retryRequestC);

    const cRejection = expect(retryRequestC).rejects.toThrow("all-c-authoritative-rejection");
    retryC.reject(new Error("all-c-authoritative-rejection"));
    await cRejection;
    const retryRequestD = listAllEntriesCached();
    expect(retryRequestD).not.toBe(retryRequestC);

    retryB.resolve(jsonResponse([allEntryItem("all-b-late-success")]));
    await retryRequestB;
    expect(getCachedAllEntries()).toBeNull();
    expect(listAllEntriesCached()).toBe(retryRequestD);
    const aRejection = expect(retryRequestA).rejects.toThrow("all-a-late-rejection");
    retryA.reject(new Error("all-a-late-rejection"));
    await aRejection;
    expect(getCachedAllEntries()).toBeNull();
    expect(listAllEntriesCached()).toBe(retryRequestD);

    retryD.resolve(jsonResponse([allEntryItem("all-d-authoritative")]));
    await retryRequestD;
    expect(getCachedAllEntries()?.[0]?.id).toBe("all-d-authoritative");
    expect(transportCalls).toBe(7);
  } finally {
    clearAllEntriesCache();
    restore();
    globalThis.fetch = originalFetch;
  }
});
