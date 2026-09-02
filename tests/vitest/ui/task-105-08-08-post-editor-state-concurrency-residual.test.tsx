// @vitest-environment happy-dom

// TASK-105-08-08-L02 residual suite: the post editor state hook's concurrency
// fail-closed contracts that the wave suites leave behind. Every case resolves
// or rejects a deferred admin-client transport at a real moment (navigation,
// unmount, barrier settlement) and asserts on the editor state the user can
// see or on the payloads that did and did not reach the client seams.
//   1. Navigating away rejects queued saves for the old session before they
//      ever reach the wire, while an in-flight save settles inertly.
//   2. An autosave that fires while the next post is still hydrating fails
//      closed instead of writing into the wrong session.
//   3. A failing authoritative barrier rejects saves admitted across it and
//      reports the reload failure.
//   4. A queued save fails closed when the editor unmounts before it
//      dispatches.
//   5. A reload that races a stale-session restore inherits the pending
//      potential write, defers to the server copy, and keeps deferring while
//      the restoration debt is unpaid.
//   6. Flushing the latest autosave across route epochs waits out the stale
//      in-flight save before re-sending the identical draft.
//   7. A revision list that settles after the route moved on is dropped.
//   8. A preview whose draft save settles after the route moved on never asks
//      for a preview.
//   9-11. Publish and unpublish fail closed when the session moves underneath
//      their transports.
//  12. A stale save that fails while a reload barrier and the close flush are
//      waiting on it poisons neither: the reload defers, the flush re-sends.
//  13. A hydration response that carries another post is refused.
//  14. A close flush over a draft that already matches the server waits out the
//      queued identical autosave instead of sending a duplicate.

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import { createDeferred, flush, hookState, mountHook, waitFor } from "./postEditorStateFixtures";
import * as postsClient from "../../../core/admin/services/postsClient";

type DeferredPost = ReturnType<typeof hookState.createPost>;
type DeferredAutosave = {
  post: DeferredPost;
  revision: ReturnType<typeof hookState.createRevision>;
  savedAt: string;
  reusedRevision: boolean;
};
type DeferredRevision = ReturnType<typeof hookState.createRevision>;

const mountEditor = async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;
  const view = mountHook();
  await waitFor(() => view.current().loading === false);
  return view;
};

const navigateToSecondPost = async (view: ReturnType<typeof mountHook>) => {
  const second = hookState.createPost("post-2", { title: "Second post", slug: "second-post" });
  hookState.cachedPost = second;
  hookState.fetchedPost = second;
  hookState.path = "/admin/posts/post-2?editor=writing";
  view.rerender();
  await waitFor(() => view.current().postId === "post-2" && view.current().loading === false);
};

const navigateBackToFirstPost = async (view: ReturnType<typeof mountHook>, post: DeferredPost) => {
  hookState.cachedPost = post;
  hookState.fetchedPost = post;
  hookState.path = "/admin/posts/post-1?editor=writing";
  view.rerender();
  await waitFor(() => view.current().postId === "post-1" && view.current().loading === false);
};

const editTitle = async (view: ReturnType<typeof mountHook>, title: string) => {
  await React.act(async () => {
    view.current().setTitle(title);
  });
  await flush();
};

afterEach(() => {
  vi.clearAllMocks();
  hookState.reset();
});

test("navigating away rejects queued saves for the old session and keeps them off the wire", async () => {
  const view = await mountEditor();
  try {
    const firstUpdate = createDeferred<DeferredPost>();
    hookState.updatePostHandler = () => firstUpdate.promise;
    await editTitle(view, "First edit");
    let firstSave: Promise<void> = Promise.resolve();
    await React.act(async () => {
      firstSave = view.current().saveDraft();
    });
    await flush();
    expect(hookState.updatePostCalls).toHaveLength(1);

    const autosaveDeferred = createDeferred<DeferredAutosave>();
    hookState.autosaveHandler = () => autosaveDeferred.promise;
    await editTitle(view, "Second edit");
    const autosaveOptions = hookState.autosaveOptions;
    if (!autosaveOptions) throw new Error("autosave options are unavailable");
    let queuedSave: Promise<void> = Promise.resolve();
    await React.act(async () => {
      queuedSave = autosaveOptions.onAutosave();
    });
    // The previous save still owns the wire, so this one only queues.
    await flush();
    expect(hookState.autosaveCalls).toEqual([]);

    const queuedRejection = expect(queuedSave).rejects.toMatchObject({
      code: "editor_identity_changed",
    });
    await navigateToSecondPost(view);
    await React.act(async () => {
      await queuedRejection;
    });
    expect(hookState.autosaveCalls).toEqual([]);

    // The in-flight save settles after the route moved on and lands nowhere.
    firstUpdate.resolve(hookState.createPost("post-1", { title: "Second edit" }));
    await React.act(async () => {
      await firstSave;
    });
    expect(view.current().title).toBe("Second post");
  } finally {
    view.cleanup();
  }
});

test("an autosave that fires while the next post is still hydrating fails closed", async () => {
  const view = await mountEditor();
  try {
    const secondGet = createDeferred<DeferredPost>();
    hookState.getPostHandler = () => secondGet.promise;
    const second = hookState.createPost("post-2", { title: "Second post", slug: "second-post" });
    hookState.cachedPost = second;
    hookState.fetchedPost = second;
    hookState.path = "/admin/posts/post-2?editor=writing";
    view.rerender();
    await flush();
    expect(view.current().postId).toBe("post-2");
    expect(view.current().loading).toBe(true);

    const hydratingAutosaveOptions = hookState.autosaveOptions;
    if (!hydratingAutosaveOptions) throw new Error("autosave options are unavailable");
    await React.act(async () => {
      await expect(hydratingAutosaveOptions.onAutosave()).rejects.toMatchObject({
        code: "editor_identity_changed",
      });
    });
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);

    secondGet.resolve(second);
    await waitFor(() => view.current().loading === false);
    expect(view.current().title).toBe("Second post");
  } finally {
    view.cleanup();
  }
});

test("a failing authoritative barrier rejects saves admitted across it", async () => {
  const view = await mountEditor();
  try {
    const reloadGet = createDeferred<DeferredPost>();
    hookState.getPostHandler = () => reloadGet.promise;
    let reloading: Promise<void> = Promise.resolve();
    await React.act(async () => {
      reloading = view.current().markReloadRemote();
    });
    await flush();

    const updateDeferred = createDeferred<DeferredPost>();
    hookState.updatePostHandler = () => updateDeferred.promise;
    await editTitle(view, "Edited across the barrier");
    let saving: Promise<void> = Promise.resolve();
    await React.act(async () => {
      saving = view.current().saveDraft();
    });
    await flush();
    expect(hookState.updatePostCalls).toEqual([]);

    reloadGet.reject(new Error("reload transport failed"));
    await React.act(async () => {
      await expect(saving).rejects.toThrow("reload transport failed");
      await expect(reloading).rejects.toThrow("reload transport failed");
    });
    expect(view.current().error).toBe("Failed to load post editor.");
    expect(hookState.updatePostCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("a queued save fails closed when the editor unmounts before it dispatches", async () => {
  const view = await mountEditor();
  const firstUpdate = createDeferred<DeferredPost>();
  hookState.updatePostHandler = () => firstUpdate.promise;
  await editTitle(view, "Unmount edit one");
  let firstSave: Promise<void> = Promise.resolve();
  await React.act(async () => {
    firstSave = view.current().saveDraft();
  });
  await flush();
  expect(hookState.updatePostCalls).toHaveLength(1);

  const autosaveDeferred = createDeferred<DeferredAutosave>();
  hookState.autosaveHandler = () => autosaveDeferred.promise;
  await editTitle(view, "Unmount edit two");
  const autosaveOptions = hookState.autosaveOptions;
  if (!autosaveOptions) throw new Error("autosave options are unavailable");
  let queuedSave: Promise<void> = Promise.resolve();
  await React.act(async () => {
    queuedSave = autosaveOptions.onAutosave();
  });
  // The first save still owns the wire, so this one only queues.
  await flush();
  expect(hookState.autosaveCalls).toEqual([]);

  const queuedRejection = expect(queuedSave).rejects.toMatchObject({
    code: "editor_identity_changed",
  });
  view.cleanup();
  firstUpdate.resolve(hookState.createPost("post-1", { title: "Unmount edit two" }));
  await React.act(async () => {
    await firstSave;
    await queuedRejection;
  });
  expect(hookState.autosaveCalls).toEqual([]);
});

test("a reload racing a stale restore defers while the restoration debt is unpaid", async () => {
  const view = await mountEditor();
  try {
    const restoreDeferred = createDeferred<{
      ok: boolean;
      restored: boolean;
      revision: DeferredRevision;
      post: DeferredPost;
    }>();
    hookState.restoreHandler = () => restoreDeferred.promise;
    let restoring: Promise<void> = Promise.resolve();
    await React.act(async () => {
      restoring = view.current().restoreRevision("rev-1");
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "rev-1" }]);

    await navigateToSecondPost(view);
    const backPost = hookState.createPost("post-1");
    await navigateBackToFirstPost(view, backPost);

    const reloadGet = createDeferred<DeferredPost>();
    hookState.getPostHandler = () => reloadGet.promise;
    let reloading: Promise<void> = Promise.resolve();
    await React.act(async () => {
      reloading = view.current().markReloadRemote();
    });
    await flush();

    // The stale-session restore settles while the reload transport is in
    // flight: the potential write lands without a watermark.
    restoreDeferred.resolve({
      ok: true,
      restored: true,
      revision: hookState.createRevision("rev-1"),
      post: backPost,
    });
    await React.act(async () => {
      await expect(restoring).rejects.toMatchObject({ code: "editor_identity_changed" });
    });

    reloadGet.resolve(backPost);
    await React.act(async () => {
      await reloading;
    });
    expect(view.current().remoteUpdatePending).toBe(true);
    expect(view.current().error).toBeNull();
    expect(view.current().title).toBe("Editor Post");

    // While the debt is unpaid, further reloads defer without a transport.
    const reloadsBefore = hookState.getPostCalls.length;
    hookState.getPostHandler = null;
    await React.act(async () => {
      await view.current().markReloadRemote();
    });
    expect(hookState.getPostCalls).toHaveLength(reloadsBefore);
    expect(view.current().remoteUpdatePending).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("flushing the latest autosave across route epochs waits out the stale save", async () => {
  const view = await mountEditor();
  try {
    const updateDeferred = createDeferred<DeferredPost>();
    hookState.updatePostHandler = () => updateDeferred.promise;
    await editTitle(view, "Renamed before leaving");
    let saving: Promise<void> = Promise.resolve();
    await React.act(async () => {
      saving = view.current().saveDraft();
    });
    await flush();
    expect(hookState.updatePostCalls).toHaveLength(1);

    const renamed = hookState.createPost("post-1", { title: "Renamed before leaving" });
    await navigateToSecondPost(view);
    await navigateBackToFirstPost(view, renamed);
    expect(view.current().title).toBe("Renamed before leaving");
    expect(view.current().hasUnsavedChanges).toBe(false);

    let flushing: Promise<void> = Promise.resolve();
    await React.act(async () => {
      flushing = view.current().flushLatestAutosave();
    });
    await flush();
    // The close flush parks behind the stale epoch-0 save: nothing is re-sent
    // while that transport is still on the wire.
    expect(hookState.autosaveCalls).toEqual([]);

    updateDeferred.resolve(renamed);
    await React.act(async () => {
      await flushing;
      await saving;
    });

    // Settling the stale save leaves restoration debt for this identity, so the
    // close flush re-sends the identical draft instead of assuming the server
    // already holds it.
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls).toHaveLength(1);
    const closePayload = hookState.autosaveCalls.at(0)?.payload;
    expect(closePayload?.title).toBe("Renamed before leaving");
    expect(closePayload?.data).toEqual(hookState.updatePostCalls.at(0)?.payload.data);
  } finally {
    view.cleanup();
  }
});

test("a stale save that fails under a waiting reload and close flush poisons neither", async () => {
  const view = await mountEditor();
  try {
    const updateDeferred = createDeferred<DeferredPost>();
    hookState.updatePostHandler = () => updateDeferred.promise;
    await editTitle(view, "Renamed before leaving");
    let saving: Promise<void> = Promise.resolve();
    await React.act(async () => {
      saving = view.current().saveDraft();
    });
    await flush();
    expect(hookState.updatePostCalls).toHaveLength(1);

    const renamed = hookState.createPost("post-1", { title: "Renamed before leaving" });
    await navigateToSecondPost(view);
    await navigateBackToFirstPost(view, renamed);

    // The close flush and the reload barrier both park behind the stale
    // epoch-0 save instead of racing it.
    const getsAfterReturn = hookState.getPostCalls.length;
    let flushing: Promise<void> = Promise.resolve();
    await React.act(async () => {
      flushing = view.current().flushLatestAutosave();
    });
    let reloading: Promise<void> = Promise.resolve();
    await React.act(async () => {
      reloading = view.current().markReloadRemote();
    });
    await flush();
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.getPostCalls).toHaveLength(getsAfterReturn);

    // The stale save's own failure is what releases them: the reload defers to
    // the server copy instead of writing across the debt, and the close flush
    // re-sends the identical draft.
    const staleFailure = expect(saving).rejects.toThrow("stale transport failed");
    updateDeferred.reject(new Error("stale transport failed"));
    await React.act(async () => {
      await flushing;
      await reloading;
    });
    await React.act(async () => {
      await staleFailure;
    });

    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.getPostCalls).toHaveLength(getsAfterReturn);
    expect(view.current().error).toBeNull();
    expect(hookState.autosaveCalls).toHaveLength(1);
    // The re-send's success also clears the reload's transient
    // remote-update-pending flag.
    expect(view.current().remoteUpdatePending).toBe(false);
    expect(view.current().title).toBe("Renamed before leaving");
    const closePayload = hookState.autosaveCalls.at(0)?.payload;
    expect(closePayload?.title).toBe("Renamed before leaving");
    expect(closePayload?.data).toEqual(hookState.updatePostCalls.at(0)?.payload.data);
  } finally {
    view.cleanup();
  }
});

test("the close flush waits out a queued identical autosave instead of re-sending it", async () => {
  const view = await mountEditor();
  try {
    const updateDeferred = createDeferred<DeferredPost>();
    hookState.updatePostHandler = () => updateDeferred.promise;
    await editTitle(view, "Transient title");
    let saving: Promise<void> = Promise.resolve();
    await React.act(async () => {
      saving = view.current().saveDraft();
    });
    await flush();
    expect(hookState.updatePostCalls).toHaveLength(1);

    // Reverting the title queues an identical autosave behind the in-flight
    // save instead of treating the draft as already persisted.
    const autosaveDeferred = createDeferred<DeferredAutosave>();
    hookState.autosaveHandler = () => autosaveDeferred.promise;
    await editTitle(view, "Editor Post");
    // The revert restored the persisted snapshot, so nothing is outstanding
    // from the editor's point of view.
    expect(view.current().hasUnsavedChanges).toBe(false);
    const autosaveOptions = hookState.autosaveOptions;
    if (!autosaveOptions) throw new Error("autosave options are unavailable");
    let queuedAutosave: Promise<void> = Promise.resolve();
    await React.act(async () => {
      queuedAutosave = autosaveOptions.onAutosave();
    });
    await flush();
    expect(hookState.autosaveCalls).toEqual([]);

    updateDeferred.resolve(hookState.createPost("post-1"));
    await React.act(async () => {
      await saving;
    });
    // Settling the superseded save leaves the draft matching the server.
    expect(view.current().hasUnsavedChanges).toBe(false);
    // The queue moves on to the identical autosave, which now owns the wire.
    expect(hookState.autosaveCalls).toHaveLength(1);

    let flushing: Promise<void> = Promise.resolve();
    await React.act(async () => {
      flushing = view.current().flushLatestAutosave();
    });
    await flush();
    // The draft already matches the server, so the close flush waits for the
    // queued identical autosave rather than sending a duplicate.
    expect(hookState.autosaveCalls).toHaveLength(1);

    autosaveDeferred.resolve({
      post: hookState.createPost("post-1"),
      revision: hookState.createRevision("rev-close"),
      savedAt: "2026-03-12T13:20:00.000Z",
      reusedRevision: false,
    });
    await React.act(async () => {
      await flushing;
      await queuedAutosave;
    });

    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls.at(0)?.payload.title).toBe("Editor Post");
    expect(view.current().title).toBe("Editor Post");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(view.current().autosaveError).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("a hydration response that carries another post is refused", async () => {
  const view = await mountEditor();
  try {
    hookState.getPostHandler = async () =>
      hookState.createPost("post-2", { title: "Wrong post", slug: "wrong-post" });
    await React.act(async () => {
      hookState.trigger("post:post-1");
    });
    await flush();

    // The mismatched payload never becomes the draft and raises no error.
    expect(view.current().postId).toBe("post-1");
    expect(view.current().title).toBe("Editor Post");
    expect(view.current().slug).toBe("editor-post");
    expect(view.current().error).toBeNull();
    expect(view.current().remoteUpdatePending).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("a revision list that settles after the route moved on is dropped", async () => {
  const view = await mountEditor();
  try {
    const revisionsDeferred = createDeferred<DeferredRevision[]>();
    vi.mocked(postsClient.listPostRevisionsCached).mockImplementationOnce(() => {
      hookState.listRevisionCalls.push("post-1");
      return revisionsDeferred.promise;
    });
    React.act(() => {
      view.current().openRevisions();
    });
    await flush();
    expect(view.current().revisionsLoading).toBe(true);
    expect(hookState.listRevisionCalls).toEqual(["post-1"]);

    await navigateToSecondPost(view);
    revisionsDeferred.resolve([hookState.createRevision("rev-1")]);
    await flush();

    expect(view.current().revisions).toEqual([]);
    expect(view.current().revisionsError).toBeNull();
    expect(view.current().revisionsLoading).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("a preview whose draft save settles after the route moved never asks for a preview", async () => {
  const view = await mountEditor();
  try {
    const updateDeferred = createDeferred<DeferredPost>();
    hookState.updatePostHandler = () => updateDeferred.promise;
    await editTitle(view, "Preview this edit");
    let previewing: Promise<void> = Promise.resolve();
    await React.act(async () => {
      previewing = view.current().preview();
    });
    await flush();
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.previewCalls).toEqual([]);
    expect(view.current().previewOpen).toBe(true);

    await navigateToSecondPost(view);
    updateDeferred.resolve(hookState.createPost("post-1", { title: "Preview this edit" }));
    await React.act(async () => {
      await previewing;
    });

    expect(hookState.previewCalls).toEqual([]);
    expect(view.current().previewOpen).toBe(false);
    expect(view.current().previewError).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("publish fails closed when its draft save settles after the route moved", async () => {
  const view = await mountEditor();
  try {
    const updateDeferred = createDeferred<DeferredPost>();
    hookState.updatePostHandler = () => updateDeferred.promise;
    await editTitle(view, "Publish after moving");
    let publishing: Promise<void> = Promise.resolve();
    await React.act(async () => {
      publishing = view.current().publish();
    });
    await flush();
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.publishCalls).toEqual([]);

    await navigateToSecondPost(view);
    updateDeferred.resolve(hookState.createPost("post-1", { title: "Publish after moving" }));
    await React.act(async () => {
      await expect(publishing).rejects.toMatchObject({ code: "editor_identity_changed" });
    });
    expect(hookState.publishCalls).toEqual([]);
    expect(view.current().error).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("publish fails closed when the publish transport settles after the route moved", async () => {
  const view = await mountEditor();
  try {
    await editTitle(view, "Publish across the move");
    const publishDeferred = createDeferred<{ ok: boolean }>();
    vi.mocked(postsClient.publishPost).mockImplementationOnce((id: string) => {
      hookState.publishCalls.push(id);
      return publishDeferred.promise;
    });
    let publishing: Promise<void> = Promise.resolve();
    await React.act(async () => {
      publishing = view.current().publish();
    });
    await flush();
    expect(hookState.publishCalls).toEqual(["post-1"]);

    await navigateToSecondPost(view);
    publishDeferred.resolve({ ok: true });
    await React.act(async () => {
      await expect(publishing).rejects.toMatchObject({ code: "editor_identity_changed" });
    });
    // The post-publish refresh never runs for the abandoned session.
    expect(hookState.getPostCalls.filter((call) => call.id === "post-1")).toHaveLength(1);
    expect(view.current().error).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("unpublish fails closed when the transport settles after the route moved", async () => {
  const view = await mountEditor();
  try {
    const unpublishDeferred = createDeferred<{ ok: boolean }>();
    vi.mocked(postsClient.unpublishPost).mockImplementationOnce((id: string) => {
      hookState.unpublishCalls.push(id);
      return unpublishDeferred.promise;
    });
    let unpublishing: Promise<void> = Promise.resolve();
    await React.act(async () => {
      unpublishing = view.current().unpublish();
    });
    await flush();
    expect(hookState.unpublishCalls).toEqual(["post-1"]);

    await navigateToSecondPost(view);
    unpublishDeferred.resolve({ ok: true });
    await React.act(async () => {
      await expect(unpublishing).rejects.toMatchObject({ code: "editor_identity_changed" });
    });
    expect(hookState.getPostCalls.filter((call) => call.id === "post-1")).toHaveLength(1);
    expect(view.current().error).toBeNull();
  } finally {
    view.cleanup();
  }
});
