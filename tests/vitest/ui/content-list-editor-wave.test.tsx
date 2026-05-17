// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { AdminUser } from "../../../core/admin/services/adminUsersClient";
import type { ContentTypeSummary } from "../../../core/admin/services/contentTypesClient";
import type {
  ListingQueryRecord,
  ListingTemplateRecord,
} from "../../../core/admin/services/listingsClient";
import type { TaxonomyOverview } from "../../../core/admin/services/taxonomyClient";
import type { ContentListData } from "../../../core/widgets/core/contentList";

const contentListState = vi.hoisted(() => ({
  contentTypes: [
    {
      id: "articles",
      name: "News",
      slug: "news-main",
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "articles-secondary",
      name: "News",
      slug: "news-secondary",
      status: "published",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "screen-2dcaeaad",
      name: "Screen 2dcaeaad",
      slug: "screen-two-dcaeaad",
      status: "draft",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
  ] satisfies ContentTypeSummary[],
  adminUsers: [
    {
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      status: "active",
      roleIds: [],
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
      lastLoginAt: null,
    },
    {
      id: "user-2",
      name: null,
      email: "editor@example.com",
      status: "active",
      roleIds: [],
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
      lastLoginAt: null,
    },
  ] satisfies AdminUser[],
  taxonomyOverview: {
    taxonomies: {
      category: {
        id: "taxonomy-category",
        typeId: "articles",
        name: "Categories",
        slug: "categories",
        kind: "category",
        createdAt: "2026-03-08T10:00:00.000Z",
        updatedAt: "2026-03-08T10:00:00.000Z",
      },
      tag: {
        id: "taxonomy-tag",
        typeId: "articles",
        name: "Tags",
        slug: "tags",
        kind: "tag",
        createdAt: "2026-03-08T10:00:00.000Z",
        updatedAt: "2026-03-08T10:00:00.000Z",
      },
    },
    terms: {
      categories: [
        {
          id: "term-1",
          taxonomyId: "taxonomy-category",
          name: "Automotive",
          slug: "automotive",
          createdAt: "2026-03-08T10:00:00.000Z",
          updatedAt: "2026-03-08T10:00:00.000Z",
        },
      ],
      tags: [
        {
          id: "term-2",
          taxonomyId: "taxonomy-tag",
          name: "featured",
          slug: "featured",
          createdAt: "2026-03-08T10:00:00.000Z",
          updatedAt: "2026-03-08T10:00:00.000Z",
        },
        {
          id: "term-3",
          taxonomyId: "taxonomy-tag",
          name: "case-study",
          slug: "case-study",
          createdAt: "2026-03-08T10:00:00.000Z",
          updatedAt: "2026-03-08T10:00:00.000Z",
        },
      ],
    },
  } satisfies TaxonomyOverview,
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
  ] satisfies ListingQueryRecord[],
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
  ] satisfies ListingTemplateRecord[],
  contentTypesError: null as unknown,
  listingsError: null as unknown,
  authorsError: null as unknown,
  taxonomyError: null as unknown,
  reset() {
    this.contentTypesError = null;
    this.listingsError = null;
    this.authorsError = null;
    this.taxonomyError = null;
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
    disabled,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
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

vi.mock("@/services/adminUsersClient", () => ({
  listAdminUsers: vi.fn(async () => {
    if (contentListState.authorsError) throw contentListState.authorsError;
    return contentListState.adminUsers;
  }),
}));

vi.mock("@/services/taxonomyClient", () => ({
  getTaxonomyOverview: vi.fn(async () => {
    if (contentListState.taxonomyError) throw contentListState.taxonomyError;
    return contentListState.taxonomyOverview;
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

const clickElement = (element: Element | null | undefined) => {
  if (!element) return;
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

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

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findNumberInputs = (container: ParentNode) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) => element instanceof HTMLInputElement && element.type === "number"
  );

const findCheckboxByLabelText = (container: ParentNode, labelText: string) =>
  Array.from(container.querySelectorAll("label"))
    .find((element) => normalizeText(element.textContent).includes(normalizeText(labelText)))
    ?.querySelector("input[type='checkbox']");

const findButtonByText = (container: ParentNode, buttonText: string) =>
  Array.from(container.querySelectorAll("button")).find((element) =>
    normalizeText(element.textContent).includes(normalizeText(buttonText))
  );

afterEach(() => {
  vi.restoreAllMocks();
  contentListState.reset();
});

test("ContentList wizard editor normalizes invalid variant, clamps item limit, and clears legacy content type in listing mode", async () => {
  const { ContentListWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<ContentListData>({} as ContentListData);
    const [variant, setVariant] = useState("unknown-layout");

    return (
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
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    const variantSelect = findSelectsByOptions(view.container, ["cards", "list", "compact"])[0];
    expect((variantSelect as HTMLSelectElement | null | undefined)?.value).toBe("cards");
    expect(view.container.textContent).toContain("By content type");
    expect(view.container.textContent).toContain("By listing query");
    expect(view.container.textContent).toContain("News (news-main)");
    expect(view.container.textContent).toContain("News (news-secondary)");
    expect(view.container.textContent).not.toContain("Legacy content type source");

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Search content types"), "secondary");
      setSelectValue(
        findSelectsByOptions(view.container, [
          "__no_content_type__",
          "articles",
          "articles-secondary",
          "screen-2dcaeaad",
        ])[0],
        "articles-secondary"
      );
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "listing");
    });
    await flush();

    React.act(() => {
      setInputValue(findNumberInputs(view.container)[0], "48");
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_query__", "query-1"])[0],
        "query-1"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_template__", "template-1"])[0],
        "template-1"
      );
      setSelectValue(findSelectsByOptions(view.container, ["cards", "list", "compact"])[0], "list");
    });

    expect(onVariantChangeSpy).toHaveBeenCalledWith("list");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          mode: "listing",
          contentTypeId: "",
          listingQueryId: "query-1",
          listingTemplateId: "template-1",
          limit: 24,
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("ContentList visual editor switches between listing and legacy sources, persists empty state content, and updates presentation fields", async () => {
  const { ContentListVisualEditor, ContentListWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");

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
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["1", "2", "3"])[0], "2");
      setSelectValue(findSelectsByOptions(view.container, ["none", "sm", "md", "lg"])[0], "lg");
      setSelectValue(
        findSelectsByOptions(view.container, ["outlined", "elevated", "minimal"])[0],
        "elevated"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["standard", "wide", "square", "compact"])[0],
        "wide"
      );
      setInputValue(findInputByPlaceholder(view.container, "Read more"), "View entry");
      clickElement(findButtonByText(view.container, "Compact"));
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "listing");
    });
    await flush();

    expect(view.container.textContent).toContain("Columns only affect the cards variant.");
    expect(findSelectsByOptions(view.container, ["1", "2", "3"])).toHaveLength(0);
    expect(view.container.textContent).toContain(
      "Builder canvas shows saved resolved data. Save or open Preview to refresh live results."
    );

    React.act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_query__", "query-1"])[0],
        "query-1"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_template__", "template-1"])[0],
        "template-1"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_query__", "query-1"])[0],
        "__no_listing_query__"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_template__", "template-1"])[0],
        "__no_listing_template__"
      );
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "legacy");
    });
    await flush();

    React.act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_content_type__", "articles"])[0],
        "__no_content_type__"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_content_type__", "articles"])[0],
        "articles"
      );
      setSelectValue(
        findSelectsByOptions(view.container, [
          "published",
          "all",
          "draft",
          "scheduled",
          "archived",
        ])[0],
        "scheduled"
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
        "title-desc"
      );
      setInputValue(
        findInputByPlaceholder(view.container, "e.g. featured or case-study"),
        "case-study"
      );
      setInputValue(
        findInputByPlaceholder(view.container, "Optional section title"),
        "Latest updates"
      );
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Optional section description"),
        "Saved preview guidance for editors."
      );
      setInputValue(findInputByPlaceholder(view.container, "No items found"), "Nothing here yet");
      setTextareaValue(
        findTextareaByPlaceholder(
          view.container,
          "Adjust filters or publish entries for this content type."
        ),
        "Publish a case study to populate this block."
      );
    });
    await flush();

    const taxonomySuggestions = Array.from(view.container.querySelectorAll("datalist option")).map(
      (option) => option.getAttribute("value")
    );
    expect(taxonomySuggestions).toEqual(expect.arrayContaining(["featured", "case-study"]));

    const showImageToggle = findCheckboxByLabelText(view.container, "Show image");
    const showExcerptToggle = findCheckboxByLabelText(view.container, "Show excerpt");
    const showMetaToggle = findCheckboxByLabelText(view.container, "Show meta");
    const showCtaToggle = findCheckboxByLabelText(view.container, "Show CTA link");

    expect(showImageToggle).toBeInstanceOf(HTMLInputElement);
    expect(showExcerptToggle).toBeInstanceOf(HTMLInputElement);
    expect(showMetaToggle).toBeInstanceOf(HTMLInputElement);
    expect(showCtaToggle).toBeInstanceOf(HTMLInputElement);

    React.act(() => {
      clickElement(showImageToggle);
      clickElement(showExcerptToggle);
      clickElement(showMetaToggle);
      clickElement(showCtaToggle);
    });

    expect(onVariantChangeSpy).toHaveBeenCalledWith("compact");
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          mode: "legacy",
          contentTypeId: "articles",
          listingQueryId: "",
          listingTemplateId: "",
          statusScope: "scheduled",
          sort: "title-desc",
        }),
        filters: expect.objectContaining({
          taxonomy: "case-study",
        }),
        fields: expect.objectContaining({
          showImage: false,
          showExcerpt: false,
          showMeta: false,
          showCta: false,
        }),
        title: "Latest updates",
        description: "Saved preview guidance for editors.",
        emptyState: expect.objectContaining({
          title: "Nothing here yet",
          description: "Publish a case study to populate this block.",
        }),
        style: expect.objectContaining({
          columns: "2",
          gap: "lg",
          cardStyle: "elevated",
          imageAspect: "wide",
          ctaLabel: "View entry",
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("ContentList visual editor updates pagination controls", async () => {
  const { ContentListVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");

  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<ContentListData>({} as ContentListData);

    return (
      <ContentListVisualEditor
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
        variant="cards"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    React.act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["none", "paged", "load-more", "view-all"])[0],
        "view-all"
      );
    });
    await flush();

    React.act(() => {
      setInputValue(findNumberInputs(view.container)[0], "8");
      setInputValue(findInputByPlaceholder(view.container, "/articles"), "/projects");
      setInputValue(findInputByPlaceholder(view.container, "View all"), "Browse everything");
    });

    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        pagination: expect.objectContaining({
          mode: "view-all",
          pageSize: 8,
          viewAllHref: "/projects",
          viewAllLabel: "Browse everything",
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("ContentList wizard editor tolerates unresolved listing and content type selections during source transitions", async () => {
  const { ContentListWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");

  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<ContentListData>({
      source: {
        mode: "listing",
        contentTypeId: "missing-type",
        listingQueryId: "missing-query",
        listingTemplateId: "missing-template",
      },
    } as ContentListData);

    return (
      <ContentListWizardEditor
        value={value}
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
        variant="cards"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(findSelectsByOptions(view.container, ["__no_listing_query__", "query-1"])).toHaveLength(
      1
    );
    expect(
      findSelectsByOptions(view.container, ["__no_listing_template__", "template-1"])
    ).toHaveLength(1);

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "legacy");
    });
    await flush();

    expect(
      findSelectsByOptions(view.container, [
        "__no_content_type__",
        "articles",
        "articles-secondary",
        "screen-2dcaeaad",
      ])
    ).toHaveLength(1);

    React.act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, [
          "__no_content_type__",
          "articles",
          "articles-secondary",
          "screen-2dcaeaad",
        ])[0],
        "__no_content_type__"
      );
    });

    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          mode: "legacy",
          contentTypeId: "",
          listingQueryId: "",
          listingTemplateId: "",
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("ContentList advanced editor handles listing query controls, disabled filters, styling tokens, and runtime snapshot", async () => {
  const { ContentListAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");

  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<ContentListData>({
      resolved: {
        items: [{ id: "item-1", title: "Launch note" }],
        total: 1,
        runtime: { rejectedTokens: ["draft"], page: 2 },
      },
    } as ContentListData);

    return (
      <ContentListAdvancedEditor
        value={value}
        variant="cards"
        onChange={(next) => {
          onChangeSpy(next);
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "listing");
    });
    await flush();

    const authorSearchInListingMode = findInputByPlaceholder(view.container, "Search authors");
    const searchInputInListingMode = findInputByPlaceholder(view.container, "Title, excerpt, tags");
    const featuredOnlyToggleInListingMode = findCheckboxByLabelText(
      view.container,
      "Featured only"
    );

    expect(authorSearchInListingMode).toBeUndefined();
    expect(searchInputInListingMode).toBeUndefined();
    expect(featuredOnlyToggleInListingMode).toBeUndefined();
    expect(view.container.textContent).toContain(
      "Listing mode uses filters and sorting from the selected Listings query."
    );

    React.act(() => {
      setInputValue(findNumberInputs(view.container)[0], "99");
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_query__", "query-1"])[0],
        "query-1"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_template__", "template-1"])[0],
        "template-1"
      );
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "legacy");
    });
    await flush();

    const authorSearchInput = findInputByPlaceholder(view.container, "Search authors");
    const authorSelect = findSelectsByOptions(view.container, [
      "__no_author__",
      "user-1",
      "user-2",
    ])[0];
    const searchInput = findInputByPlaceholder(view.container, "Title, excerpt, tags");
    const featuredOnlyToggle = findCheckboxByLabelText(view.container, "Featured only");

    expect(authorSearchInput).toBeInstanceOf(HTMLInputElement);
    expect(authorSelect).toBeInstanceOf(HTMLSelectElement);
    expect(searchInput).toBeInstanceOf(HTMLInputElement);
    expect(featuredOnlyToggle).toBeInstanceOf(HTMLInputElement);

    React.act(() => {
      setInputValue(authorSearchInput, "editor");
      setSelectValue(authorSelect, "user-2");
      setInputValue(searchInput, "launch");
      clickElement(featuredOnlyToggle);
      setInputValue(findInputByPlaceholder(view.container, "var(--color-bg)"), "#101820");
      setInputValue(findInputByPlaceholder(view.container, "var(--color-border)"), "#d1d5db");
      setInputValue(findInputByPlaceholder(view.container, "var(--color-text)"), "#f9fafb");
    });

    const clearButtons = Array.from(view.container.querySelectorAll("button")).filter((button) =>
      normalizeText(button.textContent).includes("clear")
    );
    expect(clearButtons).toHaveLength(3);

    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          mode: "legacy",
          listingQueryId: "",
          listingTemplateId: "",
          limit: 24,
        }),
        filters: expect.objectContaining({
          authorId: "user-2",
          searchQuery: "launch",
          featuredOnly: true,
        }),
        style: expect.objectContaining({
          backgroundColor: "#101820",
          borderColor: "#d1d5db",
          textColor: "#f9fafb",
        }),
      })
    );
    expect(view.container.textContent).toContain('"title": "Launch note"');
    expect(view.container.textContent).toContain('"page": 2');

    clickElement(clearButtons[2]);
    expect(onChangeSpy.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        style: expect.objectContaining({
          textColor: undefined,
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("ContentList wizard editor ignores late successful loader results after source-mode transitions", async () => {
  const { ContentListWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");
  const { listContentTypesCached } = await import("@/services/contentTypesClient");
  const { listListingQueriesCached, listListingTemplatesCached } =
    await import("@/services/listingsClient");

  const contentTypesDeferred = createDeferred<typeof contentListState.contentTypes>();
  const listingQueriesDeferred = createDeferred<typeof contentListState.listingQueries>();
  const listingTemplatesDeferred = createDeferred<typeof contentListState.listingTemplates>();
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  vi.mocked(listContentTypesCached).mockImplementationOnce(() => contentTypesDeferred.promise);
  vi.mocked(listListingQueriesCached).mockImplementationOnce(() => listingQueriesDeferred.promise);
  vi.mocked(listListingTemplatesCached).mockImplementationOnce(
    () => listingTemplatesDeferred.promise
  );

  const Harness = () => {
    const [value, setValue] = useState<ContentListData>({} as ContentListData);
    return <ContentListWizardEditor value={value} onChange={setValue} variant="cards" />;
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Loading content types...");

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "listing");
    });
    await flush();

    expect(view.container.textContent).not.toContain("Loading content types...");
    expect(view.container.textContent).toContain("Loading listings options...");

    await React.act(async () => {
      contentTypesDeferred.resolve(contentListState.contentTypes);
      await Promise.resolve();
    });
    await flush();

    expect(view.container.textContent).not.toContain("Loading content types...");
    expect(view.container.textContent).toContain("Loading listings options...");

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "legacy");
    });
    await flush();

    expect(view.container.textContent).not.toContain("Loading listings options...");

    await React.act(async () => {
      listingQueriesDeferred.resolve(contentListState.listingQueries);
      listingTemplatesDeferred.resolve(contentListState.listingTemplates);
      await Promise.resolve();
    });
    await flush();

    expect(view.container.textContent).not.toContain("Listings failed");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ContentList wizard editor ignores late loader failures after source-mode transitions", async () => {
  const { ContentListWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");
  const { listContentTypesCached } = await import("@/services/contentTypesClient");
  const { listListingQueriesCached, listListingTemplatesCached } =
    await import("@/services/listingsClient");

  const contentTypesDeferred = createDeferred<typeof contentListState.contentTypes>();
  const listingQueriesDeferred = createDeferred<typeof contentListState.listingQueries>();
  const listingTemplatesDeferred = createDeferred<typeof contentListState.listingTemplates>();
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  vi.mocked(listContentTypesCached).mockImplementationOnce(() => contentTypesDeferred.promise);
  vi.mocked(listListingQueriesCached).mockImplementationOnce(() => listingQueriesDeferred.promise);
  vi.mocked(listListingTemplatesCached).mockImplementationOnce(
    () => listingTemplatesDeferred.promise
  );

  const Harness = () => {
    const [value, setValue] = useState<ContentListData>({} as ContentListData);
    return <ContentListWizardEditor value={value} onChange={setValue} variant="cards" />;
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Loading content types...");

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "listing");
    });
    await flush();

    expect(view.container.textContent).not.toContain("Loading content types...");
    expect(view.container.textContent).toContain("Loading listings options...");

    await React.act(async () => {
      contentTypesDeferred.reject(new Error("Late content types failure"));
      await Promise.resolve();
    });
    await flush();

    expect(view.container.textContent).not.toContain("Failed to load content types.");

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "legacy");
    });
    await flush();

    expect(view.container.textContent).not.toContain("Loading listings options...");

    await React.act(async () => {
      listingQueriesDeferred.reject(new Error("Late listings failure"));
      listingTemplatesDeferred.resolve(contentListState.listingTemplates);
      await Promise.resolve();
    });
    await flush();

    expect(view.container.textContent).not.toContain("Failed to load listings options.");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ContentList editors fall back to default source, style, field, and runtime values when normalized data is sparse", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/contentList", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/contentList")>(
      "../../../core/widgets/core/contentList"
    );

    return {
      ...actual,
      normalizeContentListData: (value: ContentListData) => ({
        ...actual.normalizeContentListData(value),
        source: {
          mode: undefined,
          contentTypeId: undefined,
          listingQueryId: undefined,
          listingTemplateId: undefined,
          limit: undefined,
          statusScope: undefined,
          sort: undefined,
        } as ContentListData["source"],
        filters: {
          taxonomy: undefined,
          authorId: undefined,
          searchQuery: undefined,
          featuredOnly: undefined,
        } as ContentListData["filters"],
        fields: {
          showImage: undefined,
          showExcerpt: undefined,
          showMeta: undefined,
          showCta: undefined,
        } as ContentListData["fields"],
        style: {
          columns: undefined,
          gap: undefined,
          cardStyle: undefined,
          ctaLabel: undefined,
          backgroundColor: undefined,
          borderColor: undefined,
          textColor: undefined,
        } as ContentListData["style"],
        emptyState: {
          title: undefined,
          description: undefined,
        } as ContentListData["emptyState"],
        resolved: undefined,
      }),
    };
  });

  const { ContentListAdvancedEditor, ContentListVisualEditor, ContentListWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");

  const view = mount(
    <>
      <ContentListWizardEditor
        value={{} as ContentListData}
        onChange={() => undefined}
        variant="unknown-layout"
      />
      <ContentListVisualEditor
        value={{} as ContentListData}
        onChange={() => undefined}
        variant="unknown-layout"
      />
      <ContentListAdvancedEditor
        value={{} as ContentListData}
        onChange={() => undefined}
        variant="unknown-layout"
      />
    </>
  );

  try {
    expect(
      (
        findSelectsByOptions(view.container, ["legacy", "listing"])[0] as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("legacy");
    expect(
      (
        findSelectsByOptions(view.container, ["cards", "list", "compact"])[0] as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("cards");
    expect(
      (findNumberInputs(view.container)[0] as HTMLInputElement | null | undefined)?.value
    ).toBe("6");
    expect(
      (
        findSelectsByOptions(view.container, ["1", "2", "3"])[0] as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("3");
    expect(
      (
        findSelectsByOptions(view.container, ["none", "sm", "md", "lg"])[0] as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("md");
    expect(
      (
        findSelectsByOptions(view.container, ["outlined", "elevated", "minimal"])[0] as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("outlined");
    expect(
      (
        findSelectsByOptions(view.container, [
          "published",
          "all",
          "draft",
          "scheduled",
          "archived",
        ])[0] as HTMLSelectElement | null | undefined
      )?.value
    ).toBe("published");
    expect(
      (
        findSelectsByOptions(view.container, [
          "published-desc",
          "published-asc",
          "updated-desc",
          "updated-asc",
          "title-asc",
          "title-desc",
        ])[0] as HTMLSelectElement | null | undefined
      )?.value
    ).toBe("published-desc");
    expect(
      (findInputByPlaceholder(view.container, "Read more") as HTMLInputElement | null | undefined)
        ?.value
    ).toBe("Read more");
    expect(
      (
        findInputByPlaceholder(view.container, "No items found") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("");
    expect(
      (
        findTextareaByPlaceholder(
          view.container,
          "Adjust filters or publish entries for this content type."
        ) as HTMLTextAreaElement | null | undefined
      )?.value
    ).toBe("");
    expect(
      (findCheckboxByLabelText(view.container, "Show image") as HTMLInputElement | null | undefined)
        ?.checked
    ).toBe(true);
    expect(
      (
        findCheckboxByLabelText(view.container, "Show excerpt") as
          | HTMLInputElement
          | null
          | undefined
      )?.checked
    ).toBe(true);
    expect(
      (findCheckboxByLabelText(view.container, "Show meta") as HTMLInputElement | null | undefined)
        ?.checked
    ).toBe(true);
    expect(
      (
        findCheckboxByLabelText(view.container, "Show CTA link") as
          | HTMLInputElement
          | null
          | undefined
      )?.checked
    ).toBe(true);
    expect(
      (
        findCheckboxByLabelText(view.container, "Featured only") as
          | HTMLInputElement
          | null
          | undefined
      )?.checked
    ).toBe(false);
    expect(
      (
        findInputByPlaceholder(view.container, "var(--color-bg)") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("");
    expect(
      (
        findInputByPlaceholder(view.container, "var(--color-border)") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("");
    expect(
      (
        findInputByPlaceholder(view.container, "var(--color-text)") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("");
    expect(view.container.textContent).toContain('"items": []');
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/widgets/core/contentList");
    vi.resetModules();
  }
});

test("ContentList editors surface content type and listings loading errors", async () => {
  const { ContentListAdvancedEditor, ContentListVisualEditor, ContentListWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");

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
        <ContentListWizardEditor value={value} onChange={setValue} variant="cards" />
        <ContentListVisualEditor value={value} onChange={setValue} variant="cards" />
        <ContentListAdvancedEditor value={value} onChange={setValue} variant="cards" />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Types failed");

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "listing");
    });
    await flush();

    expect(view.container.textContent).toContain("Listings failed");
  } finally {
    view.cleanup();
  }
});

test("ContentList editors fall back to generic loading messages for unexpected errors", async () => {
  const { ContentListWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ContentListEditors");

  contentListState.contentTypesError = new Error("Unexpected types failure");
  contentListState.listingsError = new Error("Unexpected listings failure");

  const Harness = () => {
    const [value, setValue] = useState<ContentListData>({} as ContentListData);
    return <ContentListWizardEditor value={value} onChange={setValue} variant="cards" />;
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Failed to load content types.");

    React.act(() => {
      setSelectValue(findSelectsByOptions(view.container, ["legacy", "listing"])[0], "listing");
    });
    await flush();

    expect(view.container.textContent).toContain("Failed to load listings options.");
  } finally {
    view.cleanup();
  }
});
