// @vitest-environment happy-dom

import React from "react";
import { test, expect, vi } from "vitest";
import {
  hookState,
  mountHook,
  invokeFailClosedServerCallbacks,
  expectFailClosedServerCallbacks,
  expectNoServerMutationTransports,
  flush,
  waitFor,
  createDeferred,
  autosaveResponse,
} from "./postEditorStateFixtures";
import type { PostDetail } from "../../../core/admin/services/postsClient";
import { deletePost } from "../../../core/admin/services/postsClient";

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
