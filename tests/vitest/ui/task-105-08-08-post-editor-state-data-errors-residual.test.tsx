// @vitest-environment happy-dom

// TASK-105-08-08-L02 residual suite: the post editor state hook's error and
// payload contracts that the wave suites leave behind. Every case drives the
// real hook through the shared fixtures harness and resolves or rejects the
// deferred admin-client transports, then asserts on visible editor state or
// the payload that actually reached a client seam.
//   1. Publish failures surface the transport copy for api client errors and
//      the generic copy for anything else.
//   2. The preview dialog open/close control stays live for a real session.
//   3. Clipboard uploads resolve with the media payload, and an upload that
//      settles after the route moved on fails closed without touching state.
//   4. Document normalization keeps paragraphs with foreign attributes and
//      leaves multi-block non-canvas documents untouched.
//   5. A publish-time refresh that starts across an in-flight autosave stays
//      stale instead of clobbering the draft.
//   6. A refresh whose transport fails is dropped when local work appeared,
//      and otherwise commits the load-failure copy.
//   7. A reload that comes back empty reports the missing-post copy.
//   8. Revision load failures surface the transport copy.
//   9. Preview failures surface the generic copy, and a preview that settles
//      after the route moved on is dropped.
//  10. A draft save that fails with a non-transport error uses the generic
//      draft copy.
//  11. An edit typed while the initial hydration is still in flight defers
//      the load to the local draft.

import React from "react";
import { afterEach, expect, test, vi } from "vitest";

import { createDeferred, flush, hookState, mountHook, waitFor } from "./postEditorStateFixtures";
import { normalizeEditorDocumentForWritingFlow } from "../../../core/admin/ui/posts/editor/hooks/postEditorStateDocument";
import * as mediaClient from "../../../core/admin/services/mediaClient";
import * as postsClient from "../../../core/admin/services/postsClient";

type DeferredUpload = {
  id: string;
  key: string;
  url: string;
  type: "image" | "file";
  mimeType: string;
  size: number;
  createdAt: string;
};

const clipboardFile = () => new File(["image"], "clipboard.png", { type: "image/png" });

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

test("publish failures surface the transport copy and the generic publish copy", async () => {
  const view = await mountEditor();
  try {
    await editTitle(view, "Publish these edits");
    hookState.nextPublishError = hookState.apiError("Publish rejected by the transport.");
    await React.act(async () => {
      await expect(view.current().publish()).rejects.toMatchObject({ code: "request_failed" });
    });
    expect(view.current().error).toBe("Publish rejected by the transport.");
    expect(hookState.publishCalls).toEqual(["post-1"]);
    expect(hookState.updatePostCalls).toHaveLength(1);

    hookState.nextPublishError = new Error("publish exploded");
    await React.act(async () => {
      await expect(view.current().publish()).rejects.toThrow("publish exploded");
    });
    expect(view.current().error).toBe("Failed to publish post.");
    expect(hookState.publishCalls).toEqual(["post-1", "post-1"]);
  } finally {
    view.cleanup();
  }
});

test("the preview dialog control opens and closes for a live session", async () => {
  const view = await mountEditor();
  try {
    React.act(() => {
      view.current().setPreviewOpen(true);
    });
    expect(view.current().previewOpen).toBe(true);

    React.act(() => {
      view.current().setPreviewOpen(false);
    });
    expect(view.current().previewOpen).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("clipboard uploads resolve with the media payload and fail closed once the route moved", async () => {
  const view = await mountEditor();
  try {
    await React.act(async () => {
      await expect(view.current().uploadClipboardImage(clipboardFile())).resolves.toEqual({
        id: "media-clipboard",
        key: "uploads/clipboard.png",
        url: "/media/clipboard.png",
      });
    });
    expect(hookState.uploadCalls).toHaveLength(1);

    const deferred = createDeferred<DeferredUpload>();
    vi.mocked(mediaClient.uploadClipboardImage).mockImplementationOnce((file: File) => {
      hookState.uploadCalls.push(file);
      return deferred.promise;
    });
    let uploading: Promise<{ id: string; key: string; url: string }> = Promise.resolve({
      id: "",
      key: "",
      url: "",
    });
    await React.act(async () => {
      uploading = view.current().uploadClipboardImage(clipboardFile());
    });
    await flush();
    await navigateToSecondPost(view);

    deferred.resolve({
      id: "media-late",
      key: "uploads/late.png",
      url: "/media/late.png",
      type: "image",
      mimeType: "image/png",
      size: 4,
      createdAt: "2026-03-12T13:10:00.000Z",
    });
    await React.act(async () => {
      await expect(uploading).rejects.toMatchObject({ code: "editor_identity_changed" });
    });
    expect(hookState.uploadCalls).toHaveLength(2);
    expect(view.current().error).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("document normalization keeps attributed paragraphs and foreign multi-block documents", () => {
  const canvasBlock = {
    id: "canvas",
    type: "writing-canvas",
    attrs: {},
    content: { version: 1, nodes: [{ id: "node-1", type: "paragraph", text: "Body" }] },
  };

  // A paragraph carrying a meaningful layout attribute survives the
  // leading-empty-paragraph cleanup in front of the writing canvas.
  const attributed = normalizeEditorDocumentForWritingFlow({
    document: {
      version: 1,
      blocks: [
        { id: "lead", type: "paragraph", attrs: { align: "center" }, content: "" },
        canvasBlock,
      ],
      meta: {},
    },
  });
  expect(attributed.blocks.map((block) => block.id)).toEqual(["lead", "canvas"]);

  // Without the attribute the same paragraph is empty and is dropped.
  const dropped = normalizeEditorDocumentForWritingFlow({
    document: {
      version: 1,
      blocks: [{ id: "lead", type: "paragraph", attrs: {}, content: "" }, canvasBlock],
      meta: {},
    },
  });
  expect(dropped.blocks.map((block) => block.id)).toEqual(["canvas"]);

  // A multi-block document without a writing canvas is returned untouched.
  const foreign = normalizeEditorDocumentForWritingFlow({
    document: {
      version: 1,
      blocks: [
        { id: "heading", type: "heading", attrs: {}, content: "Title" },
        { id: "body", type: "paragraph", attrs: {}, content: "Body" },
      ],
      meta: {},
    },
  });
  expect(foreign.blocks.map((block) => block.id)).toEqual(["heading", "body"]);
});

test("a publish-time refresh that starts across an in-flight autosave stays stale", async () => {
  const view = await mountEditor();
  try {
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

    const autosaveDeferred = createDeferred<{
      post: ReturnType<typeof hookState.createPost>;
      revision: ReturnType<typeof hookState.createRevision>;
      savedAt: string;
      reusedRevision: boolean;
    }>();
    hookState.autosaveHandler = () => autosaveDeferred.promise;
    await editTitle(view, "Edited while publishing");
    const autosaveOptions = hookState.autosaveOptions;
    if (!autosaveOptions) throw new Error("autosave options are unavailable");
    let autosaving: Promise<void> = Promise.resolve();
    await React.act(async () => {
      autosaving = autosaveOptions.onAutosave();
    });
    await flush();
    expect(hookState.autosaveCalls).toHaveLength(1);

    publishDeferred.resolve({ ok: true });
    await React.act(async () => {
      await publishing;
    });

    // The refresh saw the queued autosave, stayed stale, and never replaced the
    // draft with the server copy.
    expect(view.current().error).toBeNull();
    expect(view.current().title).toBe("Edited while publishing");
    expect(hookState.getPostCalls.at(-1)).toMatchObject({ id: "post-1", force: true });

    autosaveDeferred.resolve({
      post: hookState.createPost("post-1", { title: "Edited while publishing" }),
      revision: hookState.createRevision("rev-published"),
      savedAt: "2026-03-12T13:00:00.000Z",
      reusedRevision: false,
    });
    await React.act(async () => {
      await autosaving;
    });
    expect(view.current().autosaveError).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("a failing refresh is dropped when local work appeared and commits the copy otherwise", async () => {
  const view = await mountEditor();
  try {
    const getDeferred = createDeferred<ReturnType<typeof hookState.createPost>>();
    hookState.getPostHandler = () => getDeferred.promise;
    const autosaveDeferred = createDeferred<{
      post: ReturnType<typeof hookState.createPost>;
      revision: ReturnType<typeof hookState.createRevision>;
      savedAt: string;
      reusedRevision: boolean;
    }>();
    hookState.autosaveHandler = () => autosaveDeferred.promise;

    await React.act(async () => {
      hookState.trigger("post:post-1");
    });
    await flush();
    await editTitle(view, "Edited during the refresh");
    const autosaveOptions = hookState.autosaveOptions;
    if (!autosaveOptions) throw new Error("autosave options are unavailable");
    let autosaving: Promise<void> = Promise.resolve();
    await React.act(async () => {
      autosaving = autosaveOptions.onAutosave();
    });
    await flush();
    expect(hookState.autosaveCalls).toHaveLength(1);

    getDeferred.reject(hookState.apiError("Remote index offline"));
    await flush();

    // The refresh failure is stale: the autosave appeared mid-flight, so no
    // error is committed and the draft keeps editing.
    expect(view.current().error).toBeNull();
    expect(view.current().title).toBe("Edited during the refresh");

    autosaveDeferred.resolve({
      post: hookState.createPost("post-1", { title: "Edited during the refresh" }),
      revision: hookState.createRevision("rev-refresh"),
      savedAt: "2026-03-12T13:05:00.000Z",
      reusedRevision: false,
    });
    await React.act(async () => {
      await autosaving;
    });

    // With no local work in flight the same failure is committed verbatim.
    hookState.getPostHandler = null;
    hookState.nextGetError = hookState.apiError("Remote index offline");
    await React.act(async () => {
      hookState.trigger("post:post-1");
    });
    await waitFor(() => view.current().error === "Remote index offline");
  } finally {
    view.cleanup();
  }
});

test("a cache-event refresh defers while the draft has unsaved work", async () => {
  const view = await mountEditor();
  try {
    hookState.getPostHandler = async () => hookState.createPost("post-1", { title: "Server copy" });
    await editTitle(view, "Local edit wins for now");
    await React.act(async () => {
      hookState.trigger("post:post-1");
    });
    await flush();

    // The refresh saw the dirty draft and deferred instead of clobbering it.
    expect(view.current().remoteUpdatePending).toBe(true);
    expect(view.current().title).toBe("Local edit wins for now");
    expect(view.current().error).toBeNull();
    expect(hookState.getPostCalls.at(-1)).toMatchObject({ id: "post-1", force: true });
  } finally {
    view.cleanup();
  }
});

test("a reload that comes back empty reports the missing-post copy", async () => {
  const view = await mountEditor();
  try {
    hookState.getPostHandler = async () => null;
    await React.act(async () => {
      await view.current().markReloadRemote();
    });
    expect(view.current().error).toBe("Post not found.");
    expect(hookState.getPostCalls.at(-1)).toMatchObject({ id: "post-1", force: true });
  } finally {
    view.cleanup();
  }
});

test("revision load failures surface the transport copy and clear the spinner", async () => {
  const view = await mountEditor();
  try {
    hookState.nextRevisionsError = hookState.apiError("Revisions are offline.");
    React.act(() => {
      view.current().openRevisions();
    });
    await waitFor(() => view.current().revisionsError === "Revisions are offline.");
    expect(hookState.listRevisionCalls).toEqual(["post-1"]);
    expect(view.current().revisionsLoading).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("preview failures use the generic copy and stale previews are dropped", async () => {
  const view = await mountEditor();
  try {
    hookState.nextPreviewError = new Error("preview exploded");
    await React.act(async () => {
      await view.current().preview();
    });
    expect(view.current().previewError).toBe("Failed to generate post preview.");
    expect(view.current().previewOpen).toBe(true);
    expect(hookState.previewCalls).toEqual([{ id: "post-1", ttl: 30 }]);

    const previewDeferred = createDeferred<{
      token: string;
      previewUrl: string;
      expiresAt: string;
    }>();
    vi.mocked(postsClient.previewPost).mockImplementationOnce((id: string, ttl?: number) => {
      hookState.previewCalls.push({ id, ttl: ttl ?? 30 });
      return previewDeferred.promise;
    });
    let previewing: Promise<void> = Promise.resolve();
    await React.act(async () => {
      previewing = view.current().preview();
    });
    await flush();
    await navigateToSecondPost(view);

    previewDeferred.resolve({
      token: "preview-token",
      previewUrl: "/preview/post-1",
      expiresAt: "2026-03-12T13:30:00.000Z",
    });
    await React.act(async () => {
      await previewing;
    });

    // The stale preview transport ran, but its result is dropped and the new
    // session starts clean.
    expect(hookState.previewCalls).toEqual([
      { id: "post-1", ttl: 30 },
      { id: "post-1", ttl: 30 },
    ]);
    expect(view.current().postId).toBe("post-2");
    expect(view.current().previewOpen).toBe(false);
    expect(view.current().previewError).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("an edit typed during the initial hydration defers the load to the local draft", async () => {
  const serverCopy = hookState.createPost("post-1", { title: "Server copy" });
  hookState.cachedPost = serverCopy;
  hookState.fetchedPost = serverCopy;
  const getDeferred = createDeferred<ReturnType<typeof hookState.createPost>>();
  hookState.getPostHandler = () => getDeferred.promise;

  const view = mountHook();
  try {
    await flush();

    // The editor is mounted on the cached copy while the forced hydration is
    // still on the wire; typing into it must not be clobbered by the response.
    React.act(() => {
      view.current().setTitle("Local edit wins");
    });
    await flush();

    getDeferred.resolve(hookState.createPost("post-1", { title: "Server copy" }));
    await flush();

    expect(view.current().remoteUpdatePending).toBe(true);
    expect(view.current().title).toBe("Local edit wins");
    expect(view.current().error).toBeNull();
    expect(hookState.getPostCalls.at(-1)).toMatchObject({ id: "post-1", force: true });
  } finally {
    view.cleanup();
  }
});

test("a draft save that fails outside the transport uses the generic draft copy", async () => {
  const view = await mountEditor();
  try {
    await editTitle(view, "Save this draft");
    hookState.updatePostHandler = async () => {
      throw new Error("save exploded");
    };
    await React.act(async () => {
      await expect(view.current().saveDraft()).rejects.toThrow("save exploded");
    });
    expect(view.current().error).toBe("Failed to save post draft.");
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(view.current().state.saving).toBe(false);
  } finally {
    view.cleanup();
  }
});
