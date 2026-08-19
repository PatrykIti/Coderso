// @vitest-environment happy-dom

import React from "react";
import { test, expect } from "vitest";
import {
  hookState,
  mountHook,
  waitFor,
  createDeferred,
  autosaveResponse,
} from "./postEditorStateFixtures";
import {
  buildSilentSyncSnapshot,
  normalizeEditorDocumentForWritingFlow,
  normalizePostDraftSyncMode,
  shouldDeferRefreshForDirtyState,
} from "../../../core/admin/ui/posts/editor/hooks/usePostEditorState";

test("usePostEditorState helper exports normalize writing-flow documents and sync guards", () => {
  const normalizedWrapped = normalizeEditorDocumentForWritingFlow({
    version: 1,
    blocks: [
      {
        id: "empty-paragraph",
        type: "paragraph",
        attrs: null,
        content: null,
      },
      {
        id: "canvas-1",
        type: "writing-canvas",
        attrs: {},
        content: {
          version: 1,
          nodes: [{ id: "node-1", type: "paragraph", text: "Body" }],
        },
      },
    ],
    meta: {},
  });

  expect(normalizedWrapped.blocks).toHaveLength(1);
  expect(normalizedWrapped.blocks[0]?.type).toBe("writing-canvas");

  const normalizedParagraph = normalizeEditorDocumentForWritingFlow({
    version: 1,
    blocks: [
      {
        id: "",
        type: "paragraph",
        attrs: {},
        content: null,
      },
    ],
    meta: {},
  });

  expect(normalizedParagraph.blocks).toHaveLength(1);
  expect(normalizedParagraph.blocks[0]?.id).toBe("block-1");
  expect(normalizedParagraph.blocks[0]?.type).toBe("writing-canvas");
  expect(normalizedParagraph.blocks[0]?.content).toEqual(
    expect.objectContaining({
      version: 1,
      nodes: [
        expect.objectContaining({
          type: "paragraph",
          text: "",
        }),
      ],
    })
  );

  const snapshot = buildSilentSyncSnapshot(
    hookState.createPost("post-2", {
      title: "Snapshot post",
      slug: "snapshot-post",
      status: "published",
      data: {
        document: {
          version: 1,
          blocks: [],
          meta: {},
        },
        featuredImage: 42 as unknown as string,
      },
    }),
    "2026-03-12T14:00:00.000Z"
  );

  expect(snapshot.title).toBe("Snapshot post");
  expect(snapshot.slug).toBe("snapshot-post");
  expect(snapshot.status).toBe("published");
  expect(snapshot.featuredImage).toBe("");
  expect(snapshot.savedAt).toBe("2026-03-12T14:00:00.000Z");
  expect(snapshot.metadataDraft.tagsInput).toBe("alpha, beta");
  expect(snapshot.metadataDraft.categoryId).toBe("cat-1");

  expect(normalizePostDraftSyncMode(undefined)).toBe("silent");
  expect(normalizePostDraftSyncMode("hydrate")).toBe("hydrate");
  expect(shouldDeferRefreshForDirtyState(undefined, true)).toBe(true);
  expect(shouldDeferRefreshForDirtyState({ allowDirty: false }, false)).toBe(false);
  expect(shouldDeferRefreshForDirtyState({ allowDirty: true }, true)).toBe(false);
});

test("usePostEditorState derives autosave baselines from normalized current and newer responses", async () => {
  const initial = hookState.createPost("post-1");
  hookState.cachedPost = initial;
  hookState.fetchedPost = initial;
  const normalizedCurrent = hookState.createPost("post-1", {
    title: "server current",
    slug: "server-current",
    tags: ["Server Current"],
    seo: {
      title: "Server Current SEO",
      description: "Server current description",
      canonicalUrl: "https://example.com/server-current",
      robots: "noindex,follow",
    },
  });
  hookState.autosaveHandler = async () => autosaveResponse(normalizedCurrent);
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle("request current");
      view.current().setSlug("request-current");
      view.current().setTagsInput("Request Current");
      view.current().setSeoDraft({ title: "Request Current SEO" });
    });
    await React.act(async () => {
      await hookState.autosaveOptions?.onAutosave();
    });
    expect(view.current().title).toBe("server current");
    expect(view.current().slug).toBe("server-current");
    expect(view.current().tagsInput).toBe("Server Current");
    expect(view.current().seoDraft.title).toBe("Server Current SEO");
    expect(view.current().hasUnsavedChanges).toBe(false);

    const olderResponse = createDeferred<ReturnType<typeof autosaveResponse>>();
    hookState.autosaveHandler = async () => olderResponse.promise;
    React.act(() => {
      view.current().setTitle("captured older");
      view.current().setSlug("captured-older");
      view.current().setTagsInput("Captured Older");
      view.current().setSeoDraft({ title: "Captured Older SEO" });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "captured-node", type: "paragraph", text: "captured body" }],
      });
    });
    const capturedDocument = view.current().state.document;
    let olderPromise: Promise<void> = Promise.resolve();
    React.act(() => {
      olderPromise = hookState.autosaveOptions?.onAutosave() ?? Promise.resolve();
    });
    await waitFor(() => hookState.autosaveCalls.length === 2);

    React.act(() => {
      view.current().setTitle("newer live");
      view.current().setSlug("newer-live");
      view.current().setTagsInput("Newer Live");
      view.current().setSeoDraft({ title: "Newer Live SEO" });
      view.current().updateBlockContent("block-1", {
        version: 1,
        nodes: [{ id: "newer-node", type: "paragraph", text: "newer body" }],
      });
    });
    const newerDocument = view.current().state.document;
    const newerHistoryLength = view.current().state.history.past.length;
    const normalizedOlder = hookState.createPost("post-1", {
      title: "server older",
      slug: "server-older",
      data: { ...initial.data, document: capturedDocument },
      tags: ["Server Older"],
      seo: {
        title: "Server Older SEO",
        description: "Server older description",
        canonicalUrl: "https://example.com/server-older",
        robots: "index,follow",
      },
    });
    await React.act(async () => {
      olderResponse.resolve(autosaveResponse(normalizedOlder));
      await olderPromise;
    });
    expect(view.current().title).toBe("newer live");
    expect(view.current().slug).toBe("newer-live");
    expect(view.current().tagsInput).toBe("Newer Live");
    expect(view.current().seoDraft.title).toBe("Newer Live SEO");
    expect(view.current().state.document).toEqual(newerDocument);
    expect(view.current().state.history.past).toHaveLength(newerHistoryLength);
    expect(view.current().hasUnsavedChanges).toBe(true);

    React.act(() => {
      view.current().setTitle("server older");
      view.current().setSlug("server-older");
      view.current().setTagsInput("Server Older");
      view.current().setSeoDraft({
        title: "Server Older SEO",
        description: "Server older description",
        canonicalUrl: "https://example.com/server-older",
        robots: "index,follow",
      });
      view.current().undo();
    });
    expect(view.current().state.document).toEqual(capturedDocument);
    expect(view.current().hasUnsavedChanges).toBe(false);
    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState saveDraft normalizes metadata payload and clears blank featured image", async () => {
  hookState.cachedPost = hookState.createPost("post-1");
  hookState.fetchedPost = hookState.cachedPost;

  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);

    React.act(() => {
      view.current().setTitle("Saved title");
      view.current().setFeaturedImage("   ");
      view.current().setTagsInput("One, two\nONE");
      view.current().setCategoryId("   ");
      view.current().setSeoDraft({
        title: "  Saved SEO  ",
        description: "  Saved description  ",
        canonicalUrl: " https://example.com/saved ",
        robots: "   ",
      });
    });

    await React.act(async () => {
      await view.current().saveDraft();
    });
    await waitFor(() => view.current().hasUnsavedChanges === false);

    expect(hookState.cancelAutosaveCalls).toBeGreaterThan(0);
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.updateMetadataCalls).toHaveLength(1);
    expect(hookState.updatePostCalls[0]?.payload.data).not.toHaveProperty("featuredImage");
    expect(hookState.updateMetadataCalls[0]?.payload).toMatchObject({
      tags: ["One", "two"],
      taxonomy: { categoryId: null },
      seo: {
        title: "Saved SEO",
        description: "Saved description",
        canonicalUrl: "https://example.com/saved",
        robots: "index,follow",
      },
    });
    expect(view.current().featuredImage).toBe("");
    expect(view.current().title).toBe("Saved title");
  } finally {
    view.cleanup();
  }
});
test("usePostEditorState preserves meaningful leading paragraphs and canonical writing documents", () => {
  const meaningfulAnchor = normalizeEditorDocumentForWritingFlow({
    document: {
      version: 1,
      blocks: [
        {
          id: "p-anchor",
          type: "paragraph",
          attrs: { anchorId: "lead" },
          content: null,
        },
        {
          id: "canvas-1",
          type: "writing-canvas",
          attrs: {},
          content: {
            version: 1,
            nodes: [{ id: "node-1", type: "paragraph", text: "Body" }],
          },
        },
      ],
      meta: {},
    },
  });

  expect(meaningfulAnchor.blocks.map((block) => block.id)).toEqual(["p-anchor", "canvas-1"]);

  const whitespaceClass = normalizeEditorDocumentForWritingFlow({
    document: {
      version: 1,
      blocks: [
        {
          id: "p-empty",
          type: "paragraph",
          attrs: { className: "   " },
          content: null,
        },
        {
          id: "canvas-2",
          type: "writing-canvas",
          attrs: {},
          content: {
            version: 1,
            nodes: [{ id: "node-2", type: "paragraph", text: "Body" }],
          },
        },
      ],
      meta: {},
    },
  });

  expect(whitespaceClass.blocks.map((block) => block.id)).toEqual(["canvas-2"]);

  const canonical = {
    version: 1,
    blocks: [
      {
        id: "canvas-4",
        type: "writing-canvas",
        attrs: {},
        content: {
          version: 1,
          nodes: [{ id: "node-4", type: "paragraph", text: "Body" }],
        },
      },
    ],
    meta: {},
  };
  const alreadyCanonical = normalizeEditorDocumentForWritingFlow({ document: canonical });
  expect(alreadyCanonical.blocks).toHaveLength(1);
  expect(alreadyCanonical.blocks[0]?.id).toBe("canvas-4");
});
