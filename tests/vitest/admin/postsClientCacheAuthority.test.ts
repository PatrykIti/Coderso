import { afterEach, expect, test, vi } from "vitest";

import {
  autosavePost,
  clearPostsCache,
  deletePost,
  getCachedPostDetail,
  getCachedPostRevisions,
  getCachedPosts,
  getPostCached,
  listPostsCached,
  publishPost,
  restorePostRevision,
  unpublishPost,
  updatePost,
  updatePostMetadata,
  type PostDetail,
  type PostRevision,
} from "../../../core/admin/services/postsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { broadcastCacheEvent, subscribeCacheEvents } from "../../../core/admin/utils/cacheBus";

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

const capturePostEvents = () => {
  const events: string[] = [];
  const unsubscribe = subscribeCacheEvents((event) => {
    if (event.key === cacheKeys.postsList || event.key === cacheKeys.postDetail("post-1")) {
      events.push(`${event.key}:${event.action}`);
    }
  });
  return { events, unsubscribe };
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetCsrfToken();
  clearPostsCache();
});

test("a stale force detail GET returns the current metadata mutation detail without overwriting it", async () => {
  const initialRead = deferred<Response>();
  const updated = post({ title: "Metadata B", seo: { title: "Metadata B" } });
  const { events, unsubscribe } = capturePostEvents();

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1") && init?.method === "GET") return initialRead.promise;
    if (url.endsWith("/posts/post-1/metadata")) return jsonResponse(updated);
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const staleRead = getPostCached("post-1", { force: true });
    await updatePostMetadata("post-1", { seo: { title: "Metadata B" } });
    initialRead.resolve(jsonResponse(post({ title: "Stale A" })));

    await expect(staleRead).resolves.toMatchObject({ title: "Metadata B" });
    expect(getCachedPostDetail("post-1")?.title).toBe("Metadata B");
    expect(getCachedPosts()?.find((item) => item.id === "post-1")?.title).toBe("Metadata B");
    expect(events).toEqual(["posts:list:update", "posts:detail:post-1:update"]);
  } finally {
    unsubscribe();
  }
});

test("two deferred metadata mutations reconcile A after B through one guarded fresh read", async () => {
  const mutationA = deferred<Response>();
  const mutationB = deferred<Response>();
  const freshRead = post({ title: "Server B", seo: { title: "Server B" } });
  const { events, unsubscribe } = capturePostEvents();

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1/metadata")) {
      const body = JSON.parse(String(init?.body));
      return body.seo?.title === "A" ? mutationA.promise : mutationB.promise;
    }
    if (url.endsWith("/posts/post-1") && init?.method === "GET") return jsonResponse(freshRead);
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const requestA = updatePostMetadata("post-1", { seo: { title: "A" } });
    const requestB = updatePostMetadata("post-1", { seo: { title: "B" } });
    mutationB.resolve(jsonResponse(freshRead));
    await requestB;
    mutationA.resolve(jsonResponse(post({ title: "Server A", seo: { title: "A" } })));
    await requestA;

    expect(getCachedPostDetail("post-1")?.title).toBe("Server B");
    expect(getCachedPosts()?.find((item) => item.id === "post-1")?.title).toBe("Server B");
    expect(events).toEqual([
      "posts:list:update",
      "posts:detail:post-1:update",
      "posts:list:update",
      "posts:detail:post-1:update",
    ]);
  } finally {
    unsubscribe();
  }
});

test("two deferred metadata mutations reconcile B after A through one guarded fresh read", async () => {
  const mutationA = deferred<Response>();
  const mutationB = deferred<Response>();
  const freshRead = post({ title: "Server B", seo: { title: "Server B" } });
  const { events, unsubscribe } = capturePostEvents();

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1/metadata")) {
      const body = JSON.parse(String(init?.body));
      return body.seo?.title === "A" ? mutationA.promise : mutationB.promise;
    }
    if (url.endsWith("/posts/post-1") && init?.method === "GET") return jsonResponse(freshRead);
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const requestA = updatePostMetadata("post-1", { seo: { title: "A" } });
    const requestB = updatePostMetadata("post-1", { seo: { title: "B" } });
    mutationA.resolve(jsonResponse(post({ title: "Server A", seo: { title: "A" } })));
    await requestA;
    mutationB.resolve(jsonResponse(freshRead));
    await requestB;

    expect(getCachedPostDetail("post-1")?.title).toBe("Server B");
    expect(getCachedPosts()?.find((item) => item.id === "post-1")?.title).toBe("Server B");
    expect(events).toEqual([
      "posts:list:update",
      "posts:detail:post-1:update",
      "posts:list:update",
      "posts:detail:post-1:update",
    ]);
  } finally {
    unsubscribe();
  }
});

test("a failed stale non-status reconciliation invalidates its obsolete projection and protects a list row", async () => {
  const mutationA = deferred<Response>();
  const mutationB = deferred<Response>();
  const staleList = deferred<Response>();
  const failedReconciliation = deferred<Response>();
  const acceptedB = post({ title: "Metadata B", seo: { title: "Metadata B" } });
  const { events, unsubscribe } = capturePostEvents();
  let detailReadCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts") && init?.method === "GET") return staleList.promise;
    if (url.endsWith("/posts/post-1/metadata")) {
      const body = JSON.parse(String(init?.body));
      return body.seo?.title === "A" ? mutationA.promise : mutationB.promise;
    }
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      detailReadCount += 1;
      return failedReconciliation.promise;
    }
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const listRead = listPostsCached({ force: true });
    const requestA = updatePostMetadata("post-1", { seo: { title: "A" } });
    const requestB = updatePostMetadata("post-1", { seo: { title: "B" } });
    mutationB.resolve(jsonResponse(acceptedB));
    await requestB;
    mutationA.resolve(jsonResponse(post({ title: "Metadata A", seo: { title: "A" } })));
    await vi.waitFor(() => expect(detailReadCount).toBe(1));
    failedReconciliation.reject(new Error("fresh detail reconciliation failed"));
    await expect(requestA).resolves.toMatchObject({ title: "Metadata A" });
    staleList.resolve(jsonResponse([post({ title: "Stale list row" })]));

    await expect(listRead).resolves.toEqual([]);
    expect(getCachedPostDetail("post-1")).toBeNull();
    expect(getCachedPosts()).toEqual([]);
    expect(events).toEqual([
      "posts:list:update",
      "posts:detail:post-1:update",
      "posts:list:invalidate",
      "posts:detail:post-1:invalidate",
    ]);
  } finally {
    unsubscribe();
  }
});

test("a later accepted detail read suppresses a stale non-status reconciliation fallback", async () => {
  const mutationA = deferred<Response>();
  const mutationB = deferred<Response>();
  const failedReconciliation = deferred<Response>();
  const acceptedRead = deferred<Response>();
  const acceptedB = post({ title: "Metadata B", seo: { title: "Metadata B" } });
  const acceptedReadDetail = post({ title: "Accepted read", seo: { title: "Accepted read" } });
  const { events, unsubscribe } = capturePostEvents();
  let detailReadCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1/metadata")) {
      const body = JSON.parse(String(init?.body));
      return body.seo?.title === "A" ? mutationA.promise : mutationB.promise;
    }
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      detailReadCount += 1;
      return detailReadCount === 1 ? failedReconciliation.promise : acceptedRead.promise;
    }
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const requestA = updatePostMetadata("post-1", { seo: { title: "A" } });
    const requestB = updatePostMetadata("post-1", { seo: { title: "B" } });
    mutationB.resolve(jsonResponse(acceptedB));
    await requestB;
    mutationA.resolve(jsonResponse(post({ title: "Metadata A", seo: { title: "A" } })));
    await vi.waitFor(() => expect(detailReadCount).toBe(1));
    const lateRead = getPostCached("post-1", { force: true });
    await vi.waitFor(() => expect(detailReadCount).toBe(2));
    acceptedRead.resolve(jsonResponse(acceptedReadDetail));
    await expect(lateRead).resolves.toMatchObject({ title: "Accepted read" });
    failedReconciliation.reject(new Error("stale reconciliation failed"));
    await expect(requestA).resolves.toMatchObject({ title: "Metadata A" });

    expect(getCachedPostDetail("post-1")).toMatchObject(acceptedReadDetail);
    expect(getCachedPosts()).toMatchObject([{ title: "Accepted read" }]);
    expect(events).toEqual(["posts:list:update", "posts:detail:post-1:update"]);
  } finally {
    unsubscribe();
  }
});

test("a later accepted non-status mutation suppresses a stale reconciliation fallback", async () => {
  const mutationA = deferred<Response>();
  const mutationB = deferred<Response>();
  const mutationC = deferred<Response>();
  const failedReconciliation = deferred<Response>();
  const acceptedB = post({ title: "Metadata B", seo: { title: "Metadata B" } });
  const acceptedC = post({ title: "Metadata C", seo: { title: "Metadata C" } });
  const { events, unsubscribe } = capturePostEvents();
  let detailReadCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1/metadata")) {
      const body = JSON.parse(String(init?.body));
      if (body.seo?.title === "A") return mutationA.promise;
      if (body.seo?.title === "B") return mutationB.promise;
      return mutationC.promise;
    }
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      detailReadCount += 1;
      return failedReconciliation.promise;
    }
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const requestA = updatePostMetadata("post-1", { seo: { title: "A" } });
    const requestB = updatePostMetadata("post-1", { seo: { title: "B" } });
    mutationB.resolve(jsonResponse(acceptedB));
    await requestB;
    mutationA.resolve(jsonResponse(post({ title: "Metadata A", seo: { title: "A" } })));
    await vi.waitFor(() => expect(detailReadCount).toBe(1));
    const requestC = updatePostMetadata("post-1", { seo: { title: "C" } });
    mutationC.resolve(jsonResponse(acceptedC));
    await requestC;
    failedReconciliation.reject(new Error("stale reconciliation failed"));
    await expect(requestA).resolves.toMatchObject({ title: "Metadata A" });

    expect(getCachedPostDetail("post-1")).toMatchObject(acceptedC);
    expect(getCachedPosts()).toMatchObject([{ title: "Metadata C" }]);
    expect(events).toEqual([
      "posts:list:update",
      "posts:detail:post-1:update",
      "posts:list:update",
      "posts:detail:post-1:update",
    ]);
  } finally {
    unsubscribe();
  }
});

test("publish and unpublish always replace a cached schedule with a forced full detail read", async () => {
  const scheduled = post({
    status: "scheduled",
    scheduledAt: "2026-08-12T12:00:00.000Z",
  });
  const published = post({ status: "published", scheduledAt: null });
  const draft = post({ status: "draft", scheduledAt: null });
  const publishedRead = deferred<Response>();
  const draftRead = deferred<Response>();
  const detailReads: string[] = [];
  const { events, unsubscribe } = capturePostEvents();

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      detailReads.push("detail");
      if (detailReads.length === 1) return jsonResponse(scheduled);
      return detailReads.length === 2 ? publishedRead.promise : draftRead.promise;
    }
    if (url.endsWith("/posts/post-1/publish")) return jsonResponse({ ok: true });
    if (url.endsWith("/posts/post-1/unpublish")) return jsonResponse({ ok: true });
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    await getPostCached("post-1", { force: true });
    const publishing = publishPost("post-1");
    await vi.waitFor(() => expect(detailReads).toHaveLength(2));
    expect(events).toEqual([]);
    expect(getCachedPostDetail("post-1")).toMatchObject({
      status: "scheduled",
      scheduledAt: "2026-08-12T12:00:00.000Z",
    });
    expect(getCachedPosts()).toMatchObject([
      { status: "scheduled", scheduledAt: "2026-08-12T12:00:00.000Z" },
    ]);
    publishedRead.resolve(jsonResponse(published));
    await publishing;
    expect(getCachedPostDetail("post-1")).toMatchObject({
      status: "published",
      scheduledAt: null,
    });
    expect(getCachedPosts()).toMatchObject([{ status: "published", scheduledAt: null }]);
    expect(events).toEqual(["posts:list:update", "posts:detail:post-1:update"]);

    events.splice(0);
    const unpublishing = unpublishPost("post-1");
    await vi.waitFor(() => expect(detailReads).toHaveLength(3));
    expect(events).toEqual([]);
    expect(getCachedPostDetail("post-1")).toMatchObject({
      status: "published",
      scheduledAt: null,
    });
    expect(getCachedPosts()).toMatchObject([{ status: "published", scheduledAt: null }]);
    draftRead.resolve(jsonResponse(draft));
    await unpublishing;
    expect(getCachedPostDetail("post-1")).toMatchObject({
      status: "draft",
      scheduledAt: null,
    });
    expect(getCachedPosts()).toMatchObject([{ status: "draft", scheduledAt: null }]);
    expect(detailReads).toHaveLength(3);
    expect(events).toEqual(["posts:list:update", "posts:detail:post-1:update"]);
  } finally {
    unsubscribe();
  }
});

test("a failed status refresh invalidates a cached schedule instead of leaving it stale", async () => {
  const scheduled = post({
    status: "scheduled",
    scheduledAt: "2026-08-12T12:00:00.000Z",
  });
  const { events, unsubscribe } = capturePostEvents();
  let detailReadCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      detailReadCount += 1;
      if (detailReadCount === 1) return jsonResponse(scheduled);
      throw new Error("forced detail refresh failed");
    }
    if (url.endsWith("/posts/post-1/publish")) return jsonResponse({ ok: true });
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    await getPostCached("post-1", { force: true });
    await expect(publishPost("post-1")).resolves.toEqual({ ok: true });

    expect(getCachedPostDetail("post-1")).toBeNull();
    expect(getCachedPosts()).toEqual([]);
    expect(events).toEqual(["posts:list:invalidate", "posts:detail:post-1:invalidate"]);
  } finally {
    unsubscribe();
  }
});

test("a list read begun before a failed status refresh cannot restore its stale scheduled row", async () => {
  const staleList = deferred<Response>();
  const scheduled = post({
    status: "scheduled",
    scheduledAt: "2026-08-12T12:00:00.000Z",
  });
  const { events, unsubscribe } = capturePostEvents();

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts") && init?.method === "GET") return staleList.promise;
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      throw new Error("forced detail refresh failed");
    }
    if (url.endsWith("/posts/post-1/publish")) return jsonResponse({ ok: true });
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const listRead = listPostsCached({ force: true });
    await expect(publishPost("post-1")).resolves.toEqual({ ok: true });
    staleList.resolve(jsonResponse([scheduled]));

    await expect(listRead).resolves.toEqual([]);
    expect(getCachedPosts()).toEqual([]);
    expect(getCachedPostDetail("post-1")).toBeNull();
    expect(events).toEqual(["posts:list:invalidate", "posts:detail:post-1:invalidate"]);
  } finally {
    unsubscribe();
  }
});

test("a failed stale status refresh invalidates a newer scheduled projection", async () => {
  const metadataResponse = deferred<Response>();
  const publishResponse = deferred<Response>();
  const scheduled = post({
    status: "scheduled",
    scheduledAt: "2026-08-12T12:00:00.000Z",
    seo: { title: "Scheduled metadata" },
  });
  const { events, unsubscribe } = capturePostEvents();

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1/metadata")) return metadataResponse.promise;
    if (url.endsWith("/posts/post-1/publish")) return publishResponse.promise;
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      throw new Error("stale status refresh failed");
    }
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const publishing = publishPost("post-1");
    const metadata = updatePostMetadata("post-1", { seo: { title: "Scheduled metadata" } });
    metadataResponse.resolve(jsonResponse(scheduled));
    await metadata;
    events.splice(0);
    publishResponse.resolve(jsonResponse({ ok: true }));
    await expect(publishing).resolves.toEqual({ ok: true });

    expect(getCachedPostDetail("post-1")).toBeNull();
    expect(getCachedPosts()).toEqual([]);
    expect(events).toEqual(["posts:list:invalidate", "posts:detail:post-1:invalidate"]);
  } finally {
    unsubscribe();
  }
});

test("later guarded detail reads win over an earlier status refresh in both completion orders", async () => {
  const { events, unsubscribe } = capturePostEvents();

  const runOverlap = async (resolveMetadataFirst: boolean) => {
    clearPostsCache();
    resetCsrfToken();
    events.splice(0);
    const publishResponse = deferred<Response>();
    const metadataResponse = deferred<Response>();
    const statusDetail = deferred<Response>();
    const metadataDetail = deferred<Response>();
    const statusSnapshot = post({
      title: "Published snapshot",
      status: "published",
      scheduledAt: null,
    });
    const metadataSnapshot = post({
      title: "Metadata snapshot",
      status: "scheduled",
      scheduledAt: "2026-08-12T12:00:00.000Z",
      seo: { title: "Metadata snapshot" },
    });
    let detailReadCount = 0;

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
      if (url.endsWith("/posts/post-1/publish")) return publishResponse.promise;
      if (url.endsWith("/posts/post-1/metadata")) return metadataResponse.promise;
      if (url.endsWith("/posts/post-1") && init?.method === "GET") {
        detailReadCount += 1;
        return detailReadCount === 1 ? statusDetail.promise : metadataDetail.promise;
      }
      throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
    };

    const publishing = publishPost("post-1");
    const metadata = updatePostMetadata("post-1", { seo: { title: "Metadata snapshot" } });
    publishResponse.resolve(jsonResponse({ ok: true }));
    await vi.waitFor(() => expect(detailReadCount).toBe(1));
    metadataResponse.resolve(jsonResponse(metadataSnapshot));
    await vi.waitFor(() => expect(detailReadCount).toBe(2));

    if (resolveMetadataFirst) {
      metadataDetail.resolve(jsonResponse(metadataSnapshot));
      await metadata;
      statusDetail.resolve(jsonResponse(statusSnapshot));
      await publishing;
      expect(events).toEqual(["posts:list:update", "posts:detail:post-1:update"]);
    } else {
      statusDetail.resolve(jsonResponse(statusSnapshot));
      await publishing;
      metadataDetail.resolve(jsonResponse(metadataSnapshot));
      await metadata;
      expect(events).toEqual([
        "posts:list:update",
        "posts:detail:post-1:update",
        "posts:list:update",
        "posts:detail:post-1:update",
      ]);
    }

    expect(getCachedPostDetail("post-1")).toMatchObject(metadataSnapshot);
    expect(getCachedPosts()).toMatchObject([
      {
        id: "post-1",
        title: "Metadata snapshot",
        status: "scheduled",
        scheduledAt: "2026-08-12T12:00:00.000Z",
      },
    ]);
  };

  try {
    await runOverlap(true);
    await runOverlap(false);
  } finally {
    unsubscribe();
  }
});

test("a failed stale status refresh cannot invalidate a later accepted detail read", async () => {
  const publishResponse = deferred<Response>();
  const metadataResponse = deferred<Response>();
  const statusDetail = deferred<Response>();
  const metadataDetail = deferred<Response>();
  const metadataSnapshot = post({
    title: "Metadata snapshot",
    status: "scheduled",
    scheduledAt: "2026-08-12T12:00:00.000Z",
    seo: { title: "Metadata snapshot" },
  });
  const { events, unsubscribe } = capturePostEvents();
  let detailReadCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1/publish")) return publishResponse.promise;
    if (url.endsWith("/posts/post-1/metadata")) return metadataResponse.promise;
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      detailReadCount += 1;
      return detailReadCount === 1 ? statusDetail.promise : metadataDetail.promise;
    }
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const publishing = publishPost("post-1");
    const metadata = updatePostMetadata("post-1", { seo: { title: "Metadata snapshot" } });
    publishResponse.resolve(jsonResponse({ ok: true }));
    await vi.waitFor(() => expect(detailReadCount).toBe(1));
    metadataResponse.resolve(jsonResponse(metadataSnapshot));
    await vi.waitFor(() => expect(detailReadCount).toBe(2));
    metadataDetail.resolve(jsonResponse(metadataSnapshot));
    await metadata;
    statusDetail.reject(new Error("stale status refresh failed"));
    await expect(publishing).resolves.toEqual({ ok: true });

    expect(getCachedPostDetail("post-1")).toMatchObject(metadataSnapshot);
    expect(getCachedPosts()).toMatchObject([
      {
        id: "post-1",
        title: "Metadata snapshot",
        status: "scheduled",
        scheduledAt: "2026-08-12T12:00:00.000Z",
      },
    ]);
    expect(events).toEqual(["posts:list:update", "posts:detail:post-1:update"]);
  } finally {
    unsubscribe();
  }
});

test("a stale list read initiated by a cache event merges a later metadata mutation before cache and return", async () => {
  const staleList = deferred<Response>();
  const updated = post({ title: "Metadata B", seo: { title: "Metadata B" } });
  let listRead: Promise<unknown> | null = null;
  const unsubscribe = subscribeCacheEvents((event) => {
    if (event.key === "task-554:list-start" && !listRead) {
      listRead = listPostsCached({ force: true });
    }
  });

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts") && init?.method === "GET") return staleList.promise;
    if (url.endsWith("/posts/post-1/metadata")) return jsonResponse(updated);
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    broadcastCacheEvent({ key: "task-554:list-start", action: "invalidate" });
    expect(listRead).not.toBeNull();
    await updatePostMetadata("post-1", { seo: { title: "Metadata B" } });
    staleList.resolve(jsonResponse([post({ title: "Stale A" })]));

    await expect(listRead).resolves.toMatchObject([{ id: "post-1", title: "Metadata B" }]);
    expect(getCachedPosts()).toMatchObject([{ id: "post-1", title: "Metadata B" }]);
  } finally {
    unsubscribe();
  }
});

test("a stale list read merges the forced publish detail instead of its older scheduled row", async () => {
  const staleList = deferred<Response>();
  const published = post({ status: "published", scheduledAt: null });

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts") && init?.method === "GET") return staleList.promise;
    if (url.endsWith("/posts/post-1/publish")) return jsonResponse({ ok: true });
    if (url.endsWith("/posts/post-1") && init?.method === "GET") return jsonResponse(published);
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  const listRead = listPostsCached({ force: true });
  await publishPost("post-1");
  staleList.resolve(
    jsonResponse([
      post({
        status: "scheduled",
        scheduledAt: "2026-08-12T12:00:00.000Z",
      }),
    ])
  );

  await expect(listRead).resolves.toMatchObject([{ status: "published", scheduledAt: null }]);
  expect(getCachedPosts()).toMatchObject([{ status: "published", scheduledAt: null }]);
});

test("a stale list read removes a row after delete and delete emits only ordered invalidations", async () => {
  const staleList = deferred<Response>();
  const { events, unsubscribe } = capturePostEvents();

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts") && init?.method === "GET") return staleList.promise;
    if (url.endsWith("/posts/post-1") && init?.method === "DELETE")
      return jsonResponse({ ok: true });
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const listRead = listPostsCached({ force: true });
    await deletePost("post-1");
    staleList.resolve(jsonResponse([post({ title: "Deleted stale row" })]));

    await expect(listRead).resolves.toEqual([]);
    expect(getCachedPosts()).toEqual([]);
    expect(getCachedPostDetail("post-1")).toBeNull();
    expect(events).toEqual(["posts:list:invalidate", "posts:detail:post-1:invalidate"]);
  } finally {
    unsubscribe();
  }
});

test("a delete tombstone wins over stale successful and exact 404 detail reads without a retry", async () => {
  const staleSuccess = deferred<Response>();
  const staleNotFound = deferred<Response>();
  let detailReadCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      detailReadCount += 1;
      return detailReadCount === 1 ? staleSuccess.promise : staleNotFound.promise;
    }
    if (url.endsWith("/posts/post-1") && init?.method === "DELETE")
      return jsonResponse({ ok: true });
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  const firstRead = getPostCached("post-1", { force: true });
  await deletePost("post-1");
  staleSuccess.resolve(jsonResponse(post({ title: "Stale success" })));
  await expect(firstRead).resolves.toBeNull();

  clearPostsCache();
  const secondRead = getPostCached("post-1", { force: true });
  await deletePost("post-1");
  staleNotFound.resolve(
    jsonResponse({ error: { code: "post_not_found", message: "Not found" } }, 404)
  );
  await expect(secondRead).resolves.toBeNull();
  expect(detailReadCount).toBe(2);
  expect(getCachedPostDetail("post-1")).toBeNull();
});

test("late update, autosave, and restore responses after delete cannot restore details or revisions", async () => {
  const autosave = deferred<Response>();
  const restore = deferred<Response>();
  const update = deferred<Response>();
  const { events, unsubscribe } = capturePostEvents();

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1/autosave")) return autosave.promise;
    if (url.endsWith("/posts/post-1/revisions/revision-1/restore")) return restore.promise;
    if (url.endsWith("/posts/post-1") && init?.method === "PATCH") return update.promise;
    if (url.endsWith("/posts/post-1") && init?.method === "DELETE")
      return jsonResponse({ ok: true });
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  try {
    const autosaveRequest = autosavePost("post-1", { title: "Late autosave" });
    const restoreRequest = restorePostRevision("post-1", "revision-1");
    const updateRequest = updatePost("post-1", { title: "Late update" });
    await deletePost("post-1");
    autosave.resolve(
      jsonResponse({
        post: post({ title: "Late autosave" }),
        revision: revision("autosave-revision"),
        savedAt: "2026-08-11T08:00:00.000Z",
        reusedRevision: false,
      })
    );
    restore.resolve(
      jsonResponse({
        ok: true,
        restored: true,
        post: post({ title: "Late restore" }),
        revision: revision("restore-revision"),
      })
    );
    update.resolve(jsonResponse(post({ title: "Late update" })));

    await Promise.all([autosaveRequest, restoreRequest, updateRequest]);
    expect(getCachedPostDetail("post-1")).toBeNull();
    expect(getCachedPosts()?.find((item) => item.id === "post-1")).toBeUndefined();
    expect(getCachedPostRevisions("post-1")).toBeNull();
    expect(events).toEqual(["posts:list:invalidate", "posts:detail:post-1:invalidate"]);
  } finally {
    unsubscribe();
  }
});

test("clearPostsCache prevents pre-reset detail and list reads from repopulating fresh cache state", async () => {
  const oldDetail = deferred<Response>();
  const oldList = deferred<Response>();
  const freshDetail = post({ title: "Fresh detail" });
  const freshList = [post({ title: "Fresh list" })];
  let detailReadCount = 0;
  let listReadCount = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (isCsrfRequest(url)) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      detailReadCount += 1;
      return detailReadCount === 1 ? oldDetail.promise : jsonResponse(freshDetail);
    }
    if (url.endsWith("/posts") && init?.method === "GET") {
      listReadCount += 1;
      return listReadCount === 1 ? oldList.promise : jsonResponse(freshList);
    }
    if (url.endsWith("/posts/post-1") && init?.method === "DELETE")
      return jsonResponse({ ok: true });
    throw new Error(`Unexpected request ${init?.method ?? "GET"} ${url}`);
  };

  const oldDetailRead = getPostCached("post-1", { force: true });
  const oldListRead = listPostsCached({ force: true });
  await deletePost("post-1");
  clearPostsCache();

  await expect(getPostCached("post-1", { force: true })).resolves.toMatchObject({
    title: "Fresh detail",
  });
  await expect(listPostsCached({ force: true })).resolves.toMatchObject([{ title: "Fresh list" }]);
  oldDetail.resolve(jsonResponse(post({ title: "Old detail" })));
  oldList.resolve(jsonResponse([post({ title: "Old list" })]));

  await expect(oldDetailRead).resolves.toMatchObject({ title: "Fresh detail" });
  await expect(oldListRead).resolves.toMatchObject([{ title: "Fresh list" }]);
  expect(getCachedPostDetail("post-1")?.title).toBe("Fresh detail");
  expect(getCachedPosts()).toMatchObject([{ title: "Fresh list" }]);
});
