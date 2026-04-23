import React from "react";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { PostsListPage } from "../../../core/admin/ui/posts/PostsListPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("PostsListPage renders shell and loading state", () => {
  const html = renderAdminUi(<PostsListPage />, {
    path: "/admin/coderso/posts",
  });

  expect(html).toContain("Posts");
  expect(html).toContain("New");
  expect(html).toContain("Loading posts");
});

test("PostsListPage renders cached posts without loading placeholder", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.postsList,
      JSON.stringify({
        value: [
          {
            id: "post-1",
            typeId: "post-type",
            title: "Cached post",
            slug: "cached-post",
            status: "draft",
            data: {},
            tags: ["news"],
            scheduledAt: null,
            createdAt: "2026-02-21T00:00:00.000Z",
            updatedAt: "2026-02-21T00:00:00.000Z",
            publishedAt: null,
            author: null,
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<PostsListPage />, {
      path: "/admin/coderso/posts",
    });

    expect(html).toContain("Cached post");
    expect(html).not.toContain("Loading posts");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
