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
