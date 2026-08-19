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
import type { PostDetail, PostRevision } from "../../../core/admin/services/postsClient";

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
