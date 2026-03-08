// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { PostsFeedData } from "../../../core/widgets/core/postsFeed";

const postsFeedState = vi.hoisted(() => ({
  posts: [
    {
      id: "post-1",
      title: "Launch note",
      slug: "launch-note",
      status: "published",
      data: {},
      tags: ["featured"],
      scheduledAt: null,
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
      publishedAt: "2026-03-08T10:00:00.000Z",
      author: null,
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
      author: null,
    },
  ],
  postsError: null as unknown,
  reset() {
    this.postsError = null;
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
  }) => <input value={value} onChange={onChange} placeholder={placeholder} type={type} {...props} />,
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
  }) => <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} {...props} />,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/postsClient", () => ({
  listPostsCached: vi.fn(async () => {
    if (postsFeedState.postsError) throw postsFeedState.postsError;
    return postsFeedState.posts;
  }),
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

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
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

const setTextareaValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
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

const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareaByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const clickElement = (element: Element | undefined) => {
  if (!element) return;
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  postsFeedState.reset();
});

test("PostsFeed editors cover source modes, manual posts, display toggles, layout, CTA, and runtime snapshot", async () => {
  const {
    PostsFeedAdvancedEditor,
    PostsFeedVisualEditor,
    PostsFeedWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

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
        <PostsFeedAdvancedEditor
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
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Source setup");
    expect(view.container.textContent).toContain("Layout and style");
    expect(view.container.textContent).toContain("Runtime payload");

    act(() => {
      setSelectValue(
        findSelectByOptions(view.container, [
          "latest",
          "featured",
          "category",
          "manual",
        ]),
        "manual"
      );
    });
    await flush();

    const manualCheckboxes = Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    clickElement(manualCheckboxes[0]);

    act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "e.g. news, updates, automotive"),
        "news"
      );
    });

    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Read more"), "Read article");
      setInputValue(findInputByPlaceholder(view.container, "No posts found"), "Nothing published");
      setTextareaValue(
        findTextareaByPlaceholder(
          view.container,
          "Adjust source settings or publish posts to show content here."
        ),
        "Try another filter"
      );
      setSelectValue(
        findSelectByOptions(view.container, [
          "cards",
          "list",
          "compact",
        ]),
        "compact"
      );
      setSelectValue(findSelectByOptions(view.container, ["1", "2", "3"]), "2");
      setSelectValue(findSelectByOptions(view.container, ["sm", "md", "lg"]), "lg");
      setSelectValue(
        findSelectByOptions(view.container, ["outlined", "elevated", "minimal"]),
        "elevated"
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
        "title-asc"
      );
    });

    const switches = Array.from(view.container.querySelectorAll("input[type='checkbox']")).slice(1);
    clickElement(switches[0]);
    clickElement(switches[1]);
    clickElement(switches[2]);
    clickElement(switches[3]);

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
          sort: "title-asc",
        }),
        style: expect.objectContaining({
          columns: "2",
          gap: "lg",
          cardStyle: "elevated",
          ctaLabel: "Read article",
        }),
        emptyState: expect.objectContaining({
          title: "Nothing published",
          description: "Try another filter",
        }),
      })
    );
    expect(onVariantChangeSpy).toHaveBeenCalledWith("compact");
    expect(view.container.textContent).toContain("Selected: Launch note");
  } finally {
    view.cleanup();
  }
});

test("PostsFeed editors surface post loading errors", async () => {
  const {
    PostsFeedAdvancedEditor,
    PostsFeedVisualEditor,
    PostsFeedWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  postsFeedState.postsError = {
    name: "ApiClientError",
    message: "Posts failed",
  };

  const Harness = () => {
    const [value, setValue] = useState<PostsFeedData>({} as PostsFeedData);
    return (
      <>
        <PostsFeedWizardEditor value={value} onChange={setValue} />
        <PostsFeedVisualEditor value={value} onChange={setValue} />
        <PostsFeedAdvancedEditor value={value} onChange={setValue} />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    act(() => {
      setSelectValue(
        findSelectByOptions(view.container, [
          "latest",
          "featured",
          "category",
          "manual",
        ]),
        "manual"
      );
    });
    await flush();
    expect(view.container.textContent).toContain("Posts failed");
  } finally {
    view.cleanup();
  }
});
