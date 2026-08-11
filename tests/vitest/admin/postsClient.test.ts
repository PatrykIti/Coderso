import { afterEach, expect, test, vi } from "vitest";

import {
  autosavePost,
  clearPostsCache,
  createPost,
  duplicatePost,
  getPostCached,
  getCachedPostDetail,
  getCachedPostRevisions,
  listPostRevisions,
  listPostRevisionsCached,
  listPosts,
  listPostsCached,
  previewPost,
  publishPost,
  restorePostRevision,
} from "../../../core/admin/services/postsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys, cacheTtlMs } from "../../../core/admin/services/cachePolicy";

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

const resetCaches = () => {
  clearPostsCache();
};

afterEach(() => {
  vi.useRealTimers();
});

test("listPosts hits GET /posts", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listPosts();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/posts");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createPost uses CSRF and posts payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "post-1" });
  };

  try {
    resetCsrfToken();
    await createPost({
      title: "Hello",
      slug: "hello",
      data: { excerpt: "Intro" },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/posts");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.title).toBe("Hello");
    expect(body.slug).toBe("hello");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("previewPost posts ttlMinutes with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ token: "t", previewUrl: "https://example.com", expiresAt: "soon" });
  };

  try {
    resetCsrfToken();
    await previewPost("post-123", 30);

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/posts/post-123/preview");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.ttlMinutes).toBe(30);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("autosavePost posts payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      post: {
        id: "post-1",
        typeId: "post-type",
        title: "Autosaved",
        slug: "autosaved",
        status: "draft",
        data: {},
        tags: [],
        createdAt: "2026-02-21T10:00:00.000Z",
        updatedAt: "2026-02-21T10:00:00.000Z",
      },
      revision: {
        id: "rev-1",
        postId: "post-1",
        version: 1,
        data: {},
        createdAt: "2026-02-21T10:00:00.000Z",
        createdBy: null,
      },
      savedAt: "2026-02-21T10:00:00.000Z",
      reusedRevision: false,
    });
  };

  try {
    resetCsrfToken();
    await autosavePost("post-1", {
      title: "Autosaved",
      tags: ["Launch"],
      taxonomy: { categoryId: "cat-1" },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/posts/post-1/autosave");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body).toMatchObject({
      title: "Autosaved",
      tags: ["Launch"],
      taxonomy: { categoryId: "cat-1" },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listPostRevisions calls revisions endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listPostRevisions("post-1");
    expect(calls[0]?.input).toBe("/admin/api/posts/post-1/revisions");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listPostRevisionsCached reads from shared revisions cache", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();
  const cachedRevision = {
    id: "rev-cached",
    postId: "post-1",
    version: 3,
    data: {},
    createdAt: "2026-02-21T10:00:00.000Z",
    createdBy: null,
  };

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    storage.setItem(
      cacheKeys.postRevisions("post-1"),
      JSON.stringify({ value: [cachedRevision], savedAt: Date.now() })
    );

    const result = await listPostRevisionsCached("post-1");
    expect(result).toEqual([cachedRevision]);
    expect(calls).toHaveLength(0);
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

test("post mutations patch revisions cache from returned revision payloads", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const revisionOne = {
    id: "rev-1",
    postId: "post-1",
    version: 1,
    data: {},
    createdAt: "2026-02-21T10:00:00.000Z",
    createdBy: null,
  };
  const revisionTwo = {
    ...revisionOne,
    id: "rev-2",
    version: 2,
  };
  const post = {
    id: "post-1",
    typeId: "post-type",
    title: "Cached",
    slug: "cached",
    status: "draft" as const,
    data: {},
    tags: [],
    createdAt: "2026-02-21T10:00:00.000Z",
    updatedAt: "2026-02-21T10:00:00.000Z",
  };

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/autosave")) {
      return jsonResponse({
        post,
        revision: revisionOne,
        savedAt: "2026-02-21T10:00:00.000Z",
        reusedRevision: false,
      });
    }
    if (url.endsWith("/publish")) {
      return jsonResponse({
        ok: true,
        revision: revisionTwo,
        reusedRevision: false,
      });
    }
    if (url.endsWith("/posts/post-1") && init?.method === "GET") {
      return jsonResponse({
        ...post,
        status: "published",
        scheduledAt: null,
        taxonomy: null,
      });
    }
    if (url.endsWith("/revisions/rev-1/restore")) {
      return jsonResponse({
        ok: true,
        restored: true,
        revision: revisionOne,
        post,
      });
    }
    return jsonResponse({ ok: true });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCsrfToken();
    resetCaches();

    await autosavePost("post-1", { title: "Cached" });
    expect(getCachedPostRevisions("post-1")?.map((revision) => revision.id)).toEqual(["rev-1"]);

    await publishPost("post-1");
    expect(getCachedPostRevisions("post-1")?.map((revision) => revision.id)).toEqual([
      "rev-2",
      "rev-1",
    ]);
    expect(getCachedPostDetail("post-1")).toMatchObject({
      status: "published",
      scheduledAt: null,
    });

    await restorePostRevision("post-1", "rev-1");
    expect(getCachedPostRevisions("post-1")?.map((revision) => revision.id)).toEqual([
      "rev-2",
      "rev-1",
    ]);
    expect(storage.getItem(cacheKeys.postRevisions("post-1"))).toContain("rev-2");
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

test("restorePostRevision posts with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      ok: true,
      restored: true,
      revision: {
        id: "rev-1",
        postId: "post-1",
        version: 1,
        data: {},
        createdAt: "2026-02-21T10:00:00.000Z",
        createdBy: null,
      },
      post: {
        id: "post-1",
        typeId: "post-type",
        title: "Restored",
        slug: "restored",
        status: "draft",
        data: {},
        tags: [],
        createdAt: "2026-02-21T10:00:00.000Z",
        updatedAt: "2026-02-21T10:00:00.000Z",
      },
    });
  };

  try {
    resetCsrfToken();
    await restorePostRevision("post-1", "rev-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/posts/post-1/revisions/rev-1/restore");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("duplicatePost posts to duplicate endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "post-copy" });
  };

  try {
    resetCsrfToken();
    await duplicatePost("post-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/posts/post-1/duplicate");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listPostsCached reads from local storage", async () => {
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
        id: "post-1",
        typeId: "post-type",
        title: "Hello",
        slug: "hello",
        status: "draft" as const,
        data: {},
        tags: [],
        scheduledAt: null,
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
        publishedAt: null,
        author: null,
      },
    ];
    storage.setItem(cacheKeys.postsList, JSON.stringify({ value: cached, savedAt: Date.now() }));

    const result = await listPostsCached();
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

test("listPostsCached ignores expired in-memory list cache", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-24T10:00:00.000Z"));

  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();
  const stale = [
    {
      id: "post-stale",
      typeId: "post-type",
      title: "Stale",
      slug: "stale",
      status: "draft" as const,
      data: {},
      tags: [],
      scheduledAt: null,
      createdAt: "2026-02-14T00:00:00.000Z",
      updatedAt: "2026-02-14T00:00:00.000Z",
      publishedAt: null,
      author: null,
    },
  ];
  const fresh = [
    {
      ...stale[0],
      id: "post-fresh",
      title: "Fresh",
      slug: "fresh",
    },
  ];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(fresh);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    storage.setItem(cacheKeys.postsList, JSON.stringify({ value: stale, savedAt: Date.now() }));
    expect(await listPostsCached()).toEqual(stale);

    vi.setSystemTime(new Date(Date.now() + cacheTtlMs.list + 1000));

    expect(await listPostsCached()).toEqual(fresh);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/posts");
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

test("getPostCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ id: "post-2" });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    const cached = {
      id: "post-2",
      typeId: "post-type",
      title: "Docs",
      slug: "docs",
      status: "draft" as const,
      data: {},
      tags: [],
      scheduledAt: null,
      createdAt: "2026-02-14T00:00:00.000Z",
      updatedAt: "2026-02-14T00:00:00.000Z",
      publishedAt: null,
      author: null,
      taxonomy: null,
    };
    storage.setItem(
      cacheKeys.postDetail("post-2"),
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await getPostCached("post-2");
    expect(result?.id).toBe("post-2");
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
