import { afterEach, expect, test } from "vitest";

import {
  clearPostsCache,
  getCachedPostDetail,
  getCachedPostRevisions,
  getPostCached,
  listPostRevisionsCached,
  listPostsCached,
  publishPost,
  type PostDetail,
  type PostRevision,
} from "../../../core/admin/services/postsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const originalFetch = globalThis.fetch;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const deferred = <Value>() => {
  let resolve!: (value: Value) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const post = (overrides: Partial<PostDetail> = {}): PostDetail => ({
  id: "post-1",
  typeId: "post-type",
  title: "Original title",
  slug: "original-title",
  status: "draft",
  data: {},
  tags: [],
  scheduledAt: null,
  createdAt: "2026-08-11T08:00:00.000Z",
  updatedAt: "2026-08-11T08:00:00.000Z",
  publishedAt: null,
  author: null,
  taxonomy: null,
  ...overrides,
});

const revision = (id = "revision-1"): PostRevision => ({
  id,
  postId: "post-1",
  version: 1,
  data: {},
  createdAt: "2026-08-11T08:00:00.000Z",
  createdBy: null,
});

const isCsrfRequest = (url: string) => url.endsWith("/auth/csrf");

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetCsrfToken();
  clearPostsCache();
});

test("prunes list row publication epochs and clears them when no reads remain", async () => {
  const firstList = deferred<Response>();
  const secondList = deferred<Response>();
  let listCalls = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/posts") && init?.method === "GET") {
      listCalls += 1;
      if (listCalls === 1) return firstList.promise;
      return secondList.promise;
    }
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      return jsonResponse(post({ id: "post-1", title: "Row A" }));
    }
    if (url.endsWith("/posts/post-2") && init?.method === "GET") {
      return jsonResponse(post({ id: "post-2", title: "Row B" }));
    }
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const firstListRead = listPostsCached();
    // Row A publication while the first list read is in flight.
    await expect(getPostCached("post-1", { force: true })).resolves.toMatchObject({
      title: "Row A",
    });
    // Second list read captures a newer publication epoch but stays in flight.
    const secondListRead = listPostsCached({ force: true });
    // Row B publication while both list reads are in flight.
    await expect(getPostCached("post-2", { force: true })).resolves.toMatchObject({
      title: "Row B",
    });

    // The first read finishes while the second is still active: the pruner keeps
    // only the rows published after the newest active capture.
    firstList.resolve(jsonResponse([post({ id: "post-1", title: "Row A" })]));
    await expect(firstListRead).resolves.toBeDefined();

    // The last read finishing clears the publication-epoch bookkeeping.
    secondList.resolve(jsonResponse([post({ id: "post-1", title: "Row A" })]));
    await expect(secondListRead).resolves.toBeDefined();
  } finally {
    globalThis.fetch = originalFetch;
    clearPostsCache();
  }
});

test("a doubly-superseded detail read retries once and then gives up", async () => {
  const staleDetail = deferred<Response>();
  const reconcileOne = deferred<Response>();
  const recursionRead = deferred<Response>();
  const reconcileTwo = deferred<Response>();
  const publishOne = deferred<Response>();
  const publishTwo = deferred<Response>();
  let getCount = 0;
  let publishCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      getCount += 1;
      if (getCount === 1) return staleDetail.promise;
      if (getCount === 2) return reconcileOne.promise;
      if (getCount === 3) return recursionRead.promise;
      return reconcileTwo.promise;
    }
    if (url.endsWith("/posts/post-1/publish")) {
      publishCount += 1;
      return publishCount === 1 ? publishOne.promise : publishTwo.promise;
    }
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const initialRead = getPostCached("post-1", { force: true });
    const firstPublish = publishPost("post-1");
    // First publish wins: advances the generation and supersedes the initial read.
    publishOne.resolve(jsonResponse({ ok: true }));
    await flushAsync();
    // The superseded read resolves stale and retries through a fresh read.
    staleDetail.resolve(jsonResponse(post({ title: "Stale" })));
    await flushAsync();
    // The first reconciliation fails with a hard 404, removing the detail cache.
    reconcileOne.resolve(
      jsonResponse({ error: { code: "post_not_found", message: "Not found" } }, 404)
    );
    await flushAsync();

    const secondPublish = publishPost("post-1");
    // Second publish supersedes the retry read before it resolves.
    publishTwo.resolve(jsonResponse({ ok: true }));
    await flushAsync();
    recursionRead.resolve(jsonResponse(post({ title: "Stale 2" })));
    reconcileTwo.resolve(jsonResponse(post({ title: "Fresh" })));

    await expect(initialRead).resolves.toBeNull();
    await expect(firstPublish).resolves.toMatchObject({ ok: true });
    await expect(secondPublish).resolves.toMatchObject({ ok: true });
    expect(getCachedPostDetail("post-1")?.title).toBe("Fresh");
  } finally {
    globalThis.fetch = originalFetch;
    clearPostsCache();
  }
});

test("getPostCached falls back to the list cache when no detail is cached", async () => {
  const listItem = post({ id: "post-1", title: "List title" });

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/posts") && init?.method === "GET") {
      return jsonResponse([listItem]);
    }
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    await listPostsCached({ force: true });
    const detail = await getPostCached("post-1");
    expect(detail).toMatchObject({ id: "post-1", title: "List title" });
  } finally {
    globalThis.fetch = originalFetch;
    clearPostsCache();
  }
});

test("listPostRevisionsCached fetches and writes revisions on cache miss", async () => {
  const revisions = [revision("revision-1"), revision("revision-2")];
  let calls = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/posts/post-1/revisions") && init?.method === "GET") {
      calls += 1;
      return jsonResponse(revisions);
    }
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const result = await listPostRevisionsCached("post-1");
    expect(result).toEqual(revisions);
    expect(calls).toBe(1);
    expect(getCachedPostRevisions("post-1")).toEqual(revisions);

    // The second read is served from the written cache.
    await listPostRevisionsCached("post-1");
    expect(calls).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    clearPostsCache();
  }
});
