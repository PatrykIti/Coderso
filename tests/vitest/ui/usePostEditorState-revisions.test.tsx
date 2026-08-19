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

test("usePostEditorState suppresses a self cache refresh from restore and keeps later autosave enabled", async () => {
  const initial = hookState.createPost("post-1");
  const restored = hookState.createPost("post-1", { title: "Restored same identity" });
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    const getCallsBeforeRestore = hookState.getPostCalls.length;
    hookState.getPostHandler = async () =>
      Promise.reject(hookState.apiError("restore self GET failed"));
    hookState.restoreHandler = async () => {
      hookState.trigger("post:post-1");
      await Promise.resolve();
      await Promise.resolve();
      return {
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-self-event"),
        post: restored,
      };
    };

    await React.act(async () => {
      await view.current().restoreRevision("rev-self-event");
    });
    await flush();
    expect(hookState.getPostCalls).toHaveLength(getCallsBeforeRestore);
    expect(view.current().title).toBe("Restored same identity");
    expect(view.current().error).toBeNull();
    expect(view.current().remoteUpdatePending).toBe(false);
    expect(hookState.autosaveOptions?.enabled).toBe(true);

    hookState.getPostHandler = null;
    hookState.autosaveHandler = async (id, payload) =>
      autosaveResponse(hookState.applyPayload(hookState.createPost(id), payload));
    React.act(() => view.current().setTitle("autosave after restore self GET"));
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.autosaveCalls[0]?.payload.title).toBe("autosave after restore self GET");
    expect(view.current().error).toBeNull();
    expect(view.current().remoteUpdatePending).toBe(false);
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState queues an exact clean restoration behind a conflicting autosave", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const first = createDeferred<ReturnType<typeof autosaveResponse>>();
  const second = createDeferred<ReturnType<typeof autosaveResponse>>();
  let call = 0;
  hookState.autosaveHandler = async () => {
    call += 1;
    return call === 1 ? first.promise : second.promise;
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("dirty A"));
    let backgroundPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      backgroundPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    React.act(() => view.current().setTitle(initial.title));
    let closePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      closePromise = view.current().flushLatestAutosave();
    });
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(hookState.autosaveCalls).toHaveLength(1);

    await React.act(async () => {
      first.resolve(autosaveResponse(hookState.createPost("post-1", { title: "server A" })));
      await backgroundPromise;
    });
    await waitFor(() => hookState.autosaveCalls.length === 2);
    expect(hookState.autosaveCalls.map((entry) => entry.payload.title)).toEqual([
      "dirty A",
      initial.title,
    ]);
    expect(view.current().title).toBe(initial.title);

    await React.act(async () => {
      second.resolve(autosaveResponse(initial));
      await closePromise;
    });
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState manual restoration compares metadata with the successful predecessor", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const background = createDeferred<ReturnType<typeof autosaveResponse>>();
  hookState.autosaveHandler = async () => background.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTagsInput("changed by A"));
    let backgroundPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      backgroundPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    React.act(() => view.current().setTagsInput("alpha, beta"));
    let manualPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      manualPromise = view.current().saveDraft();
    });
    await React.act(async () => {
      background.resolve(
        autosaveResponse(hookState.createPost("post-1", { tags: ["changed by A"] }))
      );
      await backgroundPromise;
    });
    await waitFor(() => hookState.updateMetadataCalls.length === 1);
    expect(hookState.updateMetadataCalls[0]?.payload.tags).toEqual(["alpha", "beta"]);
    await React.act(async () => {
      await manualPromise;
    });
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState lets an authoritative restore hydrate after a normalized predecessor response", async () => {
  const seed = hookState.createPost("post-1");
  const initial = hookState.createPost("post-1", {
    data: {
      ...(seed.data as Record<string, unknown>),
      serverOpaque: { generation: "seed" },
    },
  });
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const saveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  const restoreR = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  hookState.autosaveHandler = async () => saveA.promise;
  hookState.restoreHandler = async () => restoreR.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle("A authored title");
      view.current().setSlug("a-authored-slug");
      view.current().setFeaturedImage("/media/a-authored.png");
      view.current().setTagsInput("a-authored-tag");
      view.current().setCategoryId("cat-a-authored");
      view.current().setSeoDraft({
        title: "A authored SEO",
        description: "A authored description",
        canonicalUrl: "https://example.com/a-authored",
        robots: "index,follow",
      });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-a-authored", type: "paragraph", text: "A authored document" }],
      });
    });
    const authoredDocumentA = structuredClone(view.current().state.document);
    let saveAPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      saveAPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    let restorePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      restorePromise = view.current().restoreRevision("rev-authoritative-r");
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([]);

    const normalizedDocumentA = structuredClone(authoredDocumentA);
    const normalizedBlockA = normalizedDocumentA.blocks[0];
    if (!normalizedBlockA) throw new Error("Missing normalized A block fixture.");
    normalizedBlockA.content = {
      version: 1,
      nodes: [
        {
          id: "node-a-normalized",
          type: "paragraph",
          text: "A server-normalized document",
        },
      ],
    };
    const normalizedA = hookState.createPost("post-1", {
      title: "A normalized title",
      slug: "a-normalized-slug",
      data: {
        ...(initial.data as Record<string, unknown>),
        serverOpaque: { generation: "a-normalized" },
        featuredImage: "/media/a-normalized.png",
        document: normalizedDocumentA,
      },
      tags: ["a-normalized-tag"],
      taxonomy: {
        category: {
          id: "cat-a-normalized",
          name: "A normalized category",
          slug: "a-normalized-category",
        },
        tags: [],
      },
      seo: {
        title: "A normalized SEO",
        description: "A normalized description",
        canonicalUrl: "https://example.com/a-normalized",
        robots: "noindex,follow",
      },
    });
    await React.act(async () => {
      saveA.resolve(autosaveResponse(normalizedA));
      await saveAPromise;
    });
    await waitFor(() => hookState.restoreCalls.length === 1);
    expect(normalizedA.data).not.toEqual(initial.data);
    expect(normalizedDocumentA).not.toEqual(authoredDocumentA);

    const restoredDocumentR = structuredClone(authoredDocumentA);
    const restoredBlockR = restoredDocumentR.blocks[0];
    if (!restoredBlockR) throw new Error("Missing restored R block fixture.");
    restoredBlockR.content = {
      version: 1,
      nodes: [
        {
          id: "node-r-authoritative",
          type: "paragraph",
          text: "R authoritative document",
        },
      ],
    };
    const restoredR = hookState.createPost("post-1", {
      title: "R authoritative title",
      slug: "r-authoritative-slug",
      data: {
        ...(initial.data as Record<string, unknown>),
        serverOpaque: { generation: "r-authoritative" },
        featuredImage: "/media/r-authoritative.png",
        document: restoredDocumentR,
      },
      tags: ["r-authoritative-tag"],
      taxonomy: {
        category: {
          id: "cat-r-authoritative",
          name: "R authoritative category",
          slug: "r-authoritative-category",
        },
        tags: [],
      },
      seo: {
        title: "R authoritative SEO",
        description: "R authoritative description",
        canonicalUrl: "https://example.com/r-authoritative",
        robots: "noindex,nofollow",
      },
    });
    await React.act(async () => {
      restoreR.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("rev-authoritative-r"),
        post: restoredR,
      });
      await restorePromise;
    });
    expect(view.current().title).toBe("R authoritative title");
    expect(view.current().slug).toBe("r-authoritative-slug");
    expect(view.current().featuredImage).toBe("/media/r-authoritative.png");
    expect(view.current().tagsInput).toBe("r-authoritative-tag");
    expect(view.current().categoryId).toBe("cat-r-authoritative");
    expect(view.current().seoDraft).toEqual({
      title: "R authoritative SEO",
      description: "R authoritative description",
      canonicalUrl: "https://example.com/r-authoritative",
      robots: "noindex,nofollow",
    });
    expect(view.current().state.document).toEqual(restoredDocumentR);
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

test("usePostEditorState propagates the first barrier failure to the next barrier and downstream save", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const restoreR1 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  hookState.restoreHandler = async (_id, revisionId) => {
    if (revisionId !== "rev-r1") {
      throw new Error(`Unexpected restore dispatch: ${revisionId}`);
    }
    return restoreR1.promise;
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    let r1Result: Promise<unknown> = Promise.resolve();
    React.act(() => {
      r1Result = view
        .current()
        .restoreRevision("rev-r1")
        .catch((error) => error);
    });
    await waitFor(() => hookState.restoreCalls.length === 1);

    let r2Result: Promise<unknown> = Promise.resolve();
    React.act(() => {
      r2Result = view
        .current()
        .restoreRevision("rev-r2")
        .catch((error) => error);
    });
    React.act(() => view.current().setTitle("downstream bytes after R2"));
    let downstreamSaveResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      downstreamSaveResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "rev-r1" }]);
    expect(hookState.autosaveCalls).toEqual([]);

    const failure = hookState.apiError("R1 authoritative failure");
    await React.act(async () => {
      restoreR1.reject(failure);
      await Promise.all([r1Result, r2Result, downstreamSaveResult]);
    });
    await expect(r1Result).resolves.toBe(failure);
    await expect(r2Result).resolves.toBe(failure);
    await expect(downstreamSaveResult).resolves.toBe(failure);
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "rev-r1" }]);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.updateMetadataCalls).toEqual([]);
    expect(view.current().title).toBe("downstream bytes after R2");
    expect(view.current().hasUnsavedChanges).toBe(true);
    expect(view.current().restoringRevisionId).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState preserves A R1 C R2 admission order when R1 fails", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const autosaveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  const restoreR1 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const wireOrder: string[] = [];
  hookState.autosaveHandler = async () => {
    wireOrder.push("A");
    return autosaveA.promise;
  };
  hookState.restoreHandler = async (_id, revisionId) => {
    wireOrder.push(revisionId);
    if (revisionId !== "R1") {
      throw new Error(`Unexpected restore dispatch: ${revisionId}`);
    }
    return restoreR1.promise;
  };
  hookState.updatePostHandler = async (id, payload) => {
    wireOrder.push("C");
    return hookState.applyPayload(hookState.createPost(id), payload);
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("A in flight"));
    let aResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      aResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);
    expect(wireOrder).toEqual(["A"]);

    let r1Result: Promise<unknown> = Promise.resolve();
    React.act(() => {
      r1Result = view
        .current()
        .restoreRevision("R1")
        .catch((error) => error);
    });
    React.act(() => view.current().setTitle("C queued after R1"));
    let cResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      cResult = view
        .current()
        .saveDraft()
        .catch((error) => error);
    });
    let r2Result: Promise<unknown> = Promise.resolve();
    React.act(() => {
      r2Result = view
        .current()
        .restoreRevision("R2")
        .catch((error) => error);
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(wireOrder).toEqual(["A"]);

    await React.act(async () => {
      autosaveA.resolve(autosaveResponse(hookState.createPost("post-1", { title: "A persisted" })));
      await aResult;
    });
    await expect(aResult).resolves.toBeUndefined();
    await waitFor(() => hookState.restoreCalls.length === 1);
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "R1" }]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(wireOrder).toEqual(["A", "R1"]);

    const failure = hookState.apiError("R1 failed after A");
    await React.act(async () => {
      restoreR1.reject(failure);
      await Promise.all([r1Result, cResult, r2Result]);
    });
    await expect(r1Result).resolves.toBe(failure);
    await expect(cResult).resolves.toBe(failure);
    await expect(r2Result).resolves.toBe(failure);
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "R1" }]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.updateMetadataCalls).toEqual([]);
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(wireOrder).toEqual(["A", "R1"]);
    expect(view.current().title).toBe("C queued after R1");
    expect(view.current().hasUnsavedChanges).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState completes A R1 C R2 success in physical admission order", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const autosaveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  const restoreR1 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const manualC = createDeferred<PostDetail>();
  const restoreR2 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const wireOrder: string[] = [];
  let manualCBaseResponse = initial;
  hookState.autosaveHandler = async () => {
    wireOrder.push("A");
    return autosaveA.promise;
  };
  hookState.restoreHandler = async (_id, revisionId) => {
    wireOrder.push(revisionId);
    if (revisionId === "R1") return restoreR1.promise;
    if (revisionId === "R2") return restoreR2.promise;
    throw new Error(`Unexpected restore dispatch: ${revisionId}`);
  };
  hookState.updatePostHandler = async () => {
    wireOrder.push("C");
    return manualC.promise;
  };
  hookState.updateMetadataHandler = async (_id, payload) => {
    wireOrder.push("C-metadata");
    return hookState.applyPayload(manualCBaseResponse, payload);
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("A in flight success"));
    let aPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      aPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    let r1Promise: Promise<void> = Promise.resolve();
    React.act(() => {
      r1Promise = view.current().restoreRevision("R1");
    });
    React.act(() => {
      view.current().setTitle("C exact payload");
      view.current().setSlug("c-exact-payload");
      view.current().setFeaturedImage("/media/c-exact-payload.png");
      view.current().setTagsInput("c-exact-one, c-exact-two");
      view.current().setCategoryId("cat-c-exact");
      view.current().setSeoDraft({
        title: "C exact SEO",
        description: "C exact description",
        canonicalUrl: "https://example.com/c-exact",
        robots: "noindex,follow",
      });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-c-exact", type: "paragraph", text: "C exact document" }],
      });
    });
    const documentC = structuredClone(view.current().state.document);
    const expectedCBase = {
      title: "C exact payload",
      slug: "c-exact-payload",
      data: {
        ...(initial.data as Record<string, unknown>),
        featuredImage: "/media/c-exact-payload.png",
        document: documentC,
      },
    };
    const expectedCMetadata = {
      tags: ["c-exact-one", "c-exact-two"],
      taxonomy: { categoryId: "cat-c-exact" },
      seo: {
        title: "C exact SEO",
        description: "C exact description",
        canonicalUrl: "https://example.com/c-exact",
        robots: "noindex,follow",
      },
    };
    let cPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      cPromise = view.current().saveDraft();
    });
    let r2Promise: Promise<void> = Promise.resolve();
    React.act(() => {
      r2Promise = view.current().restoreRevision("R2");
    });
    await flush();
    expect(wireOrder).toEqual(["A"]);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(hookState.restoreCalls).toEqual([]);

    await React.act(async () => {
      autosaveA.resolve(
        autosaveResponse(hookState.createPost("post-1", { title: "A persisted success" }))
      );
      await aPromise;
    });
    await waitFor(() => hookState.restoreCalls.length === 1);
    expect(wireOrder).toEqual(["A", "R1"]);
    expect(hookState.updatePostCalls).toEqual([]);

    await React.act(async () => {
      restoreR1.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("R1"),
        post: hookState.createPost("post-1", { title: "R1 persisted baseline" }),
      });
      await r1Promise;
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    expect(hookState.updatePostCalls[0]).toEqual({
      id: "post-1",
      payload: expectedCBase,
    });
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "R1" }]);
    expect(wireOrder).toEqual(["A", "R1", "C"]);

    await React.act(async () => {
      manualCBaseResponse = hookState.applyPayload(initial, expectedCBase);
      manualC.resolve(manualCBaseResponse);
      await cPromise;
    });
    expect(hookState.updateMetadataCalls).toEqual([{ id: "post-1", payload: expectedCMetadata }]);
    await waitFor(() => hookState.restoreCalls.length === 2);
    expect(hookState.restoreCalls).toEqual([
      { id: "post-1", revisionId: "R1" },
      { id: "post-1", revisionId: "R2" },
    ]);
    expect(wireOrder).toEqual(["A", "R1", "C", "C-metadata", "R2"]);

    await React.act(async () => {
      restoreR2.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("R2"),
        post: hookState.createPost("post-1", {
          title: "R2 final hydrate",
          slug: "r2-final-hydrate",
        }),
      });
      await r2Promise;
    });
    expect(view.current().title).toBe("R2 final hydrate");
    expect(view.current().slug).toBe("r2-final-hydrate");
    expect(view.current().hasUnsavedChanges).toBe(false);
    const writesBeforeClose = {
      autosave: hookState.autosaveCalls.length,
      update: hookState.updatePostCalls.length,
      metadata: hookState.updateMetadataCalls.length,
    };
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(writesBeforeClose.autosave);
    expect(hookState.updatePostCalls).toHaveLength(writesBeforeClose.update);
    expect(hookState.updateMetadataCalls).toHaveLength(writesBeforeClose.metadata);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState serializes concurrent successful restore barriers", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const restoreR1 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  const restoreR2 = createDeferred<{
    ok: boolean;
    restored: boolean;
    revision: PostRevision;
    post: PostDetail;
  }>();
  hookState.restoreHandler = async (_id, revisionId) => {
    if (revisionId === "R1-success") return restoreR1.promise;
    if (revisionId === "R2-success") return restoreR2.promise;
    throw new Error(`Unexpected restore dispatch: ${revisionId}`);
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    let r1Promise: Promise<void> = Promise.resolve();
    React.act(() => {
      r1Promise = view.current().restoreRevision("R1-success");
    });
    await waitFor(() => hookState.restoreCalls.length === 1);
    let r2Promise: Promise<void> = Promise.resolve();
    React.act(() => {
      r2Promise = view.current().restoreRevision("R2-success");
    });
    await flush();
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "R1-success" }]);
    expect(view.current().restoringRevisionId).toBe("R2-success");

    await React.act(async () => {
      restoreR1.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("R1-success"),
        post: hookState.createPost("post-1", { title: "R1 hydrated" }),
      });
      await r1Promise;
    });
    await waitFor(() => hookState.restoreCalls.length === 2);
    expect(hookState.restoreCalls).toEqual([
      { id: "post-1", revisionId: "R1-success" },
      { id: "post-1", revisionId: "R2-success" },
    ]);
    expect(view.current().title).toBe("R1 hydrated");
    expect(view.current().restoringRevisionId).toBe("R2-success");

    await React.act(async () => {
      restoreR2.resolve({
        ok: true,
        restored: true,
        revision: hookState.createRevision("R2-success"),
        post: hookState.createPost("post-1", { title: "R2 hydrated" }),
      });
      await r2Promise;
    });
    expect(view.current().title).toBe("R2 hydrated");
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(view.current().restoringRevisionId).toBeNull();
    expect(view.current().revisionsError).toBeNull();
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

    React.act(() => {
      view.current().openRevisions();
    });
    await waitFor(() => view.current().revisionsOpen === true);
    await waitFor(() => view.current().revisions.length === 1);

    await React.act(async () => {
      await view.current().restoreRevision("rev-1");
    });
    await waitFor(() => view.current().restoringRevisionId === null);

    expect(hookState.listRevisionCalls).toEqual(["post-1"]);
    expect(hookState.restoreCalls).toEqual([{ id: "post-1", revisionId: "rev-1" }]);
    expect(view.current().title).toBe("Restored title");
    expect(view.current().revisionsError).toBeNull();
  } finally {
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

    React.act(() => {
      view.current().setRevisionsOpen(false);
    });
    expect(hookState.listRevisionCalls).toHaveLength(0);

    React.act(() => {
      view.current().setRevisionsOpen(true);
    });
    await waitFor(() => view.current().revisionsOpen === true);
    await waitFor(() => view.current().revisions.length === 1);

    hookState.nextRestoreError = new Error("restore exploded");
    await React.act(async () => {
      await expect(view.current().restoreRevision("rev-1")).rejects.toThrow("restore exploded");
    });
    expect(view.current().revisionsError).toBe("Failed to restore revision.");

    hookState.nextUploadError = new Error("upload exploded");
    await expect(
      view
        .current()
        .uploadClipboardImage(new File(["image"], "clipboard-generic.png", { type: "image/png" }))
    ).rejects.toThrow("upload exploded");

    hookState.nextDeleteError = new Error("delete exploded");
    await React.act(async () => {
      await expect(view.current().moveToTrash()).resolves.toBe(false);
    });
    expect(view.current().error).toBe("Failed to move post to trash.");
  } finally {
    view.cleanup();
  }
});
