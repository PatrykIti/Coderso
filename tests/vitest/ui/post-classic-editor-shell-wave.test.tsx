// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

type CacheEvent = { key: string };

type PostStatus = "draft" | "published" | "scheduled" | "archived";

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
  author?: { id: string; name: string | null; email: string } | null;
  seo?: { description?: string | null } | null;
};

const classicState = vi.hoisted(() => {
  const listeners = new Set<(event: CacheEvent) => void>();
  const apiError = (message: string) => ({
    name: "ApiClientError",
    message,
    code: "request_failed",
    status: 400,
  });

  const createPost = (
    id: string,
    status: PostStatus = "draft",
    overrides: Partial<PostDetail> = {}
  ): PostDetail => ({
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
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T10:00:00.000Z",
    publishedAt: status === "published" ? "2026-03-10T08:00:00.000Z" : null,
    scheduledAt: status === "scheduled" ? "2026-03-12T08:00:00.000Z" : null,
    author: { id: "author-1", name: "Admin", email: "admin@example.com" },
    seo: { description: "SEO summary" },
    ...overrides,
  });

  const state = {
    apiError,
    createPost,
    path: "/admin/posts/post-1?editor=classic",
    cachedPost: null as PostDetail | null,
    fetchedPost: null as PostDetail | null,
    nextGetError: null as unknown,
    nextUpdateError: null as unknown,
    nextPublishError: null as unknown,
    nextMetadataError: null as unknown,
    nextPreviewError: null as unknown,
    getPostCalls: [] as Array<{ id: string; force?: boolean }>,
    updatePostCalls: [] as Array<{ id: string; payload: Record<string, unknown> }>,
    publishPostCalls: [] as string[],
    updateMetadataCalls: [] as Array<{ id: string; payload: Record<string, unknown> }>,
    previewPostCalls: [] as Array<{ id: string; ttl: number }>,
    lastPreviewOpen: false,
    navigateCalls: [] as string[],
    reset() {
      listeners.clear();
      state.path = "/admin/posts/post-1?editor=classic";
      state.cachedPost = null;
      state.fetchedPost = null;
      state.nextGetError = null;
      state.nextUpdateError = null;
      state.nextPublishError = null;
      state.nextMetadataError = null;
      state.nextPreviewError = null;
      state.getPostCalls = [];
      state.updatePostCalls = [];
      state.publishPostCalls = [];
      state.updateMetadataCalls = [];
      state.previewPostCalls = [];
      state.lastPreviewOpen = false;
      state.navigateCalls = [];
    },
    trigger(key: string) {
      for (const listener of listeners) listener({ key });
    },
    subscribe(listener: (event: CacheEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
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

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
      {children}
    </div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    postDetail: (id: string) => `post:${id}`,
  },
}));

vi.mock("@/services/postsClient", () => ({
  getCachedPostDetail: (id: string) =>
    classicState.cachedPost && classicState.cachedPost.id === id ? classicState.cachedPost : null,
  getPostCached: vi.fn(async (id: string, { force }: { force?: boolean } = {}) => {
    classicState.getPostCalls.push({ id, force });
    if (classicState.nextGetError) {
      const error = classicState.nextGetError;
      classicState.nextGetError = null;
      throw error;
    }
    return classicState.fetchedPost;
  }),
  previewPost: vi.fn(async (id: string, ttl: number) => {
    classicState.previewPostCalls.push({ id, ttl });
    if (classicState.nextPreviewError) {
      const error = classicState.nextPreviewError;
      classicState.nextPreviewError = null;
      throw error;
    }
    return {
      token: "preview-token",
      previewUrl: `https://preview.test/${id}`,
      expiresAt: "2026-03-11T12:00:00.000Z",
    };
  }),
  publishPost: vi.fn(async (id: string) => {
    classicState.publishPostCalls.push(id);
    if (classicState.nextPublishError) {
      const error = classicState.nextPublishError;
      classicState.nextPublishError = null;
      throw error;
    }
  }),
  updatePost: vi.fn(async (id: string, payload: Record<string, unknown>) => {
    classicState.updatePostCalls.push({ id, payload });
    if (classicState.nextUpdateError) {
      const error = classicState.nextUpdateError;
      classicState.nextUpdateError = null;
      throw error;
    }
    const current =
      classicState.fetchedPost ?? classicState.cachedPost ?? classicState.createPost(id);
    const next = {
      ...current,
      title: typeof payload.title === "string" ? payload.title : current.title,
      slug: typeof payload.slug === "string" ? payload.slug : current.slug,
      data:
        payload.data && typeof payload.data === "object"
          ? (payload.data as Record<string, unknown>)
          : current.data,
    };
    classicState.fetchedPost = next;
    classicState.cachedPost = next;
    return next;
  }),
  updatePostMetadata: vi.fn(async (id: string, payload: Record<string, unknown>) => {
    classicState.updateMetadataCalls.push({ id, payload });
    if (classicState.nextMetadataError) {
      const error = classicState.nextMetadataError;
      classicState.nextMetadataError = null;
      throw error;
    }
    const current =
      classicState.fetchedPost ?? classicState.cachedPost ?? classicState.createPost(id);
    const next = {
      ...current,
      status: (payload.status as PostStatus | undefined) ?? current.status,
      scheduledAt: Object.hasOwn(payload, "scheduledAt")
        ? (payload.scheduledAt as string | null)
        : current.scheduledAt,
      seo: {
        ...(current.seo ?? {}),
        ...((payload.seo as Record<string, unknown> | undefined) ?? {}),
      },
    };
    classicState.fetchedPost = next;
    classicState.cachedPost = next;
    return next;
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    path: classicState.path,
    navigate: (href: string) => {
      classicState.navigateCalls.push(href);
    },
  }),
}));

// TASK-514-03: removed the inert EntryEditorHeader mock — PostClassicEditorShell
// (this file's subject) never imported it, and EntryEditorHeader was repurposed
// into EntryEditorHeaderActions (owned/rendered only by EntryEditor).
vi.mock("@/ui/entries/EntryMetadataPanel", () => ({
  EntryMetadataPanel: ({
    status,
    scheduledAt,
    seoDescription,
    author,
    onStatusChange,
    onScheduledAtChange,
    onSeoDescriptionChange,
    onSave,
    isSaving,
  }: {
    status: string;
    scheduledAt: string;
    seoDescription: string;
    author: { name: string | null; email: string } | null;
    onStatusChange: (value: "draft" | "published" | "scheduled" | "archived") => void;
    onScheduledAtChange: (value: string) => void;
    onSeoDescriptionChange: (value: string) => void;
    onSave: () => void;
    isSaving: boolean;
  }) => (
    <div data-classic-metadata="true">
      <span>{`metadata-status:${status}`}</span>
      <span>{`metadata-scheduled:${scheduledAt}`}</span>
      <span>{`metadata-seo:${seoDescription}`}</span>
      <span>{`metadata-author:${author?.name ?? author?.email ?? "none"}`}</span>
      <span>{`metadata-saving:${String(isSaving)}`}</span>
      <button type="button" onClick={() => onStatusChange("scheduled")}>
        set-scheduled
      </button>
      <button type="button" onClick={() => onScheduledAtChange("not-a-date")}>
        set-invalid-schedule
      </button>
      <button type="button" onClick={() => onScheduledAtChange("")}>
        set-empty-schedule
      </button>
      <button type="button" onClick={() => onScheduledAtChange("2026-03-13T08:00:00Z")}>
        set-valid-schedule
      </button>
      <button type="button" onClick={() => onSeoDescriptionChange("Updated SEO")}>
        set-seo-description
      </button>
      <button type="button" onClick={onSave}>
        save-metadata
      </button>
    </div>
  ),
}));

vi.mock("@/ui/entries/entryChecklist", () => ({
  buildEntryChecklist: vi.fn(({ title, slug, status }) => ({
    blockingIssues:
      !String(title).trim() || !String(slug).trim() || status === "scheduled"
        ? ["Checklist blocking issue."]
        : [],
    items: [],
  })),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    breadcrumbs,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({
    open,
    previewUrl,
    isLoading,
    error,
    canPreview,
    cannotPreviewMessage,
    onOpenChange,
  }: {
    open: boolean;
    previewUrl: string | null;
    isLoading: boolean;
    error: string | null;
    canPreview: boolean;
    cannotPreviewMessage: string;
    onOpenChange: (open: boolean) => void;
  }) => {
    classicState.lastPreviewOpen = open;
    return (
      <div data-classic-preview="true">
        <span>{`preview-open:${String(open)}`}</span>
        <span>{`preview-url:${previewUrl ?? "none"}`}</span>
        <span>{`preview-loading:${String(isLoading)}`}</span>
        <span>{`preview-error:${error ?? "none"}`}</span>
        <span>{`preview-enabled:${String(canPreview)}`}</span>
        <span>{cannotPreviewMessage}</span>
        <button type="button" onClick={() => onOpenChange(false)}>
          close-preview-dialog
        </button>
      </div>
    );
  },
}));

vi.mock("@/utils/cacheBus", () => ({
  createCacheEventOperationToken: () => Symbol(),
  subscribeCacheEvents: (listener: (event: CacheEvent) => void) => classicState.subscribe(listener),
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

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const flush = async (times = 2) => {
  for (let index = 0; index < times; index += 1) {
    await React.act(async () => {
      await Promise.resolve();
    });
  }
};

afterEach(() => {
  vi.restoreAllMocks();
  classicState.reset();
});

test("PostClassicEditorShell hydrates cached data, saves draft, previews, and applies metadata", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");

  classicState.path = "/admin/posts/post%201?editor=classic";
  classicState.cachedPost = classicState.createPost("post 1");
  classicState.fetchedPost = classicState.createPost("post 1", "draft", {
    title: "Remote classic post",
    slug: "remote-classic-post",
  });

  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();

    expect(classicState.getPostCalls).toContainEqual({ id: "post 1", force: true });
    expect(view.container.textContent).toContain("Remote classic post");
    expect(view.container.textContent).toContain("Classic editor");
    expect(view.container.textContent).toContain("metadata-author:Admin");

    const textareas = Array.from(view.container.querySelectorAll("textarea"));
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      setTextareaValue(textareas[0], "Updated title");
      buttons.find((button) => button.textContent === "Generate")?.click();
      setTextareaValue(textareas[1], "Updated excerpt");
      setTextareaValue(textareas[2], "Updated body");
      setInputValue(
        inputs.find((input) => input.placeholder === "media-id"),
        "media-2"
      );
      (
        inputs.find((input) => input.type === "checkbox") as HTMLInputElement | null | undefined
      )?.click();
      buttons.find((button) => button.textContent === "Save draft")?.click();
    });
    await flush();

    expect(classicState.updatePostCalls).toHaveLength(1);
    const savedPayload = classicState.updatePostCalls[0]?.payload;
    expect(savedPayload.title).toBe("Updated title");
    expect(savedPayload.slug).toBe("updated-title");
    expect(savedPayload.data).toMatchObject({
      excerpt: "Updated excerpt",
      content: "Updated body",
      featuredImage: "media-2",
      featured: false,
    });
    expect((savedPayload.data as Record<string, unknown>).document).toBeTruthy();

    React.act(() => {
      buttons.find((button) => button.textContent === "Runtime preview")?.click();
    });
    await flush();

    expect(classicState.previewPostCalls).toContainEqual({ id: "post 1", ttl: 30 });
    expect(view.container.textContent).toContain("preview-url:https://preview.test/post 1");

    React.act(() => {
      buttons.find((button) => button.textContent === "set-valid-schedule")?.click();
      buttons.find((button) => button.textContent === "set-seo-description")?.click();
    });
    await flush();
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "save-metadata")
        ?.click();
    });
    await flush();

    expect(classicState.updateMetadataCalls).toContainEqual({
      id: "post 1",
      payload: {
        seo: { description: "Updated SEO" },
      },
    });

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "set-scheduled")
        ?.click();
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "set-empty-schedule")
        ?.click();
    });
    await flush();
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "save-metadata")
        ?.click();
    });
    await flush();

    expect(view.container.textContent).toContain(
      "Schedule date is required for scheduled entries."
    );

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "set-invalid-schedule")
        ?.click();
    });
    await flush();
    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "save-metadata")
        ?.click();
    });
    await flush();

    expect(view.container.textContent).toContain("Schedule date must be a valid ISO timestamp.");
  } finally {
    view.cleanup();
  }
});

test("PostClassicEditorShell handles publish/update branches, preview failure, and mobile details sheet", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");

  classicState.cachedPost = classicState.createPost("post-2", "published", {
    title: "Published post",
    slug: "published-post",
  });
  classicState.fetchedPost = classicState.createPost("post-2", "published", {
    title: "Published post",
    slug: "published-post",
  });
  classicState.path = "/admin/posts/post-2?editor=classic";
  classicState.nextPreviewError = classicState.apiError("Preview failed");

  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();

    const buttons = Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      buttons.find((button) => button.textContent === "Update")?.click();
    });
    await flush();

    expect(classicState.publishPostCalls).toEqual([]);
    expect(classicState.updatePostCalls).toHaveLength(1);

    React.act(() => {
      buttons.find((button) => button.textContent === "Runtime preview")?.click();
    });
    await flush();

    expect(view.container.textContent).toContain("preview-error:Preview failed");

    React.act(() => {
      buttons.find((button) => button.textContent === "Details")?.click();
    });

    expect(
      view.container.querySelector("[data-has-open-change='true']")?.getAttribute("data-sheet-open")
    ).toBe("true");

    React.act(() => {
      buttons.find((button) => button.textContent === "close-preview-dialog")?.click();
    });
    expect(classicState.lastPreviewOpen).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("PostClassicEditorShell surfaces refresh conflicts, publish errors, and metadata save errors", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");

  classicState.cachedPost = classicState.createPost("post-3", "draft");
  classicState.fetchedPost = classicState.createPost("post-3", "draft", {
    title: "Post three",
    slug: "post-three",
  });
  classicState.path = "/admin/posts/post-3?editor=classic";

  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();

    const textareas = Array.from(view.container.querySelectorAll("textarea"));
    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      setTextareaValue(textareas[0], "Unsaved title");
    });
    await flush();

    React.act(() => {
      classicState.trigger("post:post-3");
    });
    await flush();

    expect(view.container.textContent).toContain("Updated in another tab");

    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Refresh"))
        ?.click();
    });
    await flush();

    expect(view.container.textContent).toContain("Post three");

    classicState.nextPublishError = classicState.apiError("Publish blocked");
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "Publish")
        ?.click();
    });
    await flush();
    expect(view.container.textContent).toContain("Publish blocked");

    classicState.nextMetadataError = classicState.apiError("Metadata blocked");
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "set-scheduled")
        ?.click();
      buttons()
        .find((button) => button.textContent === "set-valid-schedule")
        ?.click();
    });
    await flush();
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "save-metadata")
        ?.click();
    });
    await flush();
    expect(view.container.textContent).toContain("Metadata blocked");

    classicState.nextGetError = classicState.apiError("Refresh failed");
    React.act(() => {
      classicState.trigger("post:post-3");
    });
    await flush();
    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Refresh"))
        ?.click();
    });
    await flush();
    expect(view.container.textContent).toContain("Refresh failed");
  } finally {
    view.cleanup();
  }
});

test("PostClassicEditorShell handles missing post ids, generic preview failures, and manual slug edits", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");

  classicState.path = "/admin/advanced/settings";

  const missingIdView = mount(<PostClassicEditorShell />);

  try {
    await flush();

    const missingButtons = Array.from(missingIdView.container.querySelectorAll("button"));
    React.act(() => {
      missingButtons.find((button) => button.textContent === "Runtime preview")?.click();
    });
    await flush();

    expect(classicState.previewPostCalls).toEqual([]);
    expect(missingIdView.container.textContent).toContain("preview-url:none");
    expect(missingIdView.container.textContent).toContain("preview-error:none");
    expect(missingIdView.container.textContent).toContain("preview-loading:false");
  } finally {
    missingIdView.cleanup();
  }

  classicState.cachedPost = classicState.createPost("post-4", "draft", {
    slug: "initial-slug",
  });
  classicState.fetchedPost = classicState.cachedPost;
  classicState.path = "/admin/posts/post-4?editor=classic";
  classicState.nextPreviewError = new Error("preview crashed");

  const genericPreviewView = mount(<PostClassicEditorShell />);

  try {
    await flush();

    const slugInput = genericPreviewView.container.querySelector('input[placeholder="post-slug"]');
    const buttons = Array.from(genericPreviewView.container.querySelectorAll("button"));

    React.act(() => {
      setInputValue(slugInput, "manual-slug");
      buttons.find((button) => button.textContent === "Runtime preview")?.click();
    });
    await flush();

    expect(genericPreviewView.container.textContent).toContain("Unsaved changes");
    expect(genericPreviewView.container.textContent).toContain(
      "preview-error:Failed to generate preview."
    );
  } finally {
    genericPreviewView.cleanup();
  }
});

test("PostClassicEditorShell reports a missing post when the fetch resolves to nothing", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");

  classicState.path = "/admin/posts/post-5?editor=classic";
  classicState.cachedPost = classicState.createPost("post-5", "draft", {
    title: "Cached only",
    slug: "cached-only",
  });
  classicState.fetchedPost = null;

  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Post not found.");
  } finally {
    view.cleanup();
  }
});

test("PostClassicEditorShell blocks publishing when the entry checklist has blocking issues", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");

  classicState.path = "/admin/posts/post-6?editor=classic";
  classicState.cachedPost = classicState.createPost("post-6", "scheduled", {
    title: "Scheduled post",
    slug: "scheduled-post",
  });
  classicState.fetchedPost = classicState.cachedPost;

  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Publish")
        ?.click();
    });
    await flush();

    expect(classicState.publishPostCalls).toEqual([]);
    expect(view.container.textContent).toContain("Checklist blocking issue.");
  } finally {
    view.cleanup();
  }
});

test("PostClassicEditorShell publishes a draft through the success path", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");

  classicState.path = "/admin/posts/post-7?editor=classic";
  classicState.cachedPost = classicState.createPost("post-7", "draft", {
    title: "Draft post",
    slug: "draft-post",
  });
  classicState.fetchedPost = classicState.cachedPost;

  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();

    React.act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent === "Publish")
        ?.click();
    });
    await flush();

    expect(classicState.publishPostCalls).toEqual(["post-7"]);
    expect(classicState.getPostCalls.length).toBeGreaterThanOrEqual(2);
  } finally {
    view.cleanup();
  }
});

test("PostClassicEditorShell surfaces draft save failures and saves from the trailing button", async () => {
  const { PostClassicEditorShell } =
    await import("../../../core/admin/ui/posts/editor/PostClassicEditorShell");

  classicState.path = "/admin/posts/post-8?editor=classic";
  classicState.cachedPost = classicState.createPost("post-8", "draft", {
    title: "Save target",
    slug: "save-target",
  });
  classicState.fetchedPost = classicState.cachedPost;

  const view = mount(<PostClassicEditorShell />);

  try {
    await flush();

    const saveDraftButtons = () =>
      Array.from(view.container.querySelectorAll("button")).filter(
        (button) => button.textContent === "Save draft"
      );

    classicState.nextUpdateError = classicState.apiError("Save throttled");
    React.act(() => {
      saveDraftButtons()[0]?.click();
    });
    await flush();
    expect(view.container.textContent).toContain("Save throttled");

    classicState.nextUpdateError = new Error("save exploded");
    React.act(() => {
      saveDraftButtons()[0]?.click();
    });
    await flush();
    expect(view.container.textContent).toContain("Failed to save post.");

    const before = classicState.updatePostCalls.length;
    React.act(() => {
      saveDraftButtons().at(-1)?.click();
    });
    await flush();
    expect(classicState.updatePostCalls.length).toBe(before + 1);
  } finally {
    view.cleanup();
  }
});
