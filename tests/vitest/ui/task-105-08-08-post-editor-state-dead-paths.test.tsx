// @vitest-environment happy-dom

// TASK-105-08-08-L04 regression suite: drives the public usePostEditorState()
// hook (mounted through the shared fixtures harness) with deferred real client
// responses to pin the contract-scoped dead-path removals and the module split:
//   1. valid refresh — mount hydration installs the fetched post, and a
//      forced background refresh applies newer content without ever flipping
//      the visible loading flag (the removed `setLoading` option paths).
//   2. stale completion rejection — a refresh that completes after the route
//      identity changed must not write any editor state.
//   3. equal-snapshot coalescing — two manual saves of the same unchanged
//      draft revision coalesce onto one queued record and one transport call
//      (the former conflicting-byte rejection at the same key was proven
//      structurally impossible and removed).
//   4. visible dirty/error state — local edits surface hasUnsavedChanges and
//      the autosave scheduler dirty flag; a failing manual save surfaces the
//      server error copy while the draft stays dirty.
// The suite never imports or invokes the extracted private module helpers.

import React from "react";
import { expect, test } from "vitest";

import {
  createDeferred,
  createDistinctEnvelopePost,
  flush,
  hookState,
  mountHook,
  waitFor,
} from "./postEditorStateFixtures";

test("task-105-08-08 usePostEditorState mount hydration and background refresh apply valid responses without loading churn", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    expect(view.current().post?.id).toBe("post-1");
    expect(view.current().title).toBe("Editor Post");
    expect(view.current().canMutatePost).toBe(true);
    expect(view.current().hasUnsavedChanges).toBe(false);

    const refreshed = createDistinctEnvelopePost("post-1", "refreshed");
    const deferredRefresh = createDeferred<typeof refreshed | null>();
    hookState.getPostHandler = () => deferredRefresh.promise;

    React.act(() => {
      hookState.trigger("post:post-1");
    });
    await waitFor(() => hookState.getPostCalls.some((call) => call.force === true));

    // The forced background refresh stays pending while the visible loading
    // flag must remain false for the whole request (the removed `setLoading`
    // option wrote nothing on this path before the split either).
    expect(
      hookState.getPostCalls.filter((call) => call.id === "post-1" && call.force === true).length
    ).toBeGreaterThanOrEqual(1);
    expect(view.current().loading).toBe(false);

    deferredRefresh.resolve(refreshed);
    await waitFor(() => view.current().title === "refreshed title");
    expect(view.current().slug).toBe("refreshed");
    expect(view.current().post?.id).toBe("post-1");
    expect(view.current().loading).toBe(false);
    expect(view.current().error).toBeNull();
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(view.current().remoteUpdatePending).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("task-105-08-08 usePostEditorState rejects refresh completions that arrive after the route identity changed", async () => {
  const stalePost = createDistinctEnvelopePost("post-1", "hydrate-stale");
  const nextPost = createDistinctEnvelopePost("post-2", "hydrate-fresh");
  const deferredStale = createDeferred<typeof stalePost | null>();
  hookState.getPostHandler = (id) =>
    id === "post-1" ? deferredStale.promise : Promise.resolve(nextPost);

  const view = mountHook();
  try {
    await waitFor(() =>
      hookState.getPostCalls.some((call) => call.id === "post-1" && call.force === true)
    );
    expect(view.current().loading).toBe(true);

    // Flip the route to another post while the post-1 hydration is pending.
    hookState.path = "/admin/posts/post-2?editor=writing";
    view.rerender();
    await waitFor(() => view.current().post?.id === "post-2");
    expect(view.current().title).toBe("hydrate-fresh title");
    expect(view.current().loading).toBe(false);

    // The stale completion must be discarded: no state writes, no error, and
    // the fresh session remains authoritative.
    deferredStale.resolve(stalePost);
    await flush(5);
    expect(view.current().post?.id).toBe("post-2");
    expect(view.current().title).toBe("hydrate-fresh title");
    expect(view.current().slug).toBe("hydrate-fresh");
    expect(view.current().error).toBeNull();
    expect(view.current().loading).toBe(false);
    expect(view.current().remoteUpdatePending).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("task-105-08-08 usePostEditorState coalesces equal-snapshot manual saves onto one queued revision", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().setTitle("Coalesced title");
    });
    expect(view.current().hasUnsavedChanges).toBe(true);

    // Two manual saves in the same tick capture the same (identity, epoch,
    // revision) target with identical snapshot bytes. The second admission
    // must coalesce onto the existing queued record instead of rejecting or
    // dispatching a second transport write.
    let firstResult: PromiseSettledResult<void> = { status: "fulfilled", value: undefined };
    let secondResult: PromiseSettledResult<void> = { status: "fulfilled", value: undefined };
    await React.act(async () => {
      const first = view.current().saveDraft();
      const second = view.current().saveDraft();
      [firstResult, secondResult] = await Promise.allSettled([first, second]);
    });

    expect(firstResult.status).toBe("fulfilled");
    expect(secondResult.status).toBe("fulfilled");
    await waitFor(() => view.current().hasUnsavedChanges === false);
    expect(hookState.updatePostCalls.length).toBe(1);
    expect(hookState.updatePostCalls[0]?.id).toBe("post-1");
    expect(hookState.updatePostCalls[0]?.payload.title).toBe("Coalesced title");
    expect(view.current().error).toBeNull();
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().lastSavedAt).toBe("2026-03-12T12:00:00.000Z");

    // A follow-up save of the now-persisted draft performs no further write.
    await React.act(async () => {
      await view.current().saveDraft();
    });
    expect(hookState.updatePostCalls.length).toBe(1);
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("task-105-08-08 usePostEditorState keeps dirty and save-failure state visible through the split queue", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(hookState.autosaveOptions?.enabled).toBe(true);
    expect(hookState.autosaveOptions?.dirty).toBe(false);

    React.act(() => {
      view.current().setTitle("Edited title");
    });
    expect(view.current().title).toBe("Edited title");
    expect(view.current().hasUnsavedChanges).toBe(true);
    expect(hookState.autosaveOptions?.dirty).toBe(true);

    const savedAtBeforeFailure = view.current().lastSavedAt;
    hookState.nextUpdateError = hookState.apiError("Save rejected by server.");
    await React.act(async () => {
      await expect(view.current().saveDraft()).rejects.toThrow("Save rejected by server.");
    });

    expect(view.current().error).toBe("Save rejected by server.");
    expect(view.current().hasUnsavedChanges).toBe(true);
    expect(view.current().title).toBe("Edited title");
    expect(view.current().lastSavedAt).toBe(savedAtBeforeFailure);
    expect(hookState.updatePostCalls.length).toBe(1);
    expect(hookState.updatePostCalls[0]?.payload.title).toBe("Edited title");

    // Recovering with a healthy transport clears the error and persists the
    // still-dirty draft (one failed attempt plus one successful retry).
    await React.act(async () => {
      await view.current().saveDraft();
    });
    await waitFor(() => view.current().hasUnsavedChanges === false);
    expect(view.current().error).toBeNull();
    expect(hookState.updatePostCalls.length).toBe(2);
    expect(hookState.updatePostCalls[1]?.payload.title).toBe("Edited title");
  } finally {
    view.cleanup();
  }
});
