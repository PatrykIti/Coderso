// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, vi } from "vitest";

import type {
  PostDetail,
  PostRevision,
  PostStatus,
} from "../../../core/admin/services/postsClient";

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
      ((id: string, options: { force?: boolean }) => Promise<PostDetail | null>) | null,
    updatePostHandler: null as
      ((id: string, payload: Record<string, unknown>) => Promise<PostDetail>) | null,
    updateMetadataHandler: null as
      ((id: string, payload: Record<string, unknown>) => Promise<PostDetail>) | null,
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

import { usePostEditorState } from "../../../core/admin/ui/posts/editor/hooks/usePostEditorState";

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

export {
  hookState,
  mountHook,
  invokeFailClosedServerCallbacks,
  expectFailClosedServerCallbacks,
  expectNoServerMutationTransports,
  flush,
  waitFor,
  createDeferred,
  autosaveResponse,
  createDistinctEnvelopePost,
  buildExpectedMetadataPayload,
};
