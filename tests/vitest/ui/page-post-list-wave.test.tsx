// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
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
    status: "draft" as "draft" | "published" | "scheduled" | "archived",
    updatedAt: "2026-03-06T12:00:00.000Z",
    author: { id: "author-1", name: "Admin", email: "admin@example.com" },
  };

  const post = {
    id: "post-1",
    typeId: "post-type",
    title: "Product launch",
    slug: "product-launch",
    status: "draft" as "draft" | "published" | "archived" | "scheduled",
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
    pages: [{ ...page }],
    posts: [{ ...post }],
    cachedPagesOverride: undefined as typeof page[] | null | undefined,
    cachedPostsOverride: undefined as typeof post[] | null | undefined,
    pageError: null as unknown,
    postError: null as unknown,
    createPageError: null as unknown,
    createPostError: null as unknown,
    deletePageError: null as unknown,
    deletePostError: null as unknown,
    publishPageError: null as unknown,
    publishPostError: null as unknown,
    unpublishPageError: null as unknown,
    unpublishPostError: null as unknown,
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
      this.pages = [{ ...page }];
      this.posts = [{ ...post }];
      this.cachedPagesOverride = undefined;
      this.cachedPostsOverride = undefined;
      this.pageError = null;
      this.postError = null;
      this.createPageError = null;
      this.createPostError = null;
      this.deletePageError = null;
      this.deletePostError = null;
      this.publishPageError = null;
      this.publishPostError = null;
      this.unpublishPageError = null;
      this.unpublishPostError = null;
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
      this.getUserSettings.mockReset();
      this.getUserSettings.mockImplementation(async () => ({ "pages.openAfterCreate": true }));
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
      <button type="button" onClick={() => onOpenChange?.(true)}>
        sheet-trigger-open
      </button>
      <button type="button" onClick={() => onOpenChange?.(false)}>
        sheet-trigger-close
      </button>
      {children}
    </div>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
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
  getCachedPages: () =>
    pagePostState.cachedPagesOverride === undefined
      ? pagePostState.pages
      : pagePostState.cachedPagesOverride,
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
    if (pagePostState.unpublishPageError) throw pagePostState.unpublishPageError;
    return { ok: true };
  }),
}));

vi.mock("@/services/postsClient", () => ({
  getCachedPosts: () =>
    pagePostState.cachedPostsOverride === undefined
      ? pagePostState.posts
      : pagePostState.cachedPostsOverride,
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
    if (pagePostState.unpublishPostError) throw pagePostState.unpublishPostError;
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
    selectedIds = [],
    isAllSelected,
    onToggleAll,
    onTogglePage,
    onEdit,
    onPreview,
    onPublish,
    onUnpublish,
    onDuplicate,
    onDelete,
  }: {
    items: Array<{ id: string; title: string }>;
    emptyMessage?: string;
    selectedIds?: string[];
    isAllSelected?: boolean;
    onToggleAll?: () => void;
    onTogglePage?: (id: string) => void;
    onEdit: (id: string) => void;
    onPreview: (id: string) => void;
    onPublish: (id: string) => void;
    onUnpublish: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <div>
      <span>{emptyMessage ?? `pages:${items.length}`}</span>
      <span>{`page-selected:${selectedIds.length}`}</span>
      <span>{`page-all-selected:${String(Boolean(isAllSelected))}`}</span>
      {items.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
      <button type="button" onClick={() => onToggleAll?.()}>
        toggle-page-all
      </button>
      <button type="button" onClick={() => onTogglePage?.(items[0]!.id)}>
        toggle-page-first
      </button>
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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
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
    const buttons = Array.from(view.container.querySelectorAll("button")) as HTMLButtonElement[];
    const toggles = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];

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

test("PageListPage loads without cache, refreshes on matching cache events, and surfaces load failures", async () => {
  pagePostState.cachedPagesOverride = null;
  pagePostState.pageError = pagePostState.apiError("Pages unavailable.");
  pagePostState.getUserSettings.mockRejectedValueOnce(new Error("prefs unavailable"));

  const { PageListPage } = await import(
    "../../../core/admin/ui/pages/PageListPage"
  );

  const view = mount(<PageListPage />);

  try {
    expect(view.container.textContent).toContain("Loading pages");

    await act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Pages unavailable.");
    expect(pagePostState.getUserSettings).toHaveBeenCalled();

    pagePostState.pageError = new Error("generic page load failure");
    await act(async () => {
      pagePostState.pageSubscribers.forEach((handler) =>
        handler({ key: "pagesList" })
      );
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Failed to load pages.");

    pagePostState.pageError = null;
    await act(async () => {
      pagePostState.pageSubscribers.forEach((handler) =>
        handler({ key: "pagesList" })
      );
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Landing");
    expect(pagePostState.pageRefreshCalls).toEqual([
      { force: true, background: true },
      { force: true, background: true },
      { force: true, background: true },
    ]);
  } finally {
    view.cleanup();
  }
});

test("PageListPage opens drawer via sheet controls, creates with navigation, and reports action failures", async () => {
  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  const { PageListPage } = await import(
    "../../../core/admin/ui/pages/PageListPage"
  );

  const view = mount(<PageListPage />);

  try {
    await act(async () => {
      await flushMicrotasks();
    });

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    const titleInput = () =>
      view.container.querySelector('input[placeholder="e.g. About us"]');

    act(() => {
      buttons().find((button) => button.textContent === "sheet-trigger-open")?.click();
    });
    expect(
      view.container
        .querySelector("[data-has-open-change='true']")
        ?.getAttribute("data-sheet-open")
    ).toBe("true");

    act(() => {
      buttons().find((button) => button.textContent === "sheet-trigger-close")?.click();
    });
    expect(
      view.container
        .querySelector("[data-has-open-change='true']")
        ?.getAttribute("data-sheet-open")
    ).toBe("false");

    act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Create New Page"))
        ?.click();
      setInputValue(titleInput() ?? undefined, "Docs Home");
    });
    await act(async () => {
      await flushMicrotasks();
    });

    pagePostState.createPageError = new Error("create page generic failure");
    await act(async () => {
      buttons().find((button) => button.textContent === "Create Page")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to create page.");

    pagePostState.createPageError = null;
    await act(async () => {
      setInputValue(titleInput() ?? undefined, "Docs Home");
      await flushMicrotasks();
      buttons().find((button) => button.textContent === "Create Page")?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.navigateCalls).toContain("/pages/created-page");

    pagePostState.previewPageError = pagePostState.apiError("Preview page denied.");
    await act(async () => {
      buttons().find((button) => button.textContent === "preview-page-row")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Preview page denied.");

    pagePostState.publishPageError = new Error("publish page generic failure");
    await act(async () => {
      buttons().find((button) => button.textContent === "publish-page-row")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to publish page.");

    pagePostState.unpublishPageError = pagePostState.apiError("Unpublish page denied.");
    await act(async () => {
      buttons().find((button) => button.textContent === "unpublish-page-row")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Unpublish page denied.");

    pagePostState.duplicatePageError = new Error("duplicate page generic failure");
    await act(async () => {
      buttons().find((button) => button.textContent === "duplicate-page-row")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to duplicate page.");

    pagePostState.deletePageError = pagePostState.apiError("Delete page denied.");
    await act(async () => {
      buttons().find((button) => button.textContent === "delete-page-row")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Delete page denied.");
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "confirm");
    Reflect.deleteProperty(window, "open");
  }
});

test("PageListPage applies filters, refreshes on cache events, and creates without editor navigation when preference is off", async () => {
  pagePostState.pages = [
    pagePostState.pages[0],
    {
      ...pagePostState.pages[0],
      id: "page-2",
      title: "Docs hub",
      slug: "/docs",
      status: "published",
      author: {
        id: "author-2",
        name: "Editor",
        email: "editor@example.com",
      },
    },
  ];

  const { PageListPage } = await import(
    "../../../core/admin/ui/pages/PageListPage"
  );

  const view = mount(<PageListPage />);

  try {
    await act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Showing 2 of 2 pages");
    expect(pagePostState.pageRefreshCalls).toEqual([
      { force: false, background: undefined },
    ]);

    const searchInput = view.container.querySelector(
      'input[placeholder="Search pages by title..."]'
    );
    const selects = Array.from(view.container.querySelectorAll("select"));
    const statusSelect = selects.find((select) =>
      select.querySelector('option[value="scheduled"]')
    );
    const authorSelect = selects.find((select) =>
      select.querySelector('option[value="author-2"]')
    );

    act(() => {
      setInputValue(searchInput ?? undefined, "missing");
    });

    expect(view.container.textContent).toContain("No pages match your current filters.");
    expect(view.container.textContent).toContain("Showing 0 of 2 pages");

    act(() => {
      setInputValue(searchInput ?? undefined, "docs");
      setSelectValue(statusSelect, "published");
      setSelectValue(authorSelect, "author-2");
    });

    expect(view.container.textContent).toContain("Docs hub");
    expect(view.container.textContent).toContain("Showing 1 of 2 pages");
    expect(
      Array.from(view.container.querySelectorAll("button")).filter(
        (button) => button.textContent === "edit-page-row"
      )
    ).toHaveLength(1);

    await act(async () => {
      pagePostState.pageSubscribers.forEach((handler) =>
        handler({ key: "postsList" })
      );
      await flushMicrotasks();
    });

    expect(pagePostState.pageRefreshCalls).toHaveLength(1);

    await act(async () => {
      pagePostState.pageSubscribers.forEach((handler) =>
        handler({ key: "pagesList" })
      );
      await flushMicrotasks();
    });

    expect(pagePostState.pageRefreshCalls).toEqual([
      { force: false, background: undefined },
      { force: true, background: true },
    ]);

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Create New Page"))
        ?.click();
    });

    expect(
      view.container
        .querySelector("[data-has-open-change='true']")
        ?.getAttribute("data-sheet-open")
    ).toBe("true");

    const openAfterCreateToggle = view.container.querySelector(
      "#page-open-after-create"
    );
    const titleInput = view.container.querySelector(
      'input[placeholder="e.g. About us"]'
    );

    await act(async () => {
      if (openAfterCreateToggle instanceof HTMLInputElement) {
        openAfterCreateToggle.click();
      }
      setInputValue(titleInput ?? undefined, "Support");
      buttons().find((button) => button.textContent === "Create Page")?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.setUserSettingCalls).toContainEqual({
      key: "pages.openAfterCreate",
      value: false,
    });
    expect(pagePostState.createPageCalls).toEqual([
      {
        title: "Support",
        slug: "/support",
        template: "landing",
        data: {
          blocks: [],
          settings: { template: "landing" },
        },
      },
    ]);
    expect(pagePostState.pageRefreshCalls).toEqual([
      { force: false, background: undefined },
      { force: true, background: true },
      { force: true, background: true },
    ]);
    expect(pagePostState.navigateCalls).not.toContain("/pages/created-page");
    expect(
      view.container
        .querySelector("[data-has-open-change='true']")
        ?.getAttribute("data-sheet-open")
    ).toBe("false");
  } finally {
    view.cleanup();
  }
});

test("PageListPage shows bulk actions for visible selection, trims hidden selection, and applies publish", async () => {
  pagePostState.pages = [
    pagePostState.pages[0],
    {
      ...pagePostState.pages[0],
      id: "page-2",
      title: "Docs hub",
      slug: "/docs",
      status: "draft",
      author: {
        id: "author-2",
        name: "Editor",
        email: "editor@example.com",
      },
    },
  ];

  const { PageListPage } = await import(
    "../../../core/admin/ui/pages/PageListPage"
  );

  const view = mount(<PageListPage />);

  try {
    await act(async () => {
      await flushMicrotasks();
    });

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    const searchInput = view.container.querySelector(
      'input[placeholder="Search pages by title..."]'
    );

    act(() => {
      buttons().find((button) => button.textContent === "toggle-page-all")?.click();
    });

    expect(view.container.textContent).toContain("Selected 2");
    expect(view.container.textContent).toContain("page-selected:2");

    act(() => {
      setInputValue(searchInput ?? undefined, "docs");
    });

    expect(view.container.textContent).toContain("Selected 1");
    expect(view.container.textContent).toContain("page-selected:1");
    expect(view.container.textContent).toContain("Docs hub");
    expect(
      Array.from(view.container.querySelectorAll("button")).filter(
        (button) => button.textContent === "edit-page-row"
      )
    ).toHaveLength(1);

    const bulkSelect = Array.from(view.container.querySelectorAll("select")).find((select) =>
      select.querySelector('option[value="publish"]')
    );

    act(() => {
      setSelectValue(bulkSelect, "publish");
    });

    await act(async () => {
      buttons().find((button) => button.textContent === "Apply")?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.publishPageCalls).toEqual(["page-2"]);
    expect(view.container.textContent).not.toContain("Selected 1");
    expect(pagePostState.pageRefreshCalls).toEqual([
      { force: false, background: undefined },
      { force: true, background: true },
    ]);
  } finally {
    view.cleanup();
  }
});

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

  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => false),
  });

  const { PostsListPage } = await import(
    "../../../core/admin/ui/posts/PostsListPage"
  );

  const view = mount(<PostsListPage />);

  try {
    await act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Product launch");
    expect(view.container.textContent).toContain("Roadmap");
    expect(pagePostState.postRefreshCalls).toEqual([
      { force: true, background: true },
    ]);

    const searchInput = view.container.querySelector(
      'input[placeholder="Search pages by title..."]'
    );

    act(() => {
      setInputValue(searchInput ?? undefined, "unknown");
    });

    expect(view.container.textContent).not.toContain("Product launch");
    expect(view.container.textContent).not.toContain("Roadmap");

    act(() => {
      setInputValue(searchInput ?? undefined, "campaign");
    });

    expect(view.container.textContent).toContain("Product launch");
    expect(view.container.textContent).not.toContain("Roadmap");

    await act(async () => {
      pagePostState.postSubscribers.forEach((handler) =>
        handler({ key: "pagesList" })
      );
      await flushMicrotasks();
    });

    expect(pagePostState.postRefreshCalls).toHaveLength(1);

    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    act(() => {
      buttons().find((button) => button.textContent === "delete-post-row")?.click();
    });

    expect(pagePostState.deletePostCalls).toEqual([]);

    act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Create New Post"))
        ?.click();
    });

    expect(
      view.container
        .querySelector("[data-has-open-change='true']")
        ?.getAttribute("data-sheet-open")
    ).toBe("true");

    const openAfterCreateToggle = view.container.querySelector(
      "#post-open-after-create"
    );
    const titleInput = view.container.querySelector(
      'input[placeholder="e.g. Product launch update"]'
    );

    await act(async () => {
      if (openAfterCreateToggle instanceof HTMLInputElement) {
        openAfterCreateToggle.click();
      }
      setInputValue(titleInput ?? undefined, "Release Notes");
      buttons().find((button) => button.textContent === "Create Post")?.click();
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
    expect(pagePostState.navigateCalls).not.toContain("/coderso/posts/created-post");
    expect(
      view.container
        .querySelector("[data-has-open-change='true']")
        ?.getAttribute("data-sheet-open")
    ).toBe("false");
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "confirm");
  }
});

test("PostsListPage loads without cache, refreshes on matching cache events, and surfaces load failures", async () => {
  pagePostState.cachedPostsOverride = null;
  pagePostState.postError = pagePostState.apiError("Posts unavailable.");
  pagePostState.getUserSettings.mockRejectedValueOnce(new Error("prefs unavailable"));

  const { PostsListPage } = await import(
    "../../../core/admin/ui/posts/PostsListPage"
  );

  const view = mount(<PostsListPage />);

  try {
    expect(view.container.textContent).toContain("Loading posts");

    await act(async () => {
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Posts unavailable.");
    expect(pagePostState.getUserSettings).toHaveBeenCalled();

    pagePostState.postError = new Error("generic load failure");
    await act(async () => {
      pagePostState.postSubscribers.forEach((handler) =>
        handler({ key: "postsList" })
      );
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Failed to load posts.");

    pagePostState.postError = null;
    await act(async () => {
      pagePostState.postSubscribers.forEach((handler) =>
        handler({ key: "postsList" })
      );
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
  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(window, "open", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });

  const { PostsListPage } = await import(
    "../../../core/admin/ui/posts/PostsListPage"
  );

  const view = mount(<PostsListPage />);

  try {
    await act(async () => {
      await flushMicrotasks();
    });

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    const titleInput = () =>
      view.container.querySelector(
        'input[placeholder="e.g. Product launch update"]'
      );

    act(() => {
      buttons().find((button) => button.textContent === "sheet-trigger-open")?.click();
    });
    expect(
      view.container
        .querySelector("[data-has-open-change='true']")
        ?.getAttribute("data-sheet-open")
    ).toBe("true");

    act(() => {
      buttons().find((button) => button.textContent === "sheet-trigger-close")?.click();
    });
    expect(
      view.container
        .querySelector("[data-has-open-change='true']")
        ?.getAttribute("data-sheet-open")
    ).toBe("false");

    act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Create New Post"))
        ?.click();
      setInputValue(titleInput() ?? undefined, "Launch Memo");
    });
    await act(async () => {
      await flushMicrotasks();
    });

    pagePostState.createPostError = new Error("create generic failure");
    await act(async () => {
      buttons().find((button) => button.textContent === "Create Post")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to create post.");

    pagePostState.createPostError = null;
    await act(async () => {
      setInputValue(titleInput() ?? undefined, "Launch Memo");
      await flushMicrotasks();
      buttons().find((button) => button.textContent === "Create Post")?.click();
      await flushMicrotasks();
    });

    expect(pagePostState.navigateCalls).toContain("/coderso/posts/created-post");

    pagePostState.previewPostError = pagePostState.apiError("Preview denied.");
    await act(async () => {
      buttons().find((button) => button.textContent === "preview-post-row")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Preview denied.");

    pagePostState.publishPostError = new Error("publish generic failure");
    await act(async () => {
      buttons().find((button) => button.textContent === "publish-post-row")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to publish post.");

    pagePostState.unpublishPostError = pagePostState.apiError("Unpublish denied.");
    await act(async () => {
      buttons().find((button) => button.textContent === "unpublish-post-row")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Unpublish denied.");

    pagePostState.duplicatePostError = new Error("duplicate generic failure");
    await act(async () => {
      buttons().find((button) => button.textContent === "duplicate-post-row")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Failed to duplicate post.");

    pagePostState.deletePostError = pagePostState.apiError("Delete denied.");
    await act(async () => {
      buttons().find((button) => button.textContent === "delete-post-row")?.click();
      await flushMicrotasks();
    });
    expect(view.container.textContent).toContain("Delete denied.");
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "confirm");
    Reflect.deleteProperty(window, "open");
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
      await flushMicrotasks();
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
      await flushMicrotasks();
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
    Reflect.deleteProperty(window, "confirm");
  }
});
