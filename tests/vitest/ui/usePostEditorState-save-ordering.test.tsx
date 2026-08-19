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

test("usePostEditorState preserves A to manual B to Close C wire order and exact waiter ownership", async () => {
  const seed = hookState.createPost("post-1");
  const initial = hookState.createPost("post-1", {
    data: {
      ...(seed.data as Record<string, unknown>),
      retainedBaseData: { sentinel: "seed" },
    },
  });
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const autosaveA = createDeferred<ReturnType<typeof autosaveResponse>>();
  const autosaveC = createDeferred<ReturnType<typeof autosaveResponse>>();
  const manualB = createDeferred<PostDetail>();
  let autosaveCall = 0;
  hookState.autosaveHandler = async () => {
    autosaveCall += 1;
    return autosaveCall === 1 ? autosaveA.promise : autosaveC.promise;
  };
  hookState.updatePostHandler = async () => manualB.promise;
  let manualBBaseResponse = initial;
  hookState.updateMetadataHandler = async (_id, payload) =>
    hookState.applyPayload(manualBBaseResponse, payload);
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle("A title");
      view.current().setSlug("a-slug");
      view.current().setFeaturedImage("/media/a.png");
      view.current().setTagsInput("a-tag-one, a-tag-two");
      view.current().setCategoryId("cat-a");
      view.current().setSeoDraft({
        title: "A SEO",
        description: "A description",
        canonicalUrl: "https://example.com/a",
        robots: "index,follow",
      });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-a", type: "paragraph", text: "A document bytes" }],
      });
    });
    const documentA = structuredClone(view.current().state.document);
    const expectedA = {
      title: "A title",
      slug: "a-slug",
      data: {
        ...(initial.data as Record<string, unknown>),
        featuredImage: "/media/a.png",
        document: documentA,
      },
      tags: ["a-tag-one", "a-tag-two"],
      taxonomy: { categoryId: "cat-a" },
      seo: {
        title: "A SEO",
        description: "A description",
        canonicalUrl: "https://example.com/a",
        robots: "index,follow",
      },
    };
    let aPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      aPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);
    expect(hookState.autosaveCalls[0]).toEqual({ id: "post-1", payload: expectedA });

    React.act(() => {
      view.current().setTitle("B title");
      view.current().setSlug("b-slug");
      view.current().setFeaturedImage("/media/b.png");
      view.current().setTagsInput("b-tag-one, b-tag-two");
      view.current().setCategoryId("cat-b");
      view.current().setSeoDraft({
        title: "B SEO",
        description: "B description",
        canonicalUrl: "https://example.com/b",
        robots: "noindex,nofollow",
      });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-b", type: "paragraph", text: "B document bytes" }],
      });
    });
    const documentB = structuredClone(view.current().state.document);
    const expectedBBase = {
      title: "B title",
      slug: "b-slug",
      data: {
        ...(initial.data as Record<string, unknown>),
        featuredImage: "/media/b.png",
        document: documentB,
      },
    };
    const expectedBMetadata = {
      tags: ["b-tag-one", "b-tag-two"],
      taxonomy: { categoryId: "cat-b" },
      seo: {
        title: "B SEO",
        description: "B description",
        canonicalUrl: "https://example.com/b",
        robots: "noindex,nofollow",
      },
    };
    let manualSettled = false;
    let bPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      bPromise = view
        .current()
        .saveDraft()
        .then(() => {
          manualSettled = true;
        });
    });
    React.act(() => {
      view.current().setTitle("C title");
      view.current().setSlug("c-slug");
      view.current().setFeaturedImage("/media/c.png");
      view.current().setTagsInput("c-tag-one, c-tag-two");
      view.current().setCategoryId("cat-c");
      view.current().setSeoDraft({
        title: "C SEO",
        description: "C description",
        canonicalUrl: "https://example.com/c",
        robots: "index,nofollow",
      });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "node-c", type: "paragraph", text: "C document bytes" }],
      });
      view.current().insertBlock("heading");
    });
    const documentC = structuredClone(view.current().state.document);
    const expectedC = {
      title: "C title",
      slug: "c-slug",
      data: {
        ...(initial.data as Record<string, unknown>),
        featuredImage: "/media/c.png",
        document: documentC,
      },
      tags: ["c-tag-one", "c-tag-two"],
      taxonomy: { categoryId: "cat-c" },
      seo: {
        title: "C SEO",
        description: "C description",
        canonicalUrl: "https://example.com/c",
        robots: "index,nofollow",
      },
    };
    const cSelection = view.current().state.selectedBlockId;
    const cHistoryLength = view.current().state.history.past.length;
    let cPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      cPromise = view.current().flushLatestAutosave();
    });
    expect(hookState.updatePostCalls).toEqual([]);

    await React.act(async () => {
      autosaveA.resolve(autosaveResponse(hookState.applyPayload(initial, expectedA)));
      await aPromise;
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    expect(manualSettled).toBe(false);
    expect(hookState.updatePostCalls[0]).toEqual({
      id: "post-1",
      payload: expectedBBase,
    });
    expect(view.current().title).toBe("C title");
    expect(view.current().state.selectedBlockId).toBe(cSelection);
    expect(view.current().state.history.past).toHaveLength(cHistoryLength);

    await React.act(async () => {
      manualBBaseResponse = hookState.applyPayload(initial, expectedBBase);
      manualB.resolve(manualBBaseResponse);
      await bPromise;
    });
    expect(manualSettled).toBe(true);
    expect(hookState.updateMetadataCalls[0]).toEqual({
      id: "post-1",
      payload: expectedBMetadata,
    });
    await waitFor(() => hookState.autosaveCalls.length === 2);
    expect(hookState.autosaveCalls[1]).toEqual({ id: "post-1", payload: expectedC });
    expect(view.current().title).toBe("C title");
    expect(view.current().state.selectedBlockId).toBe(cSelection);
    expect(view.current().state.history.past).toHaveLength(cHistoryLength);
    expect(view.current().hasUnsavedChanges).toBe(true);

    await React.act(async () => {
      autosaveC.resolve(autosaveResponse(hookState.applyPayload(initial, expectedC)));
      await cPromise;
    });
    expect(hookState.autosaveCalls).toEqual([
      { id: "post-1", payload: expectedA },
      { id: "post-1", payload: expectedC },
    ]);
    expect(hookState.updatePostCalls).toEqual([{ id: "post-1", payload: expectedBBase }]);
    expect(hookState.updateMetadataCalls).toEqual([{ id: "post-1", payload: expectedBMetadata }]);
    expect(view.current().title).toBe("C title");
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test.each(["manual", "autosave"] as const)(
  "usePostEditorState derives %s baselines from normalized current and older responses",
  async (transport) => {
    const seed = hookState.createPost("post-1");
    const initial = hookState.createPost("post-1", {
      data: {
        ...(seed.data as Record<string, unknown>),
        retainedBaseData: { generation: "seed" },
      },
    });
    hookState.cachedPost = initial;
    hookState.fetchedPost = initial;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      React.act(() => {
        view.current().setTitle(`${transport} current request`);
        view.current().setSlug(`${transport}-current-request`);
        view.current().setFeaturedImage(`/media/${transport}-current-request.png`);
        view.current().setTagsInput(`${transport}-request-tag`);
        view.current().setCategoryId(`cat-${transport}-request`);
        view.current().setSeoDraft({
          title: `${transport} request SEO`,
          description: `${transport} request description`,
          canonicalUrl: `https://example.com/${transport}-request`,
          robots: "index,follow",
        });
        view.current().updateBlockContent("block-1", {
          version: 1,
          nodes: [
            {
              id: `node-${transport}-request`,
              type: "paragraph",
              text: `${transport} current request document`,
            },
          ],
        });
      });
      const currentRequestDocument = structuredClone(view.current().state.document);
      const currentResponseDocument = structuredClone(currentRequestDocument);
      const currentResponseBlock = currentResponseDocument.blocks[0];
      if (!currentResponseBlock) throw new Error("Missing response block fixture.");
      currentResponseBlock.content = {
        version: 1,
        nodes: [
          {
            id: `node-${transport}-server-current`,
            type: "paragraph",
            text: `${transport} server-normalized current document`,
          },
        ],
      };
      const currentResponse = hookState.createPost("post-1", {
        title: `${transport} normalized current`,
        slug: `${transport}-normalized-current`,
        data: {
          ...(initial.data as Record<string, unknown>),
          retainedBaseData: { generation: `${transport}-server-current` },
          serverOnlyBaseData: { transport, response: "current" },
          featuredImage: `/media/${transport}-server-current.png`,
          document: currentResponseDocument,
        },
        tags: [`${transport}-canonical-current`],
        taxonomy: {
          category: {
            id: `cat-${transport}-canonical-current`,
            name: `${transport} canonical current`,
            slug: `${transport}-canonical-current`,
          },
          tags: [],
        },
        seo: {
          title: `${transport} canonical current SEO`,
          description: `${transport} canonical current description`,
          canonicalUrl: `https://example.com/${transport}-canonical-current`,
          robots: "noindex,follow",
        },
      });
      if (transport === "manual") {
        hookState.updatePostHandler = async () => currentResponse;
        hookState.updateMetadataHandler = async () => currentResponse;
      } else {
        hookState.autosaveHandler = async () => autosaveResponse(currentResponse);
      }

      await React.act(async () => {
        if (transport === "manual") await view.current().saveDraft();
        else await (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve());
      });
      expect(view.current().title).toBe(`${transport} normalized current`);
      expect(view.current().slug).toBe(`${transport}-normalized-current`);
      expect(view.current().featuredImage).toBe(`/media/${transport}-server-current.png`);
      expect(view.current().tagsInput).toBe(`${transport}-canonical-current`);
      expect(view.current().categoryId).toBe(`cat-${transport}-canonical-current`);
      expect(view.current().seoDraft).toEqual({
        title: `${transport} canonical current SEO`,
        description: `${transport} canonical current description`,
        canonicalUrl: `https://example.com/${transport}-canonical-current`,
        robots: "noindex,follow",
      });
      expect(view.current().state.document).toEqual(currentResponseDocument);
      expect(view.current().state.document).not.toEqual(currentRequestDocument);
      expect(currentResponse.data).not.toEqual(initial.data);
      expect(currentResponse.data).toMatchObject({
        retainedBaseData: { generation: `${transport}-server-current` },
        serverOnlyBaseData: { transport, response: "current" },
      });
      expect(view.current().hasUnsavedChanges).toBe(false);
      const currentWriteCounts = {
        autosave: hookState.autosaveCalls.length,
        update: hookState.updatePostCalls.length,
        metadata: hookState.updateMetadataCalls.length,
      };
      await React.act(async () => {
        await view.current().flushLatestAutosave();
      });
      expect(hookState.autosaveCalls).toHaveLength(currentWriteCounts.autosave);
      expect(hookState.updatePostCalls).toHaveLength(currentWriteCounts.update);
      expect(hookState.updateMetadataCalls).toHaveLength(currentWriteCounts.metadata);

      React.act(() => {
        view.current().setTitle(`${transport} captured older request`);
        view.current().setSlug(`${transport}-captured-older-request`);
        view.current().setFeaturedImage(`/media/${transport}-captured-older.png`);
        view.current().setTagsInput(`${transport}-captured-older-tag`);
        view.current().setCategoryId(`cat-${transport}-captured-older`);
        view.current().setSeoDraft({
          title: `${transport} captured older SEO`,
          description: `${transport} captured older description`,
          canonicalUrl: `https://example.com/${transport}-captured-older`,
          robots: "index,nofollow",
        });
        view.current().updateBlockContent("block-1", {
          version: 1,
          nodes: [
            {
              id: `node-${transport}-captured-older`,
              type: "paragraph",
              text: `${transport} captured older document`,
            },
          ],
        });
      });
      const capturedOlderDocument = structuredClone(view.current().state.document);
      const newerResponse = hookState.createPost("post-1", {
        title: `${transport} normalized older response`,
        slug: `${transport}-normalized-older-response`,
        data: {
          ...(currentResponse.data as Record<string, unknown>),
          retainedBaseData: { generation: `${transport}-server-older-response` },
          serverOnlyBaseData: { transport, response: "older" },
          featuredImage: `/media/${transport}-server-older.png`,
          document: currentResponseDocument,
        },
        tags: [`${transport}-canonical-older`],
        taxonomy: {
          category: {
            id: `cat-${transport}-canonical-older`,
            name: `${transport} canonical older`,
            slug: `${transport}-canonical-older`,
          },
          tags: [],
        },
        seo: {
          title: `${transport} canonical older SEO`,
          description: `${transport} canonical older description`,
          canonicalUrl: `https://example.com/${transport}-canonical-older`,
          robots: "noindex,nofollow",
        },
      });
      const deferredManual = createDeferred<PostDetail>();
      const deferredAutosave = createDeferred<ReturnType<typeof autosaveResponse>>();
      if (transport === "manual") {
        hookState.updatePostHandler = async () => deferredManual.promise;
        hookState.updateMetadataHandler = async () => newerResponse;
      } else {
        hookState.autosaveHandler = async () => deferredAutosave.promise;
      }
      let olderSavePromise: Promise<void> = Promise.resolve();
      React.act(() => {
        olderSavePromise =
          transport === "manual"
            ? view.current().saveDraft()
            : (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve());
      });
      await waitFor(() =>
        transport === "manual"
          ? hookState.updatePostCalls.length === currentWriteCounts.update + 1
          : hookState.autosaveCalls.length === currentWriteCounts.autosave + 1
      );

      React.act(() => {
        view.current().setTitle(`${transport} newer live title`);
        view.current().setSlug(`${transport}-newer-live-slug`);
        view.current().setFeaturedImage(`/media/${transport}-newer-live.png`);
        view.current().setTagsInput(`${transport}-newer-live-tag`);
        view.current().setCategoryId(`cat-${transport}-newer-live`);
        view.current().setSeoDraft({
          title: `${transport} newer live SEO`,
          description: `${transport} newer live description`,
          canonicalUrl: `https://example.com/${transport}-newer-live`,
          robots: "index,follow",
        });
        view.current().updateBlockContent("block-1", {
          version: 1,
          nodes: [
            {
              id: `node-${transport}-newer-live`,
              type: "paragraph",
              text: `${transport} newer live document`,
            },
          ],
        });
      });
      const newerLiveDocument = structuredClone(view.current().state.document);
      const newerHistoryLength = view.current().state.history.past.length;

      await React.act(async () => {
        if (transport === "manual") deferredManual.resolve(newerResponse);
        else deferredAutosave.resolve(autosaveResponse(newerResponse));
        await olderSavePromise;
      });
      expect(view.current().title).toBe(`${transport} newer live title`);
      expect(view.current().slug).toBe(`${transport}-newer-live-slug`);
      expect(view.current().featuredImage).toBe(`/media/${transport}-newer-live.png`);
      expect(view.current().tagsInput).toBe(`${transport}-newer-live-tag`);
      expect(view.current().categoryId).toBe(`cat-${transport}-newer-live`);
      expect(view.current().state.document).toEqual(newerLiveDocument);
      expect(view.current().state.history.past).toHaveLength(newerHistoryLength);
      expect(view.current().hasUnsavedChanges).toBe(true);
      expect(newerResponse.data).not.toEqual(initial.data);
      expect(newerResponse.data).not.toEqual(currentResponse.data);
      expect(newerResponse.data).toMatchObject({
        retainedBaseData: { generation: `${transport}-server-older-response` },
        serverOnlyBaseData: { transport, response: "older" },
      });
      expect(newerResponse.data).toMatchObject({ document: currentResponseDocument });
      expect(currentResponseDocument).not.toEqual(capturedOlderDocument);

      React.act(() => {
        view.current().setTitle(`${transport} normalized older response`);
        view.current().setSlug(`${transport}-normalized-older-response`);
        view.current().setFeaturedImage(`/media/${transport}-server-older.png`);
        view.current().setTagsInput(`${transport}-canonical-older`);
        view.current().setCategoryId(`cat-${transport}-canonical-older`);
        view.current().setSeoDraft({
          title: `${transport} canonical older SEO`,
          description: `${transport} canonical older description`,
          canonicalUrl: `https://example.com/${transport}-canonical-older`,
          robots: "noindex,nofollow",
        });
        view.current().undo();
        view.current().undo();
      });
      expect(view.current().state.document).toEqual(currentResponseDocument);
      expect(view.current().hasUnsavedChanges).toBe(false);
      const finalWriteCounts = {
        autosave: hookState.autosaveCalls.length,
        update: hookState.updatePostCalls.length,
        metadata: hookState.updateMetadataCalls.length,
      };
      await React.act(async () => {
        await view.current().flushLatestAutosave();
      });
      expect(hookState.autosaveCalls).toHaveLength(finalWriteCounts.autosave);
      expect(hookState.updatePostCalls).toHaveLength(finalWriteCounts.update);
      expect(hookState.updateMetadataCalls).toHaveLength(finalWriteCounts.metadata);
    } finally {
      view.cleanup();
    }
  }
);

test.each(["success", "failure"] as const)(
  "usePostEditorState keeps autosave as first owner when manual Save and Close join its exact target on %s",
  async (outcome) => {
    const initial = hookState.createPost("post-1");
    hookState.cachedPost = initial;
    hookState.fetchedPost = initial;
    const autosave = createDeferred<ReturnType<typeof autosaveResponse>>();
    hookState.autosaveHandler = async () => autosave.promise;
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      React.act(() => {
        view.current().setTitle("one autosave-owned exact target");
        view.current().setSlug("one-autosave-owned-exact-target");
      });
      let autosaveResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        autosaveResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
          (error) => error
        );
      });
      await waitFor(() => hookState.autosaveCalls.length === 1);

      let manualResult: Promise<unknown> = Promise.resolve();
      let closeResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        manualResult = view
          .current()
          .saveDraft()
          .catch((error) => error);
        closeResult = view
          .current()
          .flushLatestAutosave()
          .catch((error) => error);
      });
      await flush();
      expect(hookState.autosaveCalls).toHaveLength(1);
      expect(hookState.updatePostCalls).toEqual([]);
      expect(hookState.updateMetadataCalls).toEqual([]);

      const failure = hookState.apiError("shared autosave owner failed");
      await React.act(async () => {
        if (outcome === "success") {
          autosave.resolve(
            autosaveResponse(
              hookState.createPost("post-1", {
                title: "one autosave-owned exact target",
                slug: "one-autosave-owned-exact-target",
              })
            )
          );
        } else {
          autosave.reject(failure);
        }
        await Promise.all([autosaveResult, manualResult, closeResult]);
      });
      if (outcome === "success") {
        await expect(autosaveResult).resolves.toBeUndefined();
        await expect(manualResult).resolves.toBeUndefined();
        await expect(closeResult).resolves.toBeUndefined();
        expect(view.current().hasUnsavedChanges).toBe(false);
      } else {
        await expect(autosaveResult).resolves.toBe(failure);
        await expect(manualResult).resolves.toBe(failure);
        await expect(closeResult).resolves.toBe(failure);
        expect(view.current().hasUnsavedChanges).toBe(true);
      }
      expect(hookState.autosaveCalls).toHaveLength(1);
      expect(hookState.updatePostCalls).toEqual([]);
      expect(hookState.updateMetadataCalls).toEqual([]);
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState coalesces manual and Close for one target under first-owner transport", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const manual = createDeferred<PostDetail>();
  hookState.updatePostHandler = async () => manual.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("shared target"));
    let manualPromise: Promise<void> = Promise.resolve();
    let closePromise: Promise<void> = Promise.resolve();
    React.act(() => {
      manualPromise = view.current().saveDraft();
      closePromise = view.current().flushLatestAutosave();
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    expect(hookState.autosaveCalls).toEqual([]);

    await React.act(async () => {
      manual.resolve(hookState.createPost("post-1", { title: "shared target" }));
      await Promise.all([manualPromise, closePromise]);
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState shares an active manual failure with Close and retries without duplicate transport", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const manual = createDeferred<PostDetail>();
  hookState.updatePostHandler = async () => manual.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("manual failure bytes"));
    let manualResult: Promise<unknown> = Promise.resolve();
    let closeResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      manualResult = view
        .current()
        .saveDraft()
        .catch((error) => error);
      closeResult = view
        .current()
        .flushLatestAutosave()
        .catch((error) => error);
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);
    const failure = hookState.apiError("manual shared failure");
    await React.act(async () => {
      manual.reject(failure);
      await Promise.resolve();
    });
    await expect(manualResult).resolves.toBe(failure);
    await expect(closeResult).resolves.toBe(failure);
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls).toEqual([]);
    expect(view.current().title).toBe("manual failure bytes");
    expect(view.current().hasUnsavedChanges).toBe(true);

    hookState.updatePostHandler = null;
    hookState.autosaveHandler = async (id, payload) =>
      autosaveResponse(hookState.applyPayload(hookState.createPost(id), payload));
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState rejects queued B and C when A fails and retries the retained C bytes", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const first = createDeferred<ReturnType<typeof autosaveResponse>>();
  hookState.autosaveHandler = async () => first.promise;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => view.current().setTitle("A failure"));
    let aResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      aResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);

    React.act(() => view.current().setTitle("B queued"));
    let bResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      bResult = view
        .current()
        .saveDraft()
        .catch((error) => error);
    });
    React.act(() => view.current().setTitle("C retained"));
    let cResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      cResult = view
        .current()
        .flushLatestAutosave()
        .catch((error) => error);
    });
    const failure = hookState.apiError("A failed");
    await React.act(async () => {
      first.reject(failure);
      await Promise.resolve();
    });
    await expect(aResult).resolves.toBe(failure);
    await expect(bResult).resolves.toBe(failure);
    await expect(cResult).resolves.toBe(failure);
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.updatePostCalls).toEqual([]);
    expect(view.current().title).toBe("C retained");
    expect(view.current().hasUnsavedChanges).toBe(true);

    hookState.updatePostHandler = null;
    await React.act(async () => {
      await view.current().saveDraft();
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.updatePostCalls[0]?.payload.title).toBe("C retained");
    expect(hookState.updateMetadataCalls).toEqual([
      {
        id: "post-1",
        payload: {
          tags: ["alpha", "beta"],
          taxonomy: { categoryId: "cat-1" },
          seo: {
            title: "SEO title",
            description: "SEO description",
            canonicalUrl: "https://example.com/editor-post",
            robots: "index,follow",
          },
        },
      },
    ]);
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.updateMetadataCalls).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState propagates shared failure, retries current bytes, and isolates old identity responses", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const failure = hookState.apiError("Close save failed.");
  hookState.autosaveHandler = async () => Promise.reject(failure);
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle("retry bytes");
      view.current().insertBlock("heading");
    });
    const selectedRetryBlock = view.current().state.selectedBlockId;
    if (!selectedRetryBlock) throw new Error("Missing selected retry block.");
    React.act(() => {
      view.current().updateBlockContent(selectedRetryBlock, "retry block bytes");
      view.current().selectBlock(selectedRetryBlock);
    });
    const retryDocument = structuredClone(view.current().state.document);
    const retryHistory = structuredClone(view.current().state.history);
    const retryHistoryLength = view.current().state.history.past.length;
    const retryCanUndo = view.current().canUndo;
    let firstFailure: unknown;
    await React.act(async () => {
      try {
        await view.current().flushLatestAutosave();
      } catch (error) {
        firstFailure = error;
      }
    });
    expect(firstFailure).toBe(failure);
    expect(view.current().autosaveError).toBe("Close save failed.");
    expect(view.current().title).toBe("retry bytes");
    expect(view.current().state.document).toEqual(retryDocument);
    expect(view.current().state.selectedBlockId).toBe(selectedRetryBlock);
    expect(view.current().state.history).toEqual(retryHistory);
    expect(view.current().state.history.past).toHaveLength(retryHistoryLength);
    expect(view.current().canUndo).toBe(retryCanUndo);
    expect(view.current().hasUnsavedChanges).toBe(true);

    hookState.autosaveHandler = async (id, payload) =>
      autosaveResponse(hookState.applyPayload(hookState.createPost(id), payload));
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls.map((entry) => entry.payload.title)).toEqual([
      "retry bytes",
      "retry bytes",
    ]);
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().state.document).toEqual(retryDocument);
    expect(view.current().state.selectedBlockId).toBe(selectedRetryBlock);
    expect(view.current().state.history).toEqual(retryHistory);
    expect(view.current().state.history.past).toHaveLength(retryHistoryLength);
    expect(view.current().canUndo).toBe(retryCanUndo);
    expect(view.current().hasUnsavedChanges).toBe(false);

    const stale = createDeferred<ReturnType<typeof autosaveResponse>>();
    hookState.autosaveHandler = async () => stale.promise;
    React.act(() => view.current().setTitle("old identity pending"));
    let oldPromise: Promise<unknown> = Promise.resolve();
    React.act(() => {
      oldPromise = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await waitFor(() => hookState.autosaveCalls.length === 3);

    hookState.path = "/admin/posts/post-2";
    hookState.cachedPost = null;
    hookState.fetchedPost = hookState.createPost("post-2", { title: "Post two" });
    view.rerender();
    await waitFor(() => view.current().postId === "post-2" && view.current().title === "Post two");
    const staleFailure = hookState.apiError("late old identity failure");
    await React.act(async () => {
      stale.reject(staleFailure);
      await Promise.resolve();
    });
    await expect(oldPromise).resolves.toBe(staleFailure);
    expect(view.current().postId).toBe("post-2");
    expect(view.current().title).toBe("Post two");
    expect(view.current().autosaveError).toBeNull();
    expect(view.current().hasUnsavedChanges).toBe(false);
  } finally {
    view.cleanup();
  }
});
