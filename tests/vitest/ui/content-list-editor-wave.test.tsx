// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ContentListData } from "../../../core/widgets/core/contentList";

const contentListState = vi.hoisted(() => ({
  contentTypes: [
    {
      id: "articles",
      name: "Articles",
    },
  ],
  listingQueries: [
    {
      id: "query-1",
      name: "Featured listing",
      description: "Homepage query",
      query: {
        source: "entries",
        sourceConfig: { contentTypeId: "articles", includeDrafts: false },
        filters: [],
        sort: [{ field: "updatedAt", dir: "desc" }],
        pagination: { limit: 6, offset: 0 },
        fields: ["id", "title"],
      },
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
  ],
  listingTemplates: [
    {
      id: "template-1",
      name: "Cards",
      slug: "cards",
      description: "Cards template",
      layout: "grid",
      config: {
        fields: [],
        itemActions: [],
        emptyState: {
          title: "No items found",
          description: null,
          ctaLabel: null,
          ctaHref: null,
        },
        style: {
          columns: 3,
          gap: "md",
          cardVariant: "default",
        },
      },
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
  ],
  contentTypesError: null as unknown,
  listingsError: null as unknown,
  reset() {
    this.contentTypesError = null;
    this.listingsError = null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    disabled,
    placeholder,
    type,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    placeholder?: string;
    type?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      type={type}
      {...props}
    />
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
    readOnly,
    placeholder,
    rows,
    className,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    readOnly?: boolean;
    placeholder?: string;
    rows?: number;
    className?: string;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      rows={rows}
      className={className}
      {...props}
    />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) =>
    values.filter(Boolean).join(" "),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/contentTypesClient", () => ({
  listContentTypesCached: vi.fn(async () => {
    if (contentListState.contentTypesError) throw contentListState.contentTypesError;
    return contentListState.contentTypes;
  }),
}));

vi.mock("@/services/listingsClient", () => ({
  listListingQueriesCached: vi.fn(async () => {
    if (contentListState.listingsError) throw contentListState.listingsError;
    return contentListState.listingQueries;
  }),
  listListingTemplatesCached: vi.fn(async () => {
    if (contentListState.listingsError) throw contentListState.listingsError;
    return contentListState.listingTemplates;
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

const clickElement = (element: Element | undefined) => {
  if (!element) return;
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
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

const findTextareasByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).filter(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  );

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

afterEach(() => {
  vi.restoreAllMocks();
  contentListState.reset();
});

test("ContentList editors cover legacy and listing source modes, variant/layout controls, runtime labels, and snapshot", async () => {
  const {
    ContentListAdvancedEditor,
    ContentListVisualEditor,
    ContentListWizardEditor,
  } = await import(
    "../../../core/admin/ui/widgets/editors/ContentListEditors"
  );

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<ContentListData>({} as ContentListData);
    const [variant, setVariant] = useState("cards");
    return (
      <>
        <ContentListWizardEditor
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
        <ContentListVisualEditor
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
        <ContentListAdvancedEditor
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
    expect(view.container.textContent).toContain("Variant and layout");
    expect(view.container.textContent).toContain("Runtime payload");

    act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["legacy", "listing"])[0],
        "legacy"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_content_type__", "articles"])[0],
        "articles"
      );
      setInputValue(
        findInputByPlaceholder(view.container, "e.g. featured or case-study"),
        "featured"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["published", "all", "draft", "scheduled", "archived"])[0],
        "draft"
      );
      setSelectValue(
        findSelectsByOptions(view.container, [
          "published-desc",
          "published-asc",
          "updated-desc",
          "updated-asc",
          "title-asc",
          "title-desc",
        ])[0],
        "title-asc"
      );
      setInputValue(findInputByPlaceholder(view.container, "e.g. news"), "news");
      setInputValue(
        findInputByPlaceholder(view.container, "Optional helper text."),
        "Empty state helper"
      );
    });

    act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["cards", "list", "compact"])[0],
        "compact"
      );
      setSelectValue(findSelectsByOptions(view.container, ["1", "2", "3"])[0], "2");
      setSelectValue(findSelectsByOptions(view.container, ["sm", "md", "lg"])[0], "lg");
      setSelectValue(
        findSelectsByOptions(view.container, ["outlined", "elevated", "minimal"])[0],
        "elevated"
      );
      setInputValue(findInputByPlaceholder(view.container, "Read more"), "View entry");
    });

    const checkboxes = Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    clickElement(checkboxes[0]);
    clickElement(checkboxes[1]);
    clickElement(checkboxes[2]);
    clickElement(checkboxes[3]);

    act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["legacy", "listing"])[0],
        "listing"
      );
    });
    await flush();

    act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_query__", "query-1"])[0],
        "query-1"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_template__", "template-1"])[0],
        "template-1"
      );
    });

    const payload = onChangeSpy.mock.lastCall?.[0];
    expect(payload).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          mode: "listing",
          listingQueryId: "query-1",
          listingTemplateId: "template-1",
        }),
        style: expect.objectContaining({
          columns: "2",
          gap: "lg",
          cardStyle: "elevated",
          ctaLabel: "View entry",
        }),
      })
    );
    expect(onVariantChangeSpy).toHaveBeenCalledWith("compact");
    expect(view.container.textContent).toContain('"items"');
    expect(view.container.textContent).toContain('"runtime"');
  } finally {
    view.cleanup();
  }
});

test("ContentList editors surface content type and listings loading errors", async () => {
  const {
    ContentListAdvancedEditor,
    ContentListVisualEditor,
    ContentListWizardEditor,
  } = await import(
    "../../../core/admin/ui/widgets/editors/ContentListEditors"
  );

  contentListState.contentTypesError = {
    name: "ApiClientError",
    message: "Types failed",
  };
  contentListState.listingsError = {
    name: "ApiClientError",
    message: "Listings failed",
  };

  const Harness = () => {
    const [value, setValue] = useState<ContentListData>({} as ContentListData);
    return (
      <>
        <ContentListWizardEditor value={value} onChange={setValue} />
        <ContentListVisualEditor value={value} onChange={setValue} />
        <ContentListAdvancedEditor value={value} onChange={setValue} />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Types failed");

    act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["legacy", "listing"])[0],
        "listing"
      );
    });
    await flush();

    expect(view.container.textContent).toContain("Listings failed");
  } finally {
    view.cleanup();
  }
});
