// @vitest-environment happy-dom

import React from "react";
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
    cachedPagesOverride: undefined as (typeof page)[] | null | undefined,
    cachedPostsOverride: undefined as (typeof post)[] | null | undefined,
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
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
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
      this.toastSuccess.mockClear();
      this.toastError.mockClear();
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
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
    [key: string]: unknown;
  }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <button type="button" onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-dialog-open="true">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
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
    <div
      data-sheet-open={String(Boolean(open))}
      data-has-open-change={String(Boolean(onOpenChange))}
    >
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

vi.mock("sonner", () => ({
  toast: {
    success: pagePostState.toastSuccess,
    error: pagePostState.toastError,
  },
}));

vi.mock("@/services/userSettingsClient", () => ({
  getUserSettings: pagePostState.getUserSettings,
  setUserSetting: vi.fn(async (key: string, value: unknown) => {
    pagePostState.setUserSettingCalls.push({ key, value });
  }),
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: vi.fn(async () => ({
    adminBaseUrl: null,
    publicBaseUrl: "https://coderso.test",
    adminPath: "/admin",
    adminRedirectEnabled: false,
    homepageId: null,
    notFoundPageId: null,
    previewEnabled: true,
    cacheTtlSeconds: 30,
    contentRoutes: [
      {
        type: "posts",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
      },
    ],
  })),
  resolvePostSlugRouteContext: (
    settings: {
      publicBaseUrl?: string | null;
      contentRoutes?: Array<{ detailPath: string; enabled: boolean; type: string }>;
    } | null
  ) => ({
    publicBaseUrl: settings?.publicBaseUrl ?? null,
    detailPathPattern:
      settings?.contentRoutes?.find((route) => route.enabled)?.detailPath ?? "/post/:slug",
  }),
  resolvePostSlugDisplay: (
    context: { publicBaseUrl: string | null; detailPathPattern: string },
    slug: string
  ) => ({
    label: context.publicBaseUrl ? "Public URL" : "Route hint",
    value:
      context.publicBaseUrl && slug
        ? `${context.publicBaseUrl}${context.detailPathPattern.replace(":slug", slug)}`
        : context.detailPathPattern,
    concrete: Boolean(context.publicBaseUrl && slug),
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
    selectedIds = [],
    isAllSelected = false,
    isIndeterminate = false,
    onToggleAll,
    onTogglePost,
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
    isIndeterminate?: boolean;
    onToggleAll?: () => void;
    onTogglePost?: (id: string) => void;
    onEdit: (id: string) => void;
    onPreview: (id: string) => void;
    onPublish: (id: string) => void;
    onUnpublish: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <div>
      <span>{emptyMessage ?? `posts:${items.length}`}</span>
      <input
        type="checkbox"
        aria-label="Select all posts"
        checked={isAllSelected}
        data-indeterminate={String(isIndeterminate)}
        onChange={() => onToggleAll?.()}
      />
      {items.map((item) => (
        <div key={item.id}>
          <input
            type="checkbox"
            aria-label={`Select ${item.title}`}
            checked={selectedIds.includes(item.id)}
            onChange={() => onTogglePost?.(item.id)}
          />
          {item.title}
        </div>
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

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
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

export { flushMicrotasks, mount, pagePostState, setInputValue, setSelectValue };
