// @vitest-environment happy-dom

// TASK-105-08-08-L02 residual suite: the classic editor save lease and the
// canvas block-item controls that the wave suites leave behind.
//   1. A draft save that resolves after the route moved on is discarded: the
//      stale response never overwrites the post now on screen and raises no
//      error.
//   2. The selected button and embed attribute editors keep their clicks from
//      re-selecting the block underneath.
//   3. Focusing the list editor loads the block's items into the draft and
//      selects the block.
//   4. Embed URLs that cannot be parsed degrade to the configure placeholder
//      while a valid Vimeo URL still renders its player.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { PostClassicEditorShell } from "../../../core/admin/ui/posts/editor/PostClassicEditorShell";
import { PostCanvasBlockItem } from "../../../core/admin/ui/posts/editor/postEditorCanvasBlockItem";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  const state = {
    path: "/admin/posts/post-1?editor=classic",
    cache: {} as Record<string, PostDetail>,
    remote: {} as Record<string, PostDetail>,
    updatePostDeferral: null as
      ((id: string, payload: Record<string, unknown>) => Promise<unknown>) | null,
    getPostCalls: [] as Array<{ id: string; force?: boolean }>,
    updatePostCalls: [] as Array<{ id: string; payload: Record<string, unknown> }>,
    createPost(id: string, status: PostStatus = "draft", overrides: Partial<PostDetail> = {}) {
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
        createdAt: "2026-03-11T10:00:00.000Z",
        updatedAt: "2026-03-11T10:00:00.000Z",
        publishedAt: status === "published" ? "2026-03-10T08:00:00.000Z" : null,
        scheduledAt: status === "scheduled" ? "2026-03-12T08:00:00.000Z" : null,
        author: { id: "author-1", name: "Admin", email: "admin@example.com" },
        seo: { description: "SEO summary" },
        ...overrides,
      };
    },
    reset() {
      state.path = "/admin/posts/post-1?editor=classic";
      state.cache = {};
      state.remote = {};
      state.updatePostDeferral = null;
      state.getPostCalls = [];
      state.updatePostCalls = [];
    },
  };
  return state;
});

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children?: React.ReactNode }) => <strong>{children}</strong>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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
  ScrollArea: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => (
    <div data-sheet-open={String(Boolean(open))}>{children}</div>
  ),
  SheetContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    onFocus,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
    [key: string]: unknown;
  }) => <textarea value={value} onChange={onChange} onFocus={onFocus} {...props} />,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children?: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
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
  },
}));

vi.mock("@/services/postsClient", () => ({
  getCachedPostDetail: (id: string) => classicState.cache[id] ?? null,
  getPostCached: vi.fn(async (id: string, { force }: { force?: boolean } = {}) => {
    classicState.getPostCalls.push({ id, force });
    return classicState.remote[id] ?? null;
  }),
  previewPost: vi.fn(async () => {
    throw new Error("preview is not part of this suite");
  }),
  publishPost: vi.fn(async () => {
    throw new Error("publish is not part of this suite");
  }),
  updatePost: vi.fn(async (id: string, payload: Record<string, unknown>) => {
    classicState.updatePostCalls.push({ id, payload });
    if (classicState.updatePostDeferral) {
      return classicState.updatePostDeferral(id, payload);
    }
    return classicState.remote[id] ?? classicState.createPost(id);
  }),
  updatePostMetadata: vi.fn(
    async (id: string) => classicState.remote[id] ?? classicState.createPost(id)
  ),
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
  EntryMetadataPanel: ({
    status,
    isSaving,
    onSave,
  }: {
    status: string;
    isSaving?: boolean;
    onSave: () => void;
  }) => (
    <div data-classic-metadata="true">
      <span>{`metadata-status:${status}`}</span>
      <span>{`metadata-saving:${String(Boolean(isSaving))}`}</span>
      <button type="button" onClick={onSave}>
        save-metadata
      </button>
    </div>
  ),
}));

vi.mock("@/ui/entries/entryChecklist", () => ({
  buildEntryChecklist: vi.fn(() => ({ blockingIssues: [], items: [] })),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({ open }: { open?: boolean }) => (
    <div data-classic-preview="true">{`preview-open:${String(Boolean(open))}`}</div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  createCacheEventOperationToken: () => Symbol(),
  subscribeCacheEvents: () => () => undefined,
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
    rerender: (next: React.ReactNode) => {
      React.act(() => {
        root.render(next);
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async (times = 4) => {
  for (let index = 0; index < times; index += 1) {
    await React.act(async () => {
      await Promise.resolve();
    });
  }
};

const click = (element: Element) => {
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!button) throw new Error(`Missing button: ${text}`);
  click(button);
};

const typeValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  React.act(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value"
    );
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const typography = {
  fontFamily: "sans",
  baseTextScale: "md",
} as const;

afterEach(() => {
  classicState.reset();
  vi.clearAllMocks();
});

test("the selected button attribute editor does not re-select the block on click", () => {
  const onSelect = vi.fn();
  const onUpdateBlockAttrs = vi.fn();
  const view = mount(
    <PostCanvasBlockItem
      block={{
        id: "block-button",
        type: "button",
        attrs: { label: "Read more", url: "https://example.com" },
        content: "",
      }}
      selected
      onSelect={onSelect}
      onUpdateBlockContent={() => undefined}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      typography={typography}
      onInsertBlock={() => undefined}
      mediaById={new Map()}
    />
  );

  try {
    const section = view.container.querySelector<HTMLElement>("[data-post-editor-block-id]");
    if (!section) throw new Error("missing block");
    const labelInput = section.querySelector<HTMLInputElement>("input");
    if (!labelInput) throw new Error("missing label input");
    expect(labelInput.value).toBe("Read more");

    // Clicks inside the attribute editor belong to the editor, not the block.
    click(labelInput);
    expect(onSelect).not.toHaveBeenCalled();

    // Editing through the same editor still reaches the block attributes.
    typeValue(labelInput, "Read the guide");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith({ label: "Read the guide" });

    // A click on the block surface itself still selects it.
    click(section);
    expect(onSelect).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("the selected embed attribute editor does not re-select the block on click", () => {
  const onSelect = vi.fn();
  const onUpdateBlockAttrs = vi.fn();
  const view = mount(
    <PostCanvasBlockItem
      block={{
        id: "block-embed",
        type: "embed",
        attrs: { url: "https://example.com/video", provider: "youtube" },
        content: "",
      }}
      selected
      onSelect={onSelect}
      onUpdateBlockContent={() => undefined}
      onUpdateBlockAttrs={onUpdateBlockAttrs}
      typography={typography}
      onInsertBlock={() => undefined}
      mediaById={new Map()}
    />
  );

  try {
    const section = view.container.querySelector<HTMLElement>("[data-post-editor-block-id]");
    if (!section) throw new Error("missing block");
    const urlInput = section.querySelector<HTMLInputElement>("input");
    if (!urlInput) throw new Error("missing url input");
    expect(urlInput.value).toBe("https://example.com/video");

    click(urlInput);
    expect(onSelect).not.toHaveBeenCalled();

    typeValue(urlInput, "https://youtu.be/abc123");
    expect(onUpdateBlockAttrs).toHaveBeenCalledWith({ url: "https://youtu.be/abc123" });

    click(section);
    expect(onSelect).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("focusing the list editor drafts the block items and selects the block", () => {
  const onSelect = vi.fn();
  const onUpdateBlockContent = vi.fn();
  const view = mount(
    <PostCanvasBlockItem
      block={{ id: "block-list", type: "list", attrs: {}, content: ["First", "Second"] }}
      selected
      onSelect={onSelect}
      onUpdateBlockContent={onUpdateBlockContent}
      typography={typography}
      onInsertBlock={() => undefined}
      mediaById={new Map()}
    />
  );

  try {
    const textarea = view.container.querySelector<HTMLTextAreaElement>("textarea");
    if (!textarea) throw new Error("missing list editor");

    React.act(() => {
      textarea.focus();
    });

    expect(textarea.value).toBe("First\nSecond");
    expect(onSelect).toHaveBeenCalledTimes(1);

    typeValue(textarea, "First\nChanged");
    React.act(() => {
      textarea.blur();
    });
    expect(onUpdateBlockContent).toHaveBeenCalledWith(["First", "Changed"]);
  } finally {
    view.cleanup();
  }
});

test("unparsable embed URLs fall back to the configure placeholder, valid ones render players", () => {
  const view = mount(
    <div>
      <PostCanvasBlockItem
        block={{
          id: "embed-vimeo",
          type: "embed",
          attrs: { url: "http://", provider: "vimeo" },
          content: "",
        }}
        selected={false}
        onSelect={() => undefined}
        onUpdateBlockContent={() => undefined}
        typography={typography}
        onInsertBlock={() => undefined}
        mediaById={new Map()}
      />
      <PostCanvasBlockItem
        block={{
          id: "embed-loom",
          type: "embed",
          attrs: { url: "https://", provider: "loom" },
          content: "",
        }}
        selected={false}
        onSelect={() => undefined}
        onUpdateBlockContent={() => undefined}
        typography={typography}
        onInsertBlock={() => undefined}
        mediaById={new Map()}
      />
      <PostCanvasBlockItem
        block={{
          id: "embed-valid",
          type: "embed",
          attrs: { url: "https://vimeo.com/123456789", provider: "vimeo" },
          content: "",
        }}
        selected={false}
        onSelect={() => undefined}
        onUpdateBlockContent={() => undefined}
        typography={typography}
        onInsertBlock={() => undefined}
        mediaById={new Map()}
      />
    </div>
  );

  try {
    const sectionById = (id: string) => {
      const section = view.container.querySelector<HTMLElement>(
        `[data-post-editor-block-id="${id}"]`
      );
      if (!section) throw new Error(`missing block ${id}`);
      return section;
    };

    // Protocol-only URLs sanitize but cannot be parsed into provider ids.
    for (const id of ["embed-vimeo", "embed-loom"]) {
      const section = sectionById(id);
      expect(section.querySelector("iframe")).toBeNull();
      expect(
        section.querySelector("[data-post-editor-media-placeholder='embed']")?.textContent
      ).toContain("Click to configure embed URL");
    }

    const frame = sectionById("embed-valid").querySelector<HTMLIFrameElement>("iframe");
    expect(frame?.getAttribute("src")).toBe("https://player.vimeo.com/video/123456789");
  } finally {
    view.cleanup();
  }
});

test("a draft save that settles after the route moved on is discarded", async () => {
  classicState.path = "/admin/posts/post-1?editor=classic";
  classicState.cache["post-1"] = classicState.createPost("post-1");
  classicState.remote["post-1"] = classicState.createPost("post-1");
  classicState.remote["post-2"] = classicState.createPost("post-2", "draft", {
    title: "Second classic post",
    slug: "second-classic-post",
  });

  const view = mount(<PostClassicEditorShell />);
  try {
    await flush();
    const titleField = () => {
      const field = view.container.querySelector<HTMLTextAreaElement>(
        'textarea[placeholder="Enter post title..."]'
      );
      if (!field) throw new Error("missing title field");
      return field;
    };
    expect(titleField().value).toBe("Classic post");

    let resolveUpdate: () => void = () => undefined;
    classicState.updatePostDeferral = (id: string) =>
      new Promise((resolve) => {
        resolveUpdate = () =>
          resolve(classicState.createPost(id, "draft", { title: "Stale classic title" }));
      });

    clickByText(view.container, "Save draft");
    await flush();
    expect(classicState.updatePostCalls).toHaveLength(1);

    // Navigating to another post invalidates the in-flight save lease.
    classicState.path = "/admin/posts/post-2?editor=classic";
    view.rerender(<PostClassicEditorShell />);
    await flush();
    expect(titleField().value).toBe("Second classic post");

    resolveUpdate();
    await flush();

    // The stale payload is dropped: no error, and the on-screen post is untouched.
    expect(view.container.textContent).not.toContain("Failed to save post.");
    expect(titleField().value).toBe("Second classic post");
    expect(classicState.updatePostCalls).toHaveLength(1);
    expect(classicState.getPostCalls.at(-1)?.id).toBe("post-2");
  } finally {
    view.cleanup();
  }
});
