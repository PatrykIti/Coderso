// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { UsePostEditorStateResult } from "../../../core/admin/ui/posts/editor/hooks/usePostEditorState";

type PostStatus = "draft" | "published" | "scheduled" | "archived";
type TestPost = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: PostStatus;
  data: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  author: null;
  seo: {
    title: string;
    description: string;
    canonicalUrl: string;
    robots: string;
  };
  taxonomy: { category: null; tags: [] };
};

const modernState = vi.hoisted(() => {
  const post: TestPost = {
    id: "modern-post",
    typeId: "post",
    title: "Modern post",
    slug: "modern-post",
    status: "scheduled",
    data: {
      document: {
        version: 1,
        blocks: [],
        meta: {},
      },
    },
    tags: ["existing"],
    createdAt: "2026-08-11T08:00:00.000Z",
    updatedAt: "2026-08-11T08:00:00.000Z",
    publishedAt: null,
    scheduledAt: "2026-08-12T08:00:00.000Z",
    author: null,
    seo: {
      title: "Existing title",
      description: "Existing description",
      canonicalUrl: "https://example.test/modern-post",
      robots: "index,follow",
    },
    taxonomy: { category: null, tags: [] },
  };
  const state = {
    post,
    metadataCalls: [] as Array<Record<string, unknown>>,
    reset() {
      state.metadataCalls = [];
    },
  };
  return state;
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/apiClient", () => ({ isApiClientError: () => false }));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    postDetail: (id: string) => `post:${id}`,
    postRevisions: (id: string) => `post-revisions:${id}`,
  },
}));

vi.mock("@/services/postsClient", () => ({
  autosavePost: vi.fn(async () => ({
    post: modernState.post,
    revision: {
      id: "revision-1",
      postId: modernState.post.id,
      version: 1,
      data: {},
      createdAt: "",
    },
    savedAt: modernState.post.updatedAt,
    reusedRevision: false,
  })),
  deletePost: vi.fn(async () => ({ ok: true })),
  getCachedPostDetail: () => modernState.post,
  getCachedPostRevisions: () => null,
  getPostCached: vi.fn(async () => modernState.post),
  listPostRevisionsCached: vi.fn(async () => []),
  previewPost: vi.fn(async () => ({
    token: "preview",
    previewUrl: "https://preview.test",
    expiresAt: "",
  })),
  publishPost: vi.fn(async () => ({ ok: true })),
  restorePostRevision: vi.fn(async () => ({
    ok: true,
    restored: true,
    revision: {
      id: "revision-1",
      postId: modernState.post.id,
      version: 1,
      data: {},
      createdAt: "",
    },
    post: modernState.post,
  })),
  unpublishPost: vi.fn(async () => ({ ok: true })),
  updatePost: vi.fn(async () => modernState.post),
  updatePostMetadata: vi.fn(async (_id: string, payload: Record<string, unknown>) => {
    modernState.metadataCalls.push(payload);
    return modernState.post;
  }),
}));

vi.mock("@/services/mediaClient", () => ({
  uploadClipboardImage: vi.fn(async () => ({ id: "media-1", key: "media-1", url: "/media-1" })),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ path: "/admin/posts/modern-post?editor=writing", navigate: vi.fn() }),
}));

vi.mock("@/utils/cacheBus", () => ({ subscribeCacheEvents: () => () => undefined }));

vi.mock("../../../core/admin/ui/posts/editor/hooks/usePostAutosave", () => ({
  usePostAutosave: () => ({ cancel: () => undefined, flush: async () => undefined }),
}));

const flush = async (count = 3) => {
  for (let index = 0; index < count; index += 1) {
    await React.act(async () => {
      await Promise.resolve();
    });
  }
};

afterEach(() => {
  vi.restoreAllMocks();
  modernState.reset();
});

test("the modern editor metadata save remains publication-field-free", async () => {
  const { usePostEditorState } =
    await import("../../../core/admin/ui/posts/editor/hooks/usePostEditorState");
  let current: UsePostEditorStateResult | null = null;

  const Probe = () => {
    current = usePostEditorState();
    return null;
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => root.render(React.createElement(Probe)));

  try {
    await flush();
    if (!current) throw new Error("editor hook did not mount");
    React.act(() => current?.setSeoDraft({ description: "Changed description" }));
    await flush();
    if (!current) throw new Error("editor hook did not update");
    await React.act(async () => current?.saveDraft());

    expect(modernState.metadataCalls).toHaveLength(1);
    const payload = modernState.metadataCalls[0];
    expect(payload).toMatchObject({
      tags: ["existing"],
      taxonomy: { categoryId: null },
      seo: { description: "Changed description" },
    });
    expect(Object.hasOwn(payload, "status")).toBe(false);
    expect(Object.hasOwn(payload, "scheduledAt")).toBe(false);
  } finally {
    React.act(() => root.unmount());
    container.remove();
  }
});
