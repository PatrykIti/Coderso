import { expect, test } from "bun:test";

import {
  buildSilentSyncSnapshot,
  normalizePostDraftSyncMode,
  shouldDeferRefreshForDirtyState,
} from "../../../core/admin/ui/posts/editor/hooks/usePostEditorState";
import type { PostDetail } from "../../../core/admin/services/postsClient";

const createPost = (overrides?: Partial<PostDetail>): PostDetail => ({
  id: "post-1",
  typeId: "post",
  title: "Test Post",
  slug: "test-post",
  status: "draft",
  data: {
    featuredImage: "/media/test.png",
    document: {
      version: 1,
      blocks: [],
      meta: {},
    },
  },
  tags: ["one", "two"],
  createdAt: "2026-02-23T10:00:00.000Z",
  updatedAt: "2026-02-23T10:01:00.000Z",
  publishedAt: null,
  scheduledAt: null,
  author: null,
  seo: {
    title: "SEO title",
    description: "SEO description",
    canonicalUrl: "https://example.com/test-post",
    robots: "noindex,nofollow",
  },
  taxonomy: {
    category: { id: "cat-1", name: "Category", slug: "category" },
    tags: [],
  },
  ...overrides,
});

test("normalizePostDraftSyncMode defaults to silent and allows hydrate", () => {
  expect(normalizePostDraftSyncMode(undefined)).toBe("silent");
  expect(normalizePostDraftSyncMode("silent")).toBe("silent");
  expect(normalizePostDraftSyncMode("hydrate")).toBe("hydrate");
});

test("buildSilentSyncSnapshot returns baseline payload and metadata draft", () => {
  const post = createPost();
  const snapshot = buildSilentSyncSnapshot(post, "2026-02-23T10:02:00.000Z");

  expect(snapshot.title).toBe(post.title);
  expect(snapshot.slug).toBe(post.slug);
  expect(snapshot.status).toBe(post.status);
  expect(snapshot.featuredImage).toBe("/media/test.png");
  expect(snapshot.metadataDraft.tagsInput).toBe("one, two");
  expect(snapshot.metadataDraft.seo.title).toBe("SEO title");
  expect(snapshot.metadataDraft.seo.robots).toBe("noindex,nofollow");
  expect(snapshot.baseData).toEqual(post.data);
  expect(snapshot.savedAt).toBe("2026-02-23T10:02:00.000Z");
  expect(snapshot.metadataSignature.length).toBeGreaterThan(0);
});

test("buildSilentSyncSnapshot falls back to post updatedAt and default robots", () => {
  const post = createPost({
    data: {},
    seo: null,
    tags: [],
    taxonomy: null,
  });
  const snapshot = buildSilentSyncSnapshot(post);

  expect(snapshot.featuredImage).toBe("");
  expect(snapshot.metadataDraft.tagsInput).toBe("");
  expect(snapshot.metadataDraft.seo.robots).toBe("index,follow");
  expect(snapshot.savedAt).toBe(post.updatedAt);
});

test("shouldDeferRefreshForDirtyState follows allowDirty contract", () => {
  expect(shouldDeferRefreshForDirtyState(undefined, true)).toBe(true);
  expect(shouldDeferRefreshForDirtyState({ allowDirty: false }, true)).toBe(true);
  expect(shouldDeferRefreshForDirtyState({ allowDirty: true }, true)).toBe(false);
  expect(shouldDeferRefreshForDirtyState(undefined, false)).toBe(false);
});
