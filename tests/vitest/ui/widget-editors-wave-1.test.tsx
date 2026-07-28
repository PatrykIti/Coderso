// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const widgetEditorState = vi.hoisted(() => ({
  templateId: "11111111-1111-4111-8111-111111111111",
  posts: [
    {
      id: "post-1",
      title: "Launch notes",
      slug: "launch-notes",
      status: "published",
      data: {},
      tags: [],
      scheduledAt: null,
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
      publishedAt: "2026-03-08T10:00:00.000Z",
      author: null,
    },
  ],
  contentTypes: [{ id: "articles", name: "Articles" }],
  listingQueries: [
    {
      id: "query-1",
      name: "Featured query",
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
      id: "tpl-1",
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
      status: "published",
    },
  ],
  widgetTemplates: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Hero template",
      description: "Hero reusable block",
      status: "published",
      blocks: [{ id: "block-1", type: "hero" }],
    },
  ],
  templateError: null as string | null,
  postsError: null as unknown,
  listingError: null as unknown,
  reset() {
    this.templateError = null;
    this.postsError = null;
    this.listingError = null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    [key: string]: unknown;
  }) => <textarea defaultValue={value} onChange={onChange} {...props} />,
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
    if (widgetEditorState.postsError) throw widgetEditorState.postsError;
    return widgetEditorState.posts;
  }),
}));

vi.mock("@/services/contentTypesClient", () => ({
  listContentTypesCached: vi.fn(async () => widgetEditorState.contentTypes),
}));

vi.mock("@/services/listingsClient", () => ({
  listListingQueriesCached: vi.fn(async () => {
    if (widgetEditorState.listingError) throw widgetEditorState.listingError;
    return widgetEditorState.listingQueries;
  }),
  listListingTemplatesCached: vi.fn(async () => {
    if (widgetEditorState.listingError) throw widgetEditorState.listingError;
    return widgetEditorState.listingTemplates;
  }),
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

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const findSelectByOptions = (container: Element, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findButtonByText = (container: Element, label: string) =>
  Array.from(container.querySelectorAll("button")).find(
    (element) => element.textContent?.trim() === label
  );

afterEach(() => {
  vi.restoreAllMocks();
  widgetEditorState.reset();
});

test("TemplateSection editors cover setup, visual summaries, and advanced diagnostics", async () => {
  const {
    TemplateSectionAdvancedEditor,
    TemplateSectionVisualEditor,
    TemplateSectionWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/TemplateSectionEditors");

  const onChange = vi.fn();

  const emptyView = mount(
    <TemplateSectionWizardEditor
      value={{ templateId: "", templateName: "", resolved: undefined } as never}
      onChange={onChange}
      variant="default"
    />
  );

  try {
    expect(emptyView.container.textContent).toContain("Not selected");
    expect(emptyView.container.textContent).toContain("Widget-template selection retired");
  } finally {
    emptyView.cleanup();
  }

  const view = mount(
    <>
      <TemplateSectionVisualEditor
        value={
          {
            templateId: widgetEditorState.templateId,
            templateName: "Hero template",
            resolved: { blocks: [{ id: "block-1" }] },
          } as never
        }
        onChange={onChange}
        variant="default"
      />
      <TemplateSectionAdvancedEditor
        value={
          {
            templateId: widgetEditorState.templateId,
            templateName: "Hero template",
            resolved: { blocks: [{ id: "block-1" }] },
          } as never
        }
        onChange={onChange}
        variant="default"
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Hero template");
    expect(view.container.textContent).toContain("Active template");
    expect(view.container.textContent).toContain("Resolved template");
    expect(view.container.textContent).toContain("Resolved content summary");
    expect(view.container.textContent).toContain("Resolved content is ready.");
    expect(view.container.textContent).not.toContain("Resolved payload");

    expect(view.container.querySelector("select")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("AppointmentForm editors update flow, copy, visibility, and advanced runtime fields", async () => {
  const {
    AppointmentFormAdvancedEditor,
    AppointmentFormVisualEditor,
    AppointmentFormWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/AppointmentFormEditors");

  const onChange = vi.fn();
  const view = mount(
    <>
      <AppointmentFormWizardEditor value={{} as never} onChange={onChange} variant="default" />
      <AppointmentFormVisualEditor value={{} as never} onChange={onChange} variant="default" />
      <AppointmentFormAdvancedEditor value={{} as never} onChange={onChange} variant="default" />
    </>
  );

  try {
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const textareas = Array.from(view.container.querySelectorAll("textarea"));
    const toggles = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];

    React.act(() => {
      setInputValue(inputs[0], "booking-flow");
      setInputValue(inputs[1], "Intro title");
      setTextareaValue(textareas[0], "Intro description");
      setInputValue(inputs[2], "Book now");
      setInputValue(inputs[3], "Saved");
      setInputValue(inputs[4], "Slot summary");
      setInputValue(inputs[5], "No slot selected");
      setInputValue(inputs[6], "Name");
      setInputValue(inputs[7], "Jane");
      setInputValue(inputs[8], "Email");
      setInputValue(inputs[9], "jane@example.com");
      toggles[0]?.click();
      setInputValue(inputs[10], "Phone");
      setInputValue(inputs[11], "+48123");
      toggles[1]?.click();
      setInputValue(inputs[12], "Notes");
      setInputValue(inputs[13], "Type details");
      setInputValue(inputs[14], "/api/bookings");
      setInputValue(inputs[15], "Please select a slot");
      setInputValue(inputs[16], "nonce-1");
      setInputValue(inputs[17], "booking_nonce_unavailable");
    });

    expect(onChange).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PostsFeed editors cover source modes, manual posts, display toggles, and layout options", async () => {
  const { PostsFeedAdvancedEditor, PostsFeedVisualEditor, PostsFeedWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/PostsFeedEditors");

  const onChange = vi.fn();

  const view = mount(
    <>
      <PostsFeedWizardEditor value={{} as never} onChange={onChange} variant="cards" />
      <PostsFeedVisualEditor value={{} as never} onChange={onChange} variant="cards" />
      <PostsFeedAdvancedEditor value={{} as never} onChange={onChange} variant="cards" />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Latest posts");

    const selects = Array.from(view.container.querySelectorAll("select"));
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const toggles = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];

    React.act(() => {
      setSelectValue(selects[0], "manual");
      toggles[0]?.click();
      setInputValue(inputs[0], "8");
      setSelectValue(selects[1], "title-asc");
      toggles[1]?.click();
      toggles[2]?.click();
      toggles[3]?.click();
      toggles[4]?.click();
      setSelectValue(selects[3], "2");
      setSelectValue(selects[4], "lg");
      setSelectValue(selects[5], "elevated");
      setInputValue(inputs[1], "Read post");
    });

    expect(onChange).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ContentList editors cover legacy/listing source modes and visual options", async () => {
  const { ContentListAdvancedEditor, ContentListVisualEditor, ContentListWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");

  const onChange = vi.fn();
  const view = mount(
    <>
      <ContentListWizardEditor value={{} as never} onChange={onChange} variant="cards" />
      <ContentListVisualEditor value={{} as never} onChange={onChange} variant="cards" />
      <ContentListAdvancedEditor value={{} as never} onChange={onChange} variant="cards" />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Source setup");

    const selects = Array.from(view.container.querySelectorAll("select"));
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const toggles = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];

    React.act(() => {
      setSelectValue(selects[0], "listing");
      setSelectValue(selects[1], "query-1");
      setSelectValue(selects[2], "tpl-1");
      setInputValue(inputs[0], "12");
      setSelectValue(selects[4], "2");
      setSelectValue(selects[5], "lg");
      setSelectValue(selects[6], "elevated");
      toggles[0]?.click();
      toggles[1]?.click();
      setInputValue(inputs[1], "Read more");
    });

    expect(onChange).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
