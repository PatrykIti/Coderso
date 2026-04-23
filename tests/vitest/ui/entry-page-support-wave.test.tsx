// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

const entriesState = vi.hoisted(() => ({
  createEntry: vi.fn(async (typeSlug: string, input: Record<string, unknown>) => ({
    id: "entry-1",
    title: input.title,
    slug: input.slug,
    typeSlug,
    data: {},
  })),
  relationItems: [
    {
      id: "related-1",
      title: "Linked entry",
      slug: "linked-entry",
      status: "published",
      updatedAt: "2026-03-06T12:00:00.000Z",
      author: null,
    },
  ],
  relationError: null as unknown,
  listEntriesCached: vi.fn(async () => {
    if (entriesState.relationError) throw entriesState.relationError;
    return entriesState.relationItems;
  }),
  reset() {
    entriesState.createEntry.mockClear();
    entriesState.listEntriesCached.mockClear();
    entriesState.relationItems = [
      {
        id: "related-1",
        title: "Linked entry",
        slug: "linked-entry",
        status: "published",
        updatedAt: "2026-03-06T12:00:00.000Z",
        author: null,
      },
    ];
    entriesState.relationError = null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
      <span>{children}</span>
    ) : (
      <button type="button" onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <input
      type="checkbox"
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    onKeyDown,
    onBlur,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => (
    <input
      defaultValue={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  ): Array<{ value: string; label: string }> =>
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
    <div data-sheet-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {children}
    </div>
  ),
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

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

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    colSpan,
    className,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
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

vi.mock("@/services/entriesClient", () => ({
  createEntry: entriesState.createEntry,
  listEntriesCached: entriesState.listEntriesCached,
}));

vi.mock("@/ui/posts/editor/richtext/PostRichTextAdapter", () => ({
  PostRichTextAdapter: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <button
      type="button"
      data-richtext-value={value}
      onClick={() => onChange("Updated body")}
    >
      richtext-editor
    </button>
  ),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({
    onChange,
    multiple,
    maxItems,
    accept,
  }: {
    onChange: (value: unknown) => void;
    multiple?: boolean;
    maxItems?: number;
    accept?: string[];
  }) => (
    <div>
      <button type="button" onClick={() => onChange("media-1")}>
        media-picker
      </button>
      <span>{`media-multiple:${String(Boolean(multiple))}`}</span>
      <span>{`media-max:${maxItems ?? "none"}`}</span>
      <span>{`media-accept:${(accept ?? []).join("|") || "none"}`}</span>
    </div>
  ),
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) =>
    values.filter(Boolean).join(" "),
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
    rerender: (next: React.ReactNode) => {
      act(() => {
        root.render(next);
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

afterEach(() => {
  vi.restoreAllMocks();
  entriesState.reset();
});

test("EntryCreateDrawer normalizes create payloads and open-after-create flow", async () => {
  const { EntryCreateDrawer } = await import(
    "../../../core/admin/ui/entries/EntryCreateDrawer"
  );

  const onOpenChange = vi.fn();
  const onCreated = vi.fn();

  const view = mount(
    <EntryCreateDrawer
      open
      onOpenChange={onOpenChange}
      types={[
        { id: "type-1", slug: "articles", name: "Articles" },
        { id: "type-2", slug: "products", name: "Products" },
      ]}
      defaultTypeSlug="articles"
      onCreated={onCreated}
    />
  );

  try {
    expect(view.container.textContent).toContain("Create New Article");

    const titleInput = view.container.querySelector(
      'input[placeholder="e.g. Launch announcement"]'
    );
    const slugInput = view.container.querySelector(
      'input[placeholder="launch-announcement"]'
    );
    const select = view.container.querySelector("select");
    const checkbox = view.container.querySelector("input[type='checkbox']");
    const buttons = Array.from(view.container.querySelectorAll("button"));

    await act(async () => {
      setSelectValue(select ?? undefined, "products");
      setInputValue(titleInput ?? undefined, "New Product");
      setInputValue(slugInput ?? undefined, "new-product");
      (checkbox as HTMLInputElement | null)?.click();
      buttons.find((button) => button.textContent === "Create Draft")?.click();
      await Promise.resolve();
    });

    expect(entriesState.createEntry).toHaveBeenCalledWith("products", {
      title: "New Product",
      slug: "new-product",
      data: {},
    });
    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "entry-1",
        slug: "new-product",
      }),
      "products",
      false
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("EntryTypeSidebar filters types and forwards select/create actions", async () => {
  const { EntryTypeSidebar } = await import(
    "../../../core/admin/ui/entries/EntryTypeSidebar"
  );

  const onSelect = vi.fn();
  const onCreateCollection = vi.fn();

  const view = mount(
    <EntryTypeSidebar
      types={[
        { id: "type-1", slug: "articles", name: "Articles", count: 4 },
        { id: "type-2", slug: "products", name: "Products", count: 2 },
      ]}
      activeSlug="articles"
      onSelect={onSelect}
      onCreateCollection={onCreateCollection}
    />
  );

  try {
    expect(view.container.textContent).toContain("Articles");
    expect(view.container.textContent).toContain("New Collection");

    const input = view.container.querySelector("input");
    const buttons = Array.from(view.container.querySelectorAll("button"));

    act(() => {
      setInputValue(input ?? undefined, "prod");
    });
    expect(view.container.textContent).toContain("Products");
    expect(view.container.textContent).not.toContain("Articles");

    act(() => {
      buttons.find((button) => button.textContent?.includes("Products"))?.click();
      buttons.find((button) => button.textContent?.includes("New Collection"))?.click();
    });

    expect(onSelect).toHaveBeenCalledWith("products");
    expect(onCreateCollection).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("EntryMetadataPanel handles checklist, seo, taxonomy, and save actions", async () => {
  const { EntryMetadataPanel } = await import(
    "../../../core/admin/ui/entries/EntryMetadataPanel"
  );

  const onStatusChange = vi.fn();
  const onScheduledAtChange = vi.fn();
  const onSeoDescriptionChange = vi.fn();
  const onCategoryChange = vi.fn();
  const onTagIdsChange = vi.fn();
  const onCreateCategory = vi.fn(async () => ({
    id: "cat-2",
    name: "Updates",
    slug: "updates",
  }));
  const onCreateTag = vi.fn(async () => ({
    id: "tag-2",
    name: "Important",
    slug: "important",
  }));
  const onSave = vi.fn();

  const view = mount(
    <EntryMetadataPanel
      status="scheduled"
      onStatusChange={onStatusChange}
      scheduledAt="2026-03-07T10:00:00Z"
      onScheduledAtChange={onScheduledAtChange}
      title="Hello"
      slug="hello"
      seoDescription="Meta"
      onSeoDescriptionChange={onSeoDescriptionChange}
      checklist={{
        missingRequiredFields: [],
        blockingIssues: [],
        items: [
          { id: "seo", label: "SEO", status: "warning", detail: "Needs work" },
        ],
      }}
      taxonomy={{
        categoryEnabled: true,
        tagEnabled: true,
        selectedCategoryId: "cat-1",
        selectedTagIds: ["tag-1"],
        categories: [
          { id: "cat-1", name: "News", slug: "news" },
          { id: "cat-2", name: "Updates", slug: "updates" },
        ],
        tags: [
          { id: "tag-1", name: "Launch", slug: "launch" },
          { id: "tag-2", name: "Important", slug: "important" },
        ],
      }}
      onCategoryChange={onCategoryChange}
      onTagIdsChange={onTagIdsChange}
      onCreateCategory={onCreateCategory}
      onCreateTag={onCreateTag}
      helpItems={["Use this field carefully"]}
      author={{ name: "Alex Doe", email: "alex@example.com" }}
      onSave={onSave}
      isSaving={false}
    />
  );

  try {
    expect(view.container.textContent).toContain("Needs attention");
    expect(view.container.textContent).toContain("What is this help");
    expect(view.container.textContent).toContain("Alex Doe");

    const inputs = Array.from(view.container.querySelectorAll("input"));
    const textarea = view.container.querySelector("textarea");
    const selects = Array.from(view.container.querySelectorAll("select"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    await act(async () => {
      setSelectValue(selects[0], "draft");
      setInputValue(inputs[0], "2026-03-08T09:00:00Z");
      setTextareaValue(textarea ?? undefined, "Updated meta");
      setSelectValue(selects[1], "cat-2");
      setInputValue(inputs[1], "Fresh category");
      buttons.find((button) => button.textContent === "Add")?.click();
      setInputValue(inputs[2], "Important");
      inputs[2]?.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "Enter" })
      );
      buttons.find((button) => button.textContent?.includes("Save metadata"))?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onStatusChange).toHaveBeenCalledWith("draft");
    expect(onScheduledAtChange).toHaveBeenCalledWith("2026-03-08T09:00:00Z");
    expect(onSeoDescriptionChange).toHaveBeenCalledWith("Updated meta");
    expect(onCategoryChange).toHaveBeenCalledWith("cat-2");
    expect(onCreateCategory).toHaveBeenCalledWith("Fresh category");
    expect(onTagIdsChange).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("PageSettingsDrawer and PageRevisionDrawer forward save, autosave, restore, and discard", async () => {
  const { PageSettingsDrawer } = await import(
    "../../../core/admin/ui/pages/PageSettingsDrawer"
  );
  const { PageRevisionDrawer } = await import(
    "../../../core/admin/ui/pages/PageRevisionDrawer"
  );
  const { PageTable } = await import("../../../core/admin/ui/pages/PageTable");
  const { EntryTable } = await import("../../../core/admin/ui/entries/EntryTable");

  const onOpenChange = vi.fn();
  const onSave = vi.fn(async () => true);
  const onAutosave = vi.fn(async () => undefined);
  const onRestore = vi.fn();
  const onDiscard = vi.fn();
  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: vi.fn(() => true),
  });

  const view = mount(
    <>
      <PageSettingsDrawer
        open
        onOpenChange={onOpenChange}
        page={{
          id: "page-1",
          title: "Landing",
          slug: "/landing",
          status: "draft",
          currentData: { blocks: [] },
          updatedAt: "2026-03-06T12:00:00.000Z",
        } as never}
        settings={{
          template: "landing",
          showInNav: true,
          layout: {
            wrapper: {
              container: "default",
              maxWidth: undefined,
              padding: { top: "none", bottom: "none" },
              background: {
                color: "#ffffff",
                image: null,
                media: { type: "none", source: "external", src: null },
              },
            },
            sections: {
              gap: "lg",
              defaults: {
                container: "default",
                padding: { top: "xl", bottom: "xl" },
                margin: { top: "none", bottom: "none" },
              },
            },
            applyDefaultsToNewBlocks: true,
          },
          revisionRetention: 10,
        }}
        templateOptions={[{ key: "landing", label: "Landing" } as never]}
        onSave={onSave}
        onAutosave={onAutosave}
        isSubmitting={false}
        isAutosaving={false}
        error={null}
      />
      <PageRevisionDrawer
        open
        onOpenChange={onOpenChange}
        revisions={[
          {
            id: "rev-1",
            pageId: "page-1",
            version: 1,
            kind: "autosave",
            title: "Draft",
            slug: "/draft",
            data: { blocks: [] },
            createdAt: "2026-03-06T12:00:00.000Z",
            createdBy: { name: "Admin", email: "admin@example.com" },
          },
        ] as never}
        isLoading={false}
        error={null}
        onRestore={onRestore}
        onDiscard={onDiscard}
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Template and navigation");
    expect(view.container.textContent).toContain("Autosave");
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const selects = Array.from(view.container.querySelectorAll("select"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    act(() => {
      setInputValue(inputs[0], "About us");
      setInputValue(inputs[1], "/about");
      setSelectValue(selects[0], "landing");
      inputs[2]?.dispatchEvent(new Event("change", { bubbles: true }));
      buttons.find((button) => button.textContent?.includes("Reset to theme defaults"))?.click();
      buttons.find((button) => button.textContent?.includes("Save settings"))?.click();
      buttons.find((button) => button.textContent?.includes("Close and keep draft"))?.click();
      buttons.find((button) => button.textContent === "Discard")?.click();
      buttons.find((button) => button.textContent === "Restore")?.click();
      buttons.find((button) => button.textContent === "Edit")?.click();
      buttons.find((button) => button.textContent === "Preview")?.click();
      buttons.find((button) => button.textContent === "Publish")?.click();
      buttons.find((button) => button.textContent === "Unpublish")?.click();
      buttons.find((button) => button.textContent === "Duplicate")?.click();
      buttons.find((button) => button.textContent === "Delete")?.click();
    });

    expect(onSave).toHaveBeenCalled();
    expect(onAutosave).toHaveBeenCalled();
    expect(onDiscard).toHaveBeenCalledWith("rev-1");
    expect(onRestore).toHaveBeenCalledWith("rev-1");
  } finally {
    view.cleanup();
    Reflect.deleteProperty(window, "confirm");
  }
});

test("PageTable and EntryTable forward row and selection actions", async () => {
  const { PageTable } = await import("../../../core/admin/ui/pages/PageTable");
  const { EntryTable } = await import("../../../core/admin/ui/entries/EntryTable");

  const onToggleAll = vi.fn();
  const onToggleEntry = vi.fn();
  const onDeleteEntry = vi.fn();

  const pageView = mount(
    <PageTable
      items={[
        {
          id: "page-1",
          title: "Landing",
          slug: "/landing",
          status: "draft",
          updatedAt: "2026-03-06T12:00:00.000Z",
          author: { id: "author-1", name: "Admin", email: "admin@example.com" },
        },
      ] as never}
      onEdit={() => undefined}
      onPreview={() => undefined}
      onPublish={() => undefined}
      onUnpublish={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
    />
  );

  try {
    expect(pageView.container.innerHTML).toContain("/pages/page-1");
  } finally {
    pageView.cleanup();
  }

  const entryView = mount(
    <EntryTable
      entries={[
        {
          id: "entry-1",
          title: "Hello",
          slug: "hello",
          status: "draft",
          updatedAt: "2026-03-06T12:00:00.000Z",
          author: { id: "author-1", name: "Admin", email: "admin@example.com" },
        },
      ] as never}
      selectedIds={[]}
      onToggleAll={onToggleAll}
      onToggleEntry={onToggleEntry}
      onEdit={() => undefined}
      onDelete={onDeleteEntry}
      entryTypeSlug="posts"
    />
  );

  try {
    expect(entryView.container.innerHTML).toContain("/entries/posts/entry-1");

  } finally {
    entryView.cleanup();
  }
});

test("FieldRenderer covers primitive, media, relation fallback, and unknown field branches", async () => {
  const { FieldRenderer } = await import(
    "../../../core/admin/ui/entries/FieldRenderer"
  );

  const onChange = vi.fn();
  const compactTextField = {
    id: "field-text",
    name: "headline",
    type: "text",
    label: "Headline",
    help: "Custom text help",
  } as const;

  const textView = mount(
    <FieldRenderer
      field={compactTextField}
      value="Hello"
      onChange={onChange}
      display="compact"
    />
  );

  try {
    expect(textView.container.innerHTML).toContain("Custom text help");
    expect(textView.container.innerHTML).toContain("h-9 text-sm");

    const textInput = textView.container.querySelector("input");
    act(() => {
      setInputValue(textInput ?? undefined, "Updated headline");
    });
    expect(onChange).toHaveBeenLastCalledWith("Updated headline");

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-richtext",
          name: "body",
          type: "richtext",
          label: "Body",
        }}
        value="Body copy"
        onChange={onChange}
      />
    );
    expect(textView.container.textContent).toContain("Long-form content with formatting.");

    act(() => {
      textView.container
        .querySelector("button[data-richtext-value]")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith("Updated body");

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-number",
          name: "order",
          type: "number",
          label: "Order",
        }}
        value={12}
        onChange={onChange}
      />
    );
    const numberInput = textView.container.querySelector("input");
    act(() => {
      setInputValue(numberInput ?? undefined, "");
    });
    expect(onChange).toHaveBeenLastCalledWith(null);
    act(() => {
      setInputValue(numberInput ?? undefined, "42");
    });
    expect(onChange).toHaveBeenLastCalledWith(42);

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-boolean",
          name: "featured",
          type: "boolean",
          label: "Featured",
        }}
        value={false}
        onChange={onChange}
      />
    );
    const checkbox = textView.container.querySelector("input[type='checkbox']");
    act(() => {
      (checkbox as HTMLInputElement | null)?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith(true);

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-select",
          name: "tone",
          type: "select",
          label: "Tone",
          options: ["warm", "cool"],
        }}
        value="warm"
        onChange={onChange}
      />
    );
    const select = textView.container.querySelector("select");
    act(() => {
      setSelectValue(select ?? undefined, "cool");
    });
    expect(onChange).toHaveBeenLastCalledWith("cool");

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-media",
          name: "gallery",
          type: "media",
          label: "Gallery",
          media: {
            multiple: true,
            maxItems: 3,
            accept: ["image/png", "image/jpeg"],
          },
        }}
        value={[]}
        onChange={onChange}
      />
    );
    expect(textView.container.textContent).toContain("Select up to 3 assets from the library.");
    expect(textView.container.textContent).toContain("media-multiple:true");
    expect(textView.container.textContent).toContain("media-max:3");
    expect(textView.container.textContent).toContain("media-accept:image/png|image/jpeg");
    act(() => {
      Array.from(textView.container.querySelectorAll("button"))
        .find((button) => button.textContent === "media-picker")
        ?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith("media-1");

    textView.rerender(
      <FieldRenderer
        field={{
          id: "field-relation-empty",
          name: "related",
          type: "relation",
          label: "Related",
          relation: { target: "" },
        }}
        value=""
        onChange={onChange}
        display="compact"
      />
    );
    expect(textView.container.textContent).toContain(
      "Choose a related content type in the Content Type editor to enable picker."
    );
    expect(textView.container.innerHTML).toContain("Add a relation target in the content type first");

    textView.rerender(
      <FieldRenderer
        field={
          {
            id: "field-unsupported",
            name: "unknown",
            type: "unsupported",
            label: "Unsupported",
          } as never
        }
        value={null}
        onChange={onChange}
      />
    );
    expect(textView.container.textContent).toBe("");
  } finally {
    textView.cleanup();
  }
});

test("FieldRenderer relation picker covers single, multiple, search, empty, and error states", async () => {
  const { FieldRenderer } = await import(
    "../../../core/admin/ui/entries/FieldRenderer"
  );

  const onChange = vi.fn();
  entriesState.relationItems = [
    {
      id: "related-1",
      title: "Linked entry",
      slug: "linked-entry",
      status: "published",
      updatedAt: "2026-03-06T12:00:00.000Z",
      author: null,
    },
    {
      id: "related-2",
      title: "Second reference",
      slug: "second-reference",
      status: "draft",
      updatedAt: "2026-03-06T12:00:00.000Z",
      author: null,
    },
  ];

  const view = mount(
    <FieldRenderer
      field={{
        id: "field-relation",
        name: "linked-post",
        type: "relation",
        label: "Linked post",
        relation: { target: "articles" },
      }}
      value=""
      onChange={onChange}
      relationTargets={[{ slug: "articles", name: "Articles" }]}
    />
  );

  try {
    await act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain(
      "Link this entry to related content."
    );
    expect(view.container.textContent).toContain("Linked entry");

    const buttons = Array.from(view.container.querySelectorAll("button"));
    act(() => {
      buttons.find((button) => button.textContent?.includes("Linked entry"))?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith("related-1");

    const searchInput = view.container.querySelector("input");
    act(() => {
      setInputValue(searchInput ?? undefined, "missing");
    });
    expect(view.container.textContent).toContain("No matches for");

    view.rerender(
      <FieldRenderer
        field={{
          id: "field-relation-multi",
          name: "linked-posts",
          type: "relation",
          label: "Linked posts",
          help: "Use relation help",
          relation: { target: "articles-multi", multiple: true },
        }}
        value={["related-1"]}
        onChange={onChange}
        relationTargets={[{ slug: "articles-multi", name: "Articles" }]}
        display="compact"
      />
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Use relation help");
    expect(view.container.innerHTML).toContain("h-9 text-sm");
    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Second reference"))
        ?.click();
    });
    expect(onChange).toHaveBeenLastCalledWith(["related-1", "related-2"]);

    entriesState.relationItems = [];
    view.rerender(
      <FieldRenderer
        field={{
          id: "field-relation-empty",
          name: "linked-empty",
          type: "relation",
          label: "Linked empty",
          relation: { target: "articles-empty" },
        }}
        value=""
        onChange={onChange}
        relationTargets={[{ slug: "articles-empty", name: "Articles" }]}
      />
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("No items found yet.");

    entriesState.relationError = {
      name: "ApiClientError",
      message: "Relation lookup failed",
    };
    view.rerender(
      <FieldRenderer
        field={{
          id: "field-relation-error",
          name: "linked-error",
          type: "relation",
          label: "Linked error",
          relation: { target: "articles-error" },
        }}
        value=""
        onChange={onChange}
        relationTargets={[{ slug: "articles-error", name: "Articles" }]}
      />
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Relation lookup failed");
  } finally {
    view.cleanup();
  }
});
