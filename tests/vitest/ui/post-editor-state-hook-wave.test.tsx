// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type {
  PostDetail,
  PostRevision,
  PostStatus,
} from "../../../core/admin/services/postsClient";
import { deletePost } from "../../../core/admin/services/postsClient";

type CacheEvent = { key: string };

const hookState = vi.hoisted(() => {
  const listeners = new Set<(event: CacheEvent) => void>();

  const createPost = (id = "post-1", overrides: Partial<PostDetail> = {}): PostDetail => ({
    id,
    typeId: "post",
    title: "Editor Post",
    slug: "editor-post",
    status: "draft",
    data: {
      featuredImage: "/media/hero.png",
      document: {
        version: 1,
        blocks: [
          {
            id: "block-1",
            type: "writing-canvas",
            attrs: {},
            content: {
              version: 1,
              nodes: [{ id: "node-1", type: "paragraph", text: "Body" }],
            },
          },
        ],
        meta: {},
      },
    },
    tags: ["alpha", "beta"],
    createdAt: "2026-03-12T09:00:00.000Z",
    updatedAt: "2026-03-12T09:05:00.000Z",
    publishedAt: null,
    scheduledAt: null,
    author: { id: "author-1", name: "Admin", email: "admin@example.com" },
    seo: {
      title: "SEO title",
      description: "SEO description",
      canonicalUrl: "https://example.com/editor-post",
      robots: "index,follow",
    },
    taxonomy: {
      category: { id: "cat-1", name: "Category One", slug: "category-one" },
      tags: [],
    },
    ...overrides,
  });

  const createRevision = (id = "rev-1", overrides: Partial<PostRevision> = {}): PostRevision => ({
    id,
    postId: "post-1",
    version: 1,
    data: {
      document: {
        version: 1,
        blocks: [],
        meta: {},
      },
    },
    createdAt: "2026-03-12T08:00:00.000Z",
    createdBy: { id: "author-1", name: "Admin", email: "admin@example.com" },
    ...overrides,
  });

  const applyPayload = (current: PostDetail, payload: Record<string, unknown>): PostDetail => {
    const nextTags = Array.isArray(payload.tags)
      ? payload.tags.filter((value): value is string => typeof value === "string")
      : current.tags;
    const taxonomyPayload =
      payload.taxonomy && typeof payload.taxonomy === "object"
        ? (payload.taxonomy as { categoryId?: string | null })
        : undefined;
    const categoryId =
      taxonomyPayload && "categoryId" in taxonomyPayload ? taxonomyPayload.categoryId : undefined;
    const seoPayload =
      payload.seo && typeof payload.seo === "object"
        ? (payload.seo as Record<string, unknown>)
        : undefined;

    return {
      ...current,
      title: typeof payload.title === "string" ? payload.title : current.title,
      slug: typeof payload.slug === "string" ? payload.slug : current.slug,
      data:
        payload.data && typeof payload.data === "object"
          ? { ...(payload.data as Record<string, unknown>) }
          : current.data,
      tags: nextTags,
      seo: seoPayload ? { ...(current.seo ?? {}), ...seoPayload } : (current.seo ?? null),
      taxonomy:
        categoryId === undefined
          ? (current.taxonomy ?? null)
          : {
              ...(current.taxonomy ?? {}),
              category:
                categoryId === null
                  ? null
                  : {
                      id: categoryId,
                      name: `Category ${categoryId}`,
                      slug: categoryId,
                    },
              tags: current.taxonomy?.tags ?? [],
            },
      updatedAt: "2026-03-12T12:00:00.000Z",
    };
  };

  const state = {
    path: "/admin/posts/post-1?editor=writing",
    cachedPost: null as PostDetail | null,
    fetchedPost: null as PostDetail | null,
    restoredPost: null as PostDetail | null,
    revisions: [] as PostRevision[],
    autosaveOptions: null as {
      enabled: boolean;
      dirty: boolean;
      signature: string;
      onAutosave: () => Promise<void>;
    } | null,
    nextGetError: null as unknown,
    nextUpdateError: null as unknown,
    nextMetadataError: null as unknown,
    nextAutosaveError: null as unknown,
    nextPublishError: null as unknown,
    nextUnpublishError: null as unknown,
    nextPreviewError: null as unknown,
    nextDeleteError: null as unknown,
    nextRevisionsError: null as unknown,
    nextRestoreError: null as unknown,
    nextUploadError: null as unknown,
    getPostHandler: null as
      | ((id: string, options: { force?: boolean }) => Promise<PostDetail | null>)
      | null,
    updatePostHandler: null as
      | ((id: string, payload: Record<string, unknown>) => Promise<PostDetail>)
      | null,
    updateMetadataHandler: null as
      | ((id: string, payload: Record<string, unknown>) => Promise<PostDetail>)
      | null,
    autosaveHandler: null as
      | ((
          id: string,
          payload: Record<string, unknown>
        ) => Promise<{
          post: PostDetail;
          revision: PostRevision;
          savedAt: string;
          reusedRevision: boolean;
        }>)
      | null,
    restoreHandler: null as
      | ((
          id: string,
          revisionId: string
        ) => Promise<{ ok: boolean; restored: boolean; revision: PostRevision; post: PostDetail }>)
      | null,
    getPostCalls: [] as Array<{ id: string; force?: boolean }>,
    updatePostCalls: [] as Array<{ id: string; payload: Record<string, unknown> }>,
    updateMetadataCalls: [] as Array<{ id: string; payload: Record<string, unknown> }>,
    autosaveCalls: [] as Array<{ id: string; payload: Record<string, unknown> }>,
    publishCalls: [] as string[],
    unpublishCalls: [] as string[],
    previewCalls: [] as Array<{ id: string; ttl: number }>,
    deleteCalls: [] as string[],
    listRevisionCalls: [] as string[],
    restoreCalls: [] as Array<{ id: string; revisionId: string }>,
    uploadCalls: [] as File[],
    cancelAutosaveCalls: 0,
    createPost,
    createRevision,
    apiError(message: string) {
      return {
        name: "ApiClientError",
        message,
        code: "request_failed",
        status: 400,
      };
    },
    currentPost(id: string) {
      return state.fetchedPost ?? state.cachedPost ?? createPost(id);
    },
    trigger(key: string) {
      for (const listener of listeners) {
        listener({ key });
      }
    },
    subscribe(listener: (event: CacheEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      listeners.clear();
      state.path = "/admin/posts/post-1?editor=writing";
      state.cachedPost = null;
      state.fetchedPost = null;
      state.restoredPost = null;
      state.revisions = [];
      state.autosaveOptions = null;
      state.nextGetError = null;
      state.nextUpdateError = null;
      state.nextMetadataError = null;
      state.nextAutosaveError = null;
      state.nextPublishError = null;
      state.nextUnpublishError = null;
      state.nextPreviewError = null;
      state.nextDeleteError = null;
      state.nextRevisionsError = null;
      state.nextRestoreError = null;
      state.nextUploadError = null;
      state.getPostHandler = null;
      state.updatePostHandler = null;
      state.updateMetadataHandler = null;
      state.autosaveHandler = null;
      state.restoreHandler = null;
      state.getPostCalls = [];
      state.updatePostCalls = [];
      state.updateMetadataCalls = [];
      state.autosaveCalls = [];
      state.publishCalls = [];
      state.unpublishCalls = [];
      state.previewCalls = [];
      state.deleteCalls = [];
      state.listRevisionCalls = [];
      state.restoreCalls = [];
      state.uploadCalls = [];
      state.cancelAutosaveCalls = 0;
    },
    applyPayload,
  };

  return state;
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    postDetail: (id: string) => `post:${id}`,
    postRevisions: (id: string) => `post-revisions:${id}`,
  },
}));

vi.mock("@/services/postsClient", () => ({
  getCachedPostDetail: (id: string) =>
    hookState.cachedPost && hookState.cachedPost.id === id ? hookState.cachedPost : null,
  getCachedPostRevisions: (id: string) =>
    id === "post-1" && hookState.revisions.length > 0 ? hookState.revisions : null,
  getPostCached: vi.fn(async (id: string, { force }: { force?: boolean } = {}) => {
    hookState.getPostCalls.push({ id, force });
    if (hookState.getPostHandler) return hookState.getPostHandler(id, { force });
    if (hookState.nextGetError) {
      const error = hookState.nextGetError;
      hookState.nextGetError = null;
      throw error;
    }
    return hookState.fetchedPost;
  }),
  updatePost: vi.fn(async (id: string, payload: Record<string, unknown>) => {
    hookState.updatePostCalls.push({ id, payload });
    if (hookState.updatePostHandler) return hookState.updatePostHandler(id, payload);
    if (hookState.nextUpdateError) {
      const error = hookState.nextUpdateError;
      hookState.nextUpdateError = null;
      throw error;
    }
    const next = hookState.applyPayload(hookState.currentPost(id), payload);
    hookState.cachedPost = next;
    hookState.fetchedPost = next;
    return next;
  }),
  updatePostMetadata: vi.fn(async (id: string, payload: Record<string, unknown>) => {
    hookState.updateMetadataCalls.push({ id, payload });
    if (hookState.updateMetadataHandler) return hookState.updateMetadataHandler(id, payload);
    if (hookState.nextMetadataError) {
      const error = hookState.nextMetadataError;
      hookState.nextMetadataError = null;
      throw error;
    }
    const next = hookState.applyPayload(hookState.currentPost(id), payload);
    hookState.cachedPost = next;
    hookState.fetchedPost = next;
    return next;
  }),
  autosavePost: vi.fn(async (id: string, payload: Record<string, unknown>) => {
    hookState.autosaveCalls.push({ id, payload });
    if (hookState.autosaveHandler) return hookState.autosaveHandler(id, payload);
    if (hookState.nextAutosaveError) {
      const error = hookState.nextAutosaveError;
      hookState.nextAutosaveError = null;
      throw error;
    }
    const next = hookState.applyPayload(hookState.currentPost(id), payload);
    hookState.cachedPost = next;
    hookState.fetchedPost = next;
    return {
      post: next,
      revision: hookState.createRevision("rev-autosave"),
      savedAt: "2026-03-12T12:10:00.000Z",
      reusedRevision: false,
    };
  }),
  publishPost: vi.fn(async (id: string) => {
    hookState.publishCalls.push(id);
    if (hookState.nextPublishError) {
      const error = hookState.nextPublishError;
      hookState.nextPublishError = null;
      throw error;
    }
    const current = hookState.currentPost(id);
    const next: PostDetail = {
      ...current,
      status: "published",
      publishedAt: "2026-03-12T12:15:00.000Z",
      updatedAt: "2026-03-12T12:15:00.000Z",
    };
    hookState.cachedPost = next;
    hookState.fetchedPost = next;
    return { ok: true };
  }),
  unpublishPost: vi.fn(async (id: string) => {
    hookState.unpublishCalls.push(id);
    if (hookState.nextUnpublishError) {
      const error = hookState.nextUnpublishError;
      hookState.nextUnpublishError = null;
      throw error;
    }
    const current = hookState.currentPost(id);
    const next: PostDetail = {
      ...current,
      status: "draft",
      publishedAt: null,
      updatedAt: "2026-03-12T12:20:00.000Z",
    };
    hookState.cachedPost = next;
    hookState.fetchedPost = next;
    return { ok: true };
  }),
  previewPost: vi.fn(async (id: string, ttl: number) => {
    hookState.previewCalls.push({ id, ttl });
    if (hookState.nextPreviewError) {
      const error = hookState.nextPreviewError;
      hookState.nextPreviewError = null;
      throw error;
    }
    return {
      token: "preview-token",
      previewUrl: `/preview/${id}`,
      expiresAt: "2026-03-12T12:30:00.000Z",
    };
  }),
  listPostRevisions: vi.fn(async (id: string) => {
    hookState.listRevisionCalls.push(id);
    if (hookState.nextRevisionsError) {
      const error = hookState.nextRevisionsError;
      hookState.nextRevisionsError = null;
      throw error;
    }
    return hookState.revisions;
  }),
  listPostRevisionsCached: vi.fn(async (id: string) => {
    hookState.listRevisionCalls.push(id);
    if (hookState.nextRevisionsError) {
      const error = hookState.nextRevisionsError;
      hookState.nextRevisionsError = null;
      throw error;
    }
    return hookState.revisions;
  }),
  restorePostRevision: vi.fn(async (id: string, revisionId: string) => {
    hookState.restoreCalls.push({ id, revisionId });
    if (hookState.restoreHandler) return hookState.restoreHandler(id, revisionId);
    if (hookState.nextRestoreError) {
      const error = hookState.nextRestoreError;
      hookState.nextRestoreError = null;
      throw error;
    }
    const next = hookState.restoredPost ?? hookState.currentPost(id);
    hookState.cachedPost = next;
    hookState.fetchedPost = next;
    return {
      ok: true,
      restored: true,
      revision:
        hookState.revisions.find((entry) => entry.id === revisionId) ??
        hookState.createRevision(revisionId),
      post: next,
    };
  }),
  deletePost: vi.fn(async (id: string) => {
    hookState.deleteCalls.push(id);
    if (hookState.nextDeleteError) {
      const error = hookState.nextDeleteError;
      hookState.nextDeleteError = null;
      throw error;
    }
    return { ok: true };
  }),
}));

vi.mock("@/services/mediaClient", () => ({
  uploadClipboardImage: vi.fn(async (file: File) => {
    hookState.uploadCalls.push(file);
    if (hookState.nextUploadError) {
      const error = hookState.nextUploadError;
      hookState.nextUploadError = null;
      throw error;
    }
    return {
      id: "media-clipboard",
      key: "uploads/clipboard.png",
      url: "/media/clipboard.png",
    };
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    path: hookState.path,
  }),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (listener: (event: CacheEvent) => void) => hookState.subscribe(listener),
}));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostAutosave", () => ({
  usePostAutosave: (options: {
    enabled: boolean;
    dirty: boolean;
    signature: string;
    onAutosave: () => Promise<void>;
  }) => {
    hookState.autosaveOptions = options;
    return {
      cancel: () => {
        hookState.cancelAutosaveCalls += 1;
      },
      flush: async () => {
        if (!options.enabled || !options.dirty) return;
        await options.onAutosave();
      },
    };
  },
}));

import {
  buildSilentSyncSnapshot,
  normalizeEditorDocumentForWritingFlow,
  normalizePostDraftSyncMode,
  shouldDeferRefreshForDirtyState,
  usePostEditorState,
} from "../../../core/admin/ui/posts/editor/hooks/usePostEditorState";

const mountHook = () => {
  const latest: { current: ReturnType<typeof usePostEditorState> | null } = {
    current: null,
  };

  const Harness = () => {
    latest.current = usePostEditorState();
    return null;
  };

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(<Harness />);
  });

  return {
    current() {
      if (!latest.current) {
        throw new Error("Missing hook result.");
      }
      return latest.current;
    },
    rerender() {
      React.act(() => {
        root.render(<Harness />);
      });
    },
    cleanup() {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const invokeFailClosedServerCallbacks = async (view: ReturnType<typeof mountHook>) => {
  const file = new File(["blank"], "blank.png", { type: "image/png" });
  view.current().openRevisions();
  view.current().setRevisionsOpen(true);
  view.current().setPreviewOpen(true);
  return Promise.allSettled([
    view.current().saveDraft(),
    view.current().publish(),
    view.current().unpublish(),
    view.current().preview(),
    view.current().restoreRevision("rev-inert"),
    view.current().markReloadRemote(),
    view.current().uploadClipboardImage(file),
    view.current().moveToTrash(),
  ]);
};

const expectFailClosedServerCallbacks = (results: PromiseSettledResult<unknown>[]) => {
  expect(results.slice(0, 7)).toEqual(
    Array.from({ length: 7 }, () =>
      expect.objectContaining({
        status: "rejected",
        reason: expect.objectContaining({ code: "editor_identity_changed" }),
      })
    )
  );
  expect(results[7]).toEqual({ status: "fulfilled", value: false });
};

const expectNoServerMutationTransports = () => {
  expect(hookState.autosaveCalls).toEqual([]);
  expect(hookState.updatePostCalls).toEqual([]);
  expect(hookState.updateMetadataCalls).toEqual([]);
  expect(hookState.publishCalls).toEqual([]);
  expect(hookState.unpublishCalls).toEqual([]);
  expect(hookState.previewCalls).toEqual([]);
  expect(hookState.deleteCalls).toEqual([]);
  expect(hookState.listRevisionCalls).toEqual([]);
  expect(hookState.restoreCalls).toEqual([]);
  expect(hookState.uploadCalls).toEqual([]);
};

const flush = async (times = 3) => {
  for (let index = 0; index < times; index += 1) {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }
};

const waitFor = async (condition: () => boolean, attempts = 10) => {
  for (let index = 0; index < attempts; index += 1) {
    await flush();
    if (condition()) return;
  }
  throw new Error("Timed out waiting for condition.");
};

const createDeferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const autosaveResponse = (post: PostDetail, savedAt = post.updatedAt) => ({
  post,
  revision: hookState.createRevision(`rev-${post.title}`),
  savedAt,
  reusedRevision: false,
});

const createDistinctEnvelopePost = (id: string, marker: string, status: PostStatus = "draft") => {
  const seed = hookState.createPost(id);
  return hookState.createPost(id, {
    title: `${marker} title`,
    slug: marker,
    status,
    data: {
      ...(seed.data as Record<string, unknown>),
      featuredImage: `/media/${marker}.png`,
      envelopeMarker: marker,
    },
    tags: [`${marker}-tag-one`, `${marker}-tag-two`],
    taxonomy: {
      category: {
        id: `cat-${marker}`,
        name: `Category ${marker}`,
        slug: `cat-${marker}`,
      },
      tags: [],
    },
    seo: {
      title: `${marker} SEO`,
      description: `${marker} description`,
      canonicalUrl: `https://example.com/${marker}`,
      robots: marker.includes("stale") ? "noindex,nofollow" : "index,follow",
    },
    publishedAt: status === "published" ? "2026-03-12T11:00:00.000Z" : null,
  });
};

const buildExpectedMetadataPayload = (post: PostDetail) => ({
  tags: [...(post.tags ?? [])],
  taxonomy: { categoryId: post.taxonomy?.category?.id ?? null },
  seo: {
    title: post.seo?.title ?? null,
    description: post.seo?.description ?? null,
    canonicalUrl: post.seo?.canonicalUrl ?? null,
    robots: post.seo?.robots ?? "index,follow",
  },
});

afterEach(() => {
  vi.clearAllMocks();
  hookState.reset();
});

test("usePostEditorState helper exports normalize writing-flow documents and sync guards", () => {
  const normalizedWrapped = normalizeEditorDocumentForWritingFlow({
    version: 1,
    blocks: [
      {
        id: "empty-paragraph",
        type: "paragraph",
        attrs: null,
        content: null,
      },
      {
        id: "canvas-1",
        type: "writing-canvas",
        attrs: {},
        content: {
          version: 1,
          nodes: [{ id: "node-1", type: "paragraph", text: "Body" }],
        },
      },
    ],
    meta: {},
  });

  expect(normalizedWrapped.blocks).toHaveLength(1);
  expect(normalizedWrapped.blocks[0]?.type).toBe("writing-canvas");

  const normalizedParagraph = normalizeEditorDocumentForWritingFlow({
    version: 1,
    blocks: [
      {
        id: "",
        type: "paragraph",
        attrs: {},
        content: null,
      },
    ],
    meta: {},
  });

  expect(normalizedParagraph.blocks).toHaveLength(1);
  expect(normalizedParagraph.blocks[0]?.id).toBe("block-1");
  expect(normalizedParagraph.blocks[0]?.type).toBe("writing-canvas");
  expect(normalizedParagraph.blocks[0]?.content).toEqual(
    expect.objectContaining({
      version: 1,
      nodes: [
        expect.objectContaining({
          type: "paragraph",
          text: "",
        }),
      ],
    })
  );

  const snapshot = buildSilentSyncSnapshot(
    hookState.createPost("post-2", {
      title: "Snapshot post",
      slug: "snapshot-post",
      status: "published",
      data: {
        document: {
          version: 1,
          blocks: [],
          meta: {},
        },
        featuredImage: 42 as unknown as string,
      },
    }),
    "2026-03-12T14:00:00.000Z"
  );

  expect(snapshot.title).toBe("Snapshot post");
  expect(snapshot.slug).toBe("snapshot-post");
  expect(snapshot.status).toBe("published");
  expect(snapshot.featuredImage).toBe("");
  expect(snapshot.savedAt).toBe("2026-03-12T14:00:00.000Z");
  expect(snapshot.metadataDraft.tagsInput).toBe("alpha, beta");
  expect(snapshot.metadataDraft.categoryId).toBe("cat-1");

  expect(normalizePostDraftSyncMode(undefined)).toBe("silent");
  expect(normalizePostDraftSyncMode("hydrate")).toBe("hydrate");
  expect(shouldDeferRefreshForDirtyState(undefined, true)).toBe(true);
  expect(shouldDeferRefreshForDirtyState({ allowDirty: false }, false)).toBe(false);
  expect(shouldDeferRefreshForDirtyState({ allowDirty: true }, true)).toBe(false);
});

test("usePostEditorState reports missing post id without fetching", async () => {
  hookState.path = "/admin/advanced/settings";

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    expect(view.current().postId).toBeNull();
    expect(view.current().error).toBe("Post ID is missing.");
    expect(hookState.getPostCalls).toEqual([]);
    expect(hookState.autosaveOptions?.enabled).toBe(false);
    expect(view.current().hasUnsavedChanges).toBe(false);
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    let inertResults: PromiseSettledResult<unknown>[] = [];
    await React.act(async () => {
      inertResults = await invokeFailClosedServerCallbacks(view);
    });
    expectFailClosedServerCallbacks(inertResults);
    expectNoServerMutationTransports();
    expect(view.current().previewOpen).toBe(false);
    expect(view.current().revisionsOpen).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState keeps an initial rejected load blank, inert, and zero-write closable", async () => {
  const failure = hookState.apiError("Initial post load failed");
  hookState.cachedPost = null;
  hookState.fetchedPost = null;
  hookState.getPostHandler = async () => Promise.reject(failure);
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false && view.current().error !== null);
    expect(view.current().error).toBe("Initial post load failed");
    expect(view.current().post).toBeNull();
    expect(view.current().title).toBe("");
    expect(view.current().slug).toBe("");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(view.current().canMutatePost).toBe(false);
    expect(hookState.autosaveOptions).toMatchObject({ enabled: false, dirty: false });

    React.act(() => {
      view.current().setTitle("must stay inert");
      view.current().setTagsInput("must-stay-inert");
      view.current().insertBlock("heading");
    });
    await flush();
    expect(view.current().title).toBe("");
    expect(view.current().tagsInput).toBe("");
    expect(view.current().hasUnsavedChanges).toBe(false);
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    let inertResults: PromiseSettledResult<unknown>[] = [];
    await React.act(async () => {
      inertResults = await invokeFailClosedServerCallbacks(view);
    });
    expectFailClosedServerCallbacks(inertResults);
    expectNoServerMutationTransports();
    expect(view.current().previewOpen).toBe(false);
    expect(view.current().revisionsOpen).toBe(false);
  } finally {
    view.cleanup();
  }
});

test.each(["not-found", "rejected"] as const)(
  "usePostEditorState commits a failed B load as an inert zero-write boundary: %s",
  async (outcome) => {
    const initial = hookState.createPost("post-1");
    hookState.cachedPost = initial;
    hookState.fetchedPost = initial;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      const failure = hookState.apiError("Post B load failed");
      hookState.getPostHandler = async (id) => {
        if (id !== "post-2") return initial;
        if (outcome === "rejected") throw failure;
        return null;
      };
      hookState.path = "/admin/posts/post-2";
      hookState.cachedPost = null;
      view.rerender();
      await waitFor(() => view.current().postId === "post-2" && view.current().loading === false);
      expect(view.current().error).toBe(
        outcome === "rejected" ? "Post B load failed" : "Post not found."
      );
      expect(view.current().post).toBeNull();
      expect(view.current().title).toBe("");
      expect(view.current().slug).toBe("");
      expect(view.current().featuredImage).toBe("");
      expect(view.current().hasUnsavedChanges).toBe(false);
      expect(hookState.autosaveOptions).toMatchObject({ enabled: false, dirty: false });

      React.act(() => {
        view.current().setTitle("stale A draft must not become B");
        view.current().setCategoryId("stale-a-category");
        view.current().updateBlockContent("block-1", {
          version: 1,
          nodes: [{ id: "stale-a", type: "paragraph", text: "stale A" }],
        });
      });
      await flush();
      expect(view.current().title).toBe("");
      expect(view.current().categoryId).toBe("");
      expect(view.current().hasUnsavedChanges).toBe(false);
      await React.act(async () => {
        await view.current().flushLatestAutosave();
      });
      let inertResults: PromiseSettledResult<unknown>[] = [];
      await React.act(async () => {
        inertResults = await invokeFailClosedServerCallbacks(view);
      });
      expectFailClosedServerCallbacks(inertResults);
      expectNoServerMutationTransports();
      expect(view.current().previewOpen).toBe(false);
      expect(view.current().revisionsOpen).toBe(false);
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState decodes post ids from the route and treats /posts without an id as missing", async () => {
  hookState.path = "/admin/posts/post%202?editor=writing#details";
  hookState.fetchedPost = hookState.createPost("post 2");

  const resolvedView = mountHook();
  try {
    await waitFor(() => resolvedView.current().loading === false);

    expect(resolvedView.current().postId).toBe("post 2");
    expect(hookState.getPostCalls[0]).toEqual({ id: "post 2", force: true });
  } finally {
    resolvedView.cleanup();
  }

  hookState.reset();
  hookState.path = "/admin/posts";

  const missingView = mountHook();
  try {
    await waitFor(() => missingView.current().loading === false);

    expect(missingView.current().postId).toBeNull();
    expect(missingView.current().error).toBe("Post ID is missing.");
    expect(hookState.getPostCalls).toEqual([]);
  } finally {
    missingView.cleanup();
  }
});

test("usePostEditorState defers remote refresh while dirty and reloads on demand", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().setTitle("Local draft title");
    });
    hookState.fetchedPost = hookState.createPost("post-1", {
      title: "Remote replacement",
      updatedAt: "2026-03-12T13:00:00.000Z",
    });

    await React.act(async () => {
      hookState.trigger("post:post-1");
      await Promise.resolve();
    });
    await waitFor(() => view.current().remoteUpdatePending === true);

    expect(view.current().title).toBe("Local draft title");

    await React.act(async () => {
      await view.current().markReloadRemote();
    });
    await waitFor(() => view.current().remoteUpdatePending === false);

    expect(view.current().title).toBe("Remote replacement");
    expect(view.current().lastSavedAt).toBe("2026-03-12T13:00:00.000Z");
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState guards hydration with synchronous live bytes before React rerenders", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    const remote = createDeferred<PostDetail | null>();
    hookState.getPostHandler = async () => remote.promise;

    await React.act(async () => {
      hookState.trigger("post:post-1");
      view.current().setTitle("synchronous local bytes");
      remote.resolve(hookState.createPost("post-1", { title: "remote overwrite" }));
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => view.current().remoteUpdatePending === true);
    expect(view.current().title).toBe("synchronous local bytes");
    expect(view.current().hasUnsavedChanges).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState suppresses cache refreshes emitted across its base and metadata save", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const staleRefresh = createDeferred<PostDetail | null>();
  hookState.getPostHandler = async () => staleRefresh.promise;
  let baseResponse = initial;
  hookState.updatePostHandler = async (id, payload) => {
    baseResponse = hookState.applyPayload(hookState.createPost(id), payload);
    hookState.trigger("post:post-1");
    return baseResponse;
  };
  hookState.updateMetadataHandler = async (_id, payload) => {
    const response = hookState.applyPayload(baseResponse, payload);
    hookState.trigger("post:post-1");
    return response;
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    const getCallsBeforeSave = hookState.getPostCalls.length;
    React.act(() => {
      view.current().setTitle("final base title");
      view.current().setTagsInput("Final Metadata");
      view.current().insertBlock("heading");
    });
    const finalSelection = view.current().state.selectedBlockId;
    const finalHistoryLength = view.current().state.history.past.length;
    await React.act(async () => {
      await view.current().saveDraft();
    });
    expect(view.current().title).toBe("final base title");
    expect(view.current().tagsInput).toBe("Final Metadata");
    expect(view.current().state.selectedBlockId).toBe(finalSelection);
    expect(view.current().state.history.past).toHaveLength(finalHistoryLength);
    expect(view.current().canUndo).toBe(true);
    expect(hookState.getPostCalls).toHaveLength(getCallsBeforeSave);

    await React.act(async () => {
      staleRefresh.resolve(
        hookState.createPost("post-1", {
          title: "stale base-only refresh",
          tags: initial.tags,
        })
      );
      await Promise.resolve();
    });
    await flush();
    expect(view.current().remoteUpdatePending).toBe(false);
    expect(view.current().title).toBe("final base title");
    expect(view.current().tagsInput).toBe("Final Metadata");
    expect(view.current().state.selectedBlockId).toBe(finalSelection);
    expect(view.current().state.history.past).toHaveLength(finalHistoryLength);
    expect(view.current().canUndo).toBe(true);
    expect(hookState.autosaveOptions?.enabled).toBe(true);

    hookState.getPostHandler = null;
    hookState.autosaveHandler = async (id, payload) =>
      autosaveResponse(hookState.applyPayload(hookState.createPost(id), payload));
    React.act(() => view.current().setTitle("next autosave remains enabled"));
    await React.act(async () => {
      await hookState.autosaveOptions?.onAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.autosaveCalls[0]?.payload.title).toBe("next autosave remains enabled");
  } finally {
    view.cleanup();
  }
});

test.each(["base", "metadata"] as const)(
  "usePostEditorState suppresses a self cache refresh from the manual %s mutation",
  async (eventSource) => {
    const initial = hookState.createPost("post-1");
    hookState.cachedPost = initial;
    hookState.fetchedPost = initial;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      const getCallsBeforeSave = hookState.getPostCalls.length;
      const selfRefreshFailure = hookState.apiError(`${eventSource} self GET failed`);
      hookState.getPostHandler = async () => Promise.reject(selfRefreshFailure);
      let persistedPost = initial;
      hookState.updatePostHandler = async (_id, payload) => {
        persistedPost = hookState.applyPayload(persistedPost, payload);
        if (eventSource === "base") {
          hookState.trigger("post:post-1");
          await Promise.resolve();
          await Promise.resolve();
        }
        return persistedPost;
      };
      hookState.updateMetadataHandler = async (_id, payload) => {
        persistedPost = hookState.applyPayload(persistedPost, payload);
        if (eventSource === "metadata") {
          hookState.trigger("post:post-1");
          await Promise.resolve();
          await Promise.resolve();
        }
        return persistedPost;
      };

      React.act(() => {
        view.current().setTitle(`${eventSource} mutation title`);
        if (eventSource === "metadata") view.current().setTagsInput("self-event-tag");
      });
      await React.act(async () => {
        await view.current().saveDraft();
      });
      await flush();
      expect(hookState.getPostCalls).toHaveLength(getCallsBeforeSave);
      expect(view.current().error).toBeNull();
      expect(view.current().remoteUpdatePending).toBe(false);
      expect(view.current().hasUnsavedChanges).toBe(false);

      hookState.getPostHandler = null;
      hookState.autosaveHandler = async (_id, payload) => {
        persistedPost = hookState.applyPayload(persistedPost, payload);
        return autosaveResponse(persistedPost);
      };
      React.act(() => view.current().setTitle(`${eventSource} later autosave`));
      await React.act(async () => {
        await view.current().flushLatestAutosave();
      });
      expect(hookState.autosaveCalls).toHaveLength(1);
      expect(hookState.autosaveCalls[0]?.payload.title).toBe(`${eventSource} later autosave`);
      expect(view.current().error).toBeNull();
      expect(view.current().remoteUpdatePending).toBe(false);
      expect(hookState.autosaveOptions?.enabled).toBe(true);
      expect(view.current().hasUnsavedChanges).toBe(false);
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState suppresses a self cache refresh from restore and keeps later autosave enabled", async () => {
  const initial = hookState.createPost("post-1");
  const restored = hookState.createPost("post-1", { title: "Restored same identity" });
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    const getCallsBeforeRestore = hookState.getPostCalls.length;
    hookState.getPostHandler = async () =>
      Promise.reject(hookState.apiError("restore self GET failed"));
    hookState.restoreHandler = async () => {
      hookState.trigger("post:post-1");
      await Promise.resolve();
      await Promise.resolve();
      return {
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-self-event"),
        post: restored,
      };
    };

    await React.act(async () => {
      await view.current().restoreRevision("rev-self-event");
    });
    await flush();
    expect(hookState.getPostCalls).toHaveLength(getCallsBeforeRestore);
    expect(view.current().title).toBe("Restored same identity");
    expect(view.current().error).toBeNull();
    expect(view.current().remoteUpdatePending).toBe(false);
    expect(hookState.autosaveOptions?.enabled).toBe(true);

    hookState.getPostHandler = null;
    hookState.autosaveHandler = async (id, payload) =>
      autosaveResponse(hookState.applyPayload(hookState.createPost(id), payload));
    React.act(() => view.current().setTitle("autosave after restore self GET"));
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.autosaveCalls[0]?.payload.title).toBe("autosave after restore self GET");
    expect(view.current().error).toBeNull();
    expect(view.current().remoteUpdatePending).toBe(false);
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState autosaves dirty content and surfaces autosave api errors", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().setTitle("Autosaved title");
    });

    await React.act(async () => {
      await hookState.autosaveOptions?.onAutosave();
    });
    await waitFor(() => view.current().autosaveSaving === false);

    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(view.current().title).toBe("Autosaved title");
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().hasUnsavedChanges).toBe(false);

    React.act(() => {
      view.current().setTitle("Autosave failure");
    });
    hookState.nextAutosaveError = hookState.apiError("Autosave failed.");

    let autosaveFailure: unknown;
    await React.act(async () => {
      try {
        await hookState.autosaveOptions?.onAutosave();
      } catch (error) {
        autosaveFailure = error;
      }
    });
    await waitFor(() => view.current().autosaveSaving === false);

    expect(view.current().autosaveError).toBe("Autosave failed.");
    expect(autosaveFailure).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState autosaves metadata-only tag and category changes", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().setTagsInput("Launch, News, launch");
      view.current().setCategoryId("cat-2");
    });
    expect(view.current().hasUnsavedChanges).toBe(true);

    await React.act(async () => {
      await hookState.autosaveOptions?.onAutosave();
    });
    await waitFor(() => view.current().autosaveSaving === false);

    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.autosaveCalls[0]?.payload).toMatchObject({
      tags: ["Launch", "News"],
      taxonomy: { categoryId: "cat-2" },
    });
    expect(view.current().tagsInput).toBe("Launch, News");
    expect(view.current().categoryId).toBe("cat-2");
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState derives autosave baselines from normalized current and newer responses", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const normalizedCurrent = hookState.createPost("post-1", {
    title: "server current",
    slug: "server-current",
    tags: ["Server Current"],
    seo: {
      title: "Server Current SEO",
      description: "Server current description",
      canonicalUrl: "https://example.com/server-current",
      robots: "noindex,follow",
    },
  });
  hookState.autosaveHandler = async () => autosaveResponse(normalizedCurrent);
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle("request current");
      view.current().setSlug("request-current");
      view.current().setTagsInput("Request Current");
      view.current().setSeoDraft({ title: "Request Current SEO" });
    });
    await React.act(async () => {
      await hookState.autosaveOptions?.onAutosave();
    });
    expect(view.current().title).toBe("server current");
    expect(view.current().slug).toBe("server-current");
    expect(view.current().tagsInput).toBe("Server Current");
    expect(view.current().seoDraft.title).toBe("Server Current SEO");
    expect(view.current().hasUnsavedChanges).toBe(false);

    const olderResponse = createDeferred<ReturnType<typeof autosaveResponse>>();
    hookState.autosaveHandler = async () => olderResponse.promise;
    React.act(() => {
      view.current().setTitle("captured older");
      view.current().setSlug("captured-older");
      view.current().setTagsInput("Captured Older");
      view.current().setSeoDraft({ title: "Captured Older SEO" });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "captured-node", type: "paragraph", text: "captured body" }],
      });
    });
    const capturedDocument = view.current().state.document;
    let olderPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      olderPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 2);

    React.act(() => {
      view.current().setTitle("newer live");
      view.current().setSlug("newer-live");
      view.current().setTagsInput("Newer Live");
      view.current().setSeoDraft({ title: "Newer Live SEO" });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "newer-node", type: "paragraph", text: "newer body" }],
      });
    });
    const newerDocument = view.current().state.document;
    const newerHistoryLength = view.current().state.history.past.length;
    const normalizedOlder = hookState.createPost("post-1", {
      title: "server older",
      slug: "server-older",
      data: { ...initial.data, document: capturedDocument },
      tags: ["Server Older"],
      seo: {
        title: "Server Older SEO",
        description: "Server older description",
        canonicalUrl: "https://example.com/server-older",
        robots: "index,follow",
      },
    });
    await React.act(async () => {
      olderResponse.resolve(autosaveResponse(normalizedOlder));
      await olderPromise;
    });
    expect(view.current().title).toBe("newer live");
    expect(view.current().slug).toBe("newer-live");
    expect(view.current().tagsInput).toBe("Newer Live");
    expect(view.current().seoDraft.title).toBe("Newer Live SEO");
    expect(view.current().state.document).toEqual(newerDocument);
    expect(view.current().state.history.past).toHaveLength(newerHistoryLength);
    expect(view.current().hasUnsavedChanges).toBe(true);

    React.act(() => {
      view.current().setTitle("server older");
      view.current().setSlug("server-older");
      view.current().setTagsInput("Server Older");
      view.current().setSeoDraft({
        title: "Server Older SEO",
        description: "Server older description",
        canonicalUrl: "https://example.com/server-older",
        robots: "index,follow",
      });
      view.current().undo();
    });
    expect(view.current().state.document).toEqual(capturedDocument);
    expect(view.current().hasUnsavedChanges).toBe(false);
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState saveDraft normalizes metadata payload and clears blank featured image", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().setTitle("Saved title");
      view.current().setFeaturedImage("   ");
      view.current().setTagsInput("One, two\nONE");
      view.current().setCategoryId("   ");
      view.current().setSeoDraft({
        title: "  Saved SEO  ",
        description: "  Saved description  ",
        canonicalUrl: " https://example.com/saved ",
        robots: "   ",
      });
    });

    await React.act(async () => {
      await view.current().saveDraft();
    });
    await waitFor(() => view.current().hasUnsavedChanges === false);

    expect(hookState.cancelAutosaveCalls).toBeGreaterThan(0);
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.updateMetadataCalls).toHaveLength(1);
    expect(hookState.updatePostCalls[0]?.payload.data).not.toHaveProperty("featuredImage");
    expect(hookState.updateMetadataCalls[0]?.payload).toMatchObject({
      tags: ["One", "two"],
      taxonomy: { categoryId: null },
      seo: {
        title: "Saved SEO",
        description: "Saved description",
        canonicalUrl: "https://example.com/saved",
        robots: "index,follow",
      },
    });
    expect(view.current().featuredImage).toBe("");
    expect(view.current().title).toBe("Saved title");
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState Close is zero-write for authoritative and predecessor-free reverted bytes", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toEqual([]);

    React.act(() => {
      view.current().setTitle("temporary title");
      view.current().setTitle("Editor Post");
    });
    expect(view.current().hasUnsavedChanges).toBe(false);
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState queues an exact clean restoration behind a conflicting autosave", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const first = createDeferred<ReturnType<typeof autosaveResponse>>();
  const second = createDeferred<ReturnType<typeof autosaveResponse>>();
  let call = 0;
  hookState.autosaveHandler = async () => {
    call += 1;
    return call === 1 ? first.promise : second.promise;
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("dirty A"));
    let backgroundPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      backgroundPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    React.act(() => view.current().setTitle(initial.title));
    let closePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      closePromise = view.current().flushLatestAutosave();
    });
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(hookState.autosaveCalls).toHaveLength(1);

    await React.act(async () => {
      first.resolve(autosaveResponse(hookState.createPost("post-1", { title: "server A" })));
      await backgroundPromise;
    });
    await waitFor(() => hookState.autosaveCalls.length === 2);
    expect(hookState.autosaveCalls.map((entry) => entry.payload.title)).toEqual([
      "dirty A",
      initial.title,
    ]);
    expect(view.current().title).toBe(initial.title);

    await React.act(async () => {
      second.resolve(autosaveResponse(initial));
      await closePromise;
    });
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState preserves A to manual B to Close C wire order and exact waiter ownership", async () => {
  const seed = hookState.createPost("post-1");
  const initial = hookState.createPost("post-1", {
    data: {
      ...(seed.data as Record<string, unknown>),
      retainedBaseData: { sentinel: "seed" },
    },
  });
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const autosaveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  const autosaveC = createDeferred<ReturnType<typeof autosaveResponse>>();
  const manualB = createDeferred<PostDetail>();
  let autosaveCall = 0;
  hookState.autosaveHandler = async () => {
    autosaveCall += 1;
    return autosaveCall === 1 ? autosaveA.promise : autosaveC.promise;
  };
  hookState.updatePostHandler = async () => manualB.promise;
  let manualBBaseResponse = initial;
  hookState.updateMetadataHandler = async (_id, payload) =>
    hookState.applyPayload(manualBBaseResponse, payload);
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle("A title");
      view.current().setSlug("a-slug");
      view.current().setFeaturedImage("/media/a.png");
      view.current().setTagsInput("a-tag-one, a-tag-two");
      view.current().setCategoryId("cat-a");
      view.current().setSeoDraft({
        title: "A SEO",
        description: "A description",
        canonicalUrl: "https://example.com/a",
        robots: "index,follow",
      });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-a", type: "paragraph", text: "A document bytes" }],
      });
    });
    const documentA = structuredClone(view.current().state.document);
    const expectedA = {
      title: "A title",
      slug: "a-slug",
      data: {
        ...(initial.data as Record<string, unknown>),
        featuredImage: "/media/a.png",
        document: documentA,
      },
      tags: ["a-tag-one", "a-tag-two"],
      taxonomy: { categoryId: "cat-a" },
      seo: {
        title: "A SEO",
        description: "A description",
        canonicalUrl: "https://example.com/a",
        robots: "index,follow",
      },
    };
    let aPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      aPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);
    expect(hookState.autosaveCalls[0]).toEqual({ id: "post-1", payload: expectedA });

    React.act(() => {
      view.current().setTitle("B title");
      view.current().setSlug("b-slug");
      view.current().setFeaturedImage("/media/b.png");
      view.current().setTagsInput("b-tag-one, b-tag-two");
      view.current().setCategoryId("cat-b");
      view.current().setSeoDraft({
        title: "B SEO",
        description: "B description",
        canonicalUrl: "https://example.com/b",
        robots: "noindex,nofollow",
      });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-b", type: "paragraph", text: "B document bytes" }],
      });
    });
    const documentB = structuredClone(view.current().state.document);
    const expectedBBase = {
      title: "B title",
      slug: "b-slug",
      data: {
        ...(initial.data as Record<string, unknown>),
        featuredImage: "/media/b.png",
        document: documentB,
      },
    };
    const expectedBMetadata = {
      tags: ["b-tag-one", "b-tag-two"],
      taxonomy: { categoryId: "cat-b" },
      seo: {
        title: "B SEO",
        description: "B description",
        canonicalUrl: "https://example.com/b",
        robots: "noindex,nofollow",
      },
    };
    let manualSettled = false;
    let bPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      bPromise = view
        .current()
        .saveDraft()
        .then(() => {
          manualSettled = true;
        });
    });
    React.act(() => {
      view.current().setTitle("C title");
      view.current().setSlug("c-slug");
      view.current().setFeaturedImage("/media/c.png");
      view.current().setTagsInput("c-tag-one, c-tag-two");
      view.current().setCategoryId("cat-c");
      view.current().setSeoDraft({
        title: "C SEO",
        description: "C description",
        canonicalUrl: "https://example.com/c",
        robots: "index,nofollow",
      });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-c", type: "paragraph", text: "C document bytes" }],
      });
      view.current().insertBlock("heading");
    });
    const documentC = structuredClone(view.current().state.document);
    const expectedC = {
      title: "C title",
      slug: "c-slug",
      data: {
        ...(initial.data as Record<string, unknown>),
        featuredImage: "/media/c.png",
        document: documentC,
      },
      tags: ["c-tag-one", "c-tag-two"],
      taxonomy: { categoryId: "cat-c" },
      seo: {
        title: "C SEO",
        description: "C description",
        canonicalUrl: "https://example.com/c",
        robots: "index,nofollow",
      },
    };
    const cSelection = view.current().state.selectedBlockId;
    const cHistoryLength = view.current().state.history.past.length;
    let cPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      cPromise = view.current().flushLatestAutosave();
    });
    expect(hookState.updatePostCalls).toEqual([]);

    await React.act(async () => {
      autosaveA.resolve(autosaveResponse(hookState.applyPayload(initial, expectedA)));
      await aPromise;
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    expect(manualSettled).toBe(false);
    expect(hookState.updatePostCalls[0]).toEqual({
      id: "post-1",
      payload: expectedBBase,
    });
    expect(view.current().title).toBe("C title");
    expect(view.current().state.selectedBlockId).toBe(cSelection);
    expect(view.current().state.history.past).toHaveLength(cHistoryLength);

    await React.act(async () => {
      manualBBaseResponse = hookState.applyPayload(initial, expectedBBase);
      manualB.resolve(manualBBaseResponse);
      await bPromise;
    });
    expect(manualSettled).toBe(true);
    expect(hookState.updateMetadataCalls[0]).toEqual({
      id: "post-1",
      payload: expectedBMetadata,
    });
    await waitFor(() => hookState.autosaveCalls.length === 2);
    expect(hookState.autosaveCalls[1]).toEqual({ id: "post-1", payload: expectedC });
    expect(view.current().title).toBe("C title");
    expect(view.current().state.selectedBlockId).toBe(cSelection);
    expect(view.current().state.history.past).toHaveLength(cHistoryLength);
    expect(view.current().hasUnsavedChanges).toBe(true);

    await React.act(async () => {
      autosaveC.resolve(autosaveResponse(hookState.applyPayload(initial, expectedC)));
      await cPromise;
    });
    expect(hookState.autosaveCalls).toEqual([
      { id: "post-1", payload: expectedA },
      { id: "post-1", payload: expectedC },
    ]);
    expect(hookState.updatePostCalls).toEqual([{ id: "post-1", payload: expectedBBase }]);
    expect(hookState.updateMetadataCalls).toEqual([{ id: "post-1", payload: expectedBMetadata }]);
    expect(view.current().title).toBe("C title");
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test.each(["manual", "autosave"] as const)(
  "usePostEditorState derives %s baselines from normalized current and older responses",
  async (transport) => {
    const seed = hookState.createPost("post-1");
    const initial = hookState.createPost("post-1", {
      data: {
        ...(seed.data as Record<string, unknown>),
        retainedBaseData: { generation: "seed" },
      },
    });
    hookState.cachedPost = initial;
    hookState.fetchedPost = initial;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      React.act(() => {
        view.current().setTitle(`${transport} current request`);
        view.current().setSlug(`${transport}-current-request`);
        view.current().setFeaturedImage(`/media/${transport}-current-request.png`);
        view.current().setTagsInput(`${transport}-request-tag`);
        view.current().setCategoryId(`cat-${transport}-request`);
        view.current().setSeoDraft({
          title: `${transport} request SEO`,
          description: `${transport} request description`,
          canonicalUrl: `https://example.com/${transport}-request`,
          robots: "index,follow",
        });
        view.current().updateBlockContent("block-1", {
          version: 1,
          nodes: [
            {
              id: `node-${transport}-request`,
              type: "paragraph",
              text: `${transport} current request document`,
            },
          ],
        });
      });
      const currentRequestDocument = structuredClone(view.current().state.document);
      const currentResponseDocument = structuredClone(currentRequestDocument);
      const currentResponseBlock = currentResponseDocument.blocks[0];
      if (!currentResponseBlock) throw new Error("Missing response block fixture.");
      currentResponseBlock.content = {
        version: 1,
        nodes: [
          {
            id: `node-${transport}-server-current`,
            type: "paragraph",
            text: `${transport} server-normalized current document`,
          },
        ],
      };
      const currentResponse = hookState.createPost("post-1", {
        title: `${transport} normalized current`,
        slug: `${transport}-normalized-current`,
        data: {
          ...(initial.data as Record<string, unknown>),
          retainedBaseData: { generation: `${transport}-server-current` },
          serverOnlyBaseData: { transport, response: "current" },
          featuredImage: `/media/${transport}-server-current.png`,
          document: currentResponseDocument,
        },
        tags: [`${transport}-canonical-current`],
        taxonomy: {
          category: {
            id: `cat-${transport}-canonical-current`,
            name: `${transport} canonical current`,
            slug: `${transport}-canonical-current`,
          },
          tags: [],
        },
        seo: {
          title: `${transport} canonical current SEO`,
          description: `${transport} canonical current description`,
          canonicalUrl: `https://example.com/${transport}-canonical-current`,
          robots: "noindex,follow",
        },
      });
      if (transport === "manual") {
        hookState.updatePostHandler = async () => currentResponse;
        hookState.updateMetadataHandler = async () => currentResponse;
      } else {
        hookState.autosaveHandler = async () => autosaveResponse(currentResponse);
      }

      await React.act(async () => {
        if (transport === "manual") await view.current().saveDraft();
        else await (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve());
      });
      expect(view.current().title).toBe(`${transport} normalized current`);
      expect(view.current().slug).toBe(`${transport}-normalized-current`);
      expect(view.current().featuredImage).toBe(`/media/${transport}-server-current.png`);
      expect(view.current().tagsInput).toBe(`${transport}-canonical-current`);
      expect(view.current().categoryId).toBe(`cat-${transport}-canonical-current`);
      expect(view.current().seoDraft).toEqual({
        title: `${transport} canonical current SEO`,
        description: `${transport} canonical current description`,
        canonicalUrl: `https://example.com/${transport}-canonical-current`,
        robots: "noindex,follow",
      });
      expect(view.current().state.document).toEqual(currentResponseDocument);
      expect(view.current().state.document).not.toEqual(currentRequestDocument);
      expect(currentResponse.data).not.toEqual(initial.data);
      expect(currentResponse.data).toMatchObject({
        retainedBaseData: { generation: `${transport}-server-current` },
        serverOnlyBaseData: { transport, response: "current" },
      });
      expect(view.current().hasUnsavedChanges).toBe(false);
      const currentWriteCounts = {
        autosave: hookState.autosaveCalls.length,
        update: hookState.updatePostCalls.length,
        metadata: hookState.updateMetadataCalls.length,
      };
      await React.act(async () => {
        await view.current().flushLatestAutosave();
      });
      expect(hookState.autosaveCalls).toHaveLength(currentWriteCounts.autosave);
      expect(hookState.updatePostCalls).toHaveLength(currentWriteCounts.update);
      expect(hookState.updateMetadataCalls).toHaveLength(currentWriteCounts.metadata);

      React.act(() => {
        view.current().setTitle(`${transport} captured older request`);
        view.current().setSlug(`${transport}-captured-older-request`);
        view.current().setFeaturedImage(`/media/${transport}-captured-older.png`);
        view.current().setTagsInput(`${transport}-captured-older-tag`);
        view.current().setCategoryId(`cat-${transport}-captured-older`);
        view.current().setSeoDraft({
          title: `${transport} captured older SEO`,
          description: `${transport} captured older description`,
          canonicalUrl: `https://example.com/${transport}-captured-older`,
          robots: "index,nofollow",
        });
        view.current().updateBlockContent("block-1", {
          version: 1,
          nodes: [
            {
              id: `node-${transport}-captured-older`,
              type: "paragraph",
              text: `${transport} captured older document`,
            },
          ],
        });
      });
      const capturedOlderDocument = structuredClone(view.current().state.document);
      const newerResponse = hookState.createPost("post-1", {
        title: `${transport} normalized older response`,
        slug: `${transport}-normalized-older-response`,
        data: {
          ...(currentResponse.data as Record<string, unknown>),
          retainedBaseData: { generation: `${transport}-server-older-response` },
          serverOnlyBaseData: { transport, response: "older" },
          featuredImage: `/media/${transport}-server-older.png`,
          document: currentResponseDocument,
        },
        tags: [`${transport}-canonical-older`],
        taxonomy: {
          category: {
            id: `cat-${transport}-canonical-older`,
            name: `${transport} canonical older`,
            slug: `${transport}-canonical-older`,
          },
          tags: [],
        },
        seo: {
          title: `${transport} canonical older SEO`,
          description: `${transport} canonical older description`,
          canonicalUrl: `https://example.com/${transport}-canonical-older`,
          robots: "noindex,nofollow",
        },
      });
      const deferredManual = createDeferred<PostDetail>();
      const deferredAutosave = createDeferred<ReturnType<typeof autosaveResponse>>();
      if (transport === "manual") {
        hookState.updatePostHandler = async () => deferredManual.promise;
        hookState.updateMetadataHandler = async () => newerResponse;
      } else {
        hookState.autosaveHandler = async () => deferredAutosave.promise;
      }
      let olderSavePromise: Promise<void> = Promise.resolve();
      React.act(() => {
        olderSavePromise =
          transport === "manual"
            ? view.current().saveDraft()
            : (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve());
      });
      await waitFor(() =>
        transport === "manual"
          ? hookState.updatePostCalls.length === currentWriteCounts.update + 1
          : hookState.autosaveCalls.length === currentWriteCounts.autosave + 1
      );

      React.act(() => {
        view.current().setTitle(`${transport} newer live title`);
        view.current().setSlug(`${transport}-newer-live-slug`);
        view.current().setFeaturedImage(`/media/${transport}-newer-live.png`);
        view.current().setTagsInput(`${transport}-newer-live-tag`);
        view.current().setCategoryId(`cat-${transport}-newer-live`);
        view.current().setSeoDraft({
          title: `${transport} newer live SEO`,
          description: `${transport} newer live description`,
          canonicalUrl: `https://example.com/${transport}-newer-live`,
          robots: "index,follow",
        });
        view.current().updateBlockContent("block-1", {
          version: 1,
          nodes: [
            {
              id: `node-${transport}-newer-live`,
              type: "paragraph",
              text: `${transport} newer live document`,
            },
          ],
        });
      });
      const newerLiveDocument = structuredClone(view.current().state.document);
      const newerHistoryLength = view.current().state.history.past.length;

      await React.act(async () => {
        if (transport === "manual") deferredManual.resolve(newerResponse);
        else deferredAutosave.resolve(autosaveResponse(newerResponse));
        await olderSavePromise;
      });
      expect(view.current().title).toBe(`${transport} newer live title`);
      expect(view.current().slug).toBe(`${transport}-newer-live-slug`);
      expect(view.current().featuredImage).toBe(`/media/${transport}-newer-live.png`);
      expect(view.current().tagsInput).toBe(`${transport}-newer-live-tag`);
      expect(view.current().categoryId).toBe(`cat-${transport}-newer-live`);
      expect(view.current().state.document).toEqual(newerLiveDocument);
      expect(view.current().state.history.past).toHaveLength(newerHistoryLength);
      expect(view.current().hasUnsavedChanges).toBe(true);
      expect(newerResponse.data).not.toEqual(initial.data);
      expect(newerResponse.data).not.toEqual(currentResponse.data);
      expect(newerResponse.data).toMatchObject({
        retainedBaseData: { generation: `${transport}-server-older-response` },
        serverOnlyBaseData: { transport, response: "older" },
      });
      expect(newerResponse.data).toMatchObject({ document: currentResponseDocument });
      expect(currentResponseDocument).not.toEqual(capturedOlderDocument);

      React.act(() => {
        view.current().setTitle(`${transport} normalized older response`);
        view.current().setSlug(`${transport}-normalized-older-response`);
        view.current().setFeaturedImage(`/media/${transport}-server-older.png`);
        view.current().setTagsInput(`${transport}-canonical-older`);
        view.current().setCategoryId(`cat-${transport}-canonical-older`);
        view.current().setSeoDraft({
          title: `${transport} canonical older SEO`,
          description: `${transport} canonical older description`,
          canonicalUrl: `https://example.com/${transport}-canonical-older`,
          robots: "noindex,nofollow",
        });
        view.current().undo();
        view.current().undo();
      });
      expect(view.current().state.document).toEqual(currentResponseDocument);
      expect(view.current().hasUnsavedChanges).toBe(false);
      const finalWriteCounts = {
        autosave: hookState.autosaveCalls.length,
        update: hookState.updatePostCalls.length,
        metadata: hookState.updateMetadataCalls.length,
      };
      await React.act(async () => {
        await view.current().flushLatestAutosave();
      });
      expect(hookState.autosaveCalls).toHaveLength(finalWriteCounts.autosave);
      expect(hookState.updatePostCalls).toHaveLength(finalWriteCounts.update);
      expect(hookState.updateMetadataCalls).toHaveLength(finalWriteCounts.metadata);
    } finally {
      view.cleanup();
    }
  }
);

test.each(["success", "failure"] as const)(
  "usePostEditorState keeps autosave as first owner when manual Save and Close join its exact target on %s",
  async (outcome) => {
    const initial = hookState.createPost("post-1");
    hookState.cachedPost = initial;
    hookState.fetchedPost = initial;
    const autosave = createDeferred<ReturnType<typeof autosaveResponse>>();
    hookState.autosaveHandler = async () => autosave.promise;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      React.act(() => {
        view.current().setTitle("one autosave-owned exact target");
        view.current().setSlug("one-autosave-owned-exact-target");
      });
      let autosaveResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        autosaveResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
          (error) => error
        );
      });
      await waitFor(() => hookState.autosaveCalls.length === 1);

      let manualResult: Promise<unknown> = Promise.resolve();
      let closeResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        manualResult = view
          .current()
          .saveDraft()
          .catch((error) => error);
        closeResult = view
          .current()
          .flushLatestAutosave()
          .catch((error) => error);
      });
      await flush();
      expect(hookState.autosaveCalls).toHaveLength(1);
      expect(hookState.updatePostCalls).toEqual([]);
      expect(hookState.updateMetadataCalls).toEqual([]);

      const failure = hookState.apiError("shared autosave owner failed");
      await React.act(async () => {
        if (outcome === "success") {
          autosave.resolve(
            autosaveResponse(
              hookState.createPost("post-1", {
                title: "one autosave-owned exact target",
                slug: "one-autosave-owned-exact-target",
              })
            )
          );
        } else {
          autosave.reject(failure);
        }
        await Promise.all([autosaveResult, manualResult, closeResult]);
      });
      if (outcome === "success") {
        await expect(autosaveResult).resolves.toBeUndefined();
        await expect(manualResult).resolves.toBeUndefined();
        await expect(closeResult).resolves.toBeUndefined();
        expect(view.current().hasUnsavedChanges).toBe(false);
      } else {
        await expect(autosaveResult).resolves.toBe(failure);
        await expect(manualResult).resolves.toBe(failure);
        await expect(closeResult).resolves.toBe(failure);
        expect(view.current().hasUnsavedChanges).toBe(true);
      }
      expect(hookState.autosaveCalls).toHaveLength(1);
      expect(hookState.updatePostCalls).toEqual([]);
      expect(hookState.updateMetadataCalls).toEqual([]);
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState coalesces manual and Close for one target under first-owner transport", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const manual = createDeferred<PostDetail>();
  hookState.updatePostHandler = async () => manual.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("shared target"));
    let manualPromise: Promise<void> = Promise.resolve();
    let closePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      manualPromise = view.current().saveDraft();
      closePromise = view.current().flushLatestAutosave();
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    expect(hookState.autosaveCalls).toEqual([]);

    await React.act(async () => {
      manual.resolve(hookState.createPost("post-1", { title: "shared target" }));
      await Promise.all([manualPromise, closePromise]);
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState shares an active manual failure with Close and retries without duplicate transport", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const manual = createDeferred<PostDetail>();
  hookState.updatePostHandler = async () => manual.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("manual failure bytes"));
    let manualResult: Promise<unknown> = Promise.resolve();
    let closeResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      manualResult = view
        .current()
        .saveDraft()
        .catch((error) => error);
      closeResult = view
        .current()
        .flushLatestAutosave()
        .catch((error) => error);
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    const failure = hookState.apiError("manual shared failure");
    await React.act(async () => {
      manual.reject(failure);
      await Promise.resolve();
    });
    await expect(manualResult).resolves.toBe(failure);
    await expect(closeResult).resolves.toBe(failure);
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(view.current().title).toBe("manual failure bytes");
    expect(view.current().hasUnsavedChanges).toBe(true);

    hookState.updatePostHandler = null;
    hookState.autosaveHandler = async (id, payload) =>
      autosaveResponse(hookState.applyPayload(hookState.createPost(id), payload));
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState rejects queued B and C when A fails and retries the retained C bytes", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const first = createDeferred<ReturnType<typeof autosaveResponse>>();
  hookState.autosaveHandler = async () => first.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("A failure"));
    let aResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      aResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    React.act(() => view.current().setTitle("B queued"));
    let bResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      bResult = view
        .current()
        .saveDraft()
        .catch((error) => error);
    });
    React.act(() => view.current().setTitle("C retained"));
    let cResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      cResult = view
        .current()
        .flushLatestAutosave()
        .catch((error) => error);
    });
    const failure = hookState.apiError("A failed");
    await React.act(async () => {
      first.reject(failure);
      await Promise.resolve();
    });
    await expect(aResult).resolves.toBe(failure);
    await expect(bResult).resolves.toBe(failure);
    await expect(cResult).resolves.toBe(failure);
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(view.current().title).toBe("C retained");
    expect(view.current().hasUnsavedChanges).toBe(true);

    hookState.updatePostHandler = null;
    await React.act(async () => {
      await view.current().saveDraft();
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.updatePostCalls[0]?.payload.title).toBe("C retained");
    expect(hookState.updateMetadataCalls).toEqual([
      {
        id: "post-1",
        payload: {
          tags: ["alpha", "beta"],
          taxonomy: { categoryId: "cat-1" },
          seo: {
            title: "SEO title",
            description: "SEO description",
            canonicalUrl: "https://example.com/editor-post",
            robots: "index,follow",
          },
        },
      },
    ]);
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.updateMetadataCalls).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState manual restoration compares metadata with the successful predecessor", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const background = createDeferred<ReturnType<typeof autosaveResponse>>();
  hookState.autosaveHandler = async () => background.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTagsInput("changed by A"));
    let backgroundPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      backgroundPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    React.act(() => view.current().setTagsInput("alpha, beta"));
    let manualPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      manualPromise = view.current().saveDraft();
    });
    await React.act(async () => {
      background.resolve(
        autosaveResponse(hookState.createPost("post-1", { tags: ["changed by A"] }))
      );
      await backgroundPromise;
    });
    await waitFor(() => hookState.updateMetadataCalls.length === 1);
    expect(hookState.updateMetadataCalls[0]?.payload.tags).toEqual(["alpha", "beta"]);
    await React.act(async () => {
      await manualPromise;
    });
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState propagates shared failure, retries current bytes, and isolates old identity responses", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const failure = hookState.apiError("Close save failed.");
  hookState.autosaveHandler = async () => Promise.reject(failure);
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle("retry bytes");
      view.current().insertBlock("heading");
    });
    const selectedRetryBlock = view.current().state.selectedBlockId;
    if (!selectedRetryBlock) throw new Error("Missing selected retry block.");
    React.act(() => {
      view.current().updateBlockContent(selectedRetryBlock, "retry block bytes");
      view.current().selectBlock(selectedRetryBlock);
    });
    const retryDocument = structuredClone(view.current().state.document);
    const retryHistory = structuredClone(view.current().state.history);
    const retryHistoryLength = view.current().state.history.past.length;
    const retryCanUndo = view.current().canUndo;
    let firstFailure: unknown;
    await React.act(async () => {
      try {
        await view.current().flushLatestAutosave();
      } catch (error) {
        firstFailure = error;
      }
    });
    expect(firstFailure).toBe(failure);
    expect(view.current().autosaveError).toBe("Close save failed.");
    expect(view.current().title).toBe("retry bytes");
    expect(view.current().state.document).toEqual(retryDocument);
    expect(view.current().state.selectedBlockId).toBe(selectedRetryBlock);
    expect(view.current().state.history).toEqual(retryHistory);
    expect(view.current().state.history.past).toHaveLength(retryHistoryLength);
    expect(view.current().canUndo).toBe(retryCanUndo);
    expect(view.current().hasUnsavedChanges).toBe(true);

    hookState.autosaveHandler = async (id, payload) =>
      autosaveResponse(hookState.applyPayload(hookState.createPost(id), payload));
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls.map((entry) => entry.payload.title)).toEqual([
      "retry bytes",
      "retry bytes",
    ]);
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().state.document).toEqual(retryDocument);
    expect(view.current().state.selectedBlockId).toBe(selectedRetryBlock);
    expect(view.current().state.history).toEqual(retryHistory);
    expect(view.current().state.history.past).toHaveLength(retryHistoryLength);
    expect(view.current().canUndo).toBe(retryCanUndo);
    expect(view.current().hasUnsavedChanges).toBe(false);

    const stale = createDeferred<ReturnType<typeof autosaveResponse>>();
    hookState.autosaveHandler = async () => stale.promise;
    React.act(() => view.current().setTitle("old identity pending"));
    let oldPromise: Promise<unknown> = Promise.resolve();
    React.act(() => {
      oldPromise = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await waitFor(() => hookState.autosaveCalls.length === 3);

    hookState.path = "/admin/posts/post-2";
    hookState.cachedPost = null;
    hookState.fetchedPost = hookState.createPost("post-2", { title: "Post two" });
    view.rerender();
    await waitFor(() => view.current().postId === "post-2" && view.current().title === "Post two");
    const staleFailure = hookState.apiError("late old identity failure");
    await React.act(async () => {
      stale.reject(staleFailure);
      await Promise.resolve();
    });
    await expect(oldPromise).resolves.toBe(staleFailure);
    expect(view.current().postId).toBe("post-2");
    expect(view.current().title).toBe("Post two");
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState runs a retained new-identity Close independently of the old request", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const oldRequest = createDeferred<ReturnType<typeof autosaveResponse>>();
  const newRequest = createDeferred<ReturnType<typeof autosaveResponse>>();
  hookState.autosaveHandler = async (id) =>
    id === "post-1" ? oldRequest.promise : newRequest.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("old A"));
    let oldRequestSettled = false;
    let oldResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      oldResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).then(
        (value) => {
          oldRequestSettled = true;
          return value;
        },
        (error: unknown) => {
          oldRequestSettled = true;
          return error;
        }
      );
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);
    expect(view.current().autosaveSaving).toBe(true);

    hookState.path = "/admin/posts/post-2";
    hookState.cachedPost = null;
    hookState.fetchedPost = hookState.createPost("post-2", { title: "Post two" });
    view.rerender();
    await waitFor(() => view.current().postId === "post-2" && view.current().title === "Post two");
    expect(view.current().autosaveSaving).toBe(false);
    expect(view.current().autosaveError).toBeNull();

    React.act(() => view.current().setTitle("new B"));
    let closePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      closePromise = view.current().flushLatestAutosave();
    });
    await waitFor(() => hookState.autosaveCalls.length === 2);
    expect(hookState.autosaveCalls[1]).toMatchObject({
      id: "post-2",
      payload: { title: "new B" },
    });
    expect(oldRequestSettled).toBe(false);

    await React.act(async () => {
      newRequest.resolve(autosaveResponse(hookState.createPost("post-2", { title: "new B" })));
      await closePromise;
    });
    expect(oldRequestSettled).toBe(false);
    expect(view.current().title).toBe("new B");
    expect(view.current().hasUnsavedChanges).toBe(false);

    const oldFailure = hookState.apiError("old A rejected");
    await React.act(async () => {
      oldRequest.reject(oldFailure);
      await Promise.resolve();
    });
    await expect(oldResult).resolves.toBe(oldFailure);
    expect(oldRequestSettled).toBe(true);
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().title).toBe("new B");
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState clears old identity save state and ignores late success", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const firstFailure = hookState.apiError("old visible error");
  hookState.autosaveHandler = async () => Promise.reject(firstFailure);
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("old failed bytes"));
    await React.act(async () => {
      await (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(() => undefined);
    });
    expect(view.current().autosaveError).toBe("old visible error");

    hookState.path = "/admin/posts/post-2";
    hookState.cachedPost = null;
    hookState.fetchedPost = hookState.createPost("post-2", { title: "Post two" });
    view.rerender();
    await waitFor(() => view.current().postId === "post-2" && view.current().title === "Post two");
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().autosaveSaving).toBe(false);

    const lateSuccess = createDeferred<ReturnType<typeof autosaveResponse>>();
    hookState.autosaveHandler = async () => lateSuccess.promise;
    React.act(() => view.current().setTitle("post two pending"));
    let stalePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      stalePromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => view.current().autosaveSaving === true);

    hookState.path = "/admin/posts/post-3";
    hookState.fetchedPost = hookState.createPost("post-3", { title: "Post three" });
    view.rerender();
    await waitFor(
      () => view.current().postId === "post-3" && view.current().title === "Post three"
    );
    expect(view.current().autosaveSaving).toBe(false);
    expect(view.current().autosaveError).toBeNull();

    await React.act(async () => {
      lateSuccess.resolve(
        autosaveResponse(hookState.createPost("post-2", { title: "late old success" }))
      );
      await stalePromise;
    });
    expect(view.current().title).toBe("Post three");
    expect(view.current().autosaveSaving).toBe(false);
    expect(view.current().autosaveError).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState seeds the new identity so clean Close stays zero-write around a late old save", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const oldSave = createDeferred<ReturnType<typeof autosaveResponse>>();
  hookState.autosaveHandler = async () => oldSave.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("old post pending bytes"));
    let oldSavePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      oldSavePromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    hookState.path = "/admin/posts/post-2";
    hookState.cachedPost = null;
    hookState.fetchedPost = hookState.createPost("post-2", {
      title: "Clean post two",
      slug: "clean-post-two",
    });
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-2" &&
        view.current().title === "Clean post two" &&
        view.current().loading === false
    );
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.updateMetadataCalls).toEqual([]);

    await React.act(async () => {
      oldSave.resolve(
        autosaveResponse(hookState.createPost("post-1", { title: "late old server response" }))
      );
      await oldSavePromise;
    });
    expect(view.current().postId).toBe("post-2");
    expect(view.current().title).toBe("Clean post two");
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.updateMetadataCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState exposes a blank gated route immediately and disables old autosave until hydration", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const nextPost = createDeferred<PostDetail | null>();
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle("dirty A must be gated");
      view.current().setTagsInput("dirty-a-tag");
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-dirty-a", type: "paragraph", text: "dirty A body" }],
      });
    });
    expect(view.current().hasUnsavedChanges).toBe(true);
    expect(hookState.autosaveOptions?.enabled).toBe(true);

    hookState.getPostHandler = async (id) =>
      id === "post-2" ? nextPost.promise : hookState.fetchedPost;
    hookState.path = "/admin/posts/post-2";
    hookState.cachedPost = null;
    view.rerender();

    expect(view.current().postId).toBe("post-2");
    expect(view.current().post).toBeNull();
    expect(view.current().loading).toBe(true);
    expect(view.current().title).toBe("");
    expect(view.current().slug).toBe("");
    expect(view.current().featuredImage).toBe("");
    expect(view.current().tagsInput).toBe("");
    expect(view.current().categoryId).toBe("");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(view.current().autosaveSaving).toBe(false);
    expect(view.current().autosaveError).toBeNull();
    expect(hookState.autosaveOptions).toMatchObject({ enabled: false, dirty: false });

    React.act(() => {
      view.current().setTitle("must not mutate before B hydration");
      view.current().insertBlock("heading");
    });
    await flush();
    expect(view.current().title).toBe("");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.updateMetadataCalls).toEqual([]);
    await waitFor(() => hookState.getPostCalls.some((call) => call.id === "post-2"));

    await React.act(async () => {
      nextPost.resolve(
        hookState.createPost("post-2", {
          title: "Authoritative post B",
          slug: "authoritative-post-b",
        })
      );
      await Promise.resolve();
    });
    await waitFor(
      () => view.current().loading === false && view.current().title === "Authoritative post B"
    );
    expect(view.current().slug).toBe("authoritative-post-b");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(hookState.autosaveOptions?.enabled).toBe(true);
    expect(hookState.autosaveCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState rejects a retained old restore callback before mutating the new identity", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    const retainedRestoreA = view.current().restoreRevision;

    hookState.path = "/admin/posts/post-2";
    hookState.cachedPost = null;
    hookState.fetchedPost = hookState.createPost("post-2", {
      title: "Stable post B",
      slug: "stable-post-b",
    });
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-2" &&
        view.current().title === "Stable post B" &&
        view.current().loading === false
    );
    const revisionsBefore = structuredClone(view.current().revisions);
    expect(view.current().restoringRevisionId).toBeNull();
    expect(view.current().revisionsError).toBeNull();
    expect(view.current().error).toBeNull();

    const staleResult = retainedRestoreA("rev-stale-a").catch((error) => error);
    await expect(staleResult).resolves.toMatchObject({
      code: "editor_identity_changed",
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([]);
    expect(view.current().postId).toBe("post-2");
    expect(view.current().title).toBe("Stable post B");
    expect(view.current().slug).toBe("stable-post-b");
    expect(view.current().restoringRevisionId).toBeNull();
    expect(view.current().revisions).toEqual(revisionsBefore);
    expect(view.current().revisionsError).toBeNull();
    expect(view.current().error).toBeNull();
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState makes every retained server callback inert after an identity transition", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    const retained = {
      saveDraft: view.current().saveDraft,
      flushLatestAutosave: view.current().flushLatestAutosave,
      publish: view.current().publish,
      unpublish: view.current().unpublish,
      preview: view.current().preview,
      openRevisions: view.current().openRevisions,
      setRevisionsOpen: view.current().setRevisionsOpen,
      setPreviewOpen: view.current().setPreviewOpen,
      restoreRevision: view.current().restoreRevision,
      markReloadRemote: view.current().markReloadRemote,
      uploadClipboardImage: view.current().uploadClipboardImage,
      moveToTrash: view.current().moveToTrash,
    };

    hookState.path = "/admin/posts/post-2";
    hookState.cachedPost = null;
    hookState.fetchedPost = hookState.createPost("post-2", {
      title: "Current post B",
      slug: "current-post-b",
    });
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-2" &&
        view.current().title === "Current post B" &&
        view.current().loading === false
    );
    const getCallsBefore = hookState.getPostCalls.length;
    let results: PromiseSettledResult<unknown>[] = [];
    await React.act(async () => {
      retained.openRevisions();
      retained.setRevisionsOpen(true);
      retained.setPreviewOpen(true);
      results = await Promise.allSettled([
        retained.saveDraft(),
        retained.flushLatestAutosave(),
        retained.publish(),
        retained.unpublish(),
        retained.preview(),
        retained.restoreRevision("rev-stale"),
        retained.markReloadRemote(),
        retained.uploadClipboardImage(new File(["stale"], "stale.png", { type: "image/png" })),
        retained.moveToTrash(),
      ]);
    });

    expect(results.slice(0, 8)).toEqual(
      Array.from({ length: 8 }, () =>
        expect.objectContaining({
          status: "rejected",
          reason: expect.objectContaining({ code: "editor_identity_changed" }),
        })
      )
    );
    expect(results[8]).toEqual({ status: "fulfilled", value: false });
    expect(hookState.getPostCalls).toHaveLength(getCallsBefore);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.updateMetadataCalls).toEqual([]);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.publishCalls).toEqual([]);
    expect(hookState.unpublishCalls).toEqual([]);
    expect(hookState.previewCalls).toEqual([]);
    expect(hookState.deleteCalls).toEqual([]);
    expect(hookState.listRevisionCalls).toEqual([]);
    expect(hookState.restoreCalls).toEqual([]);
    expect(hookState.uploadCalls).toEqual([]);
    expect(view.current().title).toBe("Current post B");
    expect(view.current().canMutatePost).toBe(true);
    expect(view.current().previewOpen).toBe(false);
    expect(view.current().revisionsOpen).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState closes a current deferred loading session with zero writes and rejects retained A", async () => {
  const initialA = hookState.createPost("post-1", { title: "Initial A" });
  const deferredB = createDeferred<PostDetail | null>();
  hookState.cachedPost = initialA;
  hookState.fetchedPost = initialA;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    const retainedCloseA = view.current().flushLatestAutosave;
    const sessionA = view.current().editorSessionKey;
    hookState.getPostHandler = async (id) => (id === "post-2" ? deferredB.promise : initialA);
    hookState.cachedPost = null;
    hookState.path = "/admin/posts/post-2";
    view.rerender();

    expect(view.current().postId).toBe("post-2");
    expect(view.current().editorSessionKey).not.toBe(sessionA);
    expect(view.current().loading).toBe(true);
    expect(view.current().post).toBeNull();
    await React.act(async () => {
      await expect(view.current().flushLatestAutosave()).resolves.toBeUndefined();
    });
    await expect(retainedCloseA()).rejects.toMatchObject({
      code: "editor_identity_changed",
    });
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.updateMetadataCalls).toEqual([]);

    await React.act(async () => {
      deferredB.resolve(hookState.createPost("post-2", { title: "Loaded B" }));
      await Promise.resolve();
    });
    await waitFor(() => view.current().loading === false && view.current().title === "Loaded B");
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test.each(["success", "failure"] as const)(
  "usePostEditorState serializes same-post A1 persistence behind deferred A0 without inheriting %s",
  async (outcome) => {
    const initialA = hookState.createPost("post-1", { title: "Initial A" });
    const currentB = hookState.createPost("post-2", { title: "Current B" });
    const freshA = hookState.createPost("post-1", {
      title: "Fresh A session",
      slug: "fresh-a-session",
    });
    const oldSave = createDeferred<PostDetail>();
    const staleA = hookState.createPost("post-1", {
      title: "Stale old A response",
      slug: "stale-old-a-response",
    });
    let serverA = freshA;
    hookState.cachedPost = initialA;
    hookState.fetchedPost = initialA;
    hookState.updatePostHandler = async (_id, payload) => {
      if (payload.title === "Old A pending") {
        const oldResponse = await oldSave.promise;
        serverA = oldResponse;
        hookState.cachedPost = oldResponse;
        hookState.fetchedPost = oldResponse;
        hookState.trigger("post:post-1");
        return oldResponse;
      }
      serverA = hookState.applyPayload(serverA, payload);
      hookState.cachedPost = serverA;
      hookState.fetchedPost = serverA;
      hookState.trigger("post:post-1");
      return serverA;
    };
    hookState.autosaveHandler = async (_id, payload) => {
      serverA = hookState.applyPayload(serverA, payload);
      hookState.cachedPost = serverA;
      hookState.fetchedPost = serverA;
      hookState.trigger("post:post-1");
      return autosaveResponse(serverA);
    };
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      React.act(() => view.current().setTitle("Old A pending"));
      let oldSaveSettled = false;
      let oldSaveResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        oldSaveResult = view
          .current()
          .saveDraft()
          .then(
            (value) => {
              oldSaveSettled = true;
              return value;
            },
            (error: unknown) => {
              oldSaveSettled = true;
              return error;
            }
          );
      });
      await waitFor(() => hookState.updatePostCalls.length === 1);

      hookState.getPostHandler = async (id) => (id === "post-2" ? currentB : serverA);
      hookState.cachedPost = null;
      hookState.path = "/admin/posts/post-2";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-2" &&
          view.current().title === "Current B" &&
          view.current().loading === false
      );

      hookState.path = "/admin/posts/post-1";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-1" &&
          view.current().title === "Fresh A session" &&
          view.current().loading === false
      );
      expect(view.current().canMutatePost).toBe(true);
      expect(view.current().hasUnsavedChanges).toBe(false);
      expect(view.current().state.saving).toBe(false);

      const getCallsBeforeLateA0CacheEvent = hookState.getPostCalls.length;
      React.act(() => {
        hookState.trigger("post:post-1");
      });
      await flush();
      expect(hookState.getPostCalls).toHaveLength(getCallsBeforeLateA0CacheEvent);
      expect(view.current().title).toBe("Fresh A session");

      let cleanCloseSettled = false;
      let cleanCloseResult: Promise<void> = Promise.resolve();
      React.act(() => {
        cleanCloseResult = view
          .current()
          .flushLatestAutosave()
          .then(() => {
            cleanCloseSettled = true;
          });
      });
      await flush();
      expect(hookState.autosaveCalls).toEqual([]);
      expect(cleanCloseSettled).toBe(false);

      React.act(() => view.current().setTitle("Fresh A revision one"));
      let freshSaveSettled = false;
      let freshSaveResult: Promise<void> = Promise.resolve();
      React.act(() => {
        freshSaveResult = view
          .current()
          .saveDraft()
          .then(() => {
            freshSaveSettled = true;
          });
      });
      await flush();
      expect(hookState.updatePostCalls).toHaveLength(1);
      expect(freshSaveSettled).toBe(false);

      React.act(() => view.current().setTitle("Fresh A close revision"));
      let freshCloseSettled = false;
      let freshCloseResult: Promise<void> = Promise.resolve();
      React.act(() => {
        freshCloseResult = view
          .current()
          .flushLatestAutosave()
          .then(() => {
            freshCloseSettled = true;
          });
      });
      await flush();
      expect(oldSaveSettled).toBe(false);
      expect(cleanCloseSettled).toBe(false);
      expect(freshSaveSettled).toBe(false);
      expect(freshCloseSettled).toBe(false);
      expect(hookState.updatePostCalls).toHaveLength(1);
      expect(hookState.autosaveCalls).toEqual([]);

      const staleFailure = hookState.apiError("old A save failed");
      await React.act(async () => {
        if (outcome === "success") {
          oldSave.resolve(staleA);
        } else {
          oldSave.reject(staleFailure);
        }
        await Promise.all([oldSaveResult, cleanCloseResult, freshSaveResult, freshCloseResult]);
      });
      expect(oldSaveSettled).toBe(true);
      expect(cleanCloseSettled).toBe(true);
      expect(freshSaveSettled).toBe(true);
      expect(freshCloseSettled).toBe(true);
      if (outcome === "success") {
        await expect(oldSaveResult).resolves.toBeUndefined();
      } else {
        await expect(oldSaveResult).resolves.toBe(staleFailure);
      }
      expect(hookState.updatePostCalls).toHaveLength(2);
      expect(hookState.updatePostCalls[1]).toMatchObject({
        id: "post-1",
        payload: { title: "Fresh A revision one" },
      });
      expect(hookState.autosaveCalls).toHaveLength(2);
      expect(hookState.autosaveCalls[0]).toMatchObject({
        id: "post-1",
        payload: {
          title: "Fresh A session",
          slug: "fresh-a-session",
        },
      });
      expect(hookState.autosaveCalls[1]).toMatchObject({
        id: "post-1",
        payload: { title: "Fresh A close revision" },
      });
      expect(hookState.getPostCalls).toHaveLength(getCallsBeforeLateA0CacheEvent);
      expect(serverA).toMatchObject({
        title: "Fresh A close revision",
        slug: "fresh-a-session",
      });
      expect(hookState.cachedPost).toMatchObject({
        title: "Fresh A close revision",
        slug: "fresh-a-session",
      });
      expect(view.current().title).toBe("Fresh A close revision");
      expect(view.current().slug).toBe("fresh-a-session");
      expect(view.current().loading).toBe(false);
      expect(view.current().error).toBeNull();
      expect(view.current().autosaveError).toBeNull();
      expect(view.current().hasUnsavedChanges).toBe(false);
      expect(view.current().state.saving).toBe(false);

      React.act(() => {
        hookState.trigger("post:post-1");
      });
      await waitFor(() => hookState.getPostCalls.length === getCallsBeforeLateA0CacheEvent + 1);
      expect(hookState.getPostCalls.at(-1)).toEqual({ id: "post-1", force: true });
      expect(view.current().title).toBe("Fresh A close revision");
      expect(view.current().slug).toBe("fresh-a-session");
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState retains restoration debt after a stale A0 save record is retired", async () => {
  const initialA0 = hookState.createPost("post-1", { title: "Initial A0" });
  const routeB = hookState.createPost("post-2", { title: "Route B" });
  const baselineA1 = hookState.createPost("post-1", {
    title: "Baseline A1",
    slug: "baseline-a1",
  });
  const staleA0 = hookState.createPost("post-1", {
    title: "Late stale A0",
    slug: "late-stale-a0",
  });
  const oldSave = createDeferred<PostDetail>();
  let durableA = baselineA1;
  hookState.cachedPost = initialA0;
  hookState.fetchedPost = initialA0;
  hookState.updatePostHandler = async () => {
    const response = await oldSave.promise;
    durableA = response;
    hookState.cachedPost = response;
    hookState.fetchedPost = response;
    hookState.trigger("post:post-1");
    return response;
  };
  hookState.autosaveHandler = async (_id, payload) => {
    durableA = hookState.applyPayload(durableA, payload);
    hookState.cachedPost = durableA;
    hookState.fetchedPost = durableA;
    hookState.trigger("post:post-1");
    return autosaveResponse(durableA);
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("A0 pending bytes"));
    let oldSaveResult: Promise<void> = Promise.resolve();
    React.act(() => {
      oldSaveResult = view.current().saveDraft();
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);

    hookState.getPostHandler = async (id) => (id === "post-2" ? routeB : durableA);
    hookState.cachedPost = null;
    hookState.path = "/admin/posts/post-2";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-2" &&
        view.current().title === "Route B" &&
        view.current().loading === false
    );
    hookState.path = "/admin/posts/post-1";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-1" &&
        view.current().title === "Baseline A1" &&
        view.current().loading === false
    );
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      oldSave.resolve(staleA0);
      await oldSaveResult;
    });
    await flush();
    expect(hookState.autosaveCalls).toEqual([]);
    expect(durableA).toMatchObject({
      title: "Late stale A0",
      slug: "late-stale-a0",
    });
    expect(view.current().title).toBe("Baseline A1");
    expect(view.current().hasUnsavedChanges).toBe(false);

    const getCallsBeforeDebtCacheEvent = hookState.getPostCalls.length;
    React.act(() => {
      hookState.trigger("post:post-1");
    });
    await flush();
    expect(hookState.getPostCalls).toHaveLength(getCallsBeforeDebtCacheEvent);
    expect(view.current().title).toBe("Baseline A1");

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toEqual([
      expect.objectContaining({
        id: "post-1",
        payload: expect.objectContaining({
          title: "Baseline A1",
          slug: "baseline-a1",
        }),
      }),
    ]);
    expect(durableA).toMatchObject({
      title: "Baseline A1",
      slug: "baseline-a1",
    });
    expect(hookState.cachedPost).toMatchObject({
      title: "Baseline A1",
      slug: "baseline-a1",
    });

    React.act(() => {
      hookState.trigger("post:post-1");
    });
    await waitFor(() => hookState.getPostCalls.length === getCallsBeforeDebtCacheEvent + 1);
    expect(view.current().title).toBe("Baseline A1");
    expect(view.current().slug).toBe("baseline-a1");

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test.each(["success", "partial-failure"] as const)(
  "usePostEditorState restores exact A1 metadata after a stale A0 autosave settles: %s",
  async (outcome) => {
    const initialA0 = hookState.createPost("post-1", { title: "Metadata initial A0" });
    const routeB = hookState.createPost("post-2", { title: "Metadata route B" });
    const expectedA1Metadata = {
      tags: ["metadata-a1-one", "metadata-a1-two"],
      taxonomy: { categoryId: "cat-metadata-a1" },
      seo: {
        title: "Metadata A1 SEO",
        description: "Metadata A1 description",
        canonicalUrl: "https://example.com/metadata-a1",
        robots: "index,follow",
      },
    };
    const baselineA1 = hookState.createPost("post-1", {
      title: "Metadata baseline A1",
      slug: "metadata-baseline-a1",
      tags: expectedA1Metadata.tags,
      taxonomy: {
        category: {
          id: expectedA1Metadata.taxonomy.categoryId,
          name: "Metadata A1 category",
          slug: expectedA1Metadata.taxonomy.categoryId,
        },
        tags: [],
      },
      seo: expectedA1Metadata.seo,
    });
    const expectedStaleA0Metadata = {
      tags: ["metadata-stale-a0-one", "metadata-stale-a0-two"],
      taxonomy: { categoryId: "cat-metadata-stale-a0" },
      seo: {
        title: "Metadata stale A0 SEO",
        description: "Metadata stale A0 description",
        canonicalUrl: "https://example.com/metadata-stale-a0",
        robots: "noindex,nofollow",
      },
    };
    const oldAutosave = createDeferred<void>();
    const staleFailure = hookState.apiError("stale metadata autosave may have partially failed");
    let durableA = baselineA1;
    hookState.cachedPost = initialA0;
    hookState.fetchedPost = initialA0;
    hookState.autosaveHandler = async (_id, payload) => {
      await oldAutosave.promise;
      durableA = hookState.applyPayload(durableA, payload);
      hookState.cachedPost = durableA;
      hookState.fetchedPost = durableA;
      hookState.trigger("post:post-1");
      if (outcome === "partial-failure") throw staleFailure;
      return autosaveResponse(durableA);
    };
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      React.act(() => {
        view.current().setTitle("Metadata stale A0 bytes");
        view.current().setSlug("metadata-stale-a0-bytes");
        view.current().setTagsInput(expectedStaleA0Metadata.tags.join(", "));
        view.current().setCategoryId(expectedStaleA0Metadata.taxonomy.categoryId);
        view.current().setSeoDraft(expectedStaleA0Metadata.seo);
      });
      let oldAutosaveResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        oldAutosaveResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
          (error) => error
        );
      });
      await waitFor(() => hookState.autosaveCalls.length === 1);
      expect(hookState.autosaveCalls[0]?.payload).toMatchObject({
        title: "Metadata stale A0 bytes",
        slug: "metadata-stale-a0-bytes",
        ...expectedStaleA0Metadata,
      });

      hookState.getPostHandler = async (id) => (id === "post-2" ? routeB : durableA);
      hookState.cachedPost = null;
      hookState.path = "/admin/posts/post-2";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-2" &&
          view.current().title === "Metadata route B" &&
          view.current().loading === false
      );
      hookState.path = "/admin/posts/post-1";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-1" &&
          view.current().title === "Metadata baseline A1" &&
          view.current().loading === false
      );
      expect(view.current().hasUnsavedChanges).toBe(false);

      await React.act(async () => {
        oldAutosave.resolve();
        await oldAutosaveResult;
      });
      if (outcome === "success") {
        await expect(oldAutosaveResult).resolves.toBeUndefined();
      } else {
        await expect(oldAutosaveResult).resolves.toBe(staleFailure);
      }
      expect(durableA).toMatchObject({
        title: "Metadata stale A0 bytes",
        slug: "metadata-stale-a0-bytes",
        tags: expectedStaleA0Metadata.tags,
        taxonomy: {
          category: { id: expectedStaleA0Metadata.taxonomy.categoryId },
        },
        seo: expectedStaleA0Metadata.seo,
      });
      expect(view.current().title).toBe("Metadata baseline A1");
      expect(view.current().tagsInput).toBe(expectedA1Metadata.tags.join(", "));
      expect(view.current().categoryId).toBe(expectedA1Metadata.taxonomy.categoryId);
      expect(view.current().seoDraft).toEqual(expectedA1Metadata.seo);
      expect(view.current().hasUnsavedChanges).toBe(false);

      hookState.updatePostHandler = async (_id, payload) => {
        durableA = hookState.applyPayload(durableA, payload);
        hookState.cachedPost = durableA;
        hookState.fetchedPost = durableA;
        hookState.trigger("post:post-1");
        return durableA;
      };
      hookState.updateMetadataHandler = async (_id, payload) => {
        durableA = hookState.applyPayload(durableA, payload);
        hookState.cachedPost = durableA;
        hookState.fetchedPost = durableA;
        hookState.trigger("post:post-1");
        return durableA;
      };
      await React.act(async () => {
        await view.current().saveDraft();
      });
      expect(hookState.updatePostCalls).toEqual([
        expect.objectContaining({
          id: "post-1",
          payload: expect.objectContaining({
            title: "Metadata baseline A1",
            slug: "metadata-baseline-a1",
          }),
        }),
      ]);
      expect(hookState.updateMetadataCalls).toEqual([
        { id: "post-1", payload: expectedA1Metadata },
      ]);
      expect(durableA).toMatchObject({
        title: "Metadata baseline A1",
        slug: "metadata-baseline-a1",
        tags: expectedA1Metadata.tags,
        taxonomy: {
          category: { id: expectedA1Metadata.taxonomy.categoryId },
        },
        seo: expectedA1Metadata.seo,
      });
      expect(hookState.cachedPost).toMatchObject({
        title: "Metadata baseline A1",
        slug: "metadata-baseline-a1",
        tags: expectedA1Metadata.tags,
        taxonomy: {
          category: { id: expectedA1Metadata.taxonomy.categoryId },
        },
        seo: expectedA1Metadata.seo,
      });
      expect(view.current().title).toBe("Metadata baseline A1");
      expect(view.current().slug).toBe("metadata-baseline-a1");
      expect(view.current().tagsInput).toBe(expectedA1Metadata.tags.join(", "));
      expect(view.current().categoryId).toBe(expectedA1Metadata.taxonomy.categoryId);
      expect(view.current().seoDraft).toEqual(expectedA1Metadata.seo);
      expect(view.current().hasUnsavedChanges).toBe(false);

      await React.act(async () => {
        await view.current().saveDraft();
      });
      expect(hookState.updatePostCalls).toHaveLength(1);
      expect(hookState.updateMetadataCalls).toHaveLength(1);
    } finally {
      view.cleanup();
    }
  }
);

test.each([
  ["preview", "success"],
  ["preview", "failure"],
  ["unpublish", "success"],
  ["unpublish", "failure"],
] as const)(
  "usePostEditorState orders clean %s behind full-envelope debt restoration: %s",
  async (action, outcome) => {
    const initialStatus: PostStatus = action === "unpublish" ? "published" : "draft";
    const initialA0 = createDistinctEnvelopePost("post-1", `${action}-initial-a0`, initialStatus);
    const staleDraftA0 = createDistinctEnvelopePost("post-1", `${action}-stale-a0`, initialStatus);
    const baselineA1 = createDistinctEnvelopePost("post-1", `${action}-baseline-a1`, initialStatus);
    const routeB = createDistinctEnvelopePost("post-2", `${action}-route-b`);
    const staleMetadata = buildExpectedMetadataPayload(staleDraftA0);
    const expectedA1Metadata = buildExpectedMetadataPayload(baselineA1);
    const oldA0Transport = createDeferred<void>();
    const baseRestorationTransport = createDeferred<void>();
    const metadataRestorationTransport = createDeferred<void>();
    const restorationFailure = hookState.apiError(`${action} exact restoration failed`);
    let durableA = baselineA1;
    hookState.cachedPost = initialA0;
    hookState.fetchedPost = initialA0;
    hookState.autosaveHandler = async (_id, payload) => {
      await oldA0Transport.promise;
      durableA = hookState.applyPayload(durableA, payload);
      hookState.cachedPost = durableA;
      hookState.fetchedPost = durableA;
      hookState.trigger("post:post-1");
      return autosaveResponse(durableA);
    };
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      React.act(() => {
        view.current().setTitle(staleDraftA0.title);
        view.current().setSlug(staleDraftA0.slug);
        view
          .current()
          .setFeaturedImage((staleDraftA0.data as Record<string, unknown>).featuredImage as string);
        view.current().setTagsInput(staleMetadata.tags.join(", "));
        view.current().setCategoryId(staleMetadata.taxonomy.categoryId ?? "");
        view.current().setSeoDraft({
          title: staleDraftA0.seo?.title ?? "",
          description: staleDraftA0.seo?.description ?? "",
          canonicalUrl: staleDraftA0.seo?.canonicalUrl ?? "",
          robots: staleDraftA0.seo?.robots ?? "index,follow",
        });
      });
      let oldA0Result: Promise<unknown> = Promise.resolve();
      React.act(() => {
        oldA0Result = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
          (error) => error
        );
      });
      await waitFor(() => hookState.autosaveCalls.length === 1);
      expect(hookState.autosaveCalls[0]?.payload).toMatchObject({
        title: staleDraftA0.title,
        slug: staleDraftA0.slug,
        ...staleMetadata,
      });

      hookState.getPostHandler = async (id) =>
        id === "post-2" ? routeB : (hookState.fetchedPost ?? durableA);
      hookState.cachedPost = null;
      hookState.fetchedPost = baselineA1;
      hookState.path = "/admin/posts/post-2";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-2" &&
          view.current().title === routeB.title &&
          view.current().loading === false
      );
      hookState.path = "/admin/posts/post-1";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-1" &&
          view.current().title === baselineA1.title &&
          view.current().loading === false
      );

      await React.act(async () => {
        oldA0Transport.resolve();
        await oldA0Result;
      });
      await expect(oldA0Result).resolves.toBeUndefined();
      expect(durableA).toMatchObject({
        title: staleDraftA0.title,
        slug: staleDraftA0.slug,
        tags: staleMetadata.tags,
        taxonomy: {
          category: { id: staleMetadata.taxonomy.categoryId },
        },
        seo: staleMetadata.seo,
      });
      expect(view.current().title).toBe(baselineA1.title);
      expect(view.current().hasUnsavedChanges).toBe(false);

      const expectedA1Base = {
        title: baselineA1.title,
        slug: baselineA1.slug,
        data: {
          ...(baselineA1.data as Record<string, unknown>),
          document: structuredClone(view.current().state.document),
        },
      };
      hookState.updatePostHandler = async (_id, payload) => {
        await baseRestorationTransport.promise;
        durableA = hookState.applyPayload(durableA, payload);
        hookState.cachedPost = durableA;
        hookState.fetchedPost = durableA;
        hookState.trigger("post:post-1");
        return durableA;
      };
      hookState.updateMetadataHandler = async (_id, payload) => {
        await metadataRestorationTransport.promise;
        if (outcome === "failure") throw restorationFailure;
        durableA = hookState.applyPayload(durableA, payload);
        hookState.cachedPost = durableA;
        hookState.fetchedPost = durableA;
        hookState.trigger("post:post-1");
        return durableA;
      };

      let actionSettled = false;
      let actionResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        const operation =
          action === "preview" ? view.current().preview() : view.current().unpublish();
        actionResult = operation
          .catch((error) => error)
          .finally(() => {
            actionSettled = true;
          });
      });
      await waitFor(() => hookState.updatePostCalls.length === 1);
      expect(hookState.updatePostCalls).toEqual([{ id: "post-1", payload: expectedA1Base }]);
      expect(actionSettled).toBe(false);
      expect(hookState.previewCalls).toEqual([]);
      expect(hookState.unpublishCalls).toEqual([]);

      await React.act(async () => {
        baseRestorationTransport.resolve();
        await Promise.resolve();
      });
      await waitFor(() => hookState.updateMetadataCalls.length === 1);
      expect(hookState.updateMetadataCalls).toEqual([
        { id: "post-1", payload: expectedA1Metadata },
      ]);
      expect(actionSettled).toBe(false);
      expect(hookState.previewCalls).toEqual([]);
      expect(hookState.unpublishCalls).toEqual([]);

      await React.act(async () => {
        metadataRestorationTransport.resolve();
        await actionResult;
      });
      expect(actionSettled).toBe(true);
      if (outcome === "failure") {
        if (action === "preview") {
          await expect(actionResult).resolves.toBeUndefined();
          expect(view.current().previewError).toBe(restorationFailure.message);
        } else {
          await expect(actionResult).resolves.toBe(restorationFailure);
          expect(view.current().error).toBe(restorationFailure.message);
        }
        expect(hookState.previewCalls).toEqual([]);
        expect(hookState.unpublishCalls).toEqual([]);
        return;
      }

      await expect(actionResult).resolves.toBeUndefined();
      if (action === "preview") {
        expect(hookState.previewCalls).toEqual([{ id: "post-1", ttl: 30 }]);
        expect(hookState.unpublishCalls).toEqual([]);
        expect(view.current().previewError).toBeNull();
        expect(view.current().previewUrl).toBe("/preview/post-1");
      } else {
        expect(hookState.previewCalls).toEqual([]);
        expect(hookState.unpublishCalls).toEqual(["post-1"]);
        expect(view.current().status).toBe("draft");
      }
      expect(durableA).toMatchObject({
        title: baselineA1.title,
        slug: baselineA1.slug,
        data: expectedA1Base.data,
        tags: expectedA1Metadata.tags,
        taxonomy: {
          category: { id: expectedA1Metadata.taxonomy.categoryId },
        },
        seo: expectedA1Metadata.seo,
      });
      expect(hookState.cachedPost).toMatchObject({
        title: baselineA1.title,
        slug: baselineA1.slug,
        data: expectedA1Base.data,
        tags: expectedA1Metadata.tags,
        taxonomy: {
          category: { id: expectedA1Metadata.taxonomy.categoryId },
        },
        seo: expectedA1Metadata.seo,
      });
      expect(view.current().title).toBe(baselineA1.title);
      expect(view.current().slug).toBe(baselineA1.slug);
      expect(view.current().featuredImage).toBe(
        (expectedA1Base.data as Record<string, unknown>).featuredImage
      );
      expect(view.current().tagsInput).toBe(expectedA1Metadata.tags.join(", "));
      expect(view.current().categoryId).toBe(expectedA1Metadata.taxonomy.categoryId);
      expect(view.current().seoDraft).toEqual(expectedA1Metadata.seo);
      expect(view.current().state.document).toEqual(expectedA1Base.data.document);
      expect(view.current().hasUnsavedChanges).toBe(false);
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState preserves later-settled restoration debt across an earlier A1 GET", async () => {
  const initialA0 = createDistinctEnvelopePost("post-1", "get-initial-a0");
  const staleDraftA0 = createDistinctEnvelopePost("post-1", "get-stale-a0");
  const baselineA1 = createDistinctEnvelopePost("post-1", "get-baseline-a1");
  const routeB = createDistinctEnvelopePost("post-2", "get-route-b");
  const staleMetadata = buildExpectedMetadataPayload(staleDraftA0);
  const expectedA1Metadata = buildExpectedMetadataPayload(baselineA1);
  const oldA0Transport = createDeferred<void>();
  const pendingA1Get = createDeferred<PostDetail | null>();
  let durableA = baselineA1;
  let a1GetStarted = false;
  hookState.cachedPost = initialA0;
  hookState.fetchedPost = initialA0;
  hookState.autosaveHandler = async (_id, payload) => {
    await oldA0Transport.promise;
    durableA = hookState.applyPayload(durableA, payload);
    hookState.cachedPost = durableA;
    hookState.fetchedPost = durableA;
    hookState.trigger("post:post-1");
    return autosaveResponse(durableA);
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle(staleDraftA0.title);
      view.current().setSlug(staleDraftA0.slug);
      view
        .current()
        .setFeaturedImage((staleDraftA0.data as Record<string, unknown>).featuredImage as string);
      view.current().setTagsInput(staleMetadata.tags.join(", "));
      view.current().setCategoryId(staleMetadata.taxonomy.categoryId ?? "");
      view.current().setSeoDraft({
        title: staleDraftA0.seo?.title ?? "",
        description: staleDraftA0.seo?.description ?? "",
        canonicalUrl: staleDraftA0.seo?.canonicalUrl ?? "",
        robots: staleDraftA0.seo?.robots ?? "index,follow",
      });
    });
    let oldA0Result: Promise<unknown> = Promise.resolve();
    React.act(() => {
      oldA0Result = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);
    expect(hookState.autosaveCalls[0]?.payload).toMatchObject({
      title: staleDraftA0.title,
      slug: staleDraftA0.slug,
      ...staleMetadata,
    });

    hookState.getPostHandler = async (id) => {
      if (id === "post-2") return routeB;
      a1GetStarted = true;
      return pendingA1Get.promise;
    };
    hookState.cachedPost = null;
    hookState.path = "/admin/posts/post-2";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-2" &&
        view.current().title === routeB.title &&
        view.current().loading === false
    );
    hookState.path = "/admin/posts/post-1";
    view.rerender();
    await waitFor(() => a1GetStarted && view.current().postId === "post-1");
    expect(view.current().loading).toBe(true);

    await React.act(async () => {
      oldA0Transport.resolve();
      await oldA0Result;
    });
    await expect(oldA0Result).resolves.toBeUndefined();
    expect(durableA).toMatchObject({
      title: staleDraftA0.title,
      slug: staleDraftA0.slug,
      tags: staleMetadata.tags,
      taxonomy: {
        category: { id: staleMetadata.taxonomy.categoryId },
      },
      seo: staleMetadata.seo,
    });

    await React.act(async () => {
      hookState.cachedPost = baselineA1;
      hookState.fetchedPost = baselineA1;
      pendingA1Get.resolve(baselineA1);
      await Promise.resolve();
    });
    await waitFor(
      () => view.current().title === baselineA1.title && view.current().loading === false
    );
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(durableA.title).toBe(staleDraftA0.title);

    const expectedA1Base = {
      title: baselineA1.title,
      slug: baselineA1.slug,
      data: {
        ...(baselineA1.data as Record<string, unknown>),
        document: structuredClone(view.current().state.document),
      },
    };
    hookState.updatePostHandler = async (_id, payload) => {
      durableA = hookState.applyPayload(durableA, payload);
      hookState.cachedPost = durableA;
      hookState.fetchedPost = durableA;
      hookState.trigger("post:post-1");
      return durableA;
    };
    hookState.updateMetadataHandler = async (_id, payload) => {
      durableA = hookState.applyPayload(durableA, payload);
      hookState.cachedPost = durableA;
      hookState.fetchedPost = durableA;
      hookState.trigger("post:post-1");
      return durableA;
    };
    await React.act(async () => {
      await view.current().saveDraft();
    });
    expect(hookState.updatePostCalls).toEqual([{ id: "post-1", payload: expectedA1Base }]);
    expect(hookState.updateMetadataCalls).toEqual([{ id: "post-1", payload: expectedA1Metadata }]);
    expect(durableA).toMatchObject({
      title: baselineA1.title,
      slug: baselineA1.slug,
      data: expectedA1Base.data,
      tags: expectedA1Metadata.tags,
      taxonomy: {
        category: { id: expectedA1Metadata.taxonomy.categoryId },
      },
      seo: expectedA1Metadata.seo,
    });
    expect(hookState.cachedPost).toMatchObject({
      title: baselineA1.title,
      slug: baselineA1.slug,
      data: expectedA1Base.data,
      tags: expectedA1Metadata.tags,
      taxonomy: {
        category: { id: expectedA1Metadata.taxonomy.categoryId },
      },
      seo: expectedA1Metadata.seo,
    });
    expect(view.current().title).toBe(baselineA1.title);
    expect(view.current().slug).toBe(baselineA1.slug);
    expect(view.current().featuredImage).toBe(
      (expectedA1Base.data as Record<string, unknown>).featuredImage
    );
    expect(view.current().tagsInput).toBe(expectedA1Metadata.tags.join(", "));
    expect(view.current().categoryId).toBe(expectedA1Metadata.taxonomy.categoryId);
    expect(view.current().seoDraft).toEqual(expectedA1Metadata.seo);
    expect(view.current().state.document).toEqual(expectedA1Base.data.document);
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      await view.current().saveDraft();
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.updateMetadataCalls).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState restores retired stale-save debt before publishing", async () => {
  const initialA0 = hookState.createPost("post-1", { title: "Publish A0" });
  const routeB = hookState.createPost("post-2", { title: "Publish route B" });
  const baselineA1 = hookState.createPost("post-1", {
    title: "Publish baseline A1",
    slug: "publish-baseline-a1",
  });
  const staleA0 = hookState.createPost("post-1", {
    title: "Publish stale A0",
    slug: "publish-stale-a0",
  });
  const oldSave = createDeferred<PostDetail>();
  const restoration = createDeferred<void>();
  hookState.cachedPost = initialA0;
  hookState.fetchedPost = initialA0;
  hookState.updatePostHandler = async (_id, payload) => {
    if (payload.title === "Publish A0 pending") {
      const response = await oldSave.promise;
      hookState.cachedPost = response;
      hookState.fetchedPost = response;
      hookState.trigger("post:post-1");
      return response;
    }
    await restoration.promise;
    const restored = hookState.applyPayload(staleA0, payload);
    hookState.cachedPost = restored;
    hookState.fetchedPost = restored;
    hookState.trigger("post:post-1");
    return restored;
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("Publish A0 pending"));
    let oldSaveResult: Promise<void> = Promise.resolve();
    React.act(() => {
      oldSaveResult = view.current().saveDraft();
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);

    hookState.getPostHandler = async (id) =>
      id === "post-2" ? routeB : (hookState.fetchedPost ?? baselineA1);
    hookState.cachedPost = null;
    hookState.fetchedPost = baselineA1;
    hookState.path = "/admin/posts/post-2";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-2" &&
        view.current().title === "Publish route B" &&
        view.current().loading === false
    );
    hookState.path = "/admin/posts/post-1";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-1" &&
        view.current().title === "Publish baseline A1" &&
        view.current().loading === false
    );

    await React.act(async () => {
      oldSave.resolve(staleA0);
      await oldSaveResult;
    });
    await flush();
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.publishCalls).toEqual([]);

    let publishResult: Promise<void> = Promise.resolve();
    React.act(() => {
      publishResult = view.current().publish();
    });
    await waitFor(() => hookState.updatePostCalls.length === 2);
    expect(hookState.publishCalls).toEqual([]);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls[1]).toMatchObject({
      id: "post-1",
      payload: {
        title: "Publish baseline A1",
        slug: "publish-baseline-a1",
      },
    });

    await React.act(async () => {
      restoration.resolve();
      await publishResult;
    });
    expect(hookState.publishCalls).toEqual(["post-1"]);
    expect(hookState.fetchedPost).toMatchObject({
      title: "Publish baseline A1",
      slug: "publish-baseline-a1",
    });
    expect(view.current().title).toBe("Publish baseline A1");
    expect(view.current().error).toBeNull();
  } finally {
    view.cleanup();
  }
});

test.each(["success", "failure"] as const)(
  "usePostEditorState serializes A1 persistence behind a deferred old-A restore barrier: %s",
  async (outcome) => {
    const initialA = hookState.createPost("post-1", { title: "Initial A" });
    const currentB = hookState.createPost("post-2", { title: "Current B" });
    const freshA = hookState.createPost("post-1", {
      title: "Fresh A after restore",
      slug: "fresh-a-after-restore",
    });
    const oldRestore = createDeferred<{
      ok: boolean;
      restored: boolean;
      revision: PostRevision;
      post: PostDetail;
    }>();
    hookState.cachedPost = initialA;
    hookState.fetchedPost = initialA;
    hookState.restoreHandler = async () => oldRestore.promise;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      let oldRestoreResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        oldRestoreResult = view
          .current()
          .restoreRevision("rev-old-a")
          .catch((error) => error);
      });
      await waitFor(() => hookState.restoreCalls.length === 1);

      hookState.getPostHandler = async (id) => (id === "post-2" ? currentB : freshA);
      hookState.cachedPost = null;
      hookState.path = "/admin/posts/post-2";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-2" &&
          view.current().title === "Current B" &&
          view.current().loading === false
      );
      hookState.path = "/admin/posts/post-1";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-1" &&
          view.current().title === "Fresh A after restore" &&
          view.current().loading === false
      );
      expect(view.current().restoringRevisionId).toBeNull();
      expect(view.current().canMutatePost).toBe(true);

      let freshBaseResponse = freshA;
      hookState.updatePostHandler = async (_id, payload) => {
        freshBaseResponse = hookState.applyPayload(freshA, payload);
        return freshBaseResponse;
      };
      hookState.updateMetadataHandler = async (_id, payload) =>
        hookState.applyPayload(freshBaseResponse, payload);
      React.act(() => view.current().setTitle("Fresh A after barrier revision one"));
      let freshSaveSettled = false;
      let freshSaveResult: Promise<void> = Promise.resolve();
      React.act(() => {
        freshSaveResult = view
          .current()
          .saveDraft()
          .then(() => {
            freshSaveSettled = true;
          });
      });
      await flush();
      expect(hookState.updatePostCalls).toEqual([]);
      expect(freshSaveSettled).toBe(false);

      const staleFailure = hookState.apiError("old A restore failed");
      await React.act(async () => {
        if (outcome === "success") {
          oldRestore.resolve({
            ok: true,
            restored: true,
            revision: hookState.createRevision("rev-old-a"),
            post: hookState.createPost("post-1", { title: "Stale restored A" }),
          });
        } else {
          oldRestore.reject(staleFailure);
        }
        await Promise.all([oldRestoreResult, freshSaveResult]);
      });
      expect(freshSaveSettled).toBe(true);
      if (outcome === "success") {
        await expect(oldRestoreResult).resolves.toMatchObject({
          code: "editor_identity_changed",
        });
      } else {
        await expect(oldRestoreResult).resolves.toBe(staleFailure);
      }
      expect(view.current().slug).toBe("fresh-a-after-restore");
      expect(view.current().loading).toBe(false);
      expect(view.current().error).toBeNull();
      expect(view.current().autosaveError).toBeNull();
      expect(view.current().revisionsError).toBeNull();
      expect(view.current().restoringRevisionId).toBeNull();
      expect(hookState.updatePostCalls).toEqual([
        expect.objectContaining({
          id: "post-1",
          payload: expect.objectContaining({
            title: "Fresh A after barrier revision one",
          }),
        }),
      ]);
      expect(view.current().title).toBe("Fresh A after barrier revision one");
      expect(view.current().hasUnsavedChanges).toBe(false);

      const autosavesBeforeClose = hookState.autosaveCalls.length;
      await React.act(async () => {
        await view.current().flushLatestAutosave();
      });
      expect(hookState.autosaveCalls).toHaveLength(autosavesBeforeClose);
    } finally {
      view.cleanup();
    }
  }
);

test.each(["success", "partial-failure"] as const)(
  "usePostEditorState keeps a clean cross-epoch manual Save behind stale restore settlement: %s",
  async (outcome) => {
    const initialA0 = hookState.createPost("post-1", { title: "Manual initial A0" });
    const routeB = hookState.createPost("post-2", { title: "Manual route B" });
    const baselineA1 = hookState.createPost("post-1", {
      title: "Manual clean baseline A1",
      slug: "manual-clean-baseline-a1",
    });
    const staleRestoredA0 = hookState.createPost("post-1", {
      title: "Manual stale restored A0",
      slug: "manual-stale-restored-a0",
    });
    const oldRestore = createDeferred<{
      ok: boolean;
      restored: boolean;
      revision: PostRevision;
      post: PostDetail;
    }>();
    let durableA = baselineA1;
    hookState.cachedPost = initialA0;
    hookState.fetchedPost = initialA0;
    hookState.restoreHandler = async () => oldRestore.promise;
    hookState.updatePostHandler = async (_id, payload) => {
      durableA = hookState.applyPayload(durableA, payload);
      hookState.cachedPost = durableA;
      hookState.fetchedPost = durableA;
      hookState.trigger("post:post-1");
      return durableA;
    };
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      let oldRestoreResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        oldRestoreResult = view
          .current()
          .restoreRevision("rev-manual-stale-a0")
          .catch((error) => error);
      });
      await waitFor(() => hookState.restoreCalls.length === 1);

      hookState.getPostHandler = async (id) => (id === "post-2" ? routeB : durableA);
      hookState.cachedPost = null;
      hookState.path = "/admin/posts/post-2";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-2" &&
          view.current().title === "Manual route B" &&
          view.current().loading === false
      );
      hookState.path = "/admin/posts/post-1";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-1" &&
          view.current().title === "Manual clean baseline A1" &&
          view.current().loading === false
      );
      expect(view.current().hasUnsavedChanges).toBe(false);

      let manualSettled = false;
      let manualResult: Promise<void> = Promise.resolve();
      React.act(() => {
        manualResult = view
          .current()
          .saveDraft()
          .then(() => {
            manualSettled = true;
          });
      });
      await flush();
      expect(manualSettled).toBe(false);
      expect(hookState.updatePostCalls).toEqual([]);

      durableA = staleRestoredA0;
      hookState.cachedPost = staleRestoredA0;
      hookState.fetchedPost = staleRestoredA0;
      React.act(() => {
        hookState.trigger("post:post-1");
      });
      await flush();
      expect(view.current().title).toBe("Manual clean baseline A1");

      const staleFailure = hookState.apiError("manual stale restore may have partially failed");
      await React.act(async () => {
        if (outcome === "success") {
          oldRestore.resolve({
            ok: true,
            restored: true,
            revision: hookState.createRevision("rev-manual-stale-a0"),
            post: staleRestoredA0,
          });
        } else {
          oldRestore.reject(staleFailure);
        }
        await Promise.all([oldRestoreResult, manualResult]);
      });
      expect(manualSettled).toBe(true);
      if (outcome === "success") {
        await expect(oldRestoreResult).resolves.toMatchObject({
          code: "editor_identity_changed",
        });
      } else {
        await expect(oldRestoreResult).resolves.toBe(staleFailure);
      }
      expect(hookState.updatePostCalls).toEqual([
        expect.objectContaining({
          id: "post-1",
          payload: expect.objectContaining({
            title: "Manual clean baseline A1",
            slug: "manual-clean-baseline-a1",
          }),
        }),
      ]);
      expect(durableA).toMatchObject({
        title: "Manual clean baseline A1",
        slug: "manual-clean-baseline-a1",
      });
      expect(hookState.cachedPost).toMatchObject({
        title: "Manual clean baseline A1",
        slug: "manual-clean-baseline-a1",
      });
      expect(view.current().title).toBe("Manual clean baseline A1");
      expect(view.current().autosaveError).toBeNull();
      expect(view.current().hasUnsavedChanges).toBe(false);

      await React.act(async () => {
        await view.current().saveDraft();
      });
      expect(hookState.updatePostCalls).toHaveLength(1);
    } finally {
      view.cleanup();
    }
  }
);

test.each(["success", "partial-failure"] as const)(
  "usePostEditorState waits for stale restore settlement and restores clean A1: %s",
  async (outcome) => {
    const initialA0 = hookState.createPost("post-1", { title: "Initial A0" });
    const routeB = hookState.createPost("post-2", { title: "Route B" });
    const baselineA1 = hookState.createPost("post-1", {
      title: "Clean baseline A1",
      slug: "clean-baseline-a1",
    });
    const staleRestoredA0 = hookState.createPost("post-1", {
      title: "Stale restored A0",
      slug: "stale-restored-a0",
    });
    const oldRestore = createDeferred<{
      ok: boolean;
      restored: boolean;
      revision: PostRevision;
      post: PostDetail;
    }>();
    let durableA = baselineA1;
    hookState.cachedPost = initialA0;
    hookState.fetchedPost = initialA0;
    hookState.restoreHandler = async () => oldRestore.promise;
    hookState.autosaveHandler = async (_id, payload) => {
      durableA = hookState.applyPayload(durableA, payload);
      hookState.cachedPost = durableA;
      hookState.fetchedPost = durableA;
      hookState.trigger("post:post-1");
      return autosaveResponse(durableA);
    };
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      let oldRestoreResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        oldRestoreResult = view
          .current()
          .restoreRevision("rev-stale-a0")
          .catch((error) => error);
      });
      await waitFor(() => hookState.restoreCalls.length === 1);

      hookState.getPostHandler = async (id) => (id === "post-2" ? routeB : durableA);
      hookState.cachedPost = null;
      hookState.path = "/admin/posts/post-2";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-2" &&
          view.current().title === "Route B" &&
          view.current().loading === false
      );
      hookState.path = "/admin/posts/post-1";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-1" &&
          view.current().title === "Clean baseline A1" &&
          view.current().loading === false
      );
      expect(view.current().hasUnsavedChanges).toBe(false);

      let closeSettled = false;
      let closeResult: Promise<void> = Promise.resolve();
      React.act(() => {
        closeResult = view
          .current()
          .flushLatestAutosave()
          .then(() => {
            closeSettled = true;
          });
      });
      await flush();
      expect(closeSettled).toBe(false);
      expect(hookState.autosaveCalls).toEqual([]);

      const getCallsBeforeOldRestoreSettlement = hookState.getPostCalls.length;
      durableA = staleRestoredA0;
      hookState.cachedPost = staleRestoredA0;
      hookState.fetchedPost = staleRestoredA0;
      React.act(() => {
        hookState.trigger("post:post-1");
      });
      await flush();
      expect(hookState.getPostCalls).toHaveLength(getCallsBeforeOldRestoreSettlement);
      expect(view.current().title).toBe("Clean baseline A1");

      const staleFailure = hookState.apiError("stale restore may have partially failed");
      await React.act(async () => {
        if (outcome === "success") {
          oldRestore.resolve({
            ok: true,
            restored: true,
            revision: hookState.createRevision("rev-stale-a0"),
            post: staleRestoredA0,
          });
        } else {
          oldRestore.reject(staleFailure);
        }
        await Promise.all([oldRestoreResult, closeResult]);
      });
      expect(closeSettled).toBe(true);
      if (outcome === "success") {
        await expect(oldRestoreResult).resolves.toMatchObject({
          code: "editor_identity_changed",
        });
      } else {
        await expect(oldRestoreResult).resolves.toBe(staleFailure);
      }
      expect(hookState.autosaveCalls).toEqual([
        expect.objectContaining({
          id: "post-1",
          payload: expect.objectContaining({
            title: "Clean baseline A1",
            slug: "clean-baseline-a1",
          }),
        }),
      ]);
      expect(durableA).toMatchObject({
        title: "Clean baseline A1",
        slug: "clean-baseline-a1",
      });
      expect(hookState.cachedPost).toMatchObject({
        title: "Clean baseline A1",
        slug: "clean-baseline-a1",
      });
      expect(view.current().title).toBe("Clean baseline A1");
      expect(view.current().autosaveError).toBeNull();
      expect(view.current().hasUnsavedChanges).toBe(false);
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState admission-orders chained cross-epoch barriers without stale failure poisoning", async () => {
  const initialA1 = hookState.createPost("post-1", { title: "Initial A1" });
  const routeB = hookState.createPost("post-2", { title: "Route B" });
  const initialA2 = hookState.createPost("post-1", { title: "Initial A2" });
  const authoritativeA2 = hookState.createPost("post-1", {
    title: "Authoritative A2",
    slug: "authoritative-a2",
  });
  const firstBarrierTransport = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const currentBarrierTransport = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  let restoreTransportCount = 0;
  hookState.cachedPost = initialA1;
  hookState.fetchedPost = initialA1;
  hookState.restoreHandler = async () => {
    restoreTransportCount += 1;
    return restoreTransportCount === 1
      ? firstBarrierTransport.promise
      : currentBarrierTransport.promise;
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    let firstBarrierResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      firstBarrierResult = view
        .current()
        .restoreRevision("rev-a1-first")
        .catch((error) => error);
    });
    await waitFor(() => hookState.restoreCalls.length === 1);

    let chainedBarrierResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      chainedBarrierResult = view
        .current()
        .restoreRevision("rev-a1-chained")
        .catch((error) => error);
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "rev-a1-first" }]);

    hookState.getPostHandler = async (id) => (id === "post-2" ? routeB : initialA2);
    hookState.cachedPost = null;
    hookState.path = "/admin/posts/post-2";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-2" &&
        view.current().title === "Route B" &&
        view.current().loading === false
    );
    hookState.path = "/admin/posts/post-1";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-1" &&
        view.current().title === "Initial A2" &&
        view.current().loading === false
    );

    let currentBarrierSettled = false;
    let currentBarrierResult: Promise<void> = Promise.resolve();
    React.act(() => {
      currentBarrierResult = view
        .current()
        .restoreRevision("rev-a2")
        .then(() => {
          currentBarrierSettled = true;
        });
    });
    await flush();
    expect(hookState.restoreCalls).toHaveLength(1);
    expect(currentBarrierSettled).toBe(false);

    const staleFailure = hookState.apiError("stale A1 barrier failed");
    await React.act(async () => {
      firstBarrierTransport.reject(staleFailure);
      await Promise.all([firstBarrierResult, chainedBarrierResult]);
    });
    await waitFor(() => hookState.restoreCalls.length === 2);
    await expect(firstBarrierResult).resolves.toBe(staleFailure);
    await expect(chainedBarrierResult).resolves.toBe(staleFailure);
    expect(hookState.restoreCalls[1]).toEqual({
      id: "post-1",
      revisionId: "rev-a2",
    });
    expect(currentBarrierSettled).toBe(false);

    await React.act(async () => {
      currentBarrierTransport.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-a2"),
        post: authoritativeA2,
      });
      await currentBarrierResult;
    });
    expect(currentBarrierSettled).toBe(true);
    expect(restoreTransportCount).toBe(2);
    expect(view.current().title).toBe("Authoritative A2");
    expect(view.current().slug).toBe("authoritative-a2");
    expect(view.current().revisionsError).toBeNull();
    expect(view.current().restoringRevisionId).toBeNull();
  } finally {
    view.cleanup();
  }
});

test.each(["success", "failure"] as const)(
  "usePostEditorState rejects an old Close after a render-time route switch and late save %s",
  async (outcome) => {
    const initial = hookState.createPost("post-1");
    hookState.cachedPost = initial;
    hookState.fetchedPost = initial;
    const oldSave = createDeferred<ReturnType<typeof autosaveResponse>>();
    hookState.autosaveHandler = async () => oldSave.promise;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      React.act(() => view.current().setTitle("old Close pending bytes"));
      await waitFor(() => hookState.autosaveOptions?.dirty === true);
      let closeResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        closeResult = view
          .current()
          .flushLatestAutosave()
          .catch((error) => error);
      });
      await waitFor(() => hookState.autosaveCalls.length === 1);
      expect(view.current().autosaveSaving).toBe(true);

      hookState.path = "/admin/posts/post-2";
      hookState.cachedPost = null;
      hookState.fetchedPost = hookState.createPost("post-2", {
        title: "Protected post B",
        slug: "protected-post-b",
      });
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-2" &&
          view.current().title === "Protected post B" &&
          view.current().loading === false
      );
      expect(view.current().autosaveSaving).toBe(false);
      expect(view.current().autosaveError).toBeNull();

      const failure = hookState.apiError("late old Close failed");
      await React.act(async () => {
        if (outcome === "success") {
          oldSave.resolve(
            autosaveResponse(
              hookState.createPost("post-1", {
                title: "stale old normalized success",
                slug: "stale-old-normalized-success",
              })
            )
          );
        } else {
          oldSave.reject(failure);
        }
        await closeResult;
      });
      if (outcome === "success") {
        await expect(closeResult).resolves.toMatchObject({
          code: "editor_identity_changed",
        });
      } else {
        await expect(closeResult).resolves.toBe(failure);
      }
      expect(view.current().postId).toBe("post-2");
      expect(view.current().title).toBe("Protected post B");
      expect(view.current().slug).toBe("protected-post-b");
      expect(view.current().hasUnsavedChanges).toBe(false);
      expect(view.current().autosaveSaving).toBe(false);
      expect(view.current().autosaveError).toBeNull();
      expect(view.current().error).toBeNull();
      expect(hookState.autosaveCalls).toEqual([expect.objectContaining({ id: "post-1" })]);
      expect(hookState.updatePostCalls).toEqual([]);
      expect(hookState.updateMetadataCalls).toEqual([]);
    } finally {
      view.cleanup();
    }
  }
);

test.each(["success", "failure"] as const)(
  "usePostEditorState keeps the new route loading while a deferred old-route GET settles %s",
  async (outcome) => {
    const initial = hookState.createPost("post-1");
    hookState.cachedPost = initial;
    hookState.fetchedPost = initial;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      const oldGet = createDeferred<PostDetail | null>();
      const newGet = createDeferred<PostDetail | null>();
      hookState.getPostHandler = async (id) => (id === "post-1" ? oldGet.promise : newGet.promise);
      React.act(() => hookState.trigger("post:post-1"));
      await waitFor(
        () => hookState.getPostCalls.filter((call) => call.id === "post-1").length >= 2
      );

      hookState.path = "/admin/posts/post-2";
      hookState.cachedPost = null;
      hookState.fetchedPost = hookState.createPost("post-2", { title: "Current post two" });
      view.rerender();
      await waitFor(() => hookState.getPostCalls.some((call) => call.id === "post-2"));
      expect(view.current().postId).toBe("post-2");
      expect(view.current().loading).toBe(true);
      expect(view.current().title).not.toBe("stale old GET");

      await React.act(async () => {
        if (outcome === "success") {
          oldGet.resolve(hookState.createPost("post-1", { title: "stale old GET" }));
        } else {
          oldGet.reject(hookState.apiError("stale old GET failure"));
        }
        await Promise.resolve();
      });
      expect(view.current().postId).toBe("post-2");
      expect(view.current().title).not.toBe("stale old GET");
      expect(view.current().error).toBeNull();
      expect(view.current().loading).toBe(true);

      await React.act(async () => {
        newGet.resolve(hookState.createPost("post-2", { title: "Current post two" }));
        await Promise.resolve();
      });
      await waitFor(
        () => view.current().title === "Current post two" && view.current().loading === false
      );
      expect(view.current().error).toBeNull();
    } finally {
      view.cleanup();
    }
  }
);

test.each(["success", "failure"] as const)(
  "usePostEditorState keeps the new restore pending while an old-route restore settles %s",
  async (outcome) => {
    const initial = hookState.createPost("post-1");
    hookState.cachedPost = initial;
    hookState.fetchedPost = initial;
    const oldRestore = createDeferred<{
      ok: boolean;
      restored: boolean;
      revision: PostRevision;
      post: PostDetail;
    }>();
    const newRestore = createDeferred<{
      ok: boolean;
      restored: boolean;
      revision: PostRevision;
      post: PostDetail;
    }>();
    hookState.restoreHandler = async (id) =>
      id === "post-1" ? oldRestore.promise : newRestore.promise;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      let restoreResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        restoreResult = view
          .current()
          .restoreRevision("rev-old")
          .catch((error) => error);
      });
      await waitFor(() => hookState.restoreCalls.length === 1);

      hookState.path = "/admin/posts/post-2";
      hookState.cachedPost = null;
      hookState.fetchedPost = hookState.createPost("post-2", { title: "Current post two" });
      view.rerender();
      await waitFor(
        () => view.current().postId === "post-2" && view.current().title === "Current post two"
      );
      let newRestoreResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        newRestoreResult = view
          .current()
          .restoreRevision("rev-new")
          .catch((error) => error);
      });
      await waitFor(
        () =>
          hookState.restoreCalls.some(
            (call) => call.id === "post-2" && call.revisionId === "rev-new"
          ) && view.current().restoringRevisionId === "rev-new"
      );
      const staleFailure = hookState.apiError("stale restore failure");
      await React.act(async () => {
        if (outcome === "success") {
          oldRestore.resolve({
            ok: true,
            restored: true,
            revision: hookState.createRevision("rev-old"),
            post: hookState.createPost("post-1", { title: "stale restored post" }),
          });
        } else {
          oldRestore.reject(staleFailure);
        }
        await Promise.resolve();
      });
      if (outcome === "failure") await expect(restoreResult).resolves.toBe(staleFailure);
      else {
        await expect(restoreResult).resolves.toMatchObject({
          code: "editor_identity_changed",
        });
      }
      expect(view.current().postId).toBe("post-2");
      expect(view.current().title).toBe("Current post two");
      expect(view.current().error).toBeNull();
      expect(view.current().revisionsError).toBeNull();
      expect(view.current().restoringRevisionId).toBe("rev-new");

      await React.act(async () => {
        newRestore.resolve({
          ok: true,
          restored: true,
          revision: hookState.createRevision("rev-new", { postId: "post-2" }),
          post: hookState.createPost("post-2", { title: "Restored current post two" }),
        });
        await newRestoreResult;
      });
      await expect(newRestoreResult).resolves.toBeUndefined();
      expect(view.current().title).toBe("Restored current post two");
      expect(view.current().restoringRevisionId).toBeNull();
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState guards late old-identity manual failure after switch and unmount", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const manual = createDeferred<PostDetail>();
  hookState.updatePostHandler = async () => manual.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("old manual pending"));
    let manualResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      manualResult = view
        .current()
        .saveDraft()
        .catch((error) => error);
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    hookState.path = "/admin/posts/post-2";
    hookState.cachedPost = null;
    hookState.fetchedPost = hookState.createPost("post-2", { title: "Current post two" });
    view.rerender();
    await waitFor(() => view.current().title === "Current post two");
    const failure = hookState.apiError("late old manual failure");
    await React.act(async () => {
      manual.reject(failure);
      await Promise.resolve();
    });
    await expect(manualResult).resolves.toBe(failure);
    expect(view.current().error).toBeNull();
    expect(view.current().title).toBe("Current post two");
    expect(view.current().state.saving).toBe(false);
  } finally {
    view.cleanup();
  }

  hookState.reset();
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const unmountedManual = createDeferred<PostDetail>();
  hookState.updatePostHandler = async () => unmountedManual.promise;
  const unmountedView = mountHook();
  await waitFor(() => unmountedView.current().loading === false);
  React.act(() => unmountedView.current().setTitle("unmounted manual pending"));
  let unmountedResult: Promise<unknown> = Promise.resolve();
  React.act(() => {
    unmountedResult = unmountedView
      .current()
      .saveDraft()
      .catch((error) => error);
  });
  await waitFor(() => hookState.updatePostCalls.length === 1);
  unmountedView.cleanup();
  const unmountedFailure = hookState.apiError("late unmounted manual failure");
  unmountedManual.reject(unmountedFailure);
  await expect(unmountedResult).resolves.toBe(unmountedFailure);
});

test("usePostEditorState ignores late old-identity manual success after switch", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const manual = createDeferred<PostDetail>();
  hookState.updatePostHandler = async () => manual.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("old manual pending"));
    let manualPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      manualPromise = view.current().saveDraft();
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    hookState.path = "/admin/posts/post-2";
    hookState.cachedPost = null;
    hookState.fetchedPost = hookState.createPost("post-2", { title: "Current post two" });
    view.rerender();
    await waitFor(() => view.current().title === "Current post two");
    await React.act(async () => {
      manual.resolve(hookState.createPost("post-1", { title: "late old manual success" }));
      await manualPromise;
    });
    expect(view.current().postId).toBe("post-2");
    expect(view.current().title).toBe("Current post two");
    expect(view.current().error).toBeNull();
    expect(view.current().state.saving).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState lets an authoritative restore hydrate after a normalized predecessor response", async () => {
  const seed = hookState.createPost("post-1");
  const initial = hookState.createPost("post-1", {
    data: {
      ...(seed.data as Record<string, unknown>),
      serverOpaque: { generation: "seed" },
    },
  });
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const saveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  const restoreR = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  hookState.autosaveHandler = async () => saveA.promise;
  hookState.restoreHandler = async () => restoreR.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle("A authored title");
      view.current().setSlug("a-authored-slug");
      view.current().setFeaturedImage("/media/a-authored.png");
      view.current().setTagsInput("a-authored-tag");
      view.current().setCategoryId("cat-a-authored");
      view.current().setSeoDraft({
        title: "A authored SEO",
        description: "A authored description",
        canonicalUrl: "https://example.com/a-authored",
        robots: "index,follow",
      });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-a-authored", type: "paragraph", text: "A authored document" }],
      });
    });
    const authoredDocumentA = structuredClone(view.current().state.document);
    let saveAPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      saveAPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    let restorePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      restorePromise = view.current().restoreRevision("rev-authoritative-r");
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([]);

    const normalizedDocumentA = structuredClone(authoredDocumentA);
    const normalizedBlockA = normalizedDocumentA.blocks[0];
    if (!normalizedBlockA) throw new Error("Missing normalized A block fixture.");
    normalizedBlockA.content = {
      version: 1,
      nodes: [
        {
          id: "node-a-normalized",
          type: "paragraph",
          text: "A server-normalized document",
        },
      ],
    };
    const normalizedA = hookState.createPost("post-1", {
      title: "A normalized title",
      slug: "a-normalized-slug",
      data: {
        ...(initial.data as Record<string, unknown>),
        serverOpaque: { generation: "a-normalized" },
        featuredImage: "/media/a-normalized.png",
        document: normalizedDocumentA,
      },
      tags: ["a-normalized-tag"],
      taxonomy: {
        category: {
          id: "cat-a-normalized",
          name: "A normalized category",
          slug: "a-normalized-category",
        },
        tags: [],
      },
      seo: {
        title: "A normalized SEO",
        description: "A normalized description",
        canonicalUrl: "https://example.com/a-normalized",
        robots: "noindex,follow",
      },
    });
    await React.act(async () => {
      saveA.resolve(autosaveResponse(normalizedA));
      await saveAPromise;
    });
    await waitFor(() => hookState.restoreCalls.length === 1);
    expect(normalizedA.data).not.toEqual(initial.data);
    expect(normalizedDocumentA).not.toEqual(authoredDocumentA);

    const restoredDocumentR = structuredClone(authoredDocumentA);
    const restoredBlockR = restoredDocumentR.blocks[0];
    if (!restoredBlockR) throw new Error("Missing restored R block fixture.");
    restoredBlockR.content = {
      version: 1,
      nodes: [
        {
          id: "node-r-authoritative",
          type: "paragraph",
          text: "R authoritative document",
        },
      ],
    };
    const restoredR = hookState.createPost("post-1", {
      title: "R authoritative title",
      slug: "r-authoritative-slug",
      data: {
        ...(initial.data as Record<string, unknown>),
        serverOpaque: { generation: "r-authoritative" },
        featuredImage: "/media/r-authoritative.png",
        document: restoredDocumentR,
      },
      tags: ["r-authoritative-tag"],
      taxonomy: {
        category: {
          id: "cat-r-authoritative",
          name: "R authoritative category",
          slug: "r-authoritative-category",
        },
        tags: [],
      },
      seo: {
        title: "R authoritative SEO",
        description: "R authoritative description",
        canonicalUrl: "https://example.com/r-authoritative",
        robots: "noindex,nofollow",
      },
    });
    await React.act(async () => {
      restoreR.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-authoritative-r"),
        post: restoredR,
      });
      await restorePromise;
    });
    expect(view.current().title).toBe("R authoritative title");
    expect(view.current().slug).toBe("r-authoritative-slug");
    expect(view.current().featuredImage).toBe("/media/r-authoritative.png");
    expect(view.current().tagsInput).toBe("r-authoritative-tag");
    expect(view.current().categoryId).toBe("cat-r-authoritative");
    expect(view.current().seoDraft).toEqual({
      title: "R authoritative SEO",
      description: "R authoritative description",
      canonicalUrl: "https://example.com/r-authoritative",
      robots: "noindex,nofollow",
    });
    expect(view.current().state.document).toEqual(restoredDocumentR);
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.updateMetadataCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState propagates the first barrier failure to the next barrier and downstream save", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const restoreR1 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  hookState.restoreHandler = async (_id, revisionId) => {
    if (revisionId !== "rev-r1") {
      throw new Error(`Unexpected restore dispatch: ${revisionId}`);
    }
    return restoreR1.promise;
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    let r1Result: Promise<unknown> = Promise.resolve();
    React.act(() => {
      r1Result = view
        .current()
        .restoreRevision("rev-r1")
        .catch((error) => error);
    });
    await waitFor(() => hookState.restoreCalls.length === 1);

    let r2Result: Promise<unknown> = Promise.resolve();
    React.act(() => {
      r2Result = view
        .current()
        .restoreRevision("rev-r2")
        .catch((error) => error);
    });
    React.act(() => view.current().setTitle("downstream bytes after R2"));
    let downstreamSaveResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      downstreamSaveResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "rev-r1" }]);
    expect(hookState.autosaveCalls).toEqual([]);

    const failure = hookState.apiError("R1 authoritative failure");
    await React.act(async () => {
      restoreR1.reject(failure);
      await Promise.all([r1Result, r2Result, downstreamSaveResult]);
    });
    await expect(r1Result).resolves.toBe(failure);
    await expect(r2Result).resolves.toBe(failure);
    await expect(downstreamSaveResult).resolves.toBe(failure);
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "rev-r1" }]);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.updateMetadataCalls).toEqual([]);
    expect(view.current().title).toBe("downstream bytes after R2");
    expect(view.current().hasUnsavedChanges).toBe(true);
    expect(view.current().restoringRevisionId).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState preserves A R1 C R2 admission order when R1 fails", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const autosaveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  const restoreR1 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const wireOrder: string[] = [];
  hookState.autosaveHandler = async () => {
    wireOrder.push("A");
    return autosaveA.promise;
  };
  hookState.restoreHandler = async (_id, revisionId) => {
    wireOrder.push(revisionId);
    if (revisionId !== "R1") {
      throw new Error(`Unexpected restore dispatch: ${revisionId}`);
    }
    return restoreR1.promise;
  };
  hookState.updatePostHandler = async (id, payload) => {
    wireOrder.push("C");
    return hookState.applyPayload(hookState.createPost(id), payload);
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("A in flight"));
    let aResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      aResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);
    expect(wireOrder).toEqual(["A"]);

    let r1Result: Promise<unknown> = Promise.resolve();
    React.act(() => {
      r1Result = view
        .current()
        .restoreRevision("R1")
        .catch((error) => error);
    });
    React.act(() => view.current().setTitle("C queued after R1"));
    let cResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      cResult = view
        .current()
        .saveDraft()
        .catch((error) => error);
    });
    let r2Result: Promise<unknown> = Promise.resolve();
    React.act(() => {
      r2Result = view
        .current()
        .restoreRevision("R2")
        .catch((error) => error);
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(wireOrder).toEqual(["A"]);

    await React.act(async () => {
      autosaveA.resolve(autosaveResponse(hookState.createPost("post-1", { title: "A persisted" })));
      await aResult;
    });
    await expect(aResult).resolves.toBeUndefined();
    await waitFor(() => hookState.restoreCalls.length === 1);
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "R1" }]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(wireOrder).toEqual(["A", "R1"]);

    const failure = hookState.apiError("R1 failed after A");
    await React.act(async () => {
      restoreR1.reject(failure);
      await Promise.all([r1Result, cResult, r2Result]);
    });
    await expect(r1Result).resolves.toBe(failure);
    await expect(cResult).resolves.toBe(failure);
    await expect(r2Result).resolves.toBe(failure);
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "R1" }]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.updateMetadataCalls).toEqual([]);
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(wireOrder).toEqual(["A", "R1"]);
    expect(view.current().title).toBe("C queued after R1");
    expect(view.current().hasUnsavedChanges).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState completes A R1 C R2 success in physical admission order", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const autosaveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  const restoreR1 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const manualC = createDeferred<PostDetail>();
  const restoreR2 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const wireOrder: string[] = [];
  let manualCBaseResponse = initial;
  hookState.autosaveHandler = async () => {
    wireOrder.push("A");
    return autosaveA.promise;
  };
  hookState.restoreHandler = async (_id, revisionId) => {
    wireOrder.push(revisionId);
    if (revisionId === "R1") return restoreR1.promise;
    if (revisionId === "R2") return restoreR2.promise;
    throw new Error(`Unexpected restore dispatch: ${revisionId}`);
  };
  hookState.updatePostHandler = async () => {
    wireOrder.push("C");
    return manualC.promise;
  };
  hookState.updateMetadataHandler = async (_id, payload) => {
    wireOrder.push("C-metadata");
    return hookState.applyPayload(manualCBaseResponse, payload);
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("A in flight success"));
    let aPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      aPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    let r1Promise: Promise<void> = Promise.resolve();
    React.act(() => {
      r1Promise = view.current().restoreRevision("R1");
    });
    React.act(() => {
      view.current().setTitle("C exact payload");
      view.current().setSlug("c-exact-payload");
      view.current().setFeaturedImage("/media/c-exact-payload.png");
      view.current().setTagsInput("c-exact-one, c-exact-two");
      view.current().setCategoryId("cat-c-exact");
      view.current().setSeoDraft({
        title: "C exact SEO",
        description: "C exact description",
        canonicalUrl: "https://example.com/c-exact",
        robots: "noindex,follow",
      });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-c-exact", type: "paragraph", text: "C exact document" }],
      });
    });
    const documentC = structuredClone(view.current().state.document);
    const expectedCBase = {
      title: "C exact payload",
      slug: "c-exact-payload",
      data: {
        ...(initial.data as Record<string, unknown>),
        featuredImage: "/media/c-exact-payload.png",
        document: documentC,
      },
    };
    const expectedCMetadata = {
      tags: ["c-exact-one", "c-exact-two"],
      taxonomy: { categoryId: "cat-c-exact" },
      seo: {
        title: "C exact SEO",
        description: "C exact description",
        canonicalUrl: "https://example.com/c-exact",
        robots: "noindex,follow",
      },
    };
    let cPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      cPromise = view.current().saveDraft();
    });
    let r2Promise: Promise<void> = Promise.resolve();
    React.act(() => {
      r2Promise = view.current().restoreRevision("R2");
    });
    await flush();
    expect(wireOrder).toEqual(["A"]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.restoreCalls).toEqual([]);

    await React.act(async () => {
      autosaveA.resolve(
        autosaveResponse(hookState.createPost("post-1", { title: "A persisted success" }))
      );
      await aPromise;
    });
    await waitFor(() => hookState.restoreCalls.length === 1);
    expect(wireOrder).toEqual(["A", "R1"]);
    expect(hookState.updatePostCalls).toEqual([]);

    await React.act(async () => {
      restoreR1.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("R1"),
        post: hookState.createPost("post-1", { title: "R1 persisted baseline" }),
      });
      await r1Promise;
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    expect(hookState.updatePostCalls[0]).toEqual({
      id: "post-1",
      payload: expectedCBase,
    });
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "R1" }]);
    expect(wireOrder).toEqual(["A", "R1", "C"]);

    await React.act(async () => {
      manualCBaseResponse = hookState.applyPayload(initial, expectedCBase);
      manualC.resolve(manualCBaseResponse);
      await cPromise;
    });
    expect(hookState.updateMetadataCalls).toEqual([{ id: "post-1", payload: expectedCMetadata }]);
    await waitFor(() => hookState.restoreCalls.length === 2);
    expect(hookState.restoreCalls).toEqual([
      { id: "post-1", revisionId: "R1" },
      { id: "post-1", revisionId: "R2" },
    ]);
    expect(wireOrder).toEqual(["A", "R1", "C", "C-metadata", "R2"]);

    await React.act(async () => {
      restoreR2.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("R2"),
        post: hookState.createPost("post-1", {
          title: "R2 final hydrate",
          slug: "r2-final-hydrate",
        }),
      });
      await r2Promise;
    });
    expect(view.current().title).toBe("R2 final hydrate");
    expect(view.current().slug).toBe("r2-final-hydrate");
    expect(view.current().hasUnsavedChanges).toBe(false);
    const writesBeforeClose = {
      autosave: hookState.autosaveCalls.length,
      update: hookState.updatePostCalls.length,
      metadata: hookState.updateMetadataCalls.length,
    };
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(writesBeforeClose.autosave);
    expect(hookState.updatePostCalls).toHaveLength(writesBeforeClose.update);
    expect(hookState.updateMetadataCalls).toHaveLength(writesBeforeClose.metadata);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState serializes concurrent successful restore barriers", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const restoreR1 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const restoreR2 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  hookState.restoreHandler = async (_id, revisionId) => {
    if (revisionId === "R1-success") return restoreR1.promise;
    if (revisionId === "R2-success") return restoreR2.promise;
    throw new Error(`Unexpected restore dispatch: ${revisionId}`);
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    let r1Promise: Promise<void> = Promise.resolve();
    React.act(() => {
      r1Promise = view.current().restoreRevision("R1-success");
    });
    await waitFor(() => hookState.restoreCalls.length === 1);
    let r2Promise: Promise<void> = Promise.resolve();
    React.act(() => {
      r2Promise = view.current().restoreRevision("R2-success");
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "R1-success" }]);
    expect(view.current().restoringRevisionId).toBe("R2-success");

    await React.act(async () => {
      restoreR1.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("R1-success"),
        post: hookState.createPost("post-1", { title: "R1 hydrated" }),
      });
      await r1Promise;
    });
    await waitFor(() => hookState.restoreCalls.length === 2);
    expect(hookState.restoreCalls).toEqual([
      { id: "post-1", revisionId: "R1-success" },
      { id: "post-1", revisionId: "R2-success" },
    ]);
    expect(view.current().title).toBe("R1 hydrated");
    expect(view.current().restoringRevisionId).toBe("R2-success");

    await React.act(async () => {
      restoreR2.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("R2-success"),
        post: hookState.createPost("post-1", { title: "R2 hydrated" }),
      });
      await r2Promise;
    });
    expect(view.current().title).toBe("R2 hydrated");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(view.current().restoringRevisionId).toBeNull();
    expect(view.current().revisionsError).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState serializes A B C before restore and persists newer D behind the barrier", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const autosaveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  const manualB = createDeferred<PostDetail>();
  const autosaveC = createDeferred<ReturnType<typeof autosaveResponse>>();
  const autosaveD = createDeferred<ReturnType<typeof autosaveResponse>>();
  const restoreR = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  let autosaveCall = 0;
  hookState.autosaveHandler = async () => {
    autosaveCall += 1;
    if (autosaveCall === 1) return autosaveA.promise;
    if (autosaveCall === 2) return autosaveC.promise;
    return autosaveD.promise;
  };
  hookState.updatePostHandler = async () => manualB.promise;
  hookState.restoreHandler = async () => restoreR.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("A"));
    let aPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      aPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    React.act(() => view.current().setTitle("B"));
    let bPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      bPromise = view.current().saveDraft();
    });
    React.act(() => view.current().setTitle("C"));
    let cPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      cPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    let restorePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      restorePromise = view.current().restoreRevision("rev-R");
    });
    expect(hookState.restoreCalls).toEqual([]);

    await React.act(async () => {
      autosaveA.resolve(autosaveResponse(hookState.createPost("post-1", { title: "A" })));
      await aPromise;
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    await React.act(async () => {
      manualB.resolve(hookState.createPost("post-1", { title: "B" }));
      await bPromise;
    });
    await waitFor(() => hookState.autosaveCalls.length === 2);
    await React.act(async () => {
      autosaveC.resolve(autosaveResponse(hookState.createPost("post-1", { title: "C" })));
      await cPromise;
    });
    await waitFor(() => hookState.restoreCalls.length === 1);
    expect(hookState.autosaveCalls.map((entry) => entry.payload.title)).toEqual(["A", "C"]);
    expect(hookState.updatePostCalls[0]?.payload.title).toBe("B");

    React.act(() => view.current().setTitle("D newer than restore"));
    let closePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      closePromise = view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(2);

    await React.act(async () => {
      restoreR.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-R"),
        post: hookState.createPost("post-1", { title: "Restored R" }),
      });
      await restorePromise;
    });
    expect(view.current().title).toBe("D newer than restore");
    await waitFor(() => hookState.autosaveCalls.length === 3);
    expect(hookState.autosaveCalls[2]?.payload.title).toBe("D newer than restore");

    await React.act(async () => {
      autosaveD.resolve(
        autosaveResponse(hookState.createPost("post-1", { title: "D newer than restore" }))
      );
      await closePromise;
    });
    expect(view.current().hasUnsavedChanges).toBe(false);
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(3);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState keeps a post-barrier manual snapshot exact and waits for restore", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const autosaveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  const restoreR = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const manualAfterR = createDeferred<PostDetail>();
  const wireOrder: string[] = [];
  hookState.autosaveHandler = async () => {
    wireOrder.push("A");
    return autosaveA.promise;
  };
  hookState.restoreHandler = async () => {
    wireOrder.push("R");
    return restoreR.promise;
  };
  hookState.updatePostHandler = async () => {
    wireOrder.push("manual");
    return manualAfterR.promise;
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("A exact manual bytes"));
    let aPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      aPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    let restorePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      restorePromise = view.current().restoreRevision("rev-R");
    });
    let manualSettled = false;
    let manualPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      manualPromise = view.current().saveDraft();
      void manualPromise.then(() => {
        manualSettled = true;
      });
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(manualSettled).toBe(false);

    await React.act(async () => {
      autosaveA.resolve(
        autosaveResponse(hookState.createPost("post-1", { title: "A exact manual bytes" }))
      );
      await aPromise;
    });
    await waitFor(() => hookState.restoreCalls.length === 1);
    expect(wireOrder).toEqual(["A", "R"]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(manualSettled).toBe(false);

    await React.act(async () => {
      restoreR.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-R"),
        post: hookState.createPost("post-1", { title: "Restored R" }),
      });
      await restorePromise;
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    expect(wireOrder).toEqual(["A", "R", "manual"]);
    expect(hookState.updatePostCalls[0]?.payload.title).toBe("A exact manual bytes");
    expect(view.current().title).toBe("A exact manual bytes");
    expect(view.current().hasUnsavedChanges).toBe(true);
    expect(manualSettled).toBe(false);

    await React.act(async () => {
      manualAfterR.resolve(
        hookState.createPost("post-1", {
          title: "Server-normalized manual A",
          slug: "server-normalized-manual-a",
        })
      );
      await manualPromise;
    });
    expect(manualSettled).toBe(true);
    expect(view.current().title).toBe("Server-normalized manual A");
    expect(view.current().slug).toBe("server-normalized-manual-a");
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState keeps a clean manual Save behind an active restore barrier", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const restoreR = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const manualAfterR = createDeferred<PostDetail>();
  hookState.restoreHandler = async () => restoreR.promise;
  hookState.updatePostHandler = async () => manualAfterR.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    let restorePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      restorePromise = view.current().restoreRevision("rev-clean-R");
    });
    await waitFor(() => hookState.restoreCalls.length === 1);

    let manualSettled = false;
    let manualPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      manualPromise = view.current().saveDraft();
      void manualPromise.then(() => {
        manualSettled = true;
      });
    });
    await flush();
    expect(manualSettled).toBe(false);
    expect(hookState.updatePostCalls).toEqual([]);

    await React.act(async () => {
      restoreR.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-clean-R"),
        post: hookState.createPost("post-1", { title: "Restored clean R" }),
      });
      await restorePromise;
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    expect(manualSettled).toBe(false);
    expect(hookState.updatePostCalls[0]?.payload.title).toBe(initial.title);
    expect(view.current().title).toBe(initial.title);
    expect(view.current().hasUnsavedChanges).toBe(true);

    await React.act(async () => {
      manualAfterR.resolve(initial);
      await manualPromise;
    });
    expect(manualSettled).toBe(true);
    expect(view.current().title).toBe(initial.title);
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState makes clean Close await an authoritative reload without adding a write", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const reload = createDeferred<PostDetail | null>();
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    hookState.getPostHandler = async () => reload.promise;
    let reloadPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      reloadPromise = view.current().markReloadRemote();
    });
    let closeSettled = false;
    let closePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      closePromise = view
        .current()
        .flushLatestAutosave()
        .then(() => {
          closeSettled = true;
        });
    });
    await flush();
    expect(closeSettled).toBe(false);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);

    await React.act(async () => {
      reload.resolve(hookState.createPost("post-1", { title: "Reloaded R" }));
      await Promise.all([reloadPromise, closePromise]);
    });
    expect(closeSettled).toBe(true);
    expect(view.current().title).toBe("Reloaded R");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState serializes concurrent successful reload barriers", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const reloadR1 = createDeferred<PostDetail | null>();
  const reloadR2 = createDeferred<PostDetail | null>();
  const wireOrder: string[] = [];
  let reloadCall = 0;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    const initialGetCount = hookState.getPostCalls.length;
    hookState.getPostHandler = async () => {
      reloadCall += 1;
      wireOrder.push(`R${reloadCall}`);
      return reloadCall === 1 ? reloadR1.promise : reloadR2.promise;
    };
    let r1Promise: Promise<void> = Promise.resolve();
    React.act(() => {
      r1Promise = view.current().markReloadRemote();
    });
    await waitFor(() => hookState.getPostCalls.length === initialGetCount + 1);
    let r2Promise: Promise<void> = Promise.resolve();
    React.act(() => {
      r2Promise = view.current().markReloadRemote();
    });
    await flush();
    expect(wireOrder).toEqual(["R1"]);
    expect(hookState.getPostCalls).toHaveLength(initialGetCount + 1);

    await React.act(async () => {
      reloadR1.resolve(
        hookState.createPost("post-1", {
          title: "Reload R1 hydrated",
          slug: "reload-r1-hydrated",
        })
      );
      await r1Promise;
    });
    await waitFor(() => hookState.getPostCalls.length === initialGetCount + 2);
    expect(wireOrder).toEqual(["R1", "R2"]);
    expect(view.current().title).toBe("Reload R1 hydrated");

    await React.act(async () => {
      reloadR2.resolve(
        hookState.createPost("post-1", {
          title: "Reload R2 hydrated",
          slug: "reload-r2-hydrated",
        })
      );
      await r2Promise;
    });
    expect(view.current().title).toBe("Reload R2 hydrated");
    expect(view.current().slug).toBe("reload-r2-hydrated");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(view.current().error).toBeNull();
    expect(hookState.getPostCalls.slice(initialGetCount)).toEqual([
      { id: "post-1", force: true },
      { id: "post-1", force: true },
    ]);
  } finally {
    view.cleanup();
  }
});

test.each(["success", "failure"] as const)(
  "usePostEditorState runs an admitted reload after a save cache event and preserves its %s result",
  async (outcome) => {
    const initial = hookState.createPost("post-1");
    hookState.cachedPost = initial;
    hookState.fetchedPost = initial;
    const save = createDeferred<ReturnType<typeof autosaveResponse>>();
    const reload = createDeferred<PostDetail | null>();
    hookState.autosaveHandler = async () => {
      const response = await save.promise;
      hookState.trigger("post:post-1");
      return response;
    };
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      const initialGetCount = hookState.getPostCalls.length;
      hookState.getPostHandler = async () => reload.promise;
      React.act(() => view.current().setTitle("save predecessor A"));
      let savePromise: Promise<void> = Promise.resolve();
      React.act(() => {
        savePromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
      });
      await waitFor(() => hookState.autosaveCalls.length === 1);

      let reloadResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        reloadResult = view
          .current()
          .markReloadRemote()
          .catch((error) => error);
      });
      await flush();
      expect(hookState.getPostCalls).toHaveLength(initialGetCount);

      await React.act(async () => {
        save.resolve(
          autosaveResponse(hookState.createPost("post-1", { title: "saved predecessor A" }))
        );
        await savePromise;
      });
      await waitFor(() => hookState.getPostCalls.length === initialGetCount + 1);
      expect(hookState.getPostCalls.slice(initialGetCount)).toEqual([
        { id: "post-1", force: true },
      ]);

      if (outcome === "success") {
        await React.act(async () => {
          reload.resolve(
            hookState.createPost("post-1", {
              title: "authoritative reload after save",
              slug: "authoritative-reload-after-save",
            })
          );
          await reloadResult;
        });
        await expect(reloadResult).resolves.toBeUndefined();
        expect(view.current().title).toBe("authoritative reload after save");
        expect(view.current().slug).toBe("authoritative-reload-after-save");
        expect(view.current().error).toBeNull();
        expect(view.current().hasUnsavedChanges).toBe(false);
      } else {
        const failure = hookState.apiError("reload after save failed");
        await React.act(async () => {
          reload.reject(failure);
          await reloadResult;
        });
        await expect(reloadResult).resolves.toBe(failure);
        expect(view.current().error).toBe("reload after save failed");
        expect(view.current().title).toBe("save predecessor A");
      }
      expect(hookState.getPostCalls).toHaveLength(initialGetCount + 1);
      expect(hookState.autosaveCalls).toHaveLength(1);
      expect(hookState.updatePostCalls).toEqual([]);
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState exposes and retries a Close error when an authoritative barrier rejects", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const restore = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  hookState.restoreHandler = async () => restore.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    expect(view.current().autosaveError).toBeNull();

    let restoreResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      restoreResult = view
        .current()
        .restoreRevision("rev-barrier")
        .catch((error) => error);
    });
    await waitFor(() => hookState.restoreCalls.length === 1);

    let closeResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      closeResult = view
        .current()
        .flushLatestAutosave()
        .catch((error) => error);
    });
    await flush();
    expect(hookState.autosaveCalls).toEqual([]);

    const failure = new Error("restore barrier rejected");
    await React.act(async () => {
      restore.reject(failure);
      await Promise.all([restoreResult, closeResult]);
    });
    await expect(restoreResult).resolves.toBe(failure);
    await expect(closeResult).resolves.toBe(failure);
    expect(view.current().autosaveError).toBe("Failed to save latest changes before closing.");
    expect(view.current().title).toBe(initial.title);
    expect(view.current().hasUnsavedChanges).toBe(false);

    React.act(() => view.current().setTitle("retry after barrier"));
    await React.act(async () => {
      await view.current().saveDraft();
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.updatePostCalls[0]?.payload.title).toBe("retry after barrier");
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState rejects a wrong-identity restore barrier without upserting its revision", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const restore = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  hookState.restoreHandler = async () => restore.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    let restoreResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      restoreResult = view
        .current()
        .restoreRevision("rev-wrong-id")
        .catch((error) => error);
    });
    await waitFor(() => hookState.restoreCalls.length === 1);

    let closeResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      closeResult = view
        .current()
        .flushLatestAutosave()
        .catch((error) => error);
    });
    await flush();

    await React.act(async () => {
      restore.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-wrong-id"),
        post: hookState.createPost("post-2", { title: "Wrong identity restore" }),
      });
      await Promise.all([restoreResult, closeResult]);
    });
    await expect(restoreResult).resolves.toMatchObject({ code: "editor_identity_changed" });
    await expect(closeResult).resolves.toBe(await restoreResult);
    expect(view.current().postId).toBe("post-1");
    expect(view.current().title).toBe(initial.title);
    expect(view.current().revisions).toEqual([]);
    expect(view.current().revisionsError).toBe("Failed to restore revision.");
    expect(view.current().autosaveError).toBe("Failed to save latest changes before closing.");
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState rejects a wrong-identity reload barrier without reporting success", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const reload = createDeferred<PostDetail | null>();
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    const initialGetCalls = hookState.getPostCalls.length;
    hookState.getPostHandler = async () => reload.promise;
    let reloadResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      reloadResult = view
        .current()
        .markReloadRemote()
        .catch((error) => error);
    });
    await waitFor(() => hookState.getPostCalls.length === initialGetCalls + 1);

    let closeResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      closeResult = view
        .current()
        .flushLatestAutosave()
        .catch((error) => error);
    });
    await flush();

    await React.act(async () => {
      reload.resolve(hookState.createPost("post-2", { title: "Wrong identity reload" }));
      await Promise.all([reloadResult, closeResult]);
    });
    await expect(reloadResult).resolves.toMatchObject({ code: "editor_identity_changed" });
    await expect(closeResult).resolves.toBe(await reloadResult);
    expect(view.current().postId).toBe("post-1");
    expect(view.current().title).toBe(initial.title);
    expect(view.current().error).toBe("Failed to load post editor.");
    expect(view.current().autosaveError).toBe("Failed to save latest changes before closing.");
    expect(view.current().remoteUpdatePending).toBe(false);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState revalidates shared cache after a stale old-epoch reload settles", async () => {
  const initialA0 = hookState.createPost("post-1", { title: "Reload A0" });
  const routeB = hookState.createPost("post-2", { title: "Reload route B" });
  const baselineA1 = hookState.createPost("post-1", {
    title: "Reload baseline A1",
    slug: "reload-baseline-a1",
  });
  const staleReloadA0 = hookState.createPost("post-1", {
    title: "Late reload A0",
    slug: "late-reload-a0",
  });
  const oldReload = createDeferred<PostDetail>();
  hookState.cachedPost = initialA0;
  hookState.fetchedPost = initialA0;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    let postAGetCount = 0;
    hookState.getPostHandler = async (id) => {
      if (id === "post-2") return routeB;
      postAGetCount += 1;
      if (postAGetCount === 1) {
        const staleResponse = await oldReload.promise;
        hookState.cachedPost = staleResponse;
        hookState.fetchedPost = staleResponse;
        hookState.trigger("post:post-1");
        return staleResponse;
      }
      hookState.cachedPost = baselineA1;
      hookState.fetchedPost = baselineA1;
      hookState.trigger("post:post-1");
      return baselineA1;
    };

    let oldReloadResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      oldReloadResult = view
        .current()
        .markReloadRemote()
        .catch((error) => error);
    });
    await waitFor(() => postAGetCount === 1);

    hookState.cachedPost = null;
    hookState.path = "/admin/posts/post-2";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-2" &&
        view.current().title === "Reload route B" &&
        view.current().loading === false
    );
    hookState.path = "/admin/posts/post-1";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-1" &&
        view.current().title === "Reload baseline A1" &&
        view.current().loading === false
    );
    expect(postAGetCount).toBe(2);

    await React.act(async () => {
      oldReload.resolve(staleReloadA0);
      await oldReloadResult;
    });
    await expect(oldReloadResult).resolves.toMatchObject({
      code: "editor_identity_changed",
    });
    expect(postAGetCount).toBe(3);
    expect(hookState.cachedPost).toMatchObject({
      title: "Reload baseline A1",
      slug: "reload-baseline-a1",
    });
    expect(hookState.fetchedPost).toMatchObject({
      title: "Reload baseline A1",
      slug: "reload-baseline-a1",
    });
    expect(view.current().title).toBe("Reload baseline A1");
    expect(view.current().slug).toBe("reload-baseline-a1");
    expect(view.current().error).toBeNull();
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState waits for restore before flushing an unadmitted dirty timer", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const restore = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const restoreRefresh = createDeferred<PostDetail | null>();
  hookState.getPostHandler = async () => restoreRefresh.promise;
  hookState.restoreHandler = async () => {
    hookState.trigger("post:post-1");
    return restore.promise;
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("dirty A not admitted"));
    let restorePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      restorePromise = view.current().restoreRevision("rev-R");
    });
    await waitFor(() => hookState.restoreCalls.length === 1);

    let closeSettled = false;
    let closePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      closePromise = view
        .current()
        .flushLatestAutosave()
        .then(() => {
          closeSettled = true;
        });
    });
    await flush();
    expect(closeSettled).toBe(false);
    expect(hookState.autosaveCalls).toEqual([]);

    const restoredPost = hookState.createPost("post-1", { title: "Restored R final" });
    await React.act(async () => {
      restore.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-R"),
        post: restoredPost,
      });
      await Promise.all([restorePromise, closePromise]);
    });
    expect(view.current().title).toBe("Restored R final");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(hookState.autosaveCalls).toEqual([]);

    await React.act(async () => {
      restoreRefresh.resolve(restoredPost);
      await Promise.resolve();
    });
    expect(view.current().remoteUpdatePending).toBe(false);
    expect(hookState.autosaveOptions?.enabled).toBe(true);

    hookState.getPostHandler = null;
    hookState.autosaveHandler = async (id, payload) =>
      autosaveResponse(hookState.applyPayload(hookState.createPost(id), payload));
    React.act(() => view.current().setTitle("D after restored R"));
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.autosaveCalls[0]?.payload.title).toBe("D after restored R");
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState makes a background timer recapture only after an active restore", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const restore = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  hookState.restoreHandler = async () => restore.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("pre-restore timer bytes"));
    let restorePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      restorePromise = view.current().restoreRevision("rev-timer-R");
    });
    await waitFor(() => hookState.restoreCalls.length === 1);

    let backgroundSettled = false;
    let backgroundPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      backgroundPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
      void backgroundPromise.then(() => {
        backgroundSettled = true;
      });
    });
    await flush();
    expect(backgroundSettled).toBe(false);
    expect(hookState.autosaveCalls).toEqual([]);

    await React.act(async () => {
      restore.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-timer-R"),
        post: hookState.createPost("post-1", { title: "Restored timer R" }),
      });
      await Promise.all([restorePromise, backgroundPromise]);
    });
    expect(backgroundSettled).toBe(true);
    expect(view.current().title).toBe("Restored timer R");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(hookState.autosaveCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState propagates predecessor failure through restore and retries retained bytes", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const autosaveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  hookState.autosaveHandler = async () => autosaveA.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("A pending failure"));
    let aResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      aResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);
    let restoreResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      restoreResult = view
        .current()
        .restoreRevision("rev-failed")
        .catch((error) => error);
    });
    React.act(() => view.current().setTitle("C retained after failure"));
    let closeResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      closeResult = view
        .current()
        .flushLatestAutosave()
        .catch((error) => error);
    });

    const failure = hookState.apiError("A failed before restore");
    await React.act(async () => {
      autosaveA.reject(failure);
      await Promise.resolve();
    });
    await expect(aResult).resolves.toBe(failure);
    await expect(restoreResult).resolves.toBe(failure);
    await expect(closeResult).resolves.toBe(failure);
    expect(hookState.restoreCalls).toEqual([]);
    expect(view.current().title).toBe("C retained after failure");
    expect(view.current().hasUnsavedChanges).toBe(true);

    hookState.autosaveHandler = async (id, payload) =>
      autosaveResponse(hookState.applyPayload(hookState.createPost(id), payload));
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(2);
    expect(hookState.autosaveCalls[1]?.payload.title).toBe("C retained after failure");
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState stops Close after unmount without re-enqueueing a normalized response", async () => {
  const seed = hookState.createPost("post-1");
  const initial = hookState.createPost("post-1", {
    data: {
      ...(seed.data as Record<string, unknown>),
      opaqueServerData: { generation: "initial" },
    },
  });
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const deferred = createDeferred<ReturnType<typeof autosaveResponse>>();
  hookState.autosaveHandler = async () => deferred.promise;
  const view = mountHook();
  await waitFor(() => view.current().loading === false);
  React.act(() => {
    view.current().setTitle("unmounted pending");
    view.current().setSlug("unmounted-pending");
    view.current().setFeaturedImage("/media/unmounted-pending.png");
    view.current().updateBlockContent("block-1", {
      version: 1,
      nodes: [{ id: "node-unmounted", type: "paragraph", text: "unmounted request" }],
    });
  });
  let saveResult: Promise<unknown> = Promise.resolve();
  React.act(() => {
    saveResult = view
      .current()
      .flushLatestAutosave()
      .catch((error) => error);
  });
  await waitFor(() => hookState.autosaveCalls.length === 1);
  expect(hookState.updatePostCalls).toEqual([]);
  view.cleanup();
  const normalizedDocument = structuredClone(
    (hookState.autosaveCalls[0]?.payload.data as { document: unknown }).document
  ) as {
    blocks: Array<{ content?: unknown }>;
  };
  const firstBlock = normalizedDocument.blocks[0];
  if (!firstBlock) throw new Error("Missing normalized unmount block.");
  firstBlock.content = {
    version: 1,
    nodes: [{ id: "node-unmounted-normalized", type: "paragraph", text: "normalized late" }],
  };
  deferred.resolve(
    autosaveResponse(
      hookState.createPost("post-1", {
        title: "late normalized title",
        slug: "late-normalized-title",
        data: {
          ...(initial.data as Record<string, unknown>),
          opaqueServerData: { generation: "late-normalized" },
          featuredImage: "/media/late-normalized.png",
          document: normalizedDocument,
        },
      })
    )
  );
  await expect(saveResult).resolves.toMatchObject({
    code: "editor_identity_changed",
  });
  await flush(5);
  expect(hookState.autosaveCalls).toHaveLength(1);
  expect(hookState.updatePostCalls).toEqual([]);
  expect(hookState.updateMetadataCalls).toEqual([]);
});

test("usePostEditorState publish and unpublish keep status in sync with refresh", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().setTitle("Publish me");
    });

    await React.act(async () => {
      await view.current().publish();
    });
    await waitFor(() => view.current().status === "published");

    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.publishCalls).toEqual(["post-1"]);
    expect(view.current().status).toBe("published");

    await React.act(async () => {
      await view.current().unpublish();
    });
    await waitFor(() => view.current().status === "draft");

    expect(hookState.unpublishCalls).toEqual(["post-1"]);
    expect(view.current().status).toBe("draft");
  } finally {
    view.cleanup();
  }
});

test.each(["publish", "unpublish"] as const)(
  "usePostEditorState rejects %s when its final refresh crosses an editor session",
  async (action) => {
    const initialA = hookState.createPost("post-1", {
      status: action === "unpublish" ? "published" : "draft",
      publishedAt: action === "unpublish" ? "2026-03-12T11:00:00.000Z" : null,
    });
    const currentB = hookState.createPost("post-2", { title: "Current post B" });
    const finalRefreshA = createDeferred<PostDetail | null>();
    hookState.cachedPost = initialA;
    hookState.fetchedPost = initialA;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      const sessionA = view.current().editorSessionKey;
      const getCallsBeforeAction = hookState.getPostCalls.length;
      hookState.getPostHandler = async (id) => (id === "post-1" ? finalRefreshA.promise : currentB);
      let actionResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        const operation = action === "publish" ? view.current().publish : view.current().unpublish;
        actionResult = operation().catch((error) => error);
      });
      await waitFor(
        () =>
          (action === "publish"
            ? hookState.publishCalls.length === 1
            : hookState.unpublishCalls.length === 1) &&
          hookState.getPostCalls.length === getCallsBeforeAction + 1
      );

      hookState.cachedPost = null;
      hookState.path = "/admin/posts/post-2";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-2" &&
          view.current().title === "Current post B" &&
          view.current().loading === false
      );
      expect(view.current().editorSessionKey).not.toBe(sessionA);

      await React.act(async () => {
        finalRefreshA.resolve(initialA);
        await actionResult;
      });
      await expect(actionResult).resolves.toMatchObject({
        code: "editor_identity_changed",
      });
      expect(view.current().postId).toBe("post-2");
      expect(view.current().title).toBe("Current post B");
      expect(view.current().loading).toBe(false);
      expect(view.current().error).toBeNull();
      expect(view.current().autosaveError).toBeNull();
      expect(view.current().hasUnsavedChanges).toBe(false);
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState preview saves dirty state and reports preview api errors", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;
  hookState.nextPreviewError = hookState.apiError("Preview unavailable.");

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().setTitle("Preview draft");
    });

    await React.act(async () => {
      await view.current().preview();
    });
    await waitFor(() => view.current().previewLoading === false);

    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.previewCalls).toEqual([{ id: "post-1", ttl: 30 }]);
    expect(view.current().previewOpen).toBe(true);
    expect(view.current().previewError).toBe("Preview unavailable.");
    expect(view.current().previewUrl).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState exposes block editing callbacks and focus-token branches", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    const initialFocusToken = view.current().insertFocusToken;

    React.act(() => {
      view.current().insertBlock("not-a-real-block");
    });

    const fallbackBlockId = view.current().selectedBlock?.id ?? "";
    expect(view.current().selectedBlock?.type).toBe("writing-canvas");
    expect(view.current().insertFocusToken).toBe(initialFocusToken + 1);

    React.act(() => {
      view.current().insertBlock("paragraph", { focus: false });
    });
    expect(view.current().insertFocusToken).toBe(initialFocusToken + 1);

    React.act(() => {
      view.current().selectBlock(null);
      view.current().updateSelectedBlockContent("ignored");
      view.current().updateSelectedBlockAttrs({ align: "left" });
      view.current().deleteSelectedBlock();
      view.current().moveSelectedBlock("down");
      view.current().transformSelectedBlock("quote");
    });

    React.act(() => {
      view.current().selectBlock(fallbackBlockId);
      view.current().updateSelectedBlockContent({
        version: 1,
        nodes: [{ id: "node-2", type: "paragraph", text: "Updated" }],
      });
      view.current().updateSelectedBlockAttrs({ align: "center" });
      view.current().updateDocumentTypography({
        fontFamily: "mono",
        baseTextScale: "xl",
      });
      view.current().setExcerpt("Short summary");
      view.current().ensureDynamicTocBlock();
      view.current().moveBlockToIndex(fallbackBlockId, 0);
      view.current().transformBlock(fallbackBlockId, "quote");
      view.current().undo();
      view.current().redo();
    });

    expect(view.current().state.document.meta.typography).toEqual({
      fontFamily: "mono",
      baseTextScale: "xl",
    });
    expect(view.current().state.document.meta.excerpt).toBe("Short summary");
    expect(view.current().state.document.blocks.some((block) => block.type === "toc")).toBe(true);
    expect(view.current().state.document.blocks.some((block) => block.id === fallbackBlockId)).toBe(
      true
    );
    expect(view.current().canUndo).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState loads revisions and restores a revision", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;
  hookState.revisions = [hookState.createRevision("rev-1")];
  hookState.restoredPost = hookState.createPost("post-1", {
    title: "Restored title",
    updatedAt: "2026-03-12T14:00:00.000Z",
  });

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().openRevisions();
    });
    await waitFor(() => view.current().revisionsOpen === true);
    await waitFor(() => view.current().revisions.length === 1);

    await React.act(async () => {
      await view.current().restoreRevision("rev-1");
    });
    await waitFor(() => view.current().restoringRevisionId === null);

    expect(hookState.listRevisionCalls).toEqual(["post-1"]);
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "rev-1" }]);
    expect(view.current().title).toBe("Restored title");
    expect(view.current().revisionsError).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState reports restore and upload failures and handles move-to-trash outcomes", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    hookState.nextRestoreError = hookState.apiError("Restore failed.");
    await React.act(async () => {
      await expect(view.current().restoreRevision("rev-404")).rejects.toMatchObject({
        message: "Restore failed.",
      });
    });
    expect(view.current().revisionsError).toBe("Restore failed.");

    hookState.nextUploadError = hookState.apiError("Upload failed.");
    await expect(
      view
        .current()
        .uploadClipboardImage(new File(["image"], "clipboard.png", { type: "image/png" }))
    ).rejects.toThrow("Upload failed.");

    hookState.nextDeleteError = hookState.apiError("Delete failed.");
    await React.act(async () => {
      await expect(view.current().moveToTrash()).resolves.toBe(false);
    });
    expect(view.current().error).toBe("Delete failed.");

    await React.act(async () => {
      await expect(view.current().moveToTrash()).resolves.toBe(true);
    });
    expect(hookState.deleteCalls).toEqual(["post-1", "post-1"]);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState guards missing selected blocks, patches non-record attrs, and ignores duplicate delete requests in flight", async () => {
  hookState.cachedPost = hookState.createPost("post-1", {
    data: {
      featuredImage: "/media/hero.png",
      document: {
        version: 1,
        blocks: [
          {
            id: "paragraph-1",
            type: "paragraph",
            attrs: null,
            content: "Body",
          },
        ],
        meta: {},
      },
    },
  });
  hookState.fetchedPost = hookState.cachedPost;

  let resolveDelete: ((value: { ok: boolean }) => void) | null = null;
  vi.mocked(deletePost).mockImplementationOnce(async (id: string) => {
    hookState.deleteCalls.push(id);
    return await new Promise<{ ok: boolean }>((resolve) => {
      resolveDelete = resolve;
    });
  });

  const view = mountHook();
  let firstDeletePromise: Promise<boolean> | null = null;
  let finishDelete: ((value: { ok: boolean }) => void) | null = null;
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().updateSelectedBlockAttrs({ align: "center" });
    });
    expect(view.current().selectedBlock?.attrs).toMatchObject({ align: "center" });

    React.act(() => {
      view.current().selectBlock("missing-block");
    });
    expect(view.current().selectedBlock).toBeNull();

    React.act(() => {
      view.current().updateSelectedBlockContent("ignored");
      view.current().updateSelectedBlockAttrs({ width: "wide" });
      view.current().deleteSelectedBlock();
      view.current().moveSelectedBlock("up");
      view.current().transformSelectedBlock("quote");
    });

    await React.act(async () => {
      firstDeletePromise = view.current().moveToTrash();
      await Promise.resolve();
    });
    await waitFor(() => view.current().deletingPost === true);

    await React.act(async () => {
      await expect(view.current().moveToTrash()).resolves.toBe(false);
    });

    finishDelete = resolveDelete as unknown as ((value: { ok: boolean }) => void) | null;
    if (finishDelete) {
      finishDelete({ ok: true });
    }
    await React.act(async () => {
      await expect(firstDeletePromise).resolves.toBe(true);
    });

    expect(hookState.deleteCalls).toEqual(["post-1"]);
  } finally {
    if (finishDelete) {
      finishDelete({ ok: true });
    }
    if (firstDeletePromise) {
      await React.act(async () => {
        await firstDeletePromise;
      });
    }
    view.cleanup();
  }
});

test("usePostEditorState handles revision drawer toggles and generic async failure branches", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;
  hookState.revisions = [hookState.createRevision("rev-1")];

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().setRevisionsOpen(false);
    });
    expect(hookState.listRevisionCalls).toHaveLength(0);

    React.act(() => {
      view.current().setRevisionsOpen(true);
    });
    await waitFor(() => view.current().revisionsOpen === true);
    await waitFor(() => view.current().revisions.length === 1);

    hookState.nextRestoreError = new Error("restore exploded");
    await React.act(async () => {
      await expect(view.current().restoreRevision("rev-1")).rejects.toThrow("restore exploded");
    });
    expect(view.current().revisionsError).toBe("Failed to restore revision.");

    hookState.nextUploadError = new Error("upload exploded");
    await expect(
      view
        .current()
        .uploadClipboardImage(new File(["image"], "clipboard-generic.png", { type: "image/png" }))
    ).rejects.toThrow("upload exploded");

    hookState.nextDeleteError = new Error("delete exploded");
    await React.act(async () => {
      await expect(view.current().moveToTrash()).resolves.toBe(false);
    });
    expect(view.current().error).toBe("Failed to move post to trash.");
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState reports missing remote post, successful preview, and generic unpublish/revision failures", async () => {
  hookState.cachedPost = null;
  hookState.fetchedPost = null;

  const missingView = mountHook();
  try {
    await waitFor(() => missingView.current().loading === false);
    expect(missingView.current().error).toBe("Post not found.");
  } finally {
    missingView.cleanup();
  }

  hookState.reset();
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;
  hookState.revisions = [hookState.createRevision("rev-1")];

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    await React.act(async () => {
      await view.current().preview();
    });
    await waitFor(() => view.current().previewLoading === false);

    expect(view.current().previewOpen).toBe(true);
    expect(view.current().previewUrl).toBe("/preview/post-1");
    expect(view.current().previewError).toBeNull();

    hookState.nextUnpublishError = new Error("unpublish exploded");
    await React.act(async () => {
      await expect(view.current().unpublish()).rejects.toThrow("unpublish exploded");
    });
    expect(view.current().error).toBe("Failed to move post to draft.");

    hookState.nextRevisionsError = new Error("revisions exploded");
    React.act(() => {
      view.current().openRevisions();
    });
    await waitFor(() => view.current().revisionsError === "Failed to load post revisions.");
  } finally {
    view.cleanup();
  }
});
