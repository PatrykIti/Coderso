// @vitest-environment happy-dom

// TASK-105-08-08-L03 regression suite: pins the supported posts-editor
// behavior adjacent to the deleted dead paths.
//   1. PostClassicEditorShell: baseline hydration, runtime preview (URL,
//      transport failure, stale-route discard), cache-event silent reload
//      vs. local-edit deferral, and lease-bound publishing.
//   2. PostsListPage: the explicit refresh policy after deleting the private
//      optional background fallback — cold mount loads foreground, cache-event
//      and post-mutation refreshes stay background.
//   3. useFocusReturn: ref/element captures, active-element fallback,
//      disconnected-node skip, and per-target clears.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostClassicEditorShell } from "../../../core/admin/ui/posts/editor/PostClassicEditorShell";
import { PostsListPage } from "../../../core/admin/ui/posts/PostsListPage";
import {
  useFocusReturn,
  shouldReturnFocus,
} from "../../../core/admin/ui/posts/editor/hooks/useFocusReturn";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type PostStatus = "draft" | "published" | "scheduled" | "archived";

type PostAuthor = { id: string; name: string | null; email: string };

type PostDetail = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: PostStatus;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  author?: PostAuthor | null;
  seo?: { description?: string | null } | null;
};

type PostSummaryRow = {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  updatedAt: string;
  tags?: string[];
  author?: PostAuthor | null;
};

type CacheEventHandler = (
  event: { key: string; action: "update"; sourceId: string; ts: number },
  origin: "local" | "remote",
  operationToken?: symbol
) => void;

type NodeProps = { children?: React.ReactNode };

const classicState = vi.hoisted(() => {
  const state = {
    path: "/admin/posts/post-1?editor=classic",
    cache: {} as Record<string, unknown>,
    remote: {} as Record<string, unknown>,
    postsCache: null as unknown,
    postsRemote: [] as unknown[],
    postsListCalls: [] as Array<{ force?: boolean }>,
    postsListHandler: null as null | (() => Promise<unknown[]>),
    getPostCalls: [] as Array<{ id: string; force?: boolean }>,
    publishCalls: [] as string[],
    previewCalls: [] as Array<{ id: string; ttl?: number }>,
    previewHandler: null as null | ((id: string, ttl?: number) => Promise<{ previewUrl: string }>),
    publishHandler: null as ((id: string) => Promise<void>) | null,
    previewDialogProps: null as Record<string, unknown> | null,
    cacheListener: null as CacheEventHandler | null,
    author: { id: "author-1", name: "Admin", email: "admin@example.com" },
    createPost(id: string, status = "draft", overrides: Partial<PostDetail> = {}) {
      const now = "2026-03-11T10:00:00.000Z";
      return {
        id,
        typeId: "post",
        title: "Classic post",
        slug: "classic-post",
        status,
        data: {
          excerpt: "Summary",
          content: "Body copy",
          featuredImage: "media-1",
          featured: true,
        },
        createdAt: now,
        updatedAt: now,
        publishedAt: status === "published" ? "2026-03-10T08:00:00.000Z" : null,
        scheduledAt: status === "scheduled" ? "2026-03-12T08:00:00.000Z" : null,
        author: state.author,
        seo: { description: "SEO summary" },
        ...overrides,
      };
    },
    createSummary(id: string, title: string, status: PostStatus = "draft"): PostSummaryRow {
      return {
        id,
        title,
        slug: title.toLowerCase().replace(/\s+/g, "-"),
        status,
        updatedAt: "2026-03-11T10:00:00.000Z",
        tags: [],
        author: state.author,
      };
    },
    reset() {
      Object.assign(state, {
        path: "/admin/posts/post-1?editor=classic",
        cache: {},
        remote: {},
        postsCache: null,
        postsRemote: [],
        postsListCalls: [],
        postsListHandler: null,
        getPostCalls: [],
        publishCalls: [],
        previewCalls: [],
        previewHandler: null,
        publishHandler: null,
        previewDialogProps: null,
        cacheListener: null,
      });
    },
  };
  return state;
});

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: NodeProps) => <div>{children}</div>,
  AlertDescription: ({ children }: NodeProps) => <div>{children}</div>,
  AlertTitle: ({ children }: NodeProps) => <strong>{children}</strong>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: NodeProps) => <span>{children}</span>,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: NodeProps) => <div>{children}</div>,
  CardContent: ({ children }: NodeProps) => <div>{children}</div>,
  CardHeader: ({ children }: NodeProps) => <div>{children}</div>,
  CardTitle: ({ children }: NodeProps) => <div>{children}</div>,
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
  }) => <input value={value} onChange={onChange} {...props} />,
}));
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: NodeProps) => <div>{children}</div>,
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: NodeProps & { open?: boolean }) => (
    <div data-sheet-open={String(Boolean(open))}>{children}</div>
  ),
  SheetContent: ({ children }: NodeProps) => <div>{children}</div>,
  SheetDescription: ({ children }: NodeProps) => <div>{children}</div>,
  SheetTitle: ({ children }: NodeProps) => <div>{children}</div>,
}));
vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    [key: string]: unknown;
  }) => <textarea value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    postDetail: (id: string) => `post:${id}`,
    postsList: "posts:list",
  },
}));

vi.mock("@/services/postsClient", () => ({
  getCachedPostDetail: (id: string) => classicState.cache[id] ?? null,
  getPostCached: vi.fn(async (id: string, { force }: { force?: boolean } = {}) => {
    classicState.getPostCalls.push({ id, force });
    return classicState.remote[id] ?? null;
  }),
  previewPost: vi.fn(async (id: string, ttl?: number) => {
    classicState.previewCalls.push({ id, ttl });
    if (classicState.previewHandler) return classicState.previewHandler(id, ttl);
    return { previewUrl: `https://preview.test/${id}` };
  }),
  publishPost: vi.fn(async (id: string) => {
    classicState.publishCalls.push(id);
    if (classicState.publishHandler) return classicState.publishHandler(id);
  }),
  updatePost: vi.fn(async (id: string) => classicState.remote[id] ?? classicState.createPost(id)),
  updatePostMetadata: vi.fn(
    async (id: string) => classicState.remote[id] ?? classicState.createPost(id)
  ),
  getCachedPosts: () => classicState.postsCache,
  listPostsCached: vi.fn(async ({ force }: { force?: boolean } = {}) => {
    classicState.postsListCalls.push({ force });
    if (classicState.postsListHandler) return classicState.postsListHandler();
    return classicState.postsRemote;
  }),
  createPost: vi.fn(),
  unpublishPost: vi.fn(),
  deletePost: vi.fn(),
  duplicatePost: vi.fn(),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    path: classicState.path,
    navigate: (href: string) => {
      classicState.path = href;
    },
  }),
}));

vi.mock("@/ui/entries/EntryMetadataPanel", () => ({
  EntryMetadataPanel: ({ status }: { status: string }) => (
    <div data-classic-metadata="true">{`metadata-status:${status}`}</div>
  ),
}));

vi.mock("@/ui/entries/entryChecklist", () => ({
  buildEntryChecklist: vi.fn(() => ({ blockingIssues: [], items: [] })),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: NodeProps) => <div>{children}</div>,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: (props: Record<string, unknown>) => {
    classicState.previewDialogProps = props;
    return <div data-classic-preview="true">{String(Boolean(props.open))}</div>;
  },
}));

vi.mock("@/utils/cacheBus", () => ({
  createCacheEventOperationToken: () => Symbol(),
  subscribeCacheEvents: (listener: CacheEventHandler) => {
    classicState.cacheListener = listener;
    return () => {
      classicState.cacheListener = null;
    };
  },
}));

// PostsListPage scaffolding: table rows expose the publish action; heavier
// shared chrome renders as inert placeholders.
vi.mock("@/ui/shared/listActionToasts", () => ({
  createListActionToastAdapter: () => ({
    success: (action: string) => `post ${action}`,
    error: (action: string) => `Failed to ${action} post.`,
    summarizeBulkAction: () => ({ ok: true, inlineMessage: "Bulk action completed." }),
    emitBulk: () => undefined,
  }),
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: async () => null,
  resolvePostSlugRouteContext: () => ({}),
}));

vi.mock("@/services/userSettingsClient", () => ({
  getUserSettings: async () => ({}),
  setUserSetting: async () => undefined,
}));

vi.mock("@/ui/shared/StatusTabs", () => ({ StatusTabs: () => null }));
vi.mock("@/ui/shared/ListPaginationFooter", () => ({ ListPaginationFooter: () => null }));
vi.mock("@/ui/shared/ConfirmActionDialog", () => ({ ConfirmActionDialog: () => null }));
vi.mock("../../../core/admin/ui/pages/PageFilters", () => ({ PageFilters: () => null }));
vi.mock("../../../core/admin/ui/posts/PostsCreateDrawer", () => ({
  PostsCreateDrawer: () => null,
}));
vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({ title, actions }: { title?: string; actions?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/posts/PostsTable", () => ({
  PostsTable: ({
    items,
    onPublish,
  }: {
    items: Array<{ id: string; title: string }>;
    onPublish: (id: string) => void;
  }) => (
    <div data-posts-table="true">
      {items.map((item) => (
        <div key={item.id} data-post-row={item.id}>
          <span>{item.title}</span>
          <button type="button" data-publish={item.id} onClick={() => onPublish(item.id)}>
            Publish
          </button>
        </div>
      ))}
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
    rerender: (next: React.ReactNode) =>
      React.act(() => {
        root.render(next);
      }),
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async (times = 5) => {
  for (let index = 0; index < times; index += 1) {
    await React.act(async () => {
      await Promise.resolve();
    });
  }
};

const clickButton = (button: HTMLButtonElement) => {
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!button) throw new Error(`Missing button: ${text}`);
  clickButton(button);
};

const titleField = (container: HTMLElement) => {
  const field = container.querySelector<HTMLTextAreaElement>(
    'textarea[placeholder="Enter post title..."]'
  );
  if (!field) throw new Error("missing title field");
  return field;
};

const typeValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  React.act(() => {
    const proto =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const triggerRemoteCacheEvent = (key: string) => {
  React.act(() => {
    classicState.cacheListener?.(
      { key, action: "update", sourceId: "other-tab", ts: Date.now() },
      "remote",
      undefined
    );
  });
};

const mountHydratedShell = async () => {
  classicState.cache["post-1"] = classicState.createPost("post-1");
  classicState.remote["post-1"] = classicState.createPost("post-1");
  const view = mount(<PostClassicEditorShell />);
  await flush();
  return view;
};

afterEach(() => {
  classicState.reset();
  vi.clearAllMocks();
});

test("baseline hydration loads the post and enables the classic actions", async () => {
  const view = await mountHydratedShell();
  try {
    expect(titleField(view.container).value).toBe("Classic post");
    expect(classicState.getPostCalls.at(-1)).toEqual({ id: "post-1", force: true });

    const previewButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Runtime preview")
    );
    expect(previewButton?.disabled).toBe(false);
    expect(view.container.textContent).not.toContain("Updated in another tab");
  } finally {
    view.cleanup();
  }
});

test("runtime preview opens the dialog and previews the current post", async () => {
  const view = await mountHydratedShell();
  try {
    clickByText(view.container, "Runtime preview");
    await flush();

    expect(classicState.previewCalls).toEqual([{ id: "post-1", ttl: 30 }]);
    expect(classicState.previewDialogProps?.open).toBe(true);
    expect(classicState.previewDialogProps?.previewUrl).toBe("https://preview.test/post-1");
    expect(classicState.previewDialogProps?.isLoading).toBe(false);
    expect(classicState.previewDialogProps?.error).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("runtime preview surfaces transport failures without breaking the editor", async () => {
  classicState.previewHandler = () =>
    Promise.reject(Object.assign(new Error("Preview unavailable."), { name: "ApiClientError" }));
  const view = await mountHydratedShell();
  try {
    clickByText(view.container, "Runtime preview");
    await flush();

    expect(classicState.previewDialogProps?.open).toBe(true);
    expect(classicState.previewDialogProps?.error).toBe("Preview unavailable.");
    expect(classicState.previewDialogProps?.previewUrl).toBeNull();
    expect(classicState.previewDialogProps?.isLoading).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("a preview completion that lands after the route moved on is discarded", async () => {
  classicState.remote["post-2"] = classicState.createPost("post-2", "draft", {
    title: "Second classic post",
    slug: "second-classic-post",
  });
  let resolvePreview: (value: { previewUrl: string }) => void = () => undefined;
  classicState.previewHandler = () =>
    new Promise((resolve) => {
      resolvePreview = resolve;
    });

  const view = await mountHydratedShell();
  try {
    clickByText(view.container, "Runtime preview");
    await flush();

    classicState.path = "/admin/posts/post-2?editor=classic";
    view.rerender(<PostClassicEditorShell />);
    await flush();

    resolvePreview({ previewUrl: "https://preview.test/stale" });
    await flush();

    expect(classicState.previewDialogProps?.previewUrl).toBeNull();
    expect(classicState.previewDialogProps?.error).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("remote cache events reload silently while no lease or local edits exist", async () => {
  const view = await mountHydratedShell();
  try {
    const loadsBefore = classicState.getPostCalls.length;
    classicState.remote["post-1"] = classicState.createPost("post-1", "draft", {
      title: "Refreshed from another tab",
      slug: "classic-post",
    });
    triggerRemoteCacheEvent("post:post-1");
    await flush();

    expect(classicState.getPostCalls.length).toBe(loadsBefore + 1);
    expect(titleField(view.container).value).toBe("Refreshed from another tab");
    expect(view.container.textContent).not.toContain("Updated in another tab");
    expect(view.container.textContent).not.toContain("Unable to load post");
  } finally {
    view.cleanup();
  }
});

test("remote cache events defer to local edits and the refresh button discards them", async () => {
  const view = await mountHydratedShell();
  try {
    typeValue(titleField(view.container), "Local rewrite");
    expect(titleField(view.container).value).toBe("Local rewrite");

    classicState.remote["post-1"] = classicState.createPost("post-1", "draft", {
      title: "Remote rewrite",
      slug: "classic-post",
    });
    const loadsBefore = classicState.getPostCalls.length;
    triggerRemoteCacheEvent("post:post-1");
    await flush();

    // Local edits win: no reload, the stale-update alert appears instead.
    expect(classicState.getPostCalls.length).toBe(loadsBefore);
    expect(titleField(view.container).value).toBe("Local rewrite");
    expect(view.container.textContent).toContain("Updated in another tab");

    clickByText(view.container, "Refresh");
    await flush();

    expect(classicState.getPostCalls.length).toBe(loadsBefore + 1);
    expect(titleField(view.container).value).toBe("Remote rewrite");
    expect(view.container.textContent).not.toContain("Updated in another tab");
  } finally {
    view.cleanup();
  }
});

test("publishing takes the lease, publishes, and reloads to the published status", async () => {
  const view = await mountHydratedShell();
  try {
    classicState.publishHandler = () => {
      classicState.remote["post-1"] = classicState.createPost("post-1", "published");
      return Promise.resolve();
    };
    clickByText(view.container, "Publish");
    await flush();

    expect(classicState.publishCalls).toEqual(["post-1"]);
    expect(classicState.getPostCalls.at(-1)).toEqual({ id: "post-1", force: true });
    expect(view.container.textContent).toContain("published");
    expect(view.container.textContent).not.toContain("Failed to publish post.");
  } finally {
    view.cleanup();
  }
});

test("posts list cold mount loads in the foreground and renders the rows", async () => {
  classicState.postsRemote = [
    classicState.createSummary("post-1", "First listing post"),
    classicState.createSummary("post-2", "Second listing post", "published"),
  ];
  const view = mount(<PostsListPage />);
  try {
    // No cache on mount: the loading state owns the screen until the forced
    // cold load settles.
    expect(view.container.textContent).toContain("Loading posts...");
    expect(view.container.querySelector("[data-posts-table]")).toBeNull();
    await flush();

    expect(classicState.postsListCalls).toEqual([{ force: true }]);
    const rows = view.container.querySelectorAll("[data-post-row]");
    expect(rows).toHaveLength(2);
    expect(view.container.textContent).toContain("First listing post");
    expect(view.container.textContent).not.toContain("Loading posts...");
  } finally {
    view.cleanup();
  }
});

test("posts list cache-event refreshes stay background over live rows", async () => {
  classicState.postsRemote = [classicState.createSummary("post-1", "Stale listing post")];
  const view = mount(<PostsListPage />);
  await flush();
  try {
    expect(view.container.textContent).toContain("Stale listing post");

    let resolveList: (rows: unknown[]) => void = () => undefined;
    classicState.postsListHandler = () =>
      new Promise((resolve) => {
        resolveList = resolve;
      });
    classicState.postsRemote = [classicState.createSummary("post-1", "Fresh listing post")];
    triggerRemoteCacheEvent("posts:list");

    // While the background refresh is in flight the live rows stay mounted:
    // no loading flash, and the forced background policy is on the wire.
    await flush();
    expect(classicState.postsListCalls.at(-1)).toEqual({ force: true });
    expect(view.container.querySelector("[data-posts-table]")).toBeTruthy();
    expect(view.container.textContent).not.toContain("Loading posts...");

    resolveList(classicState.postsRemote);
    await flush();
    expect(view.container.textContent).toContain("Fresh listing post");
  } finally {
    view.cleanup();
  }
});

test("publishing from the posts list refreshes in the background", async () => {
  classicState.postsRemote = [classicState.createSummary("post-1", "Draft listing post")];
  const view = mount(<PostsListPage />);
  await flush();
  try {
    const loadsBefore = classicState.postsListCalls.length;
    classicState.postsRemote = [
      classicState.createSummary("post-1", "Published listing post", "published"),
    ];
    const publishButton =
      view.container.querySelector<HTMLButtonElement>("[data-publish='post-1']");
    expect(publishButton).toBeTruthy();
    clickButton(publishButton as HTMLButtonElement);
    await flush();

    expect(classicState.publishCalls).toEqual(["post-1"]);
    // The post-mutation refresh is forced but stays background: rows stay
    // mounted and the refreshed status renders.
    expect(classicState.postsListCalls.at(-1)).toEqual({ force: true });
    expect(classicState.postsListCalls.length).toBe(loadsBefore + 1);
    expect(view.container.querySelector("[data-posts-table]")).toBeTruthy();
    expect(view.container.textContent).toContain("Published listing post");
    expect(view.container.textContent).not.toContain("Loading posts...");
  } finally {
    view.cleanup();
  }
});

function FocusReturnProbe() {
  const focusReturn = useFocusReturn();
  const openerRef = React.useRef<HTMLButtonElement | null>(null);
  return (
    <div>
      <button type="button" data-focus-probe="opener" ref={openerRef}>
        opener
      </button>
      <button type="button" data-focus-probe="standalone">
        standalone
      </button>
      <button
        type="button"
        data-focus-probe="capture-ref"
        onClick={() => focusReturn.capture("inserter", openerRef)}
      >
        capture-ref
      </button>
      <button
        type="button"
        data-focus-probe="capture-element"
        onClick={() => focusReturn.capture("outline", openerRef.current)}
      >
        capture-element
      </button>
      <button
        type="button"
        data-focus-probe="capture-active"
        onClick={() => focusReturn.capture("details")}
      >
        capture-active
      </button>
      <button
        type="button"
        data-focus-probe="return-inserter"
        onClick={() => focusReturn.returnFocus("inserter")}
      >
        return-inserter
      </button>
      <button
        type="button"
        data-focus-probe="return-outline"
        onClick={() => focusReturn.returnFocus("outline")}
      >
        return-outline
      </button>
      <button
        type="button"
        data-focus-probe="return-details"
        onClick={() => focusReturn.returnFocus("details")}
      >
        return-details
      </button>
      <button
        type="button"
        data-focus-probe="clear-inserter"
        onClick={() => focusReturn.clear("inserter")}
      >
        clear-inserter
      </button>
    </div>
  );
}

const probeButton = (container: ParentNode, probe: string) => {
  const button = container.querySelector<HTMLButtonElement>(`[data-focus-probe="${probe}"]`);
  if (!button) throw new Error(`missing probe ${probe}`);
  return button;
};

test("focus return restores ref and element captures and honors clears", () => {
  const view = mount(<FocusReturnProbe />);
  try {
    const opener = probeButton(view.container, "opener");
    const standalone = probeButton(view.container, "standalone");

    React.act(() => {
      opener.focus();
    });
    clickByText(view.container, "capture-ref");
    React.act(() => {
      standalone.focus();
    });
    clickByText(view.container, "return-inserter");
    expect(document.activeElement).toBe(opener);

    // Direct element capture: focus returns to the captured opener even
    // though another button held it.
    React.act(() => {
      standalone.focus();
    });
    clickByText(view.container, "capture-element");
    React.act(() => {
      standalone.focus();
    });
    clickByText(view.container, "return-outline");
    expect(document.activeElement).toBe(opener);

    // Clearing a target drops its capture without touching other targets.
    clickByText(view.container, "clear-inserter");
    React.act(() => {
      standalone.focus();
    });
    clickByText(view.container, "return-inserter");
    expect(document.activeElement).toBe(standalone);
    clickByText(view.container, "return-outline");
    expect(document.activeElement).toBe(opener);
  } finally {
    view.cleanup();
  }
});

test("focus return falls back to the active element and skips disconnected nodes", () => {
  const view = mount(<FocusReturnProbe />);
  try {
    const opener = probeButton(view.container, "opener");
    const standalone = probeButton(view.container, "standalone");

    // Capture without an element records the active element at capture time.
    React.act(() => {
      opener.focus();
    });
    clickByText(view.container, "capture-active");
    React.act(() => {
      standalone.focus();
    });
    clickByText(view.container, "return-details");
    expect(document.activeElement).toBe(opener);

    // A disconnected opener is skipped instead of throwing or refocusing.
    React.act(() => {
      opener.focus();
      opener.remove();
    });
    clickByText(view.container, "capture-ref");
    React.act(() => {
      standalone.focus();
    });
    clickByText(view.container, "return-inserter");
    expect(document.activeElement).toBe(standalone);
  } finally {
    view.cleanup();
  }
});

test("shouldReturnFocus fires exactly on open-to-closed transitions", () => {
  expect(shouldReturnFocus(true, false)).toBe(true);
  expect(shouldReturnFocus(false, false)).toBe(false);
  expect(shouldReturnFocus(true, true)).toBe(false);
  expect(shouldReturnFocus(false, true)).toBe(false);
});
