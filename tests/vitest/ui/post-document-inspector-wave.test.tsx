// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { DocumentInspector } from "../../../core/admin/ui/posts/editor/inspector/DocumentInspector";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
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

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => <textarea value={value} onChange={onChange} placeholder={placeholder} {...props} />,
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
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
  };
});

vi.mock("@/components/ui/collapsible", () => {
  const ReactLocal = React;
  const CollapsibleContext = ReactLocal.createContext<{
    open: boolean;
    setOpen: (value: boolean) => void;
  } | null>(null);

  return {
    Collapsible: ({
      children,
      defaultOpen = false,
    }: {
      children: React.ReactNode;
      defaultOpen?: boolean;
    }) => {
      const [open, setOpen] = ReactLocal.useState(defaultOpen);
      return (
        <CollapsibleContext.Provider value={{ open, setOpen }}>
          <div data-collapsible-open={String(open)}>{children}</div>
        </CollapsibleContext.Provider>
      );
    },
    CollapsibleTrigger: ({
      children,
      asChild,
    }: {
      children: React.ReactNode;
      asChild?: boolean;
    }) => {
      const context = ReactLocal.useContext(CollapsibleContext);
      if (!context) return <>{children}</>;
      if (asChild && ReactLocal.isValidElement(children)) {
        const child = children as React.ReactElement<{
          onClick?: () => void;
          "data-state"?: string;
        }>;
        return ReactLocal.cloneElement(child, {
          onClick: () => {
            child.props.onClick?.();
            context.setOpen(!context.open);
          },
          "data-state": context.open ? "open" : "closed",
        });
      }
      return (
        <button type="button" onClick={() => context.setOpen(!context.open)}>
          {children}
        </button>
      );
    },
    CollapsibleContent: ({ children }: { children: React.ReactNode }) => {
      const context = ReactLocal.useContext(CollapsibleContext);
      if (!context?.open) return null;
      return <div>{children}</div>;
    },
  };
});

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: ({ content }: { content: string }) => <span data-info-tip={content}>info</span>,
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({
    onChange,
    accept,
    value,
  }: {
    onChange?: (value: unknown) => void;
    accept?: string[];
    value?: unknown;
  }) => (
    <div data-media-picker-accept={(accept ?? []).join(",")}>
      <span>{`media:${String(value ?? "none")}`}</span>
      <button type="button" onClick={() => onChange?.("media-1")}>
        pick-media
      </button>
    </div>
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input for value: ${value}`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  React.act(() => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing textarea for value: ${value}`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  React.act(() => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Missing select for value: ${value}`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  React.act(() => {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("DocumentInspector keeps advanced fields expanded and routes document callbacks", () => {
  const onMoveToTrash = vi.fn();
  const onTitleChange = vi.fn();
  const onSlugChange = vi.fn();
  const onExcerptChange = vi.fn();
  const onFeaturedImageChange = vi.fn();
  const onTagsInputChange = vi.fn();
  const onCategoryIdChange = vi.fn();
  const onSeoChange = vi.fn();

  const view = mount(
    <DocumentInspector
      title="Hello world"
      status="draft"
      slug="hello-world"
      excerpt=""
      featuredImage=""
      tagsInput=""
      categoryId=""
      seo={{
        title: "",
        description: "",
        canonicalUrl: "",
        robots: "",
      }}
      taxonomySummary={{ categoryName: null, tagCount: 0 }}
      categoryOptions={[
        { id: "cat-1", name: "Category One" },
        { id: "cat-2", name: "Category Two" },
      ]}
      slugDisplay={{
        label: "Public URL",
        value: "https://coderso.test/blog/hello-world",
        concrete: true,
      }}
      updatedAt="2026-03-13T09:00:00.000Z"
      scheduledAt={null}
      publishedAt={null}
      onMoveToTrash={onMoveToTrash}
      onTitleChange={onTitleChange}
      onSlugChange={onSlugChange}
      onExcerptChange={onExcerptChange}
      onFeaturedImageChange={onFeaturedImageChange}
      onTagsInputChange={onTagsInputChange}
      onCategoryIdChange={onCategoryIdChange}
      onSeoChange={onSeoChange}
    />
  );

  try {
    expect(view.container.textContent).toContain("Current category: Not assigned");

    const selectsBeforeToggle = Array.from(view.container.querySelectorAll("select"));
    setSelectValue(selectsBeforeToggle[0], "cat-2");
    setInputValue(
      view.container.querySelector('input[placeholder="news, guide, release"]'),
      "release, docs"
    );
    const mediaButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("pick-media")
    );
    if (!(mediaButton instanceof HTMLButtonElement)) {
      throw new Error("missing media picker trigger");
    }

    React.act(() => {
      mediaButton.click();
    });

    expect(view.container.textContent).not.toContain("Toggle");
    expect(view.container.textContent).toContain("SEO fields completed: 0/3");
    expect(view.container.textContent).toContain("Public URL:");

    const inputs = Array.from(view.container.querySelectorAll("input"));
    const textareas = Array.from(view.container.querySelectorAll("textarea"));
    const robotsSelect = Array.from(view.container.querySelectorAll("select"))[1];

    setInputValue(
      inputs.find((input) => input.value === "Hello world"),
      "Updated title"
    );
    setInputValue(
      inputs.find((input) => input.value === "hello-world"),
      "updated-slug"
    );
    setTextareaValue(
      textareas.find((textarea) => textarea.placeholder === "Short summary for listings"),
      "Updated excerpt"
    );
    setInputValue(
      view.container.querySelector('input[placeholder="Title shown in search results"]'),
      "SEO title"
    );
    setTextareaValue(
      view.container.querySelector('textarea[placeholder="Description shown in search results"]'),
      "SEO description"
    );
    setInputValue(
      view.container.querySelector('input[placeholder="https://example.com/post"]'),
      "https://example.com/post"
    );
    setSelectValue(robotsSelect, "noindex,follow");

    const dangerButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Move to trash")
    );
    if (!(dangerButton instanceof HTMLButtonElement)) {
      throw new Error("missing danger button");
    }

    React.act(() => {
      dangerButton.click();
    });

    expect(onCategoryIdChange).toHaveBeenCalledWith("cat-2");
    expect(onTagsInputChange).toHaveBeenCalledWith("release, docs");
    expect(onFeaturedImageChange).toHaveBeenCalledWith("media-1");
    expect(onTitleChange).toHaveBeenCalledWith("Updated title");
    expect(onSlugChange).toHaveBeenCalledWith("updated-slug");
    expect(onExcerptChange).toHaveBeenCalledWith("Updated excerpt");
    expect(onSeoChange).toHaveBeenCalledWith({ title: "SEO title" });
    expect(onSeoChange).toHaveBeenCalledWith({ description: "SEO description" });
    expect(onSeoChange).toHaveBeenCalledWith({ canonicalUrl: "https://example.com/post" });
    expect(onSeoChange).toHaveBeenCalledWith({ robots: "noindex,follow" });
    expect(onMoveToTrash).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("DocumentInspector renders timestamp fallbacks and disables danger action when unavailable", () => {
  const view = mount(
    <DocumentInspector
      title="Archived"
      status="archived"
      slug="archived"
      excerpt="Done"
      featuredImage=""
      tagsInput=""
      categoryId=""
      seo={{
        title: "SEO title",
        description: "",
        canonicalUrl: "",
        robots: "",
      }}
      taxonomySummary={{ categoryName: null, tagCount: 0 }}
      categoryOptions={[]}
      updatedAt="not-a-date"
      scheduledAt={null}
      publishedAt={undefined}
      moveToTrashPending
      onTitleChange={() => undefined}
      onSlugChange={() => undefined}
      onExcerptChange={() => undefined}
      onFeaturedImageChange={() => undefined}
      onTagsInputChange={() => undefined}
      onCategoryIdChange={() => undefined}
      onSeoChange={() => undefined}
    />
  );

  try {
    // Status is rendered via the shared StatusBadge (TASK-479-09-L02), which emits
    // the raw lowercase status text styled with a `capitalize` CSS class — so the
    // DOM textContent is "archived" (visually "Archived"), not a literal label.
    expect(view.container.textContent?.toLowerCase()).toContain("archived");
    expect(view.container.textContent).toContain("not-a-date");
    expect(view.container.textContent).toContain("Not set");
    expect(view.container.textContent).toContain("Moving to trash...");
    expect(view.container.querySelector("[data-media-picker-accept='image/*']")).toBeTruthy();

    const dangerButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Moving to trash")
    );
    expect(dangerButton).toBeInstanceOf(HTMLButtonElement);
    expect((dangerButton as HTMLButtonElement).disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("DocumentInspector sanitizes taxonomy load errors and keeps retry available", () => {
  const onTaxonomyRetry = vi.fn();
  const view = mount(
    <DocumentInspector
      title="Taxonomy fallback"
      status="draft"
      slug="taxonomy-fallback"
      excerpt=""
      featuredImage=""
      tagsInput=""
      categoryId=""
      seo={{
        title: "",
        description: "",
        canonicalUrl: "",
        robots: "",
      }}
      taxonomySummary={{ categoryName: null, tagCount: 0 }}
      categoryOptions={[]}
      taxonomyError='Failed query: select "content_terms"."id" from "content_terms"'
      onTaxonomyRetry={onTaxonomyRetry}
      updatedAt="2026-03-13T09:00:00.000Z"
      scheduledAt={null}
      publishedAt={null}
      onTitleChange={() => undefined}
      onSlugChange={() => undefined}
      onExcerptChange={() => undefined}
      onFeaturedImageChange={() => undefined}
      onTagsInputChange={() => undefined}
      onCategoryIdChange={() => undefined}
      onSeoChange={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Could not load categories.");
    expect(view.container.textContent).not.toContain("Failed query");
    expect(view.container.textContent).not.toContain("select");
    expect(view.container.textContent).toContain("No category");

    const retryButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Try again")
    );
    expect(retryButton).toBeInstanceOf(HTMLButtonElement);

    React.act(() => {
      (retryButton as HTMLButtonElement).click();
    });

    expect(onTaxonomyRetry).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});
