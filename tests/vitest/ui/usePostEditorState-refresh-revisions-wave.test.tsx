// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

import {
  autosaveResponse,
  createDeferred,
  flush,
  hookState,
  mountHook,
  waitFor,
} from "./postEditorStateFixtures";

test("usePostEditorState refresh surfaces not-found posts and defers remote updates for dirty drafts", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;

  const notFoundView = mountHook();
  try {
    await waitFor(() => notFoundView.current().loading === false);

    hookState.getPostHandler = async () => null;
    React.act(() => {
      hookState.trigger("post:post-1");
    });
    await waitFor(() => notFoundView.current().error === "Post not found.", 60);
    expect(notFoundView.current().post).not.toBeNull();
  } finally {
    notFoundView.cleanup();
  }

  hookState.getPostHandler = null;
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;

  const dirtyView = mountHook();
  try {
    await waitFor(() => dirtyView.current().loading === false);

    React.act(() => {
      dirtyView.current().setTitle("Dirty title");
    });
    React.act(() => {
      hookState.trigger("post:post-1");
    });
    await waitFor(() => dirtyView.current().remoteUpdatePending === true);
    expect(dirtyView.current().title).toBe("Dirty title");
  } finally {
    dirtyView.cleanup();
  }
});

test("usePostEditorState cache events load cached revisions and defer refreshes during persistence work", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  hookState.revisions = [hookState.createRevision("rev-1")];

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      hookState.trigger("post-revisions:post-1");
    });
    await waitFor(() => view.current().revisions.length === 1);
    expect(view.current().revisions[0]?.id).toBe("rev-1");

    const deferred = createDeferred<ReturnType<typeof autosaveResponse>>();
    hookState.updatePostHandler = (async () =>
      deferred.promise) as unknown as typeof hookState.updatePostHandler;
    React.act(() => {
      view.current().setTitle("In-flight save");
    });
    await React.act(async () => {
      void view.current().saveDraft();
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);

    React.act(() => {
      hookState.trigger("post:post-1");
    });
    await flush();
    expect(view.current().remoteUpdatePending).toBe(false);

    deferred.resolve(autosaveResponse(initial));
    await flush();
    await waitFor(() => {
      const current = view.current() as ReturnType<typeof view.current> & { saving?: boolean };
      return current.saving === false || current.autosaveSaving === false;
    });
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState falls back to JSON cloning when structuredClone is unavailable", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    vi.stubGlobal("structuredClone", undefined);
    React.act(() => {
      view.current().setTitle("Clone fallback");
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-1", type: "paragraph", text: "Cloned body" }],
      });
    });
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });

    expect(hookState.autosaveCalls.length).toBeGreaterThan(0);
    expect(view.current().title).toBe("Clone fallback");
  } finally {
    vi.unstubAllGlobals();
    view.cleanup();
  }
});
