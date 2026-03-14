// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { PostDetail, PostRevision, PostStatus } from "../../../core/admin/services/postsClient";
import { deletePost } from "../../../core/admin/services/postsClient";

type CacheEvent = { key: string };

const hookState = vi.hoisted(() => {
  const listeners = new Set<(event: CacheEvent) => void>();

  const createPost = (
    id = "post-1",
    overrides: Partial<PostDetail> = {}
  ): PostDetail => ({
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

  const createRevision = (
    id = "rev-1",
    overrides: Partial<PostRevision> = {}
  ): PostRevision => ({
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

  const applyPayload = (
    current: PostDetail,
    payload: Record<string, unknown>
  ): PostDetail => {
    const nextTags = Array.isArray(payload.tags)
      ? payload.tags.filter((value): value is string => typeof value === "string")
      : current.tags;
    const taxonomyPayload =
      payload.taxonomy && typeof payload.taxonomy === "object"
        ? (payload.taxonomy as { categoryId?: string | null })
        : undefined;
    const categoryId =
      taxonomyPayload && "categoryId" in taxonomyPayload
        ? taxonomyPayload.categoryId
        : undefined;
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
      seo: seoPayload ? { ...(current.seo ?? {}), ...seoPayload } : current.seo ?? null,
      taxonomy:
        categoryId === undefined
          ? current.taxonomy ?? null
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
    path: "/admin/coderso/posts/post-1?editor=writing",
    cachedPost: null as PostDetail | null,
    fetchedPost: null as PostDetail | null,
    restoredPost: null as PostDetail | null,
    revisions: [] as PostRevision[],
    autosaveOptions: null as
      | {
          enabled: boolean;
          dirty: boolean;
          signature: string;
          onAutosave: () => Promise<void>;
        }
      | null,
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
      state.path = "/admin/coderso/posts/post-1?editor=writing";
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
  },
}));

vi.mock("@/services/postsClient", () => ({
  getCachedPostDetail: (id: string) =>
    hookState.cachedPost && hookState.cachedPost.id === id ? hookState.cachedPost : null,
  getPostCached: vi.fn(async (id: string, { force }: { force?: boolean } = {}) => {
    hookState.getPostCalls.push({ id, force });
    if (hookState.nextGetError) {
      const error = hookState.nextGetError;
      hookState.nextGetError = null;
      throw error;
    }
    return hookState.fetchedPost;
  }),
  updatePost: vi.fn(async (id: string, payload: Record<string, unknown>) => {
    hookState.updatePostCalls.push({ id, payload });
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
  restorePostRevision: vi.fn(async (id: string, revisionId: string) => {
    hookState.restoreCalls.push({ id, revisionId });
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
        if (!options.enabled || !options.dirty) return false;
        await options.onAutosave();
        return true;
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

  act(() => {
    root.render(<Harness />);
  });

  return {
    current() {
      if (!latest.current) {
        throw new Error("Missing hook result.");
      }
      return latest.current;
    },
    cleanup() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async (times = 3) => {
  for (let index = 0; index < times; index += 1) {
    await act(async () => {
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
  hookState.path = "/admin/coderso/settings";

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    expect(view.current().postId).toBeNull();
    expect(view.current().error).toBe("Post ID is missing.");
    expect(hookState.getPostCalls).toEqual([]);
    expect(hookState.autosaveOptions?.enabled).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState decodes post ids from the route and treats /posts without an id as missing", async () => {
  hookState.path = "/admin/coderso/posts/post%202?editor=writing#details";
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
  hookState.path = "/admin/coderso/posts";

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

    act(() => {
      view.current().setTitle("Local draft title");
    });
    hookState.fetchedPost = hookState.createPost("post-1", {
      title: "Remote replacement",
      updatedAt: "2026-03-12T13:00:00.000Z",
    });

    await act(async () => {
      hookState.trigger("post:post-1");
      await Promise.resolve();
    });
    await waitFor(() => view.current().remoteUpdatePending === true);

    expect(view.current().title).toBe("Local draft title");

    await act(async () => {
      await view.current().markReloadRemote();
    });
    await waitFor(() => view.current().remoteUpdatePending === false);

    expect(view.current().title).toBe("Remote replacement");
    expect(view.current().lastSavedAt).toBe("2026-03-12T13:00:00.000Z");
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

    act(() => {
      view.current().setTitle("Autosaved title");
    });

    await act(async () => {
      await hookState.autosaveOptions?.onAutosave();
    });
    await waitFor(() => view.current().autosaveSaving === false);

    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(view.current().title).toBe("Autosaved title");
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().hasUnsavedChanges).toBe(false);

    act(() => {
      view.current().setTitle("Autosave failure");
    });
    hookState.nextAutosaveError = hookState.apiError("Autosave failed.");

    await act(async () => {
      await hookState.autosaveOptions?.onAutosave();
    });
    await waitFor(() => view.current().autosaveSaving === false);

    expect(view.current().autosaveError).toBe("Autosave failed.");
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

    act(() => {
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

    await act(async () => {
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

test("usePostEditorState publish and unpublish keep status in sync with refresh", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    act(() => {
      view.current().setTitle("Publish me");
    });

    await act(async () => {
      await view.current().publish();
    });
    await waitFor(() => view.current().status === "published");

    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.publishCalls).toEqual(["post-1"]);
    expect(view.current().status).toBe("published");

    await act(async () => {
      await view.current().unpublish();
    });
    await waitFor(() => view.current().status === "draft");

    expect(hookState.unpublishCalls).toEqual(["post-1"]);
    expect(view.current().status).toBe("draft");
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState preview saves dirty state and reports preview api errors", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;
  hookState.nextPreviewError = hookState.apiError("Preview unavailable.");

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    act(() => {
      view.current().setTitle("Preview draft");
    });

    await act(async () => {
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

    act(() => {
      view.current().insertBlock("not-a-real-block");
    });

    const fallbackBlockId = view.current().selectedBlock?.id ?? "";
    expect(view.current().selectedBlock?.type).toBe("writing-canvas");
    expect(view.current().insertFocusToken).toBe(initialFocusToken + 1);

    act(() => {
      view.current().insertBlock("paragraph", { focus: false });
    });
    expect(view.current().insertFocusToken).toBe(initialFocusToken + 1);

    act(() => {
      view.current().selectBlock(null);
      view.current().updateSelectedBlockContent("ignored");
      view.current().updateSelectedBlockAttrs({ align: "left" });
      view.current().deleteSelectedBlock();
      view.current().moveSelectedBlock("down");
      view.current().transformSelectedBlock("quote");
    });

    act(() => {
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

    act(() => {
      view.current().openRevisions();
    });
    await waitFor(() => view.current().revisionsOpen === true);
    await waitFor(() => view.current().revisions.length === 1);

    await act(async () => {
      await view.current().restoreRevision("rev-1");
    });
    await waitFor(() => view.current().restoringRevisionId === null);

    expect(hookState.listRevisionCalls.length).toBeGreaterThanOrEqual(2);
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
    await act(async () => {
      await expect(view.current().restoreRevision("rev-404")).rejects.toMatchObject({
        message: "Restore failed.",
      });
    });
    expect(view.current().revisionsError).toBe("Restore failed.");

    hookState.nextUploadError = hookState.apiError("Upload failed.");
    await expect(
      view.current().uploadClipboardImage(
        new File(["image"], "clipboard.png", { type: "image/png" })
      )
    ).rejects.toThrow("Upload failed.");

    hookState.nextDeleteError = hookState.apiError("Delete failed.");
    await act(async () => {
      await expect(view.current().moveToTrash()).resolves.toBe(false);
    });
    expect(view.current().error).toBe("Delete failed.");

    await act(async () => {
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
  try {
    await waitFor(() => view.current().loading === false);

    act(() => {
      view.current().updateSelectedBlockAttrs({ align: "center" });
    });
    expect(view.current().selectedBlock?.attrs).toMatchObject({ align: "center" });

    act(() => {
      view.current().selectBlock("missing-block");
    });
    expect(view.current().selectedBlock).toBeNull();

    act(() => {
      view.current().updateSelectedBlockContent("ignored");
      view.current().updateSelectedBlockAttrs({ width: "wide" });
      view.current().deleteSelectedBlock();
      view.current().moveSelectedBlock("up");
      view.current().transformSelectedBlock("quote");
    });

    await act(async () => {
      firstDeletePromise = view.current().moveToTrash();
      await Promise.resolve();
    });
    await waitFor(() => view.current().deletingPost === true);

    await act(async () => {
      await expect(view.current().moveToTrash()).resolves.toBe(false);
    });

    resolveDelete?.({ ok: true });
    await act(async () => {
      await expect(firstDeletePromise).resolves.toBe(true);
    });

    expect(hookState.deleteCalls).toEqual(["post-1"]);
  } finally {
    if (resolveDelete) {
      resolveDelete({ ok: true });
    }
    if (firstDeletePromise) {
      await act(async () => {
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

    act(() => {
      view.current().setRevisionsOpen(false);
    });
    expect(hookState.listRevisionCalls).toHaveLength(0);

    act(() => {
      view.current().setRevisionsOpen(true);
    });
    await waitFor(() => view.current().revisionsOpen === true);
    await waitFor(() => view.current().revisions.length === 1);

    hookState.nextRestoreError = new Error("restore exploded");
    await act(async () => {
      await expect(view.current().restoreRevision("rev-1")).rejects.toThrow("restore exploded");
    });
    expect(view.current().revisionsError).toBe("Failed to restore revision.");

    hookState.nextUploadError = new Error("upload exploded");
    await expect(
      view.current().uploadClipboardImage(
        new File(["image"], "clipboard-generic.png", { type: "image/png" })
      )
    ).rejects.toThrow("upload exploded");

    hookState.nextDeleteError = new Error("delete exploded");
    await act(async () => {
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

    await act(async () => {
      await view.current().preview();
    });
    await waitFor(() => view.current().previewLoading === false);

    expect(view.current().previewOpen).toBe(true);
    expect(view.current().previewUrl).toBe("/preview/post-1");
    expect(view.current().previewError).toBeNull();

    hookState.nextUnpublishError = new Error("unpublish exploded");
    await act(async () => {
      await expect(view.current().unpublish()).rejects.toThrow("unpublish exploded");
    });
    expect(view.current().error).toBe("Failed to move post to draft.");

    hookState.nextRevisionsError = new Error("revisions exploded");
    act(() => {
      view.current().openRevisions();
    });
    await waitFor(() => view.current().revisionsError === "Failed to load post revisions.");
  } finally {
    view.cleanup();
  }
});
