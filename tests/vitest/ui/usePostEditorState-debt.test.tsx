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
  createDistinctEnvelopePost,
  buildExpectedMetadataPayload,
} from "./postEditorStateFixtures";
import type { PostDetail, PostStatus } from "../../../core/admin/services/postsClient";

test("usePostEditorState retains restoration debt after a stale A0 save record is retired", async () => {
  const initialA0 = hookState.createPost("post-1", { title: "Initial A0" });
  const routeB = hookState.createPost("post-2", { title: "Route B" });
  const baselineA1 = hookState.createPost("post-1", {
    title: "Baseline A1",
    slug: "baseline-a1",
  });
  const staleA0 = hookState.createPost("post-1", {
    title: "Late stale A0",
    slug: "late-stale-a0",
  });
  const oldSave = createDeferred<PostDetail>();
  let durableA = baselineA1;
  hookState.cachedPost = initialA0;
  hookState.fetchedPost = initialA0;
  hookState.updatePostHandler = async () => {
    const response = await oldSave.promise;
    durableA = response;
    hookState.cachedPost = response;
    hookState.fetchedPost = response;
    hookState.trigger("post:post-1");
    return response;
  };
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
    React.act(() => view.current().setTitle("A0 pending bytes"));
    let oldSaveResult: Promise<void> = Promise.resolve();
    React.act(() => {
      oldSaveResult = view.current().saveDraft();
    });
    await waitFor(() => hookState.updatePostCalls.length === 1);

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
        view.current().title === "Baseline A1" &&
        view.current().loading === false
    );
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      oldSave.resolve(staleA0);
      await oldSaveResult;
    });
    await flush();
    expect(hookState.autosaveCalls).toEqual([]);
    expect(durableA).toMatchObject({
      title: "Late stale A0",
      slug: "late-stale-a0",
    });
    expect(view.current().title).toBe("Baseline A1");
    expect(view.current().hasUnsavedChanges).toBe(false);

    const getCallsBeforeDebtCacheEvent = hookState.getPostCalls.length;
    React.act(() => {
      hookState.trigger("post:post-1");
    });
    await flush();
    expect(hookState.getPostCalls).toHaveLength(getCallsBeforeDebtCacheEvent);
    expect(view.current().title).toBe("Baseline A1");

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toEqual([
      expect.objectContaining({
        id: "post-1",
        payload: expect.objectContaining({
          title: "Baseline A1",
          slug: "baseline-a1",
        }),
      }),
    ]);
    expect(durableA).toMatchObject({
      title: "Baseline A1",
      slug: "baseline-a1",
    });
    expect(hookState.cachedPost).toMatchObject({
      title: "Baseline A1",
      slug: "baseline-a1",
    });

    React.act(() => {
      hookState.trigger("post:post-1");
    });
    await waitFor(() => hookState.getPostCalls.length === getCallsBeforeDebtCacheEvent + 1);
    expect(view.current().title).toBe("Baseline A1");
    expect(view.current().slug).toBe("baseline-a1");

    await React.act(async () => {
      await view.current().flushLatestAutosave();
    });
    expect(hookState.autosaveCalls).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test.each(["success", "partial-failure"] as const)(
  "usePostEditorState restores exact A1 metadata after a stale A0 autosave settles: %s",
  async (outcome) => {
    const initialA0 = hookState.createPost("post-1", { title: "Metadata initial A0" });
    const routeB = hookState.createPost("post-2", { title: "Metadata route B" });
    const expectedA1Metadata = {
      tags: ["metadata-a1-one", "metadata-a1-two"],
      taxonomy: { categoryId: "cat-metadata-a1" },
      seo: {
        title: "Metadata A1 SEO",
        description: "Metadata A1 description",
        canonicalUrl: "https://example.com/metadata-a1",
        robots: "index,follow",
      },
    };
    const baselineA1 = hookState.createPost("post-1", {
      title: "Metadata baseline A1",
      slug: "metadata-baseline-a1",
      tags: expectedA1Metadata.tags,
      taxonomy: {
        category: {
          id: expectedA1Metadata.taxonomy.categoryId,
          name: "Metadata A1 category",
          slug: expectedA1Metadata.taxonomy.categoryId,
        },
        tags: [],
      },
      seo: expectedA1Metadata.seo,
    });
    const expectedStaleA0Metadata = {
      tags: ["metadata-stale-a0-one", "metadata-stale-a0-two"],
      taxonomy: { categoryId: "cat-metadata-stale-a0" },
      seo: {
        title: "Metadata stale A0 SEO",
        description: "Metadata stale A0 description",
        canonicalUrl: "https://example.com/metadata-stale-a0",
        robots: "noindex,nofollow",
      },
    };
    const oldAutosave = createDeferred<void>();
    const staleFailure = hookState.apiError("stale metadata autosave may have partially failed");
    let durableA = baselineA1;
    hookState.cachedPost = initialA0;
    hookState.fetchedPost = initialA0;
    hookState.autosaveHandler = async (_id, payload) => {
      await oldAutosave.promise;
      durableA = hookState.applyPayload(durableA, payload);
      hookState.cachedPost = durableA;
      hookState.fetchedPost = durableA;
      hookState.trigger("post:post-1");
      if (outcome === "partial-failure") throw staleFailure;
      return autosaveResponse(durableA);
    };
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      React.act(() => {
        view.current().setTitle("Metadata stale A0 bytes");
        view.current().setSlug("metadata-stale-a0-bytes");
        view.current().setTagsInput(expectedStaleA0Metadata.tags.join(", "));
        view.current().setCategoryId(expectedStaleA0Metadata.taxonomy.categoryId);
        view.current().setSeoDraft(expectedStaleA0Metadata.seo);
      });
      let oldAutosaveResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        oldAutosaveResult = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
          (error) => error
        );
      });
      await waitFor(() => hookState.autosaveCalls.length === 1);
      expect(hookState.autosaveCalls[0]?.payload).toMatchObject({
        title: "Metadata stale A0 bytes",
        slug: "metadata-stale-a0-bytes",
        ...expectedStaleA0Metadata,
      });

      hookState.getPostHandler = async (id) => (id === "post-2" ? routeB : durableA);
      hookState.cachedPost = null;
      hookState.path = "/admin/posts/post-2";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-2" &&
          view.current().title === "Metadata route B" &&
          view.current().loading === false
      );
      hookState.path = "/admin/posts/post-1";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-1" &&
          view.current().title === "Metadata baseline A1" &&
          view.current().loading === false
      );
      expect(view.current().hasUnsavedChanges).toBe(false);

      await React.act(async () => {
        oldAutosave.resolve();
        await oldAutosaveResult;
      });
      if (outcome === "success") {
        await expect(oldAutosaveResult).resolves.toBeUndefined();
      } else {
        await expect(oldAutosaveResult).resolves.toBe(staleFailure);
      }
      expect(durableA).toMatchObject({
        title: "Metadata stale A0 bytes",
        slug: "metadata-stale-a0-bytes",
        tags: expectedStaleA0Metadata.tags,
        taxonomy: {
          category: { id: expectedStaleA0Metadata.taxonomy.categoryId },
        },
        seo: expectedStaleA0Metadata.seo,
      });
      expect(view.current().title).toBe("Metadata baseline A1");
      expect(view.current().tagsInput).toBe(expectedA1Metadata.tags.join(", "));
      expect(view.current().categoryId).toBe(expectedA1Metadata.taxonomy.categoryId);
      expect(view.current().seoDraft).toEqual(expectedA1Metadata.seo);
      expect(view.current().hasUnsavedChanges).toBe(false);

      hookState.updatePostHandler = async (_id, payload) => {
        durableA = hookState.applyPayload(durableA, payload);
        hookState.cachedPost = durableA;
        hookState.fetchedPost = durableA;
        hookState.trigger("post:post-1");
        return durableA;
      };
      hookState.updateMetadataHandler = async (_id, payload) => {
        durableA = hookState.applyPayload(durableA, payload);
        hookState.cachedPost = durableA;
        hookState.fetchedPost = durableA;
        hookState.trigger("post:post-1");
        return durableA;
      };
      await React.act(async () => {
        await view.current().saveDraft();
      });
      expect(hookState.updatePostCalls).toEqual([
        expect.objectContaining({
          id: "post-1",
          payload: expect.objectContaining({
            title: "Metadata baseline A1",
            slug: "metadata-baseline-a1",
          }),
        }),
      ]);
      expect(hookState.updateMetadataCalls).toEqual([
        { id: "post-1", payload: expectedA1Metadata },
      ]);
      expect(durableA).toMatchObject({
        title: "Metadata baseline A1",
        slug: "metadata-baseline-a1",
        tags: expectedA1Metadata.tags,
        taxonomy: {
          category: { id: expectedA1Metadata.taxonomy.categoryId },
        },
        seo: expectedA1Metadata.seo,
      });
      expect(hookState.cachedPost).toMatchObject({
        title: "Metadata baseline A1",
        slug: "metadata-baseline-a1",
        tags: expectedA1Metadata.tags,
        taxonomy: {
          category: { id: expectedA1Metadata.taxonomy.categoryId },
        },
        seo: expectedA1Metadata.seo,
      });
      expect(view.current().title).toBe("Metadata baseline A1");
      expect(view.current().slug).toBe("metadata-baseline-a1");
      expect(view.current().tagsInput).toBe(expectedA1Metadata.tags.join(", "));
      expect(view.current().categoryId).toBe(expectedA1Metadata.taxonomy.categoryId);
      expect(view.current().seoDraft).toEqual(expectedA1Metadata.seo);
      expect(view.current().hasUnsavedChanges).toBe(false);

      await React.act(async () => {
        await view.current().saveDraft();
      });
      expect(hookState.updatePostCalls).toHaveLength(1);
      expect(hookState.updateMetadataCalls).toHaveLength(1);
    } finally {
      view.cleanup();
    }
  }
);

test.each([
  ["preview", "success"],
  ["preview", "failure"],
  ["unpublish", "success"],
  ["unpublish", "failure"],
] as const)(
  "usePostEditorState orders clean %s behind full-envelope debt restoration: %s",
  async (action, outcome) => {
    const initialStatus: PostStatus = action === "unpublish" ? "published" : "draft";
    const initialA0 = createDistinctEnvelopePost("post-1", `${action}-initial-a0`, initialStatus);
    const staleDraftA0 = createDistinctEnvelopePost("post-1", `${action}-stale-a0`, initialStatus);
    const baselineA1 = createDistinctEnvelopePost("post-1", `${action}-baseline-a1`, initialStatus);
    const routeB = createDistinctEnvelopePost("post-2", `${action}-route-b`);
    const staleMetadata = buildExpectedMetadataPayload(staleDraftA0);
    const expectedA1Metadata = buildExpectedMetadataPayload(baselineA1);
    const oldA0Transport = createDeferred<void>();
    const baseRestorationTransport = createDeferred<void>();
    const metadataRestorationTransport = createDeferred<void>();
    const restorationFailure = hookState.apiError(`${action} exact restoration failed`);
    let durableA = baselineA1;
    hookState.cachedPost = initialA0;
    hookState.fetchedPost = initialA0;
    hookState.autosaveHandler = async (_id, payload) => {
      await oldA0Transport.promise;
      durableA = hookState.applyPayload(durableA, payload);
      hookState.cachedPost = durableA;
      hookState.fetchedPost = durableA;
      hookState.trigger("post:post-1");
      return autosaveResponse(durableA);
    };
    const view = mountHook();
    try {
      await waitFor(() => view.current().loading === false);
      React.act(() => {
        view.current().setTitle(staleDraftA0.title);
        view.current().setSlug(staleDraftA0.slug);
        view
          .current()
          .setFeaturedImage((staleDraftA0.data as Record<string, unknown>).featuredImage as string);
        view.current().setTagsInput(staleMetadata.tags.join(", "));
        view.current().setCategoryId(staleMetadata.taxonomy.categoryId ?? "");
        view.current().setSeoDraft({
          title: staleDraftA0.seo?.title ?? "",
          description: staleDraftA0.seo?.description ?? "",
          canonicalUrl: staleDraftA0.seo?.canonicalUrl ?? "",
          robots: staleDraftA0.seo?.robots ?? "index,follow",
        });
      });
      let oldA0Result: Promise<unknown> = Promise.resolve();
      React.act(() => {
        oldA0Result = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
          (error) => error
        );
      });
      await waitFor(() => hookState.autosaveCalls.length === 1);
      expect(hookState.autosaveCalls[0]?.payload).toMatchObject({
        title: staleDraftA0.title,
        slug: staleDraftA0.slug,
        ...staleMetadata,
      });

      hookState.getPostHandler = async (id) =>
        id === "post-2" ? routeB : (hookState.fetchedPost ?? durableA);
      hookState.cachedPost = null;
      hookState.fetchedPost = baselineA1;
      hookState.path = "/admin/posts/post-2";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-2" &&
          view.current().title === routeB.title &&
          view.current().loading === false
      );
      hookState.path = "/admin/posts/post-1";
      view.rerender();
      await waitFor(
        () =>
          view.current().postId === "post-1" &&
          view.current().title === baselineA1.title &&
          view.current().loading === false
      );

      await React.act(async () => {
        oldA0Transport.resolve();
        await oldA0Result;
      });
      await expect(oldA0Result).resolves.toBeUndefined();
      expect(durableA).toMatchObject({
        title: staleDraftA0.title,
        slug: staleDraftA0.slug,
        tags: staleMetadata.tags,
        taxonomy: {
          category: { id: staleMetadata.taxonomy.categoryId },
        },
        seo: staleMetadata.seo,
      });
      expect(view.current().title).toBe(baselineA1.title);
      expect(view.current().hasUnsavedChanges).toBe(false);

      const expectedA1Base = {
        title: baselineA1.title,
        slug: baselineA1.slug,
        data: {
          ...(baselineA1.data as Record<string, unknown>),
          document: structuredClone(view.current().state.document),
        },
      };
      hookState.updatePostHandler = async (_id, payload) => {
        await baseRestorationTransport.promise;
        durableA = hookState.applyPayload(durableA, payload);
        hookState.cachedPost = durableA;
        hookState.fetchedPost = durableA;
        hookState.trigger("post:post-1");
        return durableA;
      };
      hookState.updateMetadataHandler = async (_id, payload) => {
        await metadataRestorationTransport.promise;
        if (outcome === "failure") throw restorationFailure;
        durableA = hookState.applyPayload(durableA, payload);
        hookState.cachedPost = durableA;
        hookState.fetchedPost = durableA;
        hookState.trigger("post:post-1");
        return durableA;
      };

      let actionSettled = false;
      let actionResult: Promise<unknown> = Promise.resolve();
      React.act(() => {
        const operation =
          action === "preview" ? view.current().preview() : view.current().unpublish();
        actionResult = operation
          .catch((error) => error)
          .finally(() => {
            actionSettled = true;
          });
      });
      await waitFor(() => hookState.updatePostCalls.length === 1);
      expect(hookState.updatePostCalls).toEqual([{ id: "post-1", payload: expectedA1Base }]);
      expect(actionSettled).toBe(false);
      expect(hookState.previewCalls).toEqual([]);
      expect(hookState.unpublishCalls).toEqual([]);

      await React.act(async () => {
        baseRestorationTransport.resolve();
        await Promise.resolve();
      });
      await waitFor(() => hookState.updateMetadataCalls.length === 1);
      expect(hookState.updateMetadataCalls).toEqual([
        { id: "post-1", payload: expectedA1Metadata },
      ]);
      expect(actionSettled).toBe(false);
      expect(hookState.previewCalls).toEqual([]);
      expect(hookState.unpublishCalls).toEqual([]);

      await React.act(async () => {
        metadataRestorationTransport.resolve();
        await actionResult;
      });
      expect(actionSettled).toBe(true);
      if (outcome === "failure") {
        if (action === "preview") {
          await expect(actionResult).resolves.toBeUndefined();
          expect(view.current().previewError).toBe(restorationFailure.message);
        } else {
          await expect(actionResult).resolves.toBe(restorationFailure);
          expect(view.current().error).toBe(restorationFailure.message);
        }
        expect(hookState.previewCalls).toEqual([]);
        expect(hookState.unpublishCalls).toEqual([]);
        return;
      }

      await expect(actionResult).resolves.toBeUndefined();
      if (action === "preview") {
        expect(hookState.previewCalls).toEqual([{ id: "post-1", ttl: 30 }]);
        expect(hookState.unpublishCalls).toEqual([]);
        expect(view.current().previewError).toBeNull();
        expect(view.current().previewUrl).toBe("/preview/post-1");
      } else {
        expect(hookState.previewCalls).toEqual([]);
        expect(hookState.unpublishCalls).toEqual(["post-1"]);
        expect(view.current().status).toBe("draft");
      }
      expect(durableA).toMatchObject({
        title: baselineA1.title,
        slug: baselineA1.slug,
        data: expectedA1Base.data,
        tags: expectedA1Metadata.tags,
        taxonomy: {
          category: { id: expectedA1Metadata.taxonomy.categoryId },
        },
        seo: expectedA1Metadata.seo,
      });
      expect(hookState.cachedPost).toMatchObject({
        title: baselineA1.title,
        slug: baselineA1.slug,
        data: expectedA1Base.data,
        tags: expectedA1Metadata.tags,
        taxonomy: {
          category: { id: expectedA1Metadata.taxonomy.categoryId },
        },
        seo: expectedA1Metadata.seo,
      });
      expect(view.current().title).toBe(baselineA1.title);
      expect(view.current().slug).toBe(baselineA1.slug);
      expect(view.current().featuredImage).toBe(
        (expectedA1Base.data as Record<string, unknown>).featuredImage
      );
      expect(view.current().tagsInput).toBe(expectedA1Metadata.tags.join(", "));
      expect(view.current().categoryId).toBe(expectedA1Metadata.taxonomy.categoryId);
      expect(view.current().seoDraft).toEqual(expectedA1Metadata.seo);
      expect(view.current().state.document).toEqual(expectedA1Base.data.document);
      expect(view.current().hasUnsavedChanges).toBe(false);
    } finally {
      view.cleanup();
    }
  }
);

test("usePostEditorState preserves later-settled restoration debt across an earlier A1 GET", async () => {
  const initialA0 = createDistinctEnvelopePost("post-1", "get-initial-a0");
  const staleDraftA0 = createDistinctEnvelopePost("post-1", "get-stale-a0");
  const baselineA1 = createDistinctEnvelopePost("post-1", "get-baseline-a1");
  const routeB = createDistinctEnvelopePost("post-2", "get-route-b");
  const staleMetadata = buildExpectedMetadataPayload(staleDraftA0);
  const expectedA1Metadata = buildExpectedMetadataPayload(baselineA1);
  const oldA0Transport = createDeferred<void>();
  const pendingA1Get = createDeferred<PostDetail | null>();
  let durableA = baselineA1;
  let a1GetStarted = false;
  hookState.cachedPost = initialA0;
  hookState.fetchedPost = initialA0;
  hookState.autosaveHandler = async (_id, payload) => {
    await oldA0Transport.promise;
    durableA = hookState.applyPayload(durableA, payload);
    hookState.cachedPost = durableA;
    hookState.fetchedPost = durableA;
    hookState.trigger("post:post-1");
    return autosaveResponse(durableA);
  };
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    React.act(() => {
      view.current().setTitle(staleDraftA0.title);
      view.current().setSlug(staleDraftA0.slug);
      view
        .current()
        .setFeaturedImage((staleDraftA0.data as Record<string, unknown>).featuredImage as string);
      view.current().setTagsInput(staleMetadata.tags.join(", "));
      view.current().setCategoryId(staleMetadata.taxonomy.categoryId ?? "");
      view.current().setSeoDraft({
        title: staleDraftA0.seo?.title ?? "",
        description: staleDraftA0.seo?.description ?? "",
        canonicalUrl: staleDraftA0.seo?.canonicalUrl ?? "",
        robots: staleDraftA0.seo?.robots ?? "index,follow",
      });
    });
    let oldA0Result: Promise<unknown> = Promise.resolve();
    React.act(() => {
      oldA0Result = (hookState.autosaveOptions?.onAutosave() ?? Promise.resolve()).catch(
        (error) => error
      );
    });
    await waitFor(() => hookState.autosaveCalls.length === 1);
    expect(hookState.autosaveCalls[0]?.payload).toMatchObject({
      title: staleDraftA0.title,
      slug: staleDraftA0.slug,
      ...staleMetadata,
    });

    hookState.getPostHandler = async (id) => {
      if (id === "post-2") return routeB;
      a1GetStarted = true;
      return pendingA1Get.promise;
    };
    hookState.cachedPost = null;
    hookState.path = "/admin/posts/post-2";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-2" &&
        view.current().title === routeB.title &&
        view.current().loading === false
    );
    hookState.path = "/admin/posts/post-1";
    view.rerender();
    await waitFor(() => a1GetStarted && view.current().postId === "post-1");
    expect(view.current().loading).toBe(true);

    await React.act(async () => {
      oldA0Transport.resolve();
      await oldA0Result;
    });
    await expect(oldA0Result).resolves.toBeUndefined();
    expect(durableA).toMatchObject({
      title: staleDraftA0.title,
      slug: staleDraftA0.slug,
      tags: staleMetadata.tags,
      taxonomy: {
        category: { id: staleMetadata.taxonomy.categoryId },
      },
      seo: staleMetadata.seo,
    });

    await React.act(async () => {
      hookState.cachedPost = baselineA1;
      hookState.fetchedPost = baselineA1;
      pendingA1Get.resolve(baselineA1);
      await Promise.resolve();
    });
    await waitFor(
      () => view.current().title === baselineA1.title && view.current().loading === false
    );
    expect(view.current().hasUnsavedChanges).toBe(false);
    expect(durableA.title).toBe(staleDraftA0.title);

    const expectedA1Base = {
      title: baselineA1.title,
      slug: baselineA1.slug,
      data: {
        ...(baselineA1.data as Record<string, unknown>),
        document: structuredClone(view.current().state.document),
      },
    };
    hookState.updatePostHandler = async (_id, payload) => {
      durableA = hookState.applyPayload(durableA, payload);
      hookState.cachedPost = durableA;
      hookState.fetchedPost = durableA;
      hookState.trigger("post:post-1");
      return durableA;
    };
    hookState.updateMetadataHandler = async (_id, payload) => {
      durableA = hookState.applyPayload(durableA, payload);
      hookState.cachedPost = durableA;
      hookState.fetchedPost = durableA;
      hookState.trigger("post:post-1");
      return durableA;
    };
    await React.act(async () => {
      await view.current().saveDraft();
    });
    expect(hookState.updatePostCalls).toEqual([{ id: "post-1", payload: expectedA1Base }]);
    expect(hookState.updateMetadataCalls).toEqual([{ id: "post-1", payload: expectedA1Metadata }]);
    expect(durableA).toMatchObject({
      title: baselineA1.title,
      slug: baselineA1.slug,
      data: expectedA1Base.data,
      tags: expectedA1Metadata.tags,
      taxonomy: {
        category: { id: expectedA1Metadata.taxonomy.categoryId },
      },
      seo: expectedA1Metadata.seo,
    });
    expect(hookState.cachedPost).toMatchObject({
      title: baselineA1.title,
      slug: baselineA1.slug,
      data: expectedA1Base.data,
      tags: expectedA1Metadata.tags,
      taxonomy: {
        category: { id: expectedA1Metadata.taxonomy.categoryId },
      },
      seo: expectedA1Metadata.seo,
    });
    expect(view.current().title).toBe(baselineA1.title);
    expect(view.current().slug).toBe(baselineA1.slug);
    expect(view.current().featuredImage).toBe(
      (expectedA1Base.data as Record<string, unknown>).featuredImage
    );
    expect(view.current().tagsInput).toBe(expectedA1Metadata.tags.join(", "));
    expect(view.current().categoryId).toBe(expectedA1Metadata.taxonomy.categoryId);
    expect(view.current().seoDraft).toEqual(expectedA1Metadata.seo);
    expect(view.current().state.document).toEqual(expectedA1Base.data.document);
    expect(view.current().hasUnsavedChanges).toBe(false);

    await React.act(async () => {
      await view.current().saveDraft();
    });
    expect(hookState.updatePostCalls).toHaveLength(1);
    expect(hookState.updateMetadataCalls).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("usePostEditorState revalidates shared cache after a stale old-epoch reload settles", async () => {
  const initialA0 = hookState.createPost("post-1", { title: "Reload A0" });
  const routeB = hookState.createPost("post-2", { title: "Reload route B" });
  const baselineA1 = hookState.createPost("post-1", {
    title: "Reload baseline A1",
    slug: "reload-baseline-a1",
  });
  const staleReloadA0 = hookState.createPost("post-1", {
    title: "Late reload A0",
    slug: "late-reload-a0",
  });
  const oldReload = createDeferred<PostDetail>();
  hookState.cachedPost = initialA0;
  hookState.fetchedPost = initialA0;
  const view = mountHook();
  try {
    await waitFor(() => view.current().loading === false);
    let postAGetCount = 0;
    hookState.getPostHandler = async (id) => {
      if (id === "post-2") return routeB;
      postAGetCount += 1;
      if (postAGetCount === 1) {
        const staleResponse = await oldReload.promise;
        hookState.cachedPost = staleResponse;
        hookState.fetchedPost = staleResponse;
        hookState.trigger("post:post-1");
        return staleResponse;
      }
      hookState.cachedPost = baselineA1;
      hookState.fetchedPost = baselineA1;
      hookState.trigger("post:post-1");
      return baselineA1;
    };

    let oldReloadResult: Promise<unknown> = Promise.resolve();
    React.act(() => {
      oldReloadResult = view
        .current()
        .markReloadRemote()
        .catch((error) => error);
    });
    await waitFor(() => postAGetCount === 1);

    hookState.cachedPost = null;
    hookState.path = "/admin/posts/post-2";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-2" &&
        view.current().title === "Reload route B" &&
        view.current().loading === false
    );
    hookState.path = "/admin/posts/post-1";
    view.rerender();
    await waitFor(
      () =>
        view.current().postId === "post-1" &&
        view.current().title === "Reload baseline A1" &&
        view.current().loading === false
    );
    expect(postAGetCount).toBe(2);

    await React.act(async () => {
      oldReload.resolve(staleReloadA0);
      await oldReloadResult;
    });
    await expect(oldReloadResult).resolves.toMatchObject({
      code: "editor_identity_changed",
    });
    expect(postAGetCount).toBe(3);
    expect(hookState.cachedPost).toMatchObject({
      title: "Reload baseline A1",
      slug: "reload-baseline-a1",
    });
    expect(hookState.fetchedPost).toMatchObject({
      title: "Reload baseline A1",
      slug: "reload-baseline-a1",
    });
    expect(view.current().title).toBe("Reload baseline A1");
    expect(view.current().slug).toBe("reload-baseline-a1");
    expect(view.current().error).toBeNull();
    expect(hookState.autosaveCalls).toEqual([]);
    expect(hookState.updatePostCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});
