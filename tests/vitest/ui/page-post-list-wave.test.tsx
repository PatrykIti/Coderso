// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

const pagePostState = vi.hoisted(() => {
  const apiError = (message: string) => ({
    name: "ApiClientError",
    message,
    code: "request_failed",
    status: 400,
  });

  const page = {
    id: "page-1",
    title: "Landing",
    slug: "/landing",
    status: "draft" as const,
    updatedAt: "2026-03-06T12:00:00.000Z",
    author: { id: "author-1", name: "Admin", email: "admin@example.com" },
  };

  const post = {
    id: "post-1",
    typeId: "post-type",
    title: "Product launch",
    slug: "product-launch",
    status: "draft" as const,
    data: {},
    tags: ["news"],
    scheduledAt: null,
    createdAt: "2026-03-06T12:00:00.000Z",
    updatedAt: "2026-03-06T12:00:00.000Z",
    publishedAt: null,
    author: { id: "author-1", name: "Admin", email: "admin@example.com" },
  };

  return {
    apiError,
    pages: [page],
    posts: [post],
    pageError: null as unknown,
    postError: null as unknown,
    createPageError: null as unknown,
    createPostError: null as unknown,
    deletePageError: null as unknown,
    deletePostError: null as unknown,
    publishPageError: null as unknown,
    publishPostError: null as unknown,
    previewPageError: null as unknown,
    previewPostError: null as unknown,
    duplicatePageError: null as unknown,
    duplicatePostError: null as unknown,
    pageSubscribers: new Set<(event: { key: string }) => void>(),
    postSubscribers: new Set<(event: { key: string }) => void>(),
    navigateCalls: [] as string[],
    setUserSettingCalls: [] as Array<{ key: string; value: unknown }>,
    previewUrlCalls: [] as string[],
    pageRefreshCalls: [] as Array<{ force?: boolean; background?: boolean }>,
    postRefreshCalls: [] as Array<{ force?: boolean; background?: boolean }>,
    createPageCalls: [] as Array<Record<string, unknown>>,
    createPostCalls: [] as Array<Record<string, unknown>>,
    deletePageCalls: [] as string[],
    deletePostCalls: [] as string[],
    previewPageCalls: [] as string[],
    previewPostCalls: [] as string[],
    publishPageCalls: [] as string[],
    publishPostCalls: [] as string[],
    unpublishPageCalls: [] as string[],
    unpublishPostCalls: [] as string[],
    duplicatePageCalls: [] as string[],
    duplicatePostCalls: [] as string[],
    getUserSettings: vi.fn(async () => ({ "pages.openAfterCreate": true })),
    reset() {
      this.pageError = null;
      this.postError = null;
      this.createPageError = null;
      this.createPostError = null;
      this.deletePageError = null;
      this.deletePostError = null;
      this.publishPageError = null;
      this.publishPostError = null;
      this.previewPageError = null;
      this.previewPostError = null;
      this.duplicatePageError = null;
      this.duplicatePostError = null;
      this.pageSubscribers.clear();
      this.postSubscribers.clear();
      this.navigateCalls = [];
      this.setUserSettingCalls = [];
      this.previewUrlCalls = [];
      this.pageRefreshCalls = [];
      this.postRefreshCalls = [];
      this.createPageCalls = [];
      this.createPostCalls = [];
      this.deletePageCalls = [];
      this.deletePostCalls = [];
      this.previewPageCalls = [];
      this.previewPostCalls = [];
      this.publishPageCalls = [];
      this.publishPostCalls = [];
      this.unpublishPageCalls = [];
      this.unpublishPostCalls = [];
      this.duplicatePageCalls = [];
      this.duplicatePostCalls = [];
      this.getUserSettings.mockClear();
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
  }) => (
    <input
      id={id}
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  };
});

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-sheet-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {children}
    </div>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    pagesList: "pagesList",
    postsList: "postsList",
  },
}));

vi.mock("@/services/userSettingsClient", () => ({
  getUserSettings: pagePostState.getUserSettings,
  setUserSetting: vi.fn(async (key: string, value: unknown) => {
    pagePostState.setUserSettingCalls.push({ key, value });
  }),
}));

vi.mock("@/services/pagesClient", () => ({
  getCachedPages: () => pagePostState.pages,
  listPagesCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    pagePostState.pageRefreshCalls.push({
      force,
      background: force ? true : undefined,
    });
    if (pagePostState.pageError) throw pagePostState.pageError;
    return pagePostState.pages;
  }),
  createPage: vi.fn(async (input) => {
    pagePostState.createPageCalls.push(input);
    if (pagePostState.createPageError) throw pagePostState.createPageError;
    return { ...pagePostState.pages[0], id: "created-page", ...input };
  }),
  deletePage: vi.fn(async (id: string) => {
    pagePostState.deletePageCalls.push(id);
    if (pagePostState.deletePageError) throw pagePostState.deletePageError;
    return { ok: true };
  }),
  duplicatePage: vi.fn(async (id: string) => {
    pagePostState.duplicatePageCalls.push(id);
    if (pagePostState.duplicatePageError) throw pagePostState.duplicatePageError;
    return { id: "duplicated-page" };
  }),
  previewPage: vi.fn(async (id: string) => {
    pagePostState.previewPageCalls.push(id);
    if (pagePostState.previewPageError) throw pagePostState.previewPageError;
    return { previewUrl: "https://preview.test/page" };
  }),
  publishPage: vi.fn(async (id: string) => {
    pagePostState.publishPageCalls.push(id);
    if (pagePostState.publishPageError) throw pagePostState.publishPageError;
    return { ok: true };
  }),
  unpublishPage: vi.fn(async (id: string) => {
    pagePostState.unpublishPageCalls.push(id);
    return { ok: true };
  }),
}));

vi.mock("@/services/postsClient", () => ({
  getCachedPosts: () => pagePostState.posts,
  listPostsCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    pagePostState.postRefreshCalls.push({
      force,
      background: force ? true : undefined,
    });
    if (pagePostState.postError) throw pagePostState.postError;
    return pagePostState.posts;
  }),
  createPost: vi.fn(async (input) => {
    pagePostState.createPostCalls.push(input);
    if (pagePostState.createPostError) throw pagePostState.createPostError;
    return { ...pagePostState.posts[0], id: "created-post", ...input };
  }),
  deletePost: vi.fn(async (id: string) => {
    pagePostState.deletePostCalls.push(id);
    if (pagePostState.deletePostError) throw pagePostState.deletePostError;
    return { ok: true };
  }),
  duplicatePost: vi.fn(async (id: string) => {
    pagePostState.duplicatePostCalls.push(id);
    if (pagePostState.duplicatePostError) throw pagePostState.duplicatePostError;
    return { id: "duplicated-post" };
  }),
  previewPost: vi.fn(async (id: string) => {
    pagePostState.previewPostCalls.push(id);
    if (pagePostState.previewPostError) throw pagePostState.previewPostError;
    return { previewUrl: "https://preview.test/post" };
  }),
  publishPost: vi.fn(async (id: string) => {
    pagePostState.publishPostCalls.push(id);
    if (pagePostState.publishPostError) throw pagePostState.publishPostError;
    return { ok: true };
  }),
  unpublishPost: vi.fn(async (id: string) => {
    pagePostState.unpublishPostCalls.push(id);
    return { ok: true };
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (path: string) => pagePostState.navigateCalls.push(path),
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
    activeHref,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    activeHref?: string;
  }) => (
    <div data-active-href={activeHref}>
      <div>{breadcrumbs}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    if (handler.toString().includes("postsList")) {
      pagePostState.postSubscribers.add(handler);
      return () => pagePostState.postSubscribers.delete(handler);
    }
    pagePostState.pageSubscribers.add(handler);
    return () => pagePostState.pageSubscribers.delete(handler);
  },
}));

vi.mock("../../../core/admin/ui/pages/PageTable", () => ({
  PageTable: ({
    items,
    emptyMessage,
    onEdit,
    onPreview,
    onPublish,
    onUnpublish,
    onDuplicate,
    onDelete,
  }: {
    items: Array<{ id: string; title: string }>;
    emptyMessage?: string;
    onEdit: (id: string) => void;
    onPreview: (id: string) => void;
    onPublish: (id: string) => void;
    onUnpublish: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <div>
      <span>{emptyMessage ?? `pages:${items.length}`}</span>
      {items.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
      <button type="button" onClick={() => onEdit(items[0]!.id)}>
        edit-page-row
      </button>
      <button type="button" onClick={() => onPreview(items[0]!.id)}>
        preview-page-row
      </button>
      <button type="button" onClick={() => onPublish(items[0]!.id)}>
        publish-page-row
      </button>
      <button type="button" onClick={() => onUnpublish(items[0]!.id)}>
        unpublish-page-row
      </button>
      <button type="button" onClick={() => onDuplicate(items[0]!.id)}>
        duplicate-page-row
      </button>
      <button type="button" onClick={() => onDelete(items[0]!.id)}>
        delete-page-row
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/PostsTable", () => ({
  PostsTable: ({
    items,
    emptyMessage,
    onEdit,
    onPreview,
    onPublish,
    onUnpublish,
    onDuplicate,
    onDelete,
  }: {
    items: Array<{ id: string; title: string }>;
    emptyMessage?: string;
    onEdit: (id: string) => void;
    onPreview: (id: string) => void;
    onPublish: (id: string) => void;
    onUnpublish: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <div>
      <span>{emptyMessage ?? `posts:${items.length}`}</span>
      {items.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
      <button type="button" onClick={() => onEdit(items[0]!.id)}>
        edit-post-row
      </button>
      <button type="button" onClick={() => onPreview(items[0]!.id)}>
        preview-post-row
      </button>
      <button type="button" onClick={() => onPublish(items[0]!.id)}>
        publish-post-row
      </button>
      <button type="button" onClick={() => onUnpublish(items[0]!.id)}>
        unpublish-post-row
      </button>
      <button type="button" onClick={() => onDuplicate(items[0]!.id)}>
        duplicate-post-row
      </button>
      <button type="button" onClick={() => onDelete(items[0]!.id)}>
        delete-post-row
      </button>
    </div>
  ),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const setInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

afterEach(() => {
  vi.restoreAllMocks();
  pagePostState.reset();
});

test("PageCreateDrawer and PostsCreateDrawer normalize create payloads and toggles", async () => {
  const { PageCreateDrawer } = await import(
    "../../../core/admin/ui/pages/PageCreateDrawer"
  );
  const { PostsCreateDrawer } = await import(
    "../../../core/admin/ui/posts/PostsCreateDrawer"
  );

  const onCreatePage = vi.fn();
  const onCreatePost = vi.fn();
  const onOpenAfterCreateChange = vi.fn();
  const onOpenChange = vi.fn();

  const view = mount(
    <>
      <PageCreateDrawer
        open
        onOpenChange={onOpenChange}
        onCreate={onCreatePage}
        openAfterCreate
        onOpenAfterCreateChange={onOpenAfterCreateChange}
        error="Page error"
      />
      <PostsCreateDrawer
        open
        onOpenChange={onOpenChange}
        onCreate={onCreatePost}
        openAfterCreate={false}
        onOpenAfterCreateChange={onOpenAfterCreateChange}
        error="Post error"
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Unable to create page");
    expect(view.container.textContent).toContain("Unable to create post");

    const inputs = Array.from(view.container.querySelectorAll("input"));
    const selects = Array.from(view.container.querySelectorAll("select"));
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const toggles = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    );

    act(() => {
      setInputValue(
        view.container.querySelector('input[placeholder="e.g. About us"]') ?? undefined,
        "About us"
      );
      setSelectValue(selects[0], "contact");
      buttons.find((button) => button.textContent === "Create Page")?.click();
    });

    act(() => {
      toggles[0]?.click();
      buttons.find((button) => button.getAttribute("aria-label") === "Close create page drawer")?.click();
      setInputValue(
        view.container.querySelector('input[placeholder="e.g. Product launch update"]') ?? undefined,
        "Release Notes"
      );
      buttons.find((button) => button.textContent === "Create Post")?.click();
    });

    act(() => {
      toggles[1]?.click();
      buttons.find((button) => button.getAttribute("aria-label") === "Close create post drawer")?.click();
    });

    expect(onCreatePage).toHaveBeenCalledWith({
      title: "About us",
      slug: "/about-us",
      template: "contact",
      openAfterCreate: true,
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

test("PageFilters forwards query and filter changes", async () => {
  const { PageFilters } = await import("../../../core/admin/ui/pages/PageFilters");

  const onSearchChange = vi.fn();
  const onStatusChange = vi.fn();
  const onAuthorChange = vi.fn();

  const view = mount(
    <PageFilters
      search="home"
      status="draft"
      author="any"
      authorOptions={[{ value: "author-1", label: "Admin" }]}
      onSearchChange={onSearchChange}
      onStatusChange={onStatusChange}
      onAuthorChange={onAuthorChange}
    />
  );

  try {
    const input = view.container.querySelector("input");
    const selects = Array.from(view.container.querySelectorAll("select"));

    act(() => {
      setInputValue(input ?? undefined, "pricing");
      setSelectValue(selects[0], "published");
      setSelectValue(selects[1], "author-1");
    });

    expect(onSearchChange).toHaveBeenCalledWith("pricing");
    expect(onStatusChange).toHaveBeenCalledWith("published");
    expect(onAuthorChange).toHaveBeenCalledWith("author-1");
  } finally {
    view.cleanup();
  }
});

test("PageListPage and PostsListPage drive create, preview, publish, duplicate, delete, and preferences", async () => {
  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: (url: string) => pagePostState.previewUrlCalls.push(url),
  });
  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => true),
  });

  const { PageListPage } = await import(
    "../../../core/admin/ui/pages/PageListPage"
  );
  const { PostsListPage } = await import(
    "../../../core/admin/ui/posts/PostsListPage"
  );

  const view = mount(
    <>
      <PageListPage />
      <PostsListPage />
    </>
  );

  try {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Pages");
    expect(view.container.textContent).toContain("Posts");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    await act(async () => {
      buttons().find((button) => button.textContent?.includes("Create New Page"))?.click();
      buttons().find((button) => button.textContent?.includes("Create New Post"))?.click();
      buttons().find((button) => button.textContent === "edit-page-row")?.click();
      buttons().find((button) => button.textContent === "preview-page-row")?.click();
      buttons().find((button) => button.textContent === "publish-page-row")?.click();
      buttons().find((button) => button.textContent === "unpublish-page-row")?.click();
      buttons().find((button) => button.textContent === "duplicate-page-row")?.click();
      buttons().find((button) => button.textContent === "delete-page-row")?.click();
      buttons().find((button) => button.textContent === "edit-post-row")?.click();
      buttons().find((button) => button.textContent === "preview-post-row")?.click();
      buttons().find((button) => button.textContent === "publish-post-row")?.click();
      buttons().find((button) => button.textContent === "unpublish-post-row")?.click();
      buttons().find((button) => button.textContent === "duplicate-post-row")?.click();
      buttons().find((button) => button.textContent === "delete-post-row")?.click();
      await Promise.resolve();
    });

    expect(pagePostState.previewPageCalls).toContain("page-1");
    expect(pagePostState.publishPageCalls).toContain("page-1");
    expect(pagePostState.unpublishPageCalls).toContain("page-1");
    expect(pagePostState.duplicatePageCalls).toContain("page-1");
    expect(pagePostState.deletePageCalls).toContain("page-1");
    expect(pagePostState.previewPostCalls).toContain("post-1");
    expect(pagePostState.publishPostCalls).toContain("post-1");
    expect(pagePostState.unpublishPostCalls).toContain("post-1");
    expect(pagePostState.duplicatePostCalls).toContain("post-1");
    expect(pagePostState.deletePostCalls).toContain("post-1");
    expect(pagePostState.previewUrlCalls).toContain("https://preview.test/page");
    expect(pagePostState.previewUrlCalls).toContain("https://preview.test/post");
    expect(pagePostState.navigateCalls).toContain("/pages/page-1");
    expect(pagePostState.navigateCalls).toContain("/pages/duplicated-page");
    expect(pagePostState.navigateCalls).toContain("/coderso/posts/post-1");
    expect(pagePostState.navigateCalls).toContain("/coderso/posts/duplicated-post");
    expect(pagePostState.getUserSettings).toHaveBeenCalled();
  } finally {
    view.cleanup();
    delete (window as Window & { confirm?: unknown }).confirm;
  }
});
