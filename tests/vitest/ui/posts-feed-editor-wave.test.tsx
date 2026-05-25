// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { PostsFeedData } from "../../../core/widgets/core/postsFeed";

const toastInfo = vi.hoisted(() => vi.fn());

const postsFeedState = vi.hoisted(() => ({
  posts: [
    {
      id: "post-1",
      title: "Launch note",
      slug: "launch-note",
      status: "published",
      data: {
        featuredImage: "media-1",
      },
      tags: ["featured"],
      scheduledAt: null,
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
      publishedAt: "2026-03-08T10:00:00.000Z",
      author: {
        id: "author-1",
        name: "Editor One",
        email: "editor1@example.com",
      },
    },
    {
      id: "post-2",
      title: "Roadmap",
      slug: "roadmap",
      status: "draft",
      data: {},
      tags: [],
      scheduledAt: null,
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
      publishedAt: null,
      author: {
        id: "author-2",
        name: "Editor Two",
        email: "editor2@example.com",
      },
    },
  ],
  postsError: null as unknown,
  listPostsImpl: null as null | (() => Promise<unknown>),
  reset() {
    this.postsError = null;
    this.listPostsImpl = null;
  },
}));

const previewResourcesState = vi.hoisted(() => ({
  settings: {
    adminBaseUrl: null,
    publicBaseUrl: "https://public.example.com",
    adminPath: "/admin",
    adminRedirectEnabled: false,
    homepageId: null,
    notFoundPageId: null,
    previewEnabled: true,
    cacheTtlSeconds: 30,
    contentRoutes: [
      {
        type: "posts",
        listPath: "/news",
        detailPath: "/news/:slug",
        enabled: true,
      },
    ],
  },
  media: [
    {
      id: "media-1",
      key: "launch-note.jpg",
      url: "/media/launch-note.jpg",
      type: "image" as const,
      mimeType: "image/jpeg",
      size: 1024,
      alt: "Launch note cover",
      title: "Launch note cover",
      createdAt: "2026-03-08T10:00:00.000Z",
    },
  ],
  settingsError: null as unknown,
  mediaError: null as unknown,
  reset() {
    this.settingsError = null;
    this.mediaError = null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    type,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    [key: string]: unknown;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} {...props} />
  ),
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
  ): Array<{ value: string; label: string; disabled: boolean }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
            disabled: Boolean(child.props.disabled),
          },
        ];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
      disabled,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
      disabled?: boolean;
    }) => (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
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

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    rows,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    [key: string]: unknown;
  }) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} {...props} />
  ),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
  isSessionExpiredApiError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError" &&
    "sharedFailureKind" in error &&
    (error as { sharedFailureKind?: string }).sharedFailureKind === "session_expired",
}));

vi.mock("@/services/postsClient", () => ({
  listPostsCached: vi.fn(async () => {
    if (postsFeedState.listPostsImpl) {
      return postsFeedState.listPostsImpl();
    }
    if (postsFeedState.postsError) throw postsFeedState.postsError;
    return postsFeedState.posts;
  }),
}));

vi.mock("@/services/siteSettingsClient", () => ({
  getSiteSettings: vi.fn(async () => {
    if (previewResourcesState.settingsError) throw previewResourcesState.settingsError;
    return previewResourcesState.settings;
  }),
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async () => {
    if (previewResourcesState.mediaError) throw previewResourcesState.mediaError;
    return previewResourcesState.media;
  }),
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "updates-page",
      title: "Updates",
      slug: "updates",
      status: "published",
      updatedAt: "2026-05-25T00:00:00.000Z",
      author: null,
    },
    {
      id: "draft-page",
      title: "Draft landing",
      slug: "draft-landing",
      status: "draft",
      updatedAt: "2026-05-25T00:00:00.000Z",
      author: null,
    },
  ]),
}));

vi.mock("sonner", () => ({
  toast: {
    info: toastInfo,
  },
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
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

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareaByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findInputByAriaLabel = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) => element instanceof HTMLInputElement && element.getAttribute("aria-label") === label
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findButtonByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find(
    (element) => element.textContent?.trim() === text
  );

const clickElement = (element: Element | null | undefined) => {
  if (!element) return;
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const writablePathsForMode = (container: ParentNode, mode: "wizard" | "visual" | "advanced") =>
  Array.from(
    container.querySelectorAll(
      `[data-widget-editor-section][data-widget-editor-mode='${mode}'] [data-widget-control-ownership='writable']`
    )
  )
    .map((element) => element.getAttribute("data-widget-control-path"))
    .filter((path): path is string => Boolean(path));

afterEach(() => {
  vi.restoreAllMocks();
  toastInfo.mockReset();
  postsFeedState.reset();
  previewResourcesState.reset();
});

test("PostsFeed editors cover manual source truthfulness, section chrome, style controls, and runtime snapshot", async () => {
  const { PostsFeedAdvancedEditor, PostsFeedVisualEditor, PostsFeedWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<PostsFeedData>({} as PostsFeedData);
    const [variant, setVariant] = useState("cards");
    return (
      <>
        <PostsFeedWizardEditor
          value={value}
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            onVariantChangeSpy(next);
            setVariant(next);
          }}
        />
        <PostsFeedVisualEditor
          value={value}
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            onVariantChangeSpy(next);
            setVariant(next);
          }}
        />
        <PostsFeedAdvancedEditor value={value} onChange={setValue} variant={variant} />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Source setup");
    expect(view.container.textContent).toContain("Section header");
    expect(view.container.textContent).toContain("Runtime status");
    expect(view.container.textContent).toContain("Runtime payload");
    expect(view.container.textContent).toContain("Contract summary");

    expect(writablePathsForMode(view.container, "wizard")).toContain("source.mode");
    expect(writablePathsForMode(view.container, "wizard")).not.toContain("style.cardStyle");
    expect(writablePathsForMode(view.container, "visual")).toContain("style.cardStyle");
    expect(writablePathsForMode(view.container, "visual")).toContain("pagination.mode");
    expect(writablePathsForMode(view.container, "visual")).not.toContain("source.mode");
    const advancedSections = view.container.querySelectorAll(
      "[data-widget-editor-section][data-widget-editor-mode='advanced']"
    );
    expect(advancedSections.length).toBeGreaterThan(0);
    expect(
      Array.from(advancedSections).some((section) =>
        Boolean(section.querySelector("input, textarea, select, button"))
      )
    ).toBe(false);
    expect(writablePathsForMode(view.container, "advanced")).toEqual([]);

    React.act(() => {
      setSelectValue(
        findSelectByOptions(view.container, ["latest", "featured", "category", "manual"]),
        "manual"
      );
    });
    await flush();

    const manualCheckboxes = Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    clickElement(manualCheckboxes[0]);

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Read more"), "Read article");
      setInputValue(findInputByPlaceholder(view.container, "Latest articles"), "Latest releases");
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Optional section description."),
        "Fresh product updates."
      );
      setInputValue(findInputByPlaceholder(view.container, "No posts found"), "Nothing published");
      setTextareaValue(
        findTextareaByPlaceholder(
          view.container,
          "Adjust source settings or publish posts to show content here."
        ),
        "Try another filter"
      );
      setSelectValue(findSelectByOptions(view.container, ["1", "2", "3"]), "2");
      setSelectValue(findSelectByOptions(view.container, ["none", "sm", "md", "lg"]), "lg");
      setSelectValue(
        findSelectByOptions(view.container, ["outlined", "elevated", "minimal"]),
        "elevated"
      );
      setSelectValue(
        findSelectByOptions(view.container, ["compact", "standard", "wide", "square"]),
        "wide"
      );
      setSelectValue(findSelectByOptions(view.container, ["none", "fade", "slide-up"]), "fade");
    });

    clickElement(findButtonByText(view.container, "Compact"));
    await flush();

    expect(view.container.textContent).toContain("Order is determined by your selection.");
    expect(view.container.textContent).toContain("Columns only affect the cards variant.");

    const matching = [...onChangeSpy.mock.calls]
      .reverse()
      .find(
        ([arg]) =>
          arg?.source?.mode === "manual" &&
          Array.isArray(arg?.source?.manualPostIds) &&
          arg.source.manualPostIds.includes("post-1") &&
          arg?.style?.cardStyle === "elevated"
      );

    expect(matching?.[0]).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          mode: "manual",
          manualPostIds: expect.arrayContaining(["post-1"]),
          sort: "published-desc",
        }),
        title: "Latest releases",
        description: "Fresh product updates.",
        style: expect.objectContaining({
          columns: "2",
          gap: "lg",
          cardStyle: "elevated",
          imageAspect: "wide",
          motion: "fade",
          ctaLabel: "Read article",
        }),
        emptyState: expect.objectContaining({
          title: "Nothing published",
          description: "Try another filter",
        }),
      })
    );
    expect(onVariantChangeSpy).toHaveBeenCalledWith("compact");
    expect(view.container.textContent).toContain('"pageSize": 6');
  } finally {
    view.cleanup();
  }
});

test("PostsFeed editors surface post loading errors", async () => {
  const { PostsFeedAdvancedEditor, PostsFeedVisualEditor, PostsFeedWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  postsFeedState.postsError = {
    name: "ApiClientError",
    status: 401,
    message: "Not authenticated",
    sharedFailureKind: "session_expired",
  };

  const Harness = () => {
    const [value, setValue] = useState<PostsFeedData>({} as PostsFeedData);
    return (
      <>
        <PostsFeedWizardEditor value={value} onChange={setValue} variant="cards" />
        <PostsFeedVisualEditor value={value} onChange={setValue} variant="cards" />
        <PostsFeedAdvancedEditor value={value} onChange={setValue} variant="cards" />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    React.act(() => {
      setSelectValue(
        findSelectByOptions(view.container, ["latest", "featured", "category", "manual"]),
        "manual"
      );
    });
    await flush();
    expect(view.container.textContent).toContain(
      "Your admin session expired. Sign in again to refresh Posts Feed data."
    );
    expect(view.container.textContent).toContain("Retry");
  } finally {
    view.cleanup();
  }
});

test("PostsFeed editors cover category filtering, manual deselection, empty catalog, and generic load errors", async () => {
  const { PostsFeedWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  const originalPosts = postsFeedState.posts;
  postsFeedState.posts = [];

  let latestValue: PostsFeedData = {
    source: {
      mode: "manual",
      manualPostIds: ["post-1"],
      limit: 3,
      sort: "published-desc",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<PostsFeedData>(latestValue);

    const handleChange = (next: PostsFeedData) => {
      latestValue = next;
      setValue(next);
    };

    return <PostsFeedWizardEditor value={value} onChange={handleChange} variant="cards" />;
  };

  const emptyView = mount(<Harness />);

  try {
    await flush();
    expect(emptyView.container.textContent).toContain("No posts available.");

    React.act(() => {
      setSelectValue(
        findSelectByOptions(emptyView.container, ["latest", "featured", "category", "manual"]),
        "category"
      );
    });
    await flush();

    React.act(() => {
      setInputValue(findInputByPlaceholder(emptyView.container, "e.g. news"), "events");
    });
    expect(latestValue.source).toEqual(
      expect.objectContaining({
        mode: "category",
        category: "events",
      })
    );
  } finally {
    emptyView.cleanup();
  }

  postsFeedState.posts = originalPosts;

  let latestManualValue: PostsFeedData = {
    source: {
      mode: "manual",
      manualPostIds: ["post-1"],
      limit: 3,
      sort: "published-desc",
    },
  };

  const ManualHarness = () => {
    const [value, setValue] = useState<PostsFeedData>(latestManualValue);

    return (
      <PostsFeedWizardEditor
        value={value}
        onChange={(next) => {
          latestManualValue = next;
          setValue(next);
        }}
        variant="cards"
      />
    );
  };

  const manualView = mount(<ManualHarness />);

  try {
    await flush();

    React.act(() => {
      setInputValue(findInputByPlaceholder(manualView.container, "Search posts"), "road");
    });
    expect(manualView.container.textContent).toContain("Roadmap");

    React.act(() => {
      setInputValue(findInputByPlaceholder(manualView.container, "Search posts"), "");
    });
    await flush();

    const selectedPostCheckbox = manualView.container.querySelector("input[type='checkbox']");
    clickElement(selectedPostCheckbox);
    await flush();

    expect(latestManualValue.source).toEqual(
      expect.objectContaining({
        mode: "manual",
        manualPostIds: [],
      })
    );
    expect(manualView.container.textContent).not.toContain("Launch note/launch-noteUpDown");
  } finally {
    manualView.cleanup();
  }

  try {
    postsFeedState.postsError = new Error("boom");
    const errorView = mount(
      <PostsFeedWizardEditor
        value={{ source: { mode: "manual" } }}
        onChange={() => undefined}
        variant="cards"
      />
    );

    try {
      React.act(() => {
        setSelectValue(
          findSelectByOptions(errorView.container, ["latest", "featured", "category", "manual"]),
          "manual"
        );
      });
      await flush();
      expect(errorView.container.textContent).toContain("Failed to load posts.");
    } finally {
      errorView.cleanup();
    }
  } finally {
    postsFeedState.posts = originalPosts;
  }
});

test("PostsFeed editors fall back for invalid numeric/select values and sparse defaults", async () => {
  const { PostsFeedAdvancedEditor, PostsFeedVisualEditor, PostsFeedWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  let latestValue: PostsFeedData = {
    source: {
      mode: "latest",
      limit: 5,
      sort: "published-desc",
    },
    style: {
      columns: "3",
      gap: "md",
      cardStyle: "outlined",
      ctaLabel: "",
    },
  } as PostsFeedData;

  const Harness = () => {
    const [value, setValue] = useState<PostsFeedData>(latestValue);
    return (
      <>
        <PostsFeedWizardEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant="unknown"
          onVariantChange={() => undefined}
        />
        <PostsFeedVisualEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant="unknown"
          onVariantChange={() => undefined}
        />
        <PostsFeedAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant="unknown"
          onVariantChange={() => undefined}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(findButtonByText(view.container, "Cards")).toBeInstanceOf(HTMLButtonElement);

    React.act(() => {
      setInputValue(
        Array.from(view.container.querySelectorAll("input")).find(
          (element) => element instanceof HTMLInputElement && element.type === "number"
        ),
        "not-a-number"
      );
      setSelectValue(
        findSelectByOptions(view.container, [
          "published-desc",
          "published-asc",
          "updated-desc",
          "updated-asc",
          "title-asc",
          "title-desc",
        ]),
        "invalid-sort"
      );
      setSelectValue(findSelectByOptions(view.container, ["1", "2", "3"]), "invalid-columns");
      setSelectValue(
        findSelectByOptions(view.container, ["none", "sm", "md", "lg"]),
        "invalid-gap"
      );
      setSelectValue(
        findSelectByOptions(view.container, ["outlined", "elevated", "minimal"]),
        "invalid-style"
      );
      setSelectValue(
        findSelectByOptions(view.container, ["compact", "standard", "wide", "square"]),
        "invalid-aspect"
      );
      setSelectValue(
        findSelectByOptions(view.container, ["none", "fade", "slide-up"]),
        "invalid-motion"
      );
    });

    expect(latestValue.source).toEqual(
      expect.objectContaining({
        limit: 1,
        sort: "published-desc",
      })
    );
    expect(latestValue.style).toEqual(
      expect.objectContaining({
        columns: "3",
        gap: "md",
        cardStyle: "outlined",
        imageAspect: "standard",
        motion: "none",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("PostsFeed editors derive author filters from the post catalog and warn on invalid legacy dates", async () => {
  const { PostsFeedWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  let latestValue: PostsFeedData = {
    source: {
      mode: "latest",
      dateRange: {
        from: "bad-date",
        to: "2026-03-15",
      },
    },
  };

  const view = mount(
    <PostsFeedWizardEditor
      value={latestValue}
      onChange={(next) => {
        latestValue = next;
      }}
      variant="cards"
    />
  );

  try {
    await flush();

    expect(view.container.textContent).toContain(
      "Date from was invalid and has been cleared from the active filter."
    );

    React.act(() => {
      setSelectValue(
        findSelectByOptions(view.container, ["__posts-feed-no-author__", "author-1", "author-2"]),
        "author-2"
      );
    });

    expect(latestValue.source?.authorId).toBe("author-2");
    expect(view.container.textContent).toContain("Editor One");
    expect(view.container.textContent).toContain("Editor Two");
  } finally {
    view.cleanup();
  }
});

test("PostsFeed visual editor resolves preview through transient context state", async () => {
  const { PostsFeedVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  const setPreviewState = vi.fn();
  const view = mount(
    <PostsFeedVisualEditor
      value={{ source: { mode: "latest", limit: 2, sort: "published-desc" } }}
      onChange={() => undefined}
      variant="cards"
      context={{
        surface: "page-builder",
        editorMode: "visual",
        blockId: "posts-feed-1",
        setPreviewState,
      }}
    />
  );

  try {
    await flush();
    expect(setPreviewState).toHaveBeenCalledWith({ status: "loading" });
    expect(setPreviewState).toHaveBeenLastCalledWith({
      status: "ready",
      dataPatch: expect.objectContaining({
        resolved: expect.objectContaining({
          total: 2,
          sourceMode: "latest",
          listPath: "/news",
          items: expect.arrayContaining([
            expect.objectContaining({
              href: "/news/launch-note",
              imageSrc: "/media/launch-note.jpg",
            }),
          ]),
        }),
      }),
    });
  } finally {
    view.cleanup();
  }
});

test("PostsFeed visual editor keeps preview ready when routes or media degrade", async () => {
  const { PostsFeedVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  previewResourcesState.mediaError = {
    name: "ApiClientError",
    status: 503,
    message: "Media unavailable",
  };

  const setPreviewState = vi.fn();
  const view = mount(
    <PostsFeedVisualEditor
      value={{ source: { mode: "latest", limit: 2, sort: "published-desc" } }}
      onChange={() => undefined}
      variant="cards"
      context={{
        surface: "page-builder",
        editorMode: "visual",
        blockId: "posts-feed-1",
        setPreviewState,
      }}
    />
  );

  try {
    await flush();

    expect(setPreviewState).toHaveBeenLastCalledWith({
      status: "ready",
      message: "Preview images could not be loaded: Media unavailable",
      dataPatch: expect.objectContaining({
        resolved: expect.objectContaining({
          total: 2,
          listPath: "/news",
          items: expect.arrayContaining([
            expect.objectContaining({
              href: "/news/launch-note",
              imageSrc: undefined,
            }),
          ]),
        }),
      }),
    });
  } finally {
    view.cleanup();
  }
});

test("PostsFeed visual editor uses swatch-only color controls with saved custom compatibility", async () => {
  const { PostsFeedVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  let latestValue: PostsFeedData = {
    style: {
      backgroundColor: "var(--color-surface)",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<PostsFeedData>(latestValue);

    return (
      <PostsFeedVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="cards"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    const backgroundSwatch = findInputByAriaLabel(view.container, "Card background swatch");
    const borderSwatch = findInputByAriaLabel(view.container, "Card border swatch");
    const textSwatch = findInputByAriaLabel(view.container, "Text color swatch");
    const clearButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Clear" && !button.hasAttribute("disabled")
    );

    expect(backgroundSwatch).toBeInstanceOf(HTMLInputElement);
    expect(borderSwatch).toBeInstanceOf(HTMLInputElement);
    expect(textSwatch).toBeInstanceOf(HTMLInputElement);
    expect((backgroundSwatch as HTMLInputElement | undefined)?.value).toBe("#ffffff");
    expect((borderSwatch as HTMLInputElement | undefined)?.value).toBe("#e2e8f0");
    expect((textSwatch as HTMLInputElement | undefined)?.value).toBe("#0f172a");
    expect(findInputByAriaLabel(view.container, "Card background value")).toBeUndefined();
    expect(findInputByAriaLabel(view.container, "Card border value")).toBeUndefined();
    expect(findInputByAriaLabel(view.container, "Text color value")).toBeUndefined();
    expect(view.container.textContent).toContain("Saved custom color");

    React.act(() => {
      setInputValue(backgroundSwatch, "#112233");
      setInputValue(borderSwatch, "#445566");
      setInputValue(textSwatch, "#778899");
    });
    await flush();

    expect(latestValue.style?.backgroundColor).toBe("#112233");
    expect(latestValue.style?.borderColor).toBe("#445566");
    expect(latestValue.style?.textColor).toBe("#778899");
    expect(view.container.textContent).not.toContain("Saved custom color");

    React.act(() => {
      clearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(latestValue.style?.backgroundColor).toBeUndefined();
    expect(toastInfo).toHaveBeenCalledWith("Card background cleared.", {
      action: {
        label: "Undo",
        onClick: expect.any(Function),
      },
    });

    const [, options] = toastInfo.mock.calls.at(-1) ?? [];
    React.act(() => {
      options?.action?.onClick?.();
    });
    await flush();

    expect(latestValue.style?.backgroundColor).toBe("#112233");
  } finally {
    view.cleanup();
  }
});

test("PostsFeed visual editor keeps fresh colors theme-owned and page-picks view-all destination", async () => {
  const { PostsFeedVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  let latestValue: PostsFeedData = {
    pagination: {
      mode: "view-all",
      pageSize: 6,
      viewAllHref: "https://legacy.example.com/posts",
      viewAllLabel: "View all posts",
      loadMoreLabel: "Load more",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<PostsFeedData>(latestValue);

    return (
      <PostsFeedVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="cards"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Theme default");
    expect(findInputByAriaLabel(view.container, "Card background value")).toBeUndefined();
    expect(findInputByAriaLabel(view.container, "Card border value")).toBeUndefined();
    expect(findInputByAriaLabel(view.container, "Text color value")).toBeUndefined();
    expect(findInputByPlaceholder(view.container, "Leave empty to use the posts list route")).toBe(
      undefined
    );
    expect(view.container.textContent).toContain("Saved custom destination");

    React.act(() => {
      setSelectValue(
        findSelectByOptions(view.container, [
          "__coderso_link_empty__",
          "updates-page",
          "__coderso_link_custom__",
        ]),
        "updates-page"
      );
    });
    await flush();

    expect(latestValue.pagination?.viewAllHref).toBe("/updates");
  } finally {
    view.cleanup();
  }
});

test("PostsFeed visual editor uses shared expired-session preview guidance", async () => {
  const { PostsFeedVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  previewResourcesState.settingsError = {
    name: "ApiClientError",
    status: 401,
    code: "auth_required",
    sharedFailureKind: "session_expired",
    message: "Authentication required",
  };

  const setPreviewState = vi.fn();
  const view = mount(
    <PostsFeedVisualEditor
      value={{ source: { mode: "latest", limit: 2, sort: "published-desc" } }}
      onChange={() => undefined}
      variant="cards"
      context={{
        surface: "page-builder",
        editorMode: "visual",
        blockId: "posts-feed-1",
        setPreviewState,
      }}
    />
  );

  try {
    await flush();

    expect(setPreviewState).toHaveBeenLastCalledWith({
      status: "ready",
      message: "Your admin session expired. Sign in again to refresh Posts Feed preview links.",
      dataPatch: expect.objectContaining({
        resolved: expect.objectContaining({
          total: 2,
        }),
      }),
    });
  } finally {
    view.cleanup();
  }
});

test("PostsFeed editors ignore async post option resolution after unmount", async () => {
  const { PostsFeedWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  const resolveDeferred = createDeferred<typeof postsFeedState.posts>();
  postsFeedState.listPostsImpl = () => resolveDeferred.promise;

  const view = mount(
    <PostsFeedWizardEditor
      value={{ source: { mode: "manual" } }}
      onChange={() => undefined}
      variant="cards"
    />
  );

  try {
    await flush();
  } finally {
    view.cleanup();
  }

  await React.act(async () => {
    resolveDeferred.resolve(postsFeedState.posts);
    await Promise.resolve();
  });

  const rejectDeferred = createDeferred<typeof postsFeedState.posts>();
  postsFeedState.listPostsImpl = () => rejectDeferred.promise;

  const rejectView = mount(
    <PostsFeedWizardEditor
      value={{ source: { mode: "manual" } }}
      onChange={() => undefined}
      variant="cards"
    />
  );

  try {
    await flush();
  } finally {
    rejectView.cleanup();
  }

  await React.act(async () => {
    rejectDeferred.reject(new Error("late failure"));
    await Promise.resolve();
  });
});
