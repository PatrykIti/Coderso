// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { EntryTeaserData } from "../../../core/widgets/core/entryTeaser";
import type { WidgetEditorContext } from "../../../core/widgets/types";

const entryTeaserState = vi.hoisted(() => ({
  contentTypes: [
    {
      id: "articles",
      slug: "articles",
      name: "Articles",
      status: "published",
    },
  ],
  entriesBySlug: {
    articles: [
      {
        id: "entry-1",
        title: "Launch note",
        slug: "launch-note",
        status: "published",
        currentData: {},
        updatedAt: "2026-03-08T10:00:00.000Z",
      },
    ],
  } as Record<string, unknown[]>,
  listingQueries: [
    {
      id: "query-1",
      name: "Featured articles",
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
  listingPreviewRows: [
    {
      id: "entry-1",
      title: "Launch note",
      slug: "launch-note",
      status: "published",
    },
    {
      id: "entry-2",
      title: "Roadmap note",
      slug: "roadmap-note",
      status: "published",
    },
  ] as Record<string, unknown>[],
  pages: [
    {
      id: "custom-entry-page",
      title: "Custom entry",
      slug: "custom-entry",
      status: "published",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "draft-page",
      title: "Draft page",
      slug: "draft-page",
      status: "draft",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
  ],
  contentTypesError: null as unknown,
  entriesError: null as unknown,
  listingsError: null as unknown,
  listingPreviewError: null as unknown,
  pagesError: null as unknown,
  reset() {
    this.contentTypesError = null;
    this.entriesError = null;
    this.listingsError = null;
    this.listingPreviewError = null;
    this.pagesError = null;
  },
}));

const previewClientState = vi.hoisted(() => ({
  calls: [] as EntryTeaserData[],
  error: null as unknown,
  response: {
    item: {
      id: "entry-1",
      title: "Launch note",
      href: "/articles/launch-note",
      status: "published",
    },
    sourceTypeId: "articles",
    sourceTypeSlug: "articles",
    resolvedAt: "2026-03-08T10:00:00.000Z",
  },
  reset() {
    this.calls = [];
    this.error = null;
    this.response = {
      item: {
        id: "entry-1",
        title: "Launch note",
        href: "/articles/launch-note",
        status: "published",
      },
      sourceTypeId: "articles",
      sourceTypeSlug: "articles",
      resolvedAt: "2026-03-08T10:00:00.000Z",
    };
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
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
    if (entryTeaserState.contentTypesError) throw entryTeaserState.contentTypesError;
    return entryTeaserState.contentTypes;
  }),
}));

vi.mock("@/services/entriesClient", () => ({
  listEntriesCached: vi.fn(async (slug: string) => {
    if (entryTeaserState.entriesError) throw entryTeaserState.entriesError;
    return entryTeaserState.entriesBySlug[slug] ?? [];
  }),
}));

vi.mock("@/services/listingsClient", () => ({
  listListingQueriesCached: vi.fn(async () => {
    if (entryTeaserState.listingsError) throw entryTeaserState.listingsError;
    return entryTeaserState.listingQueries;
  }),
  listListingTemplatesCached: vi.fn(async () => {
    if (entryTeaserState.listingsError) throw entryTeaserState.listingsError;
    return entryTeaserState.listingTemplates;
  }),
  previewListingQuery: vi.fn(async () => {
    if (entryTeaserState.listingPreviewError) throw entryTeaserState.listingPreviewError;
    return {
      source: "entries",
      total: entryTeaserState.listingPreviewRows.length,
      limit: entryTeaserState.listingPreviewRows.length,
      offset: 0,
      rows: entryTeaserState.listingPreviewRows,
    };
  }),
}));

vi.mock("@/services/entryTeaserPreviewClient", () => ({
  previewEntryTeaser: vi.fn(async (input: EntryTeaserData) => {
    previewClientState.calls.push(input);
    if (previewClientState.error) throw previewClientState.error;
    return previewClientState.response;
  }),
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => {
    if (entryTeaserState.pagesError) throw entryTeaserState.pagesError;
    return entryTeaserState.pages;
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
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButtonByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickElement = (element: Element | null | undefined) => {
  if (!element) return;
  React.act(() => {
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
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return (
      optionValues.length === values.length && values.every((value) => optionValues.includes(value))
    );
  });

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("h3, p, span")).some(
      (element) => normalizeText(element.textContent) === normalizeText(title)
    )
  );

const findCheckboxes = (container: ParentNode) =>
  Array.from(container.querySelectorAll("input[type='checkbox']")).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement
  );

const renderEditors = async ({
  initialValue,
  initialVariant = "horizontal",
  withVariantChange = true,
  context,
}: {
  initialValue: EntryTeaserData;
  initialVariant?: string;
  withVariantChange?: boolean;
  context?: WidgetEditorContext;
}) => {
  const { EntryTeaserAdvancedEditor, EntryTeaserVisualEditor, EntryTeaserWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/EntryTeaserEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState<EntryTeaserData>(initialValue);
    const [variant, setVariant] = useState(initialVariant);

    const handleChange = (next: EntryTeaserData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    const handleVariantChange = withVariantChange
      ? (next: string) => {
          latestVariant = next;
          onVariantChangeSpy(next);
          setVariant(next);
        }
      : undefined;

    return (
      <>
        <EntryTeaserWizardEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
          context={context}
        />
        <EntryTeaserVisualEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
          context={context}
        />
        <EntryTeaserAdvancedEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
          context={context}
        />
      </>
    );
  };

  const mounted = {
    ...mount(<Harness />),
    onChangeSpy,
    onVariantChangeSpy,
    getLatestValue: () => latestValue,
    getLatestVariant: () => latestVariant,
  };

  await flush();

  return mounted;
};

const mockEntryTeaserContract = async (normalizedValue: EntryTeaserData) => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/entryTeaser", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/entryTeaser")>(
      "../../../core/widgets/core/entryTeaser"
    );

    return {
      ...actual,
      normalizeEntryTeaserData: vi.fn(() => normalizedValue),
    };
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  entryTeaserState.reset();
  previewClientState.reset();
});

test("EntryTeaser visual editor owns layout/media/style while advanced stays read-only", async () => {
  const view = await renderEditors({
    initialValue: {
      sourceMode: "featured",
      source: {
        mode: "legacy",
        contentTypeId: "articles",
        entryId: "entry-1",
        listingQueryId: "query-1",
        listingTemplateId: "template-1",
      },
      style: {
        surface: "var(--surface-initial)",
        border: "var(--border-initial)",
        radius: "md",
        spacing: "sm",
      },
      fallback: {
        fallbackToLatest: true,
      },
      resolved: {
        item: null,
        error: "Pending runtime resolution",
      },
    },
    initialVariant: "vertical",
  });

  try {
    await flush();

    const teaserFieldsSection = findSectionByTitle(view.container, "Teaser content fields");
    if (!(teaserFieldsSection instanceof HTMLElement)) {
      throw new Error("Missing teaser content fields section");
    }
    setSelectValue(findSelectByOptions(teaserFieldsSection, ["0", "3", "5", "8", "12"]), "12");

    const layoutSection = findSectionByTitle(view.container, "Layout and media");
    if (!(layoutSection instanceof HTMLElement)) {
      throw new Error("Missing layout and media section");
    }

    setSelectValue(findSelectByOptions(layoutSection, ["sm", "md", "lg", "xl", "full"]), "full");
    setSelectValue(findSelectByOptions(layoutSection, ["image", "icon", "none"]), "icon");
    setSelectValue(findSelectByOptions(layoutSection, ["auto", "16:9", "4:3", "1:1"]), "4:3");
    setSelectValue(findSelectByOptions(layoutSection, ["auto", "sm", "md", "lg"]), "lg");
    setSelectValue(findSelectByOptions(layoutSection, ["cover", "contain"]), "contain");

    const styleTokensSection = findSectionByTitle(view.container, "Style");
    if (!(styleTokensSection instanceof HTMLElement)) {
      throw new Error("Missing style section");
    }

    setInputValue(
      styleTokensSection.querySelector('input[aria-label="Surface color swatch"]'),
      "#445566"
    );
    setInputValue(
      styleTokensSection.querySelector('input[aria-label="Border color swatch"]'),
      "#334455"
    );
    expect(findInputByPlaceholder(styleTokensSection, "var(--color-bg)")).toBeUndefined();
    expect(findInputByPlaceholder(styleTokensSection, "var(--color-border)")).toBeUndefined();
    const radiusSelect = findSelectByOptions(styleTokensSection, ["none", "sm", "md", "lg", "xl"]);
    const spacingSelect = findSelectByOptions(styleTokensSection, ["none", "sm", "md", "lg"]);
    expect(
      Array.from((radiusSelect as HTMLSelectElement).options).map((option) => option.value)
    ).toContain("none");
    expect(
      Array.from((spacingSelect as HTMLSelectElement).options).map((option) => option.value)
    ).toContain("none");
    setSelectValue(radiusSelect, "sm");
    setSelectValue(spacingSelect, "lg");

    expect(view.getLatestValue()).toMatchObject({
      fields: {
        tagLimit: 12,
      },
      layout: {
        maxWidth: "full",
      },
      media: {
        mode: "icon",
        aspect: "4:3",
        height: "lg",
        fit: "contain",
      },
      style: {
        surface: "#445566",
        border: "#334455",
        radius: "sm",
        spacing: "lg",
      },
    });

    for (const title of ["Source diagnostics", "Presentation diagnostics", "Runtime summary"]) {
      const section = findSectionByTitle(view.container, title);
      if (!(section instanceof HTMLElement)) {
        throw new Error(`Missing advanced section: ${title}`);
      }
      expect(section.querySelector("input, select, textarea, button")).toBeNull();
    }
    expect(view.container.querySelector("pre")).toBeNull();
    expect(view.container.textContent).toContain("Pending runtime resolution");
  } finally {
    view.cleanup();
  }
});

test("EntryTeaser visual editor adopts swatch-only color controls with saved custom compatibility", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        surface: "#112233",
        border: "rgba(10, 20, 30, 0.4)",
        radius: "lg",
        spacing: "md",
      },
    },
  });

  try {
    const styleTokensSection = findSectionByTitle(view.container, "Style");
    if (!(styleTokensSection instanceof HTMLElement)) {
      throw new Error("Missing style section");
    }

    const surfaceSwatch = styleTokensSection.querySelector(
      'input[aria-label="Surface color swatch"]'
    );
    const borderSwatch = styleTokensSection.querySelector(
      'input[aria-label="Border color swatch"]'
    );
    expect(surfaceSwatch).toBeTruthy();
    expect(borderSwatch).toBeTruthy();
    expect(styleTokensSection.querySelector('input[aria-label="Surface color value"]')).toBeNull();
    expect(styleTokensSection.querySelector('input[aria-label="Border color value"]')).toBeNull();
    expect(styleTokensSection.textContent).toContain("Saved custom color");

    setInputValue(surfaceSwatch, "#445566");
    setInputValue(borderSwatch, "#778899");

    const clearButtons = Array.from(styleTokensSection.querySelectorAll("button")).filter(
      (button) => button.textContent?.includes("Clear")
    );
    clickElement(clearButtons[0]);

    expect(view.getLatestValue()).toMatchObject({
      style: expect.objectContaining({
        border: "#778899",
      }),
    });
    expect(view.getLatestValue().style?.surface).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("EntryTeaser editors fall back safely for sparse normalized values and ignore variant changes without a handler", async () => {
  await mockEntryTeaserContract({
    sourceMode: undefined,
    source: {
      mode: undefined,
      listingQueryId: undefined,
      listingTemplateId: undefined,
      contentTypeId: undefined,
      entryId: undefined,
    },
    fields: {
      showImage: undefined,
      showExcerpt: undefined,
      showMeta: undefined,
      showTags: undefined,
    },
    cta: {
      label: undefined,
      hrefMode: undefined,
      href: undefined,
    },
    style: {
      surface: undefined,
      border: undefined,
      radius: undefined,
      spacing: undefined,
    },
    fallback: {
      title: undefined,
      description: undefined,
      fallbackToLatest: undefined,
    },
    resolved: undefined,
  });

  let view: Awaited<ReturnType<typeof renderEditors>> | undefined;

  try {
    view = await renderEditors({
      initialValue: {},
      initialVariant: "legacy-variant",
      withVariantChange: false,
    });
    await flush();

    const wizardSection = findSectionByTitle(view.container, "Source mode");
    if (!(wizardSection instanceof HTMLElement)) {
      throw new Error("Missing wizard source mode section");
    }
    expect(findSelectByOptions(wizardSection, ["legacy", "listing"])?.value).toBe("legacy");
    expect(findSelectByOptions(wizardSection, ["latest", "featured", "manual"])?.value).toBe(
      "latest"
    );
    expect(view.container.querySelector('[data-variant-thumbnail="horizontal"]')).toBeTruthy();

    clickButtonByText(view.container, "Vertical");
    expect(view.getLatestVariant()).toBe("legacy-variant");
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();

    const visualSection = findSectionByTitle(view.container, "Source summary");
    if (!(visualSection instanceof HTMLElement)) {
      throw new Error("Missing visual source summary section");
    }
    expect(visualSection.textContent).toContain("Selection: Not selected");

    const teaserFieldsSection = findSectionByTitle(view.container, "Teaser content fields");
    if (!(teaserFieldsSection instanceof HTMLElement)) {
      throw new Error("Missing teaser content fields section");
    }
    expect(findCheckboxes(teaserFieldsSection).every((checkbox) => checkbox.checked)).toBe(true);
    expect(findInputByPlaceholder(view.container, "Read more")?.value).toBe("Read more");
    expect(
      findInputByPlaceholder(view.container, "/blog/entry-slug or https://...")
    ).toBeUndefined();
    expect(findInputByPlaceholder(view.container, "No entry selected")?.value).toBe("");
    expect(
      findTextareaByPlaceholder(view.container, "Choose a source mode and content type.")?.value
    ).toBe("");

    const styleTokensSection = findSectionByTitle(view.container, "Style");
    if (!(styleTokensSection instanceof HTMLElement)) {
      throw new Error("Missing style section");
    }
    expect(findInputByPlaceholder(styleTokensSection, "var(--color-bg)")).toBeUndefined();
    expect(findInputByPlaceholder(styleTokensSection, "var(--color-border)")).toBeUndefined();
    expect(styleTokensSection.textContent).toContain("Theme default");
    const radiusSelect = findSelectByOptions(styleTokensSection, ["none", "sm", "md", "lg", "xl"]);
    const spacingSelect = findSelectByOptions(styleTokensSection, ["none", "sm", "md", "lg"]);
    expect(
      Array.from((radiusSelect as HTMLSelectElement).options).map((option) => option.value)
    ).toContain("none");
    expect(
      Array.from((spacingSelect as HTMLSelectElement).options).map((option) => option.value)
    ).toContain("none");
    expect(radiusSelect?.value).toBe("lg");
    expect(spacingSelect?.value).toBe("md");

    const fallbackSection = findSectionByTitle(view.container, "Fallback state");
    if (!(fallbackSection instanceof HTMLElement)) {
      throw new Error("Missing fallback state section");
    }
    expect(findCheckboxes(fallbackSection)[0]?.checked).toBe(true);

    expect(view.container.querySelector("pre")).toBeNull();
    expect(view.container.textContent).toContain("No resolved item");
  } finally {
    view?.cleanup();
    vi.doUnmock("../../../core/widgets/core/entryTeaser");
    vi.resetModules();
  }
});

test("EntryTeaser editors surface generic listing and entry load failures plus empty manual-entry state", async () => {
  entryTeaserState.listingsError = new Error("Listing transport failed");

  const listingsErrorView = await renderEditors({
    initialValue: {
      source: {
        mode: "listing",
      },
    },
  });

  try {
    await flush();
    expect(listingsErrorView.container.textContent).toContain("Failed to load listings options.");
  } finally {
    listingsErrorView.cleanup();
  }

  entryTeaserState.reset();
  entryTeaserState.entriesError = new Error("Entries transport failed");

  const entryErrorView = await renderEditors({
    initialValue: {
      sourceMode: "manual",
      source: {
        mode: "legacy",
        contentTypeId: "articles",
      },
    },
  });

  try {
    await flush();
    expect(entryErrorView.container.textContent).toContain("Failed to load entries.");
  } finally {
    entryErrorView.cleanup();
  }

  entryTeaserState.reset();
  const originalEntriesBySlug = entryTeaserState.entriesBySlug;
  entryTeaserState.entriesBySlug = {
    ...entryTeaserState.entriesBySlug,
    articles: [],
  };

  const emptyEntriesView = await renderEditors({
    initialValue: {
      sourceMode: "manual",
      source: {
        mode: "legacy",
        contentTypeId: "articles",
      },
    },
  });

  try {
    await flush();
    expect(emptyEntriesView.container.textContent).toContain(
      "No entries loaded yet for selected content type."
    );
  } finally {
    emptyEntriesView.cleanup();
    entryTeaserState.entriesBySlug = originalEntriesBySlug;
  }
});

test("EntryTeaser visual editor resolves preview through transient context and annotates duplicate content types", async () => {
  entryTeaserState.contentTypes = [
    {
      id: "articles",
      slug: "articles",
      name: "Articles",
      status: "published",
    },
    {
      id: "articles-landing",
      slug: "articles-landing",
      name: "Articles",
      status: "draft",
    },
  ];
  const setPreviewState = vi.fn();

  const view = await renderEditors({
    initialValue: {
      sourceMode: "latest",
      source: {
        mode: "legacy",
        contentTypeId: "articles",
      },
    },
    context: {
      surface: "page-builder",
      editorMode: "visual",
      setPreviewState,
    },
  });

  try {
    await flush();
    expect(previewClientState.calls).toHaveLength(1);
    expect(setPreviewState).toHaveBeenCalledWith({ status: "loading" });
    expect(setPreviewState).toHaveBeenLastCalledWith({
      status: "ready",
      dataPatch: {
        resolved: previewClientState.response,
      },
    });

    const duplicateOptionLabels = Array.from(view.container.querySelectorAll("option")).map(
      (option) => option.textContent?.trim()
    );
    expect(duplicateOptionLabels).toContain("Articles (articles, published)");
    expect(duplicateOptionLabels).toContain("Articles (articles-landing, draft)");
  } finally {
    view.cleanup();
  }
});

test("EntryTeaser editors show auth-specific retry affordances for content type and entry loading", async () => {
  entryTeaserState.contentTypesError = {
    name: "ApiClientError",
    status: 401,
    message: "Not authenticated",
  };

  const contentTypesView = await renderEditors({
    initialValue: {
      sourceMode: "latest",
      source: {
        mode: "legacy",
      },
    },
  });

  try {
    await flush();
    expect(contentTypesView.container.textContent).toContain(
      "Your session cannot load content types. Sign in again and retry."
    );
    expect(contentTypesView.container.textContent).toContain("Retry content types");
  } finally {
    contentTypesView.cleanup();
  }

  entryTeaserState.reset();
  entryTeaserState.entriesError = {
    name: "ApiClientError",
    status: 403,
    message: "Forbidden",
  };

  const entriesView = await renderEditors({
    initialValue: {
      sourceMode: "manual",
      source: {
        mode: "legacy",
        contentTypeId: "articles",
      },
    },
  });

  try {
    await flush();
    expect(entriesView.container.textContent).toContain(
      "Your session cannot load entries for this content type. Sign in again and retry."
    );
    expect(entriesView.container.textContent).toContain("Retry entries");
  } finally {
    entriesView.cleanup();
  }
});

test("EntryTeaser editors cover legacy manual mode, style fields, CTA options, and runtime snapshot", async () => {
  const { EntryTeaserAdvancedEditor, EntryTeaserVisualEditor, EntryTeaserWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/EntryTeaserEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue: EntryTeaserData = {} as EntryTeaserData;

  const Harness = () => {
    const [value, setValue] = useState<EntryTeaserData>({} as EntryTeaserData);
    const [variant, setVariant] = useState("horizontal");
    return (
      <>
        <EntryTeaserWizardEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            onVariantChangeSpy(next);
            setVariant(next);
          }}
        />
        <EntryTeaserVisualEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            onVariantChangeSpy(next);
            setVariant(next);
          }}
        />
        <EntryTeaserAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
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

    expect(view.container.textContent).toContain("Source mode");
    expect(view.container.textContent).toContain("Variant and structure");
    expect(view.container.textContent).toContain("Runtime summary");

    React.act(() => {
      setSelectValue(findSelectByOptions(view.container, ["legacy", "listing"]), "legacy");
      setSelectValue(
        findSelectByOptions(view.container, ["latest", "featured", "manual"]),
        "manual"
      );
    });
    await flush();

    React.act(() => {
      setSelectValue(
        findSelectByOptions(view.container, ["__no_content_type__", "articles"]),
        "articles"
      );
    });
    await flush();

    React.act(() => {
      setSelectValue(findSelectByOptions(view.container, ["__no_entry__", "entry-1"]), "entry-1");
      setInputValue(findInputByPlaceholder(view.container, "Read more"), "Read article");
    });
    await flush();
    clickButtonByText(view.container, "Minimal");

    React.act(() => {
      setSelectValue(findSelectByOptions(view.container, ["auto", "custom"]), "custom");
    });
    await flush();

    React.act(() => {
      setSelectValue(
        findSelectByOptions(view.container, ["__coderso_link_empty__", "custom-entry-page"]),
        "custom-entry-page"
      );
      setSelectValue(findSelectByOptions(view.container, ["none", "sm", "md", "lg"]), "lg");
      setSelectValue(findSelectByOptions(view.container, ["none", "sm", "md", "lg", "xl"]), "xl");
      setSelectValue(findSelectByOptions(view.container, ["link", "filled", "outline"]), "outline");
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Choose a source mode and content type."),
        "Nothing ready"
      );
    });

    const ctaSection = findSectionByTitle(view.container, "CTA behavior");
    if (!(ctaSection instanceof HTMLElement)) {
      throw new Error("Missing CTA behavior section");
    }
    clickElement(findCheckboxes(ctaSection)[0]);

    const teaserFieldsSection = findSectionByTitle(view.container, "Teaser content fields");
    if (!(teaserFieldsSection instanceof HTMLElement)) {
      throw new Error("Missing teaser content fields section");
    }
    const contentFieldCheckboxes = findCheckboxes(teaserFieldsSection);
    clickElement(contentFieldCheckboxes[0]);
    clickElement(contentFieldCheckboxes[1]);
    clickElement(contentFieldCheckboxes[2]);
    clickElement(contentFieldCheckboxes[3]);

    expect(latestValue).toMatchObject({
      sourceMode: "manual",
      cta: expect.objectContaining({
        hrefMode: "custom",
        href: "/custom-entry",
        label: "Read article",
        opensInNewTab: true,
        style: "outline",
      }),
      style: expect.objectContaining({
        radius: "xl",
      }),
    });
    expect(onVariantChangeSpy).toHaveBeenCalledWith("minimal");
  } finally {
    view.cleanup();
  }
});

test("EntryTeaser editors cover listing mode and content/listings loading errors", async () => {
  const { EntryTeaserAdvancedEditor, EntryTeaserVisualEditor, EntryTeaserWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/EntryTeaserEditors");

  const onChangeSpy = vi.fn();
  const Harness = () => {
    const [value, setValue] = useState<EntryTeaserData>({} as EntryTeaserData);
    return (
      <>
        <EntryTeaserWizardEditor
          value={value}
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
          variant="horizontal"
        />
        <EntryTeaserVisualEditor
          value={value}
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
          variant="horizontal"
        />
        <EntryTeaserAdvancedEditor
          value={value}
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
          variant="horizontal"
        />
      </>
    );
  };

  entryTeaserState.contentTypesError = {
    name: "ApiClientError",
    message: "Types failed",
  };
  entryTeaserState.listingsError = {
    name: "ApiClientError",
    message: "Listings failed",
  };

  const errorView = mount(<Harness />);

  try {
    await flush();
    expect(errorView.container.textContent).toContain("Types failed");

    React.act(() => {
      setSelectValue(findSelectByOptions(errorView.container, ["legacy", "listing"]), "listing");
    });
    await flush();
    expect(errorView.container.textContent).toContain("Listings failed");
  } finally {
    errorView.cleanup();
  }

  entryTeaserState.reset();
  const successView = mount(<Harness />);

  try {
    await flush();

    React.act(() => {
      setSelectValue(findSelectByOptions(successView.container, ["legacy", "listing"]), "listing");
    });
    await flush();

    React.act(() => {
      setSelectValue(
        findSelectByOptions(successView.container, ["latest", "featured", "manual"]),
        "manual"
      );
    });
    await flush();

    React.act(() => {
      setSelectValue(
        findSelectByOptions(successView.container, ["__no_listing_query__", "query-1"]),
        "query-1"
      );
      setSelectValue(
        findSelectByOptions(successView.container, ["__no_listing_template__", "template-1"]),
        "template-1"
      );
    });
    await flush();

    const listingCall = onChangeSpy.mock.calls.find(
      ([arg]) =>
        arg?.source?.mode === "listing" &&
        arg?.source?.listingQueryId === "query-1" &&
        arg?.source?.listingTemplateId === "template-1"
    );
    expect(listingCall?.[0]).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          mode: "listing",
          listingQueryId: "query-1",
          listingTemplateId: "template-1",
        }),
      })
    );

    React.act(() => {
      setSelectValue(
        findSelectByOptions(successView.container, ["__no_listing_manual__", "entry-1", "entry-2"]),
        "entry-2"
      );
    });
    await flush();

    const manualListingCall = onChangeSpy.mock.calls.find(
      ([arg]) =>
        arg?.sourceMode === "manual" &&
        arg?.source?.mode === "listing" &&
        arg?.source?.listingManualTarget?.rowId === "entry-2" &&
        arg?.source?.listingManualTarget?.entryId === "entry-2"
    );
    expect(manualListingCall?.[0]).toEqual(
      expect.objectContaining({
        sourceMode: "manual",
        source: expect.objectContaining({
          mode: "listing",
          listingManualTarget: {
            rowId: "entry-2",
            entryId: "entry-2",
          },
        }),
      })
    );
  } finally {
    successView.cleanup();
  }
});

test("EntryTeaser wizard source controls cover generic content-type failure, API entry failure, and fallback title updates", async () => {
  entryTeaserState.contentTypesError = new Error("types transport failed");

  const typesErrorView = await renderEditors({
    initialValue: {},
  });

  try {
    await flush();
    expect(typesErrorView.container.textContent).toContain("Failed to load content types.");
  } finally {
    typesErrorView.cleanup();
  }

  entryTeaserState.reset();
  entryTeaserState.entriesError = {
    name: "ApiClientError",
    message: "Entries API failed",
  };

  const entryErrorView = await renderEditors({
    initialValue: {
      sourceMode: "manual",
      source: {
        mode: "legacy",
        contentTypeId: "articles",
      },
    },
  });

  try {
    await flush();
    expect(entryErrorView.container.textContent).toContain("Entries API failed");
  } finally {
    entryErrorView.cleanup();
  }

  entryTeaserState.reset();

  const sourceOwnerView = await renderEditors({
    initialValue: {},
  });

  try {
    const wizardSection = findSectionByTitle(sourceOwnerView.container, "Source mode");
    if (!(wizardSection instanceof HTMLElement)) {
      throw new Error("Missing wizard source mode section");
    }

    setSelectValue(findSelectByOptions(wizardSection, ["legacy", "listing"]), "listing");
    await flush();

    expect(sourceOwnerView.getLatestValue()).toMatchObject({
      source: {
        mode: "listing",
        contentTypeId: "",
        entryId: "",
      },
    });

    setSelectValue(findSelectByOptions(wizardSection, ["legacy", "listing"]), "legacy");
    await flush();
    setSelectValue(findSelectByOptions(wizardSection, ["latest", "featured", "manual"]), "manual");
    await flush();

    setSelectValue(findSelectByOptions(wizardSection, ["legacy", "listing"]), "listing");
    await flush();

    expect(sourceOwnerView.getLatestValue()).toMatchObject({
      sourceMode: "manual",
      source: {
        mode: "listing",
        contentTypeId: "",
        entryId: "",
      },
    });

    setSelectValue(findSelectByOptions(wizardSection, ["legacy", "listing"]), "legacy");
    await flush();

    const fallbackSection = findSectionByTitle(sourceOwnerView.container, "Fallback state");
    if (!(fallbackSection instanceof HTMLElement)) {
      throw new Error("Missing fallback section");
    }

    setInputValue(
      findInputByPlaceholder(fallbackSection, "No entry selected"),
      "Choose teaser content"
    );

    expect(sourceOwnerView.getLatestValue()).toMatchObject({
      sourceMode: "manual",
      source: {
        mode: "legacy",
        entryId: "",
        listingQueryId: "",
        listingTemplateId: "",
      },
      fallback: {
        title: "Choose teaser content",
      },
    });
  } finally {
    sourceOwnerView.cleanup();
  }
});
