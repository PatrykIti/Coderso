// @vitest-environment happy-dom

import React from "react";
import { test, expect } from "vitest";
import {
  hookState,
  mountHook,
  flush,
  waitFor,
  createDeferred,
  autosaveResponse,
} from "./postEditorStateFixtures";
import type { PostDetail } from "../../../core/admin/services/postsClient";

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
