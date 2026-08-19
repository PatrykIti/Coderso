// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";
import {
  flushMicrotasks,
  mount,
  pagePostState,
  setInputValue,
  setSelectValue,
} from "./pagePostListFixtures";

test("PostsListPage filters by tag, ignores unrelated cache refreshes, skips cancelled deletes, and creates without editor navigation when preference is off", async () => {
  pagePostState.posts = [
    {
      ...pagePostState.posts[0],
      tags: ["campaign"],
    },
    {
      ...pagePostState.posts[0],
      id: "post-2",
      title: "Roadmap",
      slug: "roadmap",
      status: "published",
      tags: ["planning"],
      author: {
        id: "author-2",
        name: "Editor",
        email: "editor@example.com",
      },
    },
  ];

  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Product launch");
    expect(view.container.textContent).toContain("Roadmap");
    expect(view.container.textContent).toContain("Showing 1-2 of 2 posts");
    expect(pagePostState.postRefreshCalls).toEqual([{ force: true, background: true }]);

    const searchInput = view.container.querySelector(
      'input[placeholder="Search posts by title..."]'
    );
    const selectAll = view.container.querySelector('input[aria-label="Select all posts"]');

    React.act(() => {
      if (selectAll instanceof HTMLInputElement) {
        selectAll.click();
      }
    });

    expect(view.container.textContent).toContain("2 posts selected");
    expect(view.container.querySelector('[data-post-bulk-actions="inline"]')).not.toBeNull();
    expect((view.container.textContent ?? "").indexOf("2 posts selected")).toBeLessThan(
      (view.container.textContent ?? "").indexOf("New")
    );

    React.act(() => {
      setInputValue(searchInput ?? undefined, "unknown");
    });

    expect(view.container.textContent).not.toContain("Product launch");
    expect(view.container.textContent).not.toContain("Roadmap");
    expect(view.container.textContent).not.toContain("posts selected");
    expect(view.container.textContent).toContain("Showing 0 of 0 posts");

    React.act(() => {
      setInputValue(searchInput ?? undefined, "campaign");
    });

    expect(view.container.textContent).toContain("Product launch");
    expect(view.container.textContent).not.toContain("Roadmap");
    expect(view.container.textContent).not.toContain("posts selected");
    expect(view.container.textContent).toContain("Showing 1-1 of 1 posts");

    await React.act(async () => {
      pagePostState.postSubscribers.forEach((handler) => handler({ key: "pagesList" }));
      await flushMicrotasks();
    });

    expect(pagePostState.postRefreshCalls).toHaveLength(1);

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "delete-post-row")
        ?.click();
    });

    expect(view.container.textContent).toContain("Delete post?");
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "Cancel")
        ?.click();
    });

    expect(pagePostState.deletePostCalls).toEqual([]);

    React.act(() => {
      buttons()
        // TASK-497-01: Posts create button relabeled "New" → "New post".
        .find((button) => button.textContent === "New post")
        ?.click();
    });

    expect(
      view.container.querySelector("[data-has-open-change='true']")?.getAttribute("data-sheet-open")
    ).toBe("true");

    const openAfterCreateToggle = view.container.querySelector("#post-open-after-create");
    const titleInput = view.container.querySelector(
      'input[placeholder="e.g. Product launch update"]'
    );

    await React.act(async () => {
      if (openAfterCreateToggle instanceof HTMLInputElement) {
        openAfterCreateToggle.click();
      }
      setInputValue(titleInput ?? undefined, "Release Notes");
      buttons()
        .find((button) => button.textContent === "Create Post")
        ?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.setUserSettingCalls).toContainEqual({
      key: "pages.openAfterCreate",
      value: false,
    });
    expect(pagePostState.createPostCalls).toEqual([
      {
        title: "Release Notes",
        slug: "release-notes",
        data: {},
      },
    ]);
    expect(pagePostState.postRefreshCalls).toEqual([
      { force: true, background: true },
      { force: true, background: true },
    ]);
    expect(pagePostState.navigateCalls).not.toContain("/posts/created-post");
    expect(
      view.container.querySelector("[data-has-open-change='true']")?.getAttribute("data-sheet-open")
    ).toBe("false");
  } finally {
    view.cleanup();
  }
});

test("PostsListPage bulk toolbar applies visible-scope actions and clears selection", async () => {
  pagePostState.posts = [
    {
      ...pagePostState.posts[0],
      id: "post-1",
      title: "Alpha",
      slug: "alpha",
      tags: ["alpha"],
    },
    {
      ...pagePostState.posts[0],
      id: "post-2",
      title: "Beta",
      slug: "beta",
      tags: ["beta"],
    },
  ];

  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    const selectAll = view.container.querySelector('input[aria-label="Select all posts"]');
    const searchInput = view.container.querySelector(
      'input[placeholder="Search posts by title..."]'
    );

    React.act(() => {
      if (selectAll instanceof HTMLInputElement) {
        selectAll.click();
      }
    });

    expect(view.container.textContent).toContain("2 posts selected");
    expect(view.container.querySelector('[data-post-bulk-actions="inline"]')).not.toBeNull();

    const bulkSelect = Array.from(view.container.querySelectorAll("select")).find((select) =>
      select.querySelector('option[value="publish"]')
    );

    React.act(() => {
      setSelectValue(bulkSelect, "publish");
    });

    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Apply")
        ?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.publishPostCalls).toEqual(["post-1", "post-2"]);
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("2 posts published.");
    expect(view.container.textContent).toContain("Bulk action completed");
    expect(view.container.textContent).not.toContain("2 posts selected");

    React.act(() => {
      setInputValue(searchInput ?? undefined, "beta");
    });

    const filteredSelectAll = view.container.querySelector('input[aria-label="Select all posts"]');

    React.act(() => {
      if (filteredSelectAll instanceof HTMLInputElement) {
        filteredSelectAll.click();
      }
    });

    expect(view.container.textContent).toContain("1 post selected");

    const filteredBulkSelect = Array.from(view.container.querySelectorAll("select")).find(
      (select) => select.querySelector('option[value="delete"]')
    );

    React.act(() => {
      setSelectValue(filteredBulkSelect, "delete");
    });

    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Apply")
        ?.click();
      await flushMicrotasks();
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Delete selected")
        ?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.deletePostCalls).toEqual(["post-2"]);
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("1 post deleted.");
    expect(view.container.textContent).not.toContain("1 post selected");
  } finally {
    view.cleanup();
  }
});

test("PostsListPage loads without cache, refreshes on matching cache events, and surfaces load failures", async () => {
  pagePostState.cachedPostsOverride = null;
  pagePostState.postError = pagePostState.apiError("Posts unavailable.");
  pagePostState.getUserSettings.mockRejectedValueOnce(new Error("prefs unavailable"));

  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    expect(view.container.textContent).toContain("Loading posts");

    await React.act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Posts unavailable.");
    expect(pagePostState.getUserSettings).toHaveBeenCalled();

    pagePostState.postError = new Error("generic load failure");
    await React.act(async () => {
      pagePostState.postSubscribers.forEach((handler) => handler({ key: "postsList" }));
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Failed to load posts.");

    pagePostState.postError = null;
    await React.act(async () => {
      pagePostState.postSubscribers.forEach((handler) => handler({ key: "postsList" }));
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Product launch");
    expect(pagePostState.postRefreshCalls).toEqual([
      { force: true, background: true },
      { force: true, background: true },
      { force: true, background: true },
    ]);
  } finally {
    view.cleanup();
  }
});

test("PostsListPage opens drawer via sheet controls, creates with navigation, and reports action failures", async () => {
  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    const titleInput = () =>
      view.container.querySelector('input[placeholder="e.g. Product launch update"]');

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "sheet-trigger-open")
        ?.click();
    });
    expect(
      view.container.querySelector("[data-has-open-change='true']")?.getAttribute("data-sheet-open")
    ).toBe("true");

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "sheet-trigger-close")
        ?.click();
    });
    expect(
      view.container.querySelector("[data-has-open-change='true']")?.getAttribute("data-sheet-open")
    ).toBe("false");

    React.act(() => {
      buttons()
        // TASK-497-01: Posts create button relabeled "New" → "New post".
        .find((button) => button.textContent === "New post")
        ?.click();
      setInputValue(titleInput() ?? undefined, "Launch Memo");
    });
    await React.act(async () => {
      await flushMicrotasks();
    });

    pagePostState.createPostError = new Error("create generic failure");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "Create Post")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to create post.");
    expect(pagePostState.toastError).toHaveBeenCalledWith("Failed to create post.");

    pagePostState.createPostError = null;
    await React.act(async () => {
      setInputValue(titleInput() ?? undefined, "Launch Memo");
      await flushMicrotasks();
      buttons()
        .find((button) => button.textContent === "Create Post")
        ?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.navigateCalls).toContain("/posts/created-post");
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith('Post "Launch Memo" created.');

    pagePostState.previewPostError = pagePostState.apiError("Preview denied.");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "preview-post-row")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Preview denied.");

    pagePostState.publishPostError = new Error("publish generic failure");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "publish-post-row")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to publish post.");
    expect(pagePostState.toastError).toHaveBeenCalledWith("Failed to publish post.");

    pagePostState.unpublishPostError = pagePostState.apiError("Unpublish denied.");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "unpublish-post-row")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Unpublish denied.");

    pagePostState.duplicatePostError = new Error("duplicate generic failure");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "duplicate-post-row")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to duplicate post.");

    pagePostState.deletePostError = pagePostState.apiError("Delete denied.");
    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "delete-post-row")
        ?.click();
      await flushMicrotasks();
      buttons()
        .find((button) => button.textContent === "Delete post")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Delete denied.");
    expect(pagePostState.toastError).toHaveBeenCalledWith("Delete denied.");
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "open");
  }
});

test("PostsCreateDrawer normalizes create payloads and toggles", async () => {
  const { PostsCreateDrawer } = await import("../../../core/admin/ui/posts/PostsCreateDrawer");

  const onCreatePost = vi.fn();
  const onOpenAfterCreateChange = vi.fn();
  const onOpenChange = vi.fn();

  const view = mount(
    <PostsCreateDrawer
      open
      onOpenChange={onOpenChange}
      onCreate={onCreatePost}
      openAfterCreate={false}
      onOpenAfterCreateChange={onOpenAfterCreateChange}
      error="Post error"
      slugRouteContext={{
        publicBaseUrl: "https://coderso.test",
        detailPathPattern: "/blog/:slug",
      }}
    />
  );

  try {
    expect(view.container.textContent).toContain("Unable to create post");

    const buttons = Array.from(view.container.querySelectorAll("button")) as HTMLButtonElement[];
    const toggles = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];

    React.act(() => {
      setInputValue(
        view.container.querySelector('input[placeholder="e.g. Product launch update"]') ??
          undefined,
        "Release Notes"
      );
      buttons.find((button) => button.textContent === "Create Post")?.click();
    });

    expect(view.container.textContent).toContain("https://coderso.test/blog/release-notes");

    React.act(() => {
      toggles[0]?.click();
      buttons
        .find((button) => button.getAttribute("aria-label") === "Close create post drawer")
        ?.click();
    });

    expect(onCreatePost).toHaveBeenCalledWith({
      title: "Release Notes",
      slug: "release-notes",
      openAfterCreate: false,
    });
    expect(onOpenAfterCreateChange).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PostsListPage scopes selection to the paginated visible rows", async () => {
  pagePostState.posts = Array.from({ length: 12 }, (_, index) => ({
    ...pagePostState.posts[0],
    id: `post-${index + 1}`,
    title: `Post ${String(index + 1).padStart(2, "0")}`,
    slug: `post-${index + 1}`,
    tags: [`tag-${index + 1}`],
  }));

  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    const selectAllPosts = view.container.querySelector('input[aria-label="Select all posts"]');
    React.act(() => {
      if (selectAllPosts instanceof HTMLInputElement) {
        selectAllPosts.click();
      }
    });

    expect(view.container.textContent).toContain("10 posts selected");

    await React.act(async () => {
      const buttons = () => Array.from(view.container.querySelectorAll("button"));
      buttons()
        .filter((button) => button.textContent === "Next")[0]
        ?.click();
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Post 11");
    expect(view.container.textContent).not.toContain("10 posts selected");
  } finally {
    view.cleanup();
  }
});

test("PostsListPage drives create, preview, publish, duplicate, delete, and preferences", async () => {
  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: (url: string) => pagePostState.previewUrlCalls.push(url),
  });
  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Posts");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "New post")
        ?.click();
      buttons()
        .find((button) => button.textContent === "edit-post-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "preview-post-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "publish-post-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "unpublish-post-row")
        ?.click();
      buttons()
        .find((button) => button.textContent === "duplicate-post-row")
        ?.click();
      await flushMicrotasks();
    });

    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "delete-post-row")
        ?.click();
      await flushMicrotasks();
      buttons()
        .find((button) => button.textContent === "Delete post")
        ?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.previewPostCalls).toContain("post-1");
    expect(pagePostState.publishPostCalls).toContain("post-1");
    expect(pagePostState.unpublishPostCalls).toContain("post-1");
    expect(pagePostState.duplicatePostCalls).toContain("post-1");
    expect(pagePostState.deletePostCalls).toContain("post-1");
    expect(pagePostState.previewUrlCalls).toContain("https://preview.test/post");
    expect(pagePostState.navigateCalls).toContain("/posts/post-1");
    expect(pagePostState.navigateCalls).toContain("/posts/duplicated-post");
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("Post published.");
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("Post unpublished.");
    expect(pagePostState.toastSuccess).toHaveBeenCalledWith("Post deleted.");
    expect(pagePostState.getUserSettings).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PostsListPage surfaces refresh ApiClient failures through matching cache events", async () => {
  pagePostState.postError = pagePostState.apiError("Refresh throttled.");

  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    await React.act(async () => {
      pagePostState.postSubscribers.forEach((handler) => handler({ key: "postsList" }));
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Refresh throttled.");
  } finally {
    view.cleanup();
    pagePostState.postError = null;
  }
});

test("PostsListPage shows the generic error when the initial load fails without a cache", async () => {
  pagePostState.cachedPostsOverride = null;
  pagePostState.postError = new Error("network unavailable");

  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Failed to load posts.");
    expect(pagePostState.postRefreshCalls).toEqual([{ force: true, background: true }]);
  } finally {
    view.cleanup();
    pagePostState.postError = null;
    pagePostState.cachedPostsOverride = undefined;
  }
});

test("PostsListPage falls back to a null slug context when site settings fail to load", async () => {
  pagePostState.siteSettingsError = new Error("settings unavailable");

  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });
    // Let the rejected site-settings promise settle inside act before opening
    // the create drawer.
    await React.act(async () => {
      await flushMicrotasks();
    });

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "New post")
        ?.click();
    });

    React.act(() => {
      setInputValue(
        view.container.querySelector('input[placeholder="product-launch-update"]') ?? undefined,
        "release-notes"
      );
    });

    expect(view.container.textContent).toContain("Route hint");
  } finally {
    view.cleanup();
    pagePostState.siteSettingsError = null;
  }
});

test("PostsListPage toggles individual rows and reports a fully failed bulk publish", async () => {
  pagePostState.posts = [
    {
      ...pagePostState.posts[0],
      id: "post-1",
      title: "Alpha",
      slug: "alpha",
    },
    {
      ...pagePostState.posts[0],
      id: "post-2",
      title: "Beta",
      slug: "beta",
    },
  ];
  pagePostState.publishPostError = new Error("publish down");

  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    const rowCheckbox = (title: string): HTMLInputElement | null =>
      view.container.querySelector(
        `input[aria-label="Select ${title}"]`
      ) as HTMLInputElement | null;

    React.act(() => {
      if (rowCheckbox("Alpha") instanceof HTMLInputElement) {
        rowCheckbox("Alpha")?.click();
      }
    });
    expect(view.container.textContent).toContain("1 post selected");

    React.act(() => {
      if (rowCheckbox("Alpha") instanceof HTMLInputElement) {
        rowCheckbox("Alpha")?.click();
      }
    });
    expect(view.container.textContent).not.toContain("post selected");

    React.act(() => {
      if (rowCheckbox("Alpha") instanceof HTMLInputElement) {
        rowCheckbox("Alpha")?.click();
      }
      if (rowCheckbox("Beta") instanceof HTMLInputElement) {
        rowCheckbox("Beta")?.click();
      }
    });
    expect(view.container.textContent).toContain("2 posts selected");

    const bulkSelect = Array.from(view.container.querySelectorAll("select")).find((select) =>
      select.querySelector('option[value="publish"]')
    );

    React.act(() => {
      setSelectValue(bulkSelect, "publish");
    });

    await React.act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Apply")
        ?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.publishPostCalls).toEqual(["post-1", "post-2"]);
    expect(view.container.textContent).toContain("Failed to publish 2 posts.");
  } finally {
    view.cleanup();
    pagePostState.publishPostError = null;
  }
});

test("PostsListPage surfaces generic preview failures and duplicate ApiClient errors", async () => {
  pagePostState.previewPostError = new Error("preview exploded");
  pagePostState.duplicatePostError = pagePostState.apiError("Duplicate blocked.");

  const { PostsListPage } = await import("../../../core/admin/ui/posts/PostsListPage");

  const view = mount(<PostsListPage />);

  try {
    await React.act(async () => {
      await flushMicrotasks();
    });

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "preview-post-row")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to generate preview.");

    await React.act(async () => {
      buttons()
        .find((button) => button.textContent === "duplicate-post-row")
        ?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Duplicate blocked.");
  } finally {
    view.cleanup();
    pagePostState.previewPostError = null;
    pagePostState.duplicatePostError = null;
  }
});
