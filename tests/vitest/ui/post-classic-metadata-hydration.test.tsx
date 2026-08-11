// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

type CacheEvent = Readonly<{ key: string }>;
type PostStatus = "draft" | "published" | "scheduled" | "archived";
type TestPost = Readonly<{
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: PostStatus;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  scheduledAt: string | null;
  author: { id: string; name: string | null; email: string } | null;
  seo: { description?: string | null } | null;
  taxonomy: null;
}>;

type Deferred<Value> = Readonly<{
  promise: Promise<Value>;
  resolve: (value: Value) => void;
}>;

const deferred = <Value,>(): Deferred<Value> => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const classicState = vi.hoisted(() => {
  const listeners = new Set<(event: CacheEvent) => void>();
  const posts = new Map<string, TestPost>();
  const state = {
    path: "/admin/posts/post-1?editor=classic",
    posts,
    getQueue: [] as Array<Promise<TestPost | null>>,
    getPostCalls: [] as Array<{ id: string; force?: boolean }>,
    updatePostCalls: [] as Array<{ id: string; payload: Record<string, unknown> }>,
    updateMetadataCalls: [] as Array<{ id: string; payload: Record<string, unknown> }>,
    publishPostCalls: [] as string[],
    updatePostHandler: null as
      ((id: string, payload: Record<string, unknown>) => Promise<TestPost | null>) | null,
    updateMetadataHandler: null as
      ((id: string, payload: Record<string, unknown>) => Promise<TestPost | null>) | null,
    createPost(
      id: string,
      status: PostStatus = "draft",
      overrides: Partial<TestPost> = {}
    ): TestPost {
      return {
        id,
        typeId: "post",
        title: `Title ${id}`,
        slug: `title-${id}`,
        status,
        data: {
          excerpt: `Excerpt ${id}`,
          content: `Content ${id}`,
          featuredImage: "media-1",
          featured: true,
        },
        createdAt: "2026-08-11T08:00:00.000Z",
        updatedAt: "2026-08-11T08:00:00.000Z",
        publishedAt: status === "published" ? "2026-08-11T08:00:00.000Z" : null,
        scheduledAt: status === "scheduled" ? "2026-08-12T08:00:00.000Z" : null,
        author: { id: "author-1", name: "Admin", email: "admin@example.com" },
        seo: { description: `SEO ${id}` },
        taxonomy: null,
        ...overrides,
      };
    },
    emit(id: string) {
      for (const listener of listeners) listener({ key: `post:${id}` });
    },
    subscribe(listener: (event: CacheEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      listeners.clear();
      posts.clear();
      state.path = "/admin/posts/post-1?editor=classic";
      state.getQueue = [];
      state.getPostCalls = [];
      state.updatePostCalls = [];
      state.updateMetadataCalls = [];
      state.publishPostCalls = [];
      state.updatePostHandler = null;
      state.updateMetadataHandler = null;
    },
  };
  return state;
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: { postDetail: (id: string) => `post:${id}` },
}));

vi.mock("@/services/postsClient", () => ({
  getCachedPostDetail: (id: string) => classicState.posts.get(id) ?? null,
  getPostCached: vi.fn((id: string, options: { force?: boolean } = {}) => {
    classicState.getPostCalls.push({ id, force: options.force });
    return classicState.getQueue.shift() ?? Promise.resolve(classicState.posts.get(id) ?? null);
  }),
  previewPost: vi.fn(async (id: string) => ({
    token: "preview",
    previewUrl: `https://preview.test/${id}`,
    expiresAt: "2026-08-11T08:30:00.000Z",
  })),
  publishPost: vi.fn(async (id: string) => {
    classicState.publishPostCalls.push(id);
    classicState.emit(id);
    return { ok: true };
  }),
  updatePost: vi.fn((id: string, payload: Record<string, unknown>) => {
    classicState.updatePostCalls.push({ id, payload });
    if (classicState.updatePostHandler) return classicState.updatePostHandler(id, payload);
    return Promise.resolve(classicState.posts.get(id) ?? null);
  }),
  updatePostMetadata: vi.fn((id: string, payload: Record<string, unknown>) => {
    classicState.updateMetadataCalls.push({ id, payload });
    if (classicState.updateMetadataHandler) return classicState.updateMetadataHandler(id, payload);
    return Promise.resolve(classicState.posts.get(id) ?? null);
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ path: classicState.path, navigate: vi.fn() }),
}));

vi.mock("@/ui/entries/EntryMetadataPanel", () => ({
  EntryMetadataPanel: ({
    canSave,
    onSave,
    onScheduledAtChange,
    onSeoDescriptionChange,
    onStatusChange,
    scheduledAt,
    seoDescription,
    status,
  }: {
    canSave?: boolean;
    onSave?: () => void;
    onScheduledAtChange: (value: string) => void;
    onSeoDescriptionChange: (value: string) => void;
    onStatusChange: (value: PostStatus) => void;
    scheduledAt: string;
    seoDescription: string;
    status: string;
  }) => (
    <div data-metadata-panel="true">
      <span>{`metadata-status:${status}`}</span>
      <span>{`metadata-scheduled:${scheduledAt}`}</span>
      <span>{`metadata-seo:${seoDescription}`}</span>
      <button type="button" onClick={() => onStatusChange("scheduled")}>
        metadata-set-scheduled
      </button>
      <button type="button" onClick={() => onScheduledAtChange("2026-08-12T13:30:00+02:00")}>
        metadata-set-schedule
      </button>
      <button type="button" onClick={() => onSeoDescriptionChange("Request SEO")}>
        metadata-set-seo-request
      </button>
      <button type="button" onClick={() => onSeoDescriptionChange("Newer local SEO")}>
        metadata-set-seo-newer
      </button>
      <button type="button" disabled={!canSave} onClick={onSave}>
        metadata-save
      </button>
    </div>
  ),
}));

vi.mock("@/ui/entries/entryChecklist", () => ({
  buildEntryChecklist: () => ({ blockingIssues: [], items: [] }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: () => <div />,
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (listener: (event: CacheEvent) => void) => classicState.subscribe(listener),
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => root.render(node));
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
    rerender: (next: React.ReactNode) => React.act(() => root.render(next)),
  };
};

const flush = async (count = 3) => {
  for (let index = 0; index < count; index += 1) {
    await React.act(async () => {
      await Promise.resolve();
    });
  }
};

const button = (container: Element, label: string) =>
  Array.from(container.querySelectorAll("button")).find((element) => element.textContent === label);

const isDisabled = (element: Element | undefined) =>
  element instanceof HTMLButtonElement && element.disabled;

const textareaValue = (element: Element | null) =>
  element instanceof HTMLTextAreaElement ? element.value : null;

const setTextareaValue = (element: Element | null, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

afterEach(() => {
  vi.restoreAllMocks();
  classicState.reset();
});

test("A-to-B navigation revokes the cached A preview until the B forced baseline wins", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");
  const aRead = deferred<TestPost | null>();
  const bRead = deferred<TestPost | null>();
  const aPreview = classicState.createPost("post-a", "draft", { title: "A preview" });
  const aLate = classicState.createPost("post-a", "draft", { title: "A late result" });
  const bPreview = classicState.createPost("post-b", "draft", { title: "B preview" });
  const bBaseline = classicState.createPost("post-b", "draft", { title: "B baseline" });
  classicState.path = "/admin/posts/post-a?editor=classic";
  classicState.posts.set("post-a", aPreview);
  classicState.posts.set("post-b", bPreview);
  classicState.getQueue = [aRead.promise, bRead.promise];
  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();
    expect(classicState.getPostCalls).toEqual([{ id: "post-a", force: true }]);

    classicState.path = "/admin/posts/post-b?editor=classic";
    view.rerender(<PostClassicEditorShell />);
    await flush();
    expect(classicState.getPostCalls).toEqual([
      { id: "post-a", force: true },
      { id: "post-b", force: true },
    ]);
    expect(isDisabled(button(view.container, "Save draft"))).toBe(true);
    expect(isDisabled(button(view.container, "metadata-save"))).toBe(true);
    React.act(() => {
      button(view.container, "Save draft")?.click();
      button(view.container, "metadata-save")?.click();
    });
    expect(classicState.updatePostCalls).toEqual([]);
    expect(classicState.updateMetadataCalls).toEqual([]);

    aRead.resolve(aLate);
    await flush();
    expect(view.container.textContent).not.toContain("A late result");
    expect(classicState.updatePostCalls).toEqual([]);

    bRead.resolve(bBaseline);
    await flush();
    expect(
      textareaValue(view.container.querySelector('textarea[placeholder="Enter post title..."]'))
    ).toBe("B baseline");
    expect(isDisabled(button(view.container, "Save draft"))).toBe(false);
    expect(isDisabled(button(view.container, "metadata-save"))).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("metadata responses normalize untouched controls and preserve a post-dispatch metadata draft", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");
  const initial = classicState.createPost("post-metadata");
  const firstResponse = deferred<TestPost | null>();
  const secondResponse = deferred<TestPost | null>();
  classicState.path = "/admin/posts/post-metadata?editor=classic";
  classicState.posts.set("post-metadata", initial);
  classicState.getQueue = [Promise.resolve(initial)];
  let request = 0;
  classicState.updateMetadataHandler = (id) => {
    request += 1;
    classicState.emit(id);
    return request === 1 ? firstResponse.promise : secondResponse.promise;
  };
  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();
    React.act(() => {
      button(view.container, "metadata-set-seo-request")?.click();
    });
    await flush();
    React.act(() => {
      button(view.container, "metadata-save")?.click();
    });
    await flush();
    expect(classicState.getPostCalls).toHaveLength(1);
    expect(classicState.updateMetadataCalls).toEqual([
      { id: "post-metadata", payload: { seo: { description: "Request SEO" } } },
    ]);

    firstResponse.resolve(
      classicState.createPost("post-metadata", "draft", {
        seo: { description: "Server-normalized SEO" },
      })
    );
    await flush();
    expect(view.container.textContent).toContain("metadata-seo:Server-normalized SEO");

    React.act(() => {
      button(view.container, "metadata-set-seo-request")?.click();
    });
    await flush();
    React.act(() => {
      button(view.container, "metadata-save")?.click();
    });
    await flush();
    React.act(() => button(view.container, "metadata-set-seo-newer")?.click());
    secondResponse.resolve(
      classicState.createPost("post-metadata", "draft", {
        seo: { description: "Older server SEO" },
      })
    );
    await flush();

    expect(view.container.textContent).toContain("metadata-seo:Newer local SEO");
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(classicState.getPostCalls).toHaveLength(1);
  } finally {
    view.cleanup();
  }
});

test("a cache refresh begun before Save draft cannot hydrate while the mutation lease is held", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");
  const initial = classicState.createPost("post-lease");
  const staleRead = deferred<TestPost | null>();
  const saveResponse = deferred<TestPost | null>();
  classicState.path = "/admin/posts/post-lease?editor=classic";
  classicState.posts.set("post-lease", initial);
  classicState.getQueue = [Promise.resolve(initial), staleRead.promise];
  classicState.updatePostHandler = () => saveResponse.promise;
  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();
    React.act(() => classicState.emit("post-lease"));
    await flush();
    expect(classicState.getPostCalls).toHaveLength(2);

    React.act(() => button(view.container, "Save draft")?.click());
    await flush();
    staleRead.resolve(
      classicState.createPost("post-lease", "scheduled", {
        seo: { description: "Stale cache SEO" },
      })
    );
    await flush();

    expect(view.container.textContent).not.toContain("Stale cache SEO");
    expect(view.container.textContent).toContain("Updated in another tab");

    saveResponse.resolve(initial);
    await flush();
  } finally {
    view.cleanup();
  }
});

test("a published Update keeps its lease through the refresh and preserves later content typing", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");
  const initial = classicState.createPost("post-published", "published");
  const updateResponse = deferred<TestPost | null>();
  const refreshResponse = deferred<TestPost | null>();
  classicState.path = "/admin/posts/post-published?editor=classic";
  classicState.posts.set("post-published", initial);
  classicState.getQueue = [Promise.resolve(initial), refreshResponse.promise];
  classicState.updatePostHandler = (id) => {
    classicState.emit(id);
    return updateResponse.promise;
  };
  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();
    React.act(() => button(view.container, "Update")?.click());
    await flush();
    React.act(() => {
      setTextareaValue(
        view.container.querySelector('textarea[placeholder="Enter post title..."]'),
        "Typed after Update"
      );
    });
    updateResponse.resolve(
      classicState.createPost("post-published", "published", { title: "Old body" })
    );
    await flush();

    expect(classicState.getPostCalls).toHaveLength(2);
    expect(isDisabled(button(view.container, "Update"))).toBe(true);

    refreshResponse.resolve(
      classicState.createPost("post-published", "published", { title: "Refresh body" })
    );
    await flush();

    expect(
      textareaValue(view.container.querySelector('textarea[placeholder="Enter post title..."]'))
    ).toBe("Typed after Update");
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(isDisabled(button(view.container, "Update"))).toBe(false);
  } finally {
    view.cleanup();
  }
});
