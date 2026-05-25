// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ListingFiltersData } from "../../../core/widgets/core/listingFilters";

const listingFiltersState = vi.hoisted(() => ({
  queries: [
    {
      id: "query-1",
      name: "Featured listing",
      description: "Homepage cards",
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
  queryError: null as unknown,
  queryFailuresBeforeSuccess: 0,
  reset() {
    this.queryError = null;
    this.queryFailuresBeforeSuccess = 0;
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

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/listingsClient", () => ({
  getCachedListingQueries: vi.fn(() => null),
  listListingQueriesCached: vi.fn(async () => {
    if (listingFiltersState.queryFailuresBeforeSuccess > 0) {
      listingFiltersState.queryFailuresBeforeSuccess -= 1;
      const error = new Error("Not authenticated");
      error.name = "ApiClientError";
      throw error;
    }
    if (listingFiltersState.queryError) throw listingFiltersState.queryError;
    return listingFiltersState.queries;
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

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

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

const clickByText = (container: HTMLElement, text: string) => {
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

const findInputsByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareaByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareasByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).filter(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find(
    (section) => normalizeText(section.querySelector("h3")?.textContent) === normalizeText(title)
  );

const findInputByValue = (container: ParentNode, value: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) => element instanceof HTMLInputElement && element.value === value
  );

const writablePaths = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-widget-control-path]"))
    .filter((element) => element.getAttribute("data-widget-control-readonly") !== "true")
    .map((element) => element.getAttribute("data-widget-control-path"))
    .filter((path): path is string => Boolean(path));

afterEach(() => {
  vi.restoreAllMocks();
  listingFiltersState.reset();
});

test("ListingFilters editor modes expose non-overlapping writable ownership metadata", async () => {
  const { ListingFiltersAdvancedEditor, ListingFiltersVisualEditor, ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  const baseValue: ListingFiltersData = {
    listingQueryId: "query-1",
    title: "Filter results",
    facets: [
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [
          {
            value: "updatedAt:desc",
            label: "Newest first",
            field: "updatedAt",
            dir: "desc",
          },
        ],
      },
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "status",
        op: "in",
        options: [{ value: "published", label: "Published" }],
      },
    ],
  };

  const wizard = mount(
    <ListingFiltersWizardEditor value={baseValue} onChange={() => undefined} variant="default" />
  );
  const visual = mount(
    <ListingFiltersVisualEditor value={baseValue} onChange={() => undefined} variant="default" />
  );
  const advanced = mount(
    <ListingFiltersAdvancedEditor value={baseValue} onChange={() => undefined} variant="default" />
  );

  try {
    await flush();

    const wizardPaths = writablePaths(wizard.container);
    const visualPaths = writablePaths(visual.container);
    const advancedPaths = writablePaths(advanced.container);
    const allPaths = [...wizardPaths, ...visualPaths, ...advancedPaths];
    const duplicatePaths = allPaths.filter((path, index) => allPaths.indexOf(path) !== index);

    expect(wizardPaths).toEqual(
      expect.arrayContaining([
        "listingQueryId",
        "facets.0.kind",
        "facets.0.sortOptions.0.field",
        "facets.0.sortOptions.0.dir",
        "facets.1.field",
        "facets.1.op",
      ])
    );
    expect(wizardPaths).not.toContain("facets.0.id");
    expect(wizardPaths).not.toContain("facets.0.sortOptions.0.value");
    expect(wizardPaths).not.toContain("facets.1.options.0.value");
    expect(visualPaths).toEqual(
      expect.arrayContaining([
        "variant",
        "layout.maxWidth",
        "title",
        "showSearch",
        "style.frameBackground",
        "facets.0.order",
        "facets.0.label",
        "facets.0.sortOptions.0.label",
        "facets.1.label",
        "facets.1.options.0.label",
      ])
    );
    expect(visualPaths).not.toContain("listingQueryId");
    expect(wizardPaths).not.toContain("style.frameBackground");
    expect(advancedPaths).toEqual([]);
    expect(duplicatePaths).toEqual([]);
    expect(visual.container.querySelector('input[aria-label="Frame background value"]')).toBeNull();
    expect(advanced.container.querySelector("textarea")).toBeNull();
  } finally {
    wizard.cleanup();
    visual.cleanup();
    advanced.cleanup();
  }
});

test("ListingFilters editors cover listing query selection, runtime behavior, safe facet setup, and runtime summaries", async () => {
  const { ListingFiltersAdvancedEditor, ListingFiltersVisualEditor, ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>({} as ListingFiltersData);
    return (
      <>
        <ListingFiltersWizardEditor
          value={value}
          variant="default"
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
        />
        <ListingFiltersVisualEditor
          value={value}
          variant="default"
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
        />
        <ListingFiltersAdvancedEditor
          value={value}
          variant="default"
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Listing query source");
    expect(view.container.textContent).toContain("Facet setup");
    expect(view.container.textContent).toContain("Runtime diagnostics");
    expect(view.container.textContent).toContain("Runtime status");

    React.act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_query__", "query-1"])[0],
        "query-1"
      );
      setInputValue(findInputByPlaceholder(view.container, "Filter results"), "Filter panel");
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Optional helper text."),
        "Narrow down entries"
      );
      setInputValue(findInputByPlaceholder(view.container, "Search"), "Search label");
      setInputValue(
        findInputByPlaceholder(view.container, "Search results..."),
        "Search within results"
      );
      setInputValue(findInputByPlaceholder(view.container, "Apply filters"), "Run filters");
    });

    const facetsSection = findSectionByTitle(view.container, "Facet setup") as HTMLElement;
    const behaviorSection = findSectionByTitle(
      view.container,
      "Filter copy and behavior"
    ) as HTMLElement;
    const switches = Array.from(behaviorSection.querySelectorAll("input[type='checkbox']"));
    clickElement(switches[0]);
    clickElement(switches[1]);

    clickByText(facetsSection, "Add facet");
    React.act(() => {
      const fieldSelects = findSelectsByOptions(facetsSection, [
        "__no_field__",
        "id",
        "title",
        "updatedAt",
      ]);
      setSelectValue(fieldSelects[fieldSelects.length - 1], "title");
    });

    const lastPayload = onChangeSpy.mock.lastCall?.[0];
    expect(lastPayload).toEqual(
      expect.objectContaining({
        listingQueryId: "query-1",
        title: "Filter panel",
        description: "Narrow down entries",
        searchLabel: "Search label",
        searchPlaceholder: "Search within results",
        applyLabel: "Run filters",
        showSearch: false,
        autoApply: false,
      })
    );
    expect(view.container.textContent).not.toContain('"resolved"');
    expect(view.container.querySelector("textarea[readonly]")).toBeNull();
    expect(view.container.textContent).toContain("_docs/_WIDGETS/LISTING_FILTERS.md");
    expect(view.container.textContent).toContain("Preview");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters editors surface listing query loading errors", async () => {
  const { ListingFiltersAdvancedEditor, ListingFiltersVisualEditor, ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  listingFiltersState.queryError = {
    name: "ApiClientError",
    message: "Listing queries failed",
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>({} as ListingFiltersData);
    return (
      <>
        <ListingFiltersWizardEditor value={value} onChange={setValue} variant="default" />
        <ListingFiltersVisualEditor value={value} onChange={setValue} variant="default" />
        <ListingFiltersAdvancedEditor value={value} onChange={setValue} variant="default" />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Listing queries failed");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters wizard editor covers loading state, query reset, field suggestions, kind-scoped operators, structured rows, preview, and removal", async () => {
  const { ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  const onChangeSpy = vi.fn();
  let latestValue: ListingFiltersData = {
    facets: [
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [
          {
            value: "updatedAt:desc",
            label: "Newest first",
            field: "updatedAt",
            dir: "desc",
          },
        ],
      },
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "status",
        op: "in",
        options: [],
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);

    const handleChange = (next: ListingFiltersData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    return <ListingFiltersWizardEditor value={value} onChange={handleChange} variant="default" />;
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Loading listing queries...");
    await flush();

    const querySection = findSectionByTitle(view.container, "Listing query source");
    const facetsSection = findSectionByTitle(view.container, "Facet setup");
    expect(querySection).toBeTruthy();
    expect(facetsSection).toBeTruthy();

    const querySelect = findSelectsByOptions(querySection!, ["__no_listing_query__", "query-1"])[0];
    React.act(() => {
      setSelectValue(querySelect, "query-1");
    });
    await flush();
    expect(latestValue.listingQueryId).toBe("query-1");
    expect(facetsSection?.textContent).toContain(
      "Choose from fields available in the selected listing query."
    );

    React.act(() => {
      setSelectValue(querySelect, "__no_listing_query__");
    });
    expect(latestValue.listingQueryId).toBe("");

    React.act(() => {
      setSelectValue(querySelect, "query-1");
    });
    await flush();

    expect(findInputsByPlaceholder(facetsSection as HTMLElement, "facet-id")).toHaveLength(0);

    let kindSelects = findSelectsByOptions(facetsSection!, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);
    React.act(() => {
      setSelectValue(kindSelects[1], "radio");
    });
    expect(latestValue.facets?.[1]?.kind).toBe("radio");
    expect(latestValue.facets?.[1]?.op).toBe("eq");

    const addedFacet = facetsSection?.querySelector(
      '[data-widget-control="listing-filters.facet.1"]'
    ) as HTMLElement | null;
    expect(addedFacet).toBeTruthy();

    React.act(() => {
      const fieldSelects = findSelectsByOptions(addedFacet as HTMLElement, [
        "id",
        "title",
        "updatedAt",
        "__custom_field__",
      ]);
      const fieldSelect = fieldSelects[fieldSelects.length - 1] as HTMLSelectElement;
      expect(Array.from(fieldSelect.options).map((option) => option.value)).not.toContain(
        "__no_field__"
      );
      setSelectValue(fieldSelect, "title");
    });
    expect(latestValue.facets?.[1]?.field).toBe("title");

    let operatorSelects = findSelectsByOptions(facetsSection!, ["eq", "neq"]);
    expect(
      Array.from((operatorSelects[0] as HTMLSelectElement).options).map((option) => option.value)
    ).toEqual(["eq", "neq"]);
    React.act(() => {
      setSelectValue(operatorSelects[0], "neq");
    });
    expect(latestValue.facets?.[1]?.op).toBe("neq");

    React.act(() => {
      setSelectValue(operatorSelects[0], "__unsupported__");
    });
    expect(latestValue.facets?.[1]?.op).toBe("neq");

    expect(findInputsByPlaceholder(facetsSection as HTMLElement, "Option value")).toHaveLength(0);
    expect(facetsSection?.textContent).toContain("Option values are support-owned");
    expect(facetsSection?.textContent).toContain("Preview");

    kindSelects = findSelectsByOptions(facetsSection!, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);
    React.act(() => {
      setSelectValue(kindSelects[1], "__unsupported__");
    });
    expect(latestValue.facets?.[1]?.kind).toBe("checkbox");
    expect(latestValue.facets?.[1]?.op).toBe("in");

    kindSelects = findSelectsByOptions(facetsSection!, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);
    React.act(() => {
      setSelectValue(kindSelects[1], "sort");
    });
    expect(latestValue.facets?.[1]?.kind).toBe("sort");
    expect(latestValue.facets?.[1]?.field).toBeUndefined();
    expect(facetsSection?.textContent).toContain("Sort options choose their own listing fields.");
    expect(facetsSection?.textContent).toContain("Sort does not use filter operators.");
    expect(facetsSection?.textContent).toContain(
      "Add a sort choice that visitors can select, then choose the listing field and direction."
    );
    expect(facetsSection?.textContent).not.toContain("pipe-delimited");
    const addSortOptionButton = addedFacet?.querySelector(
      '[data-widget-control="listing-filters.facet.1.sort-option.add"]'
    );
    clickElement(addSortOptionButton);

    React.act(() => {
      const sortFieldSelects = findSelectsByOptions(addedFacet as HTMLElement, [
        "__no_field__",
        "id",
        "title",
        "updatedAt",
      ]);
      setSelectValue(sortFieldSelects[sortFieldSelects.length - 1], "title");
    });
    React.act(() => {
      const directionCandidates = findSelectsByOptions(addedFacet as HTMLElement, [
        "__no_sort_direction__",
        "asc",
        "desc",
      ]);
      setSelectValue(directionCandidates[directionCandidates.length - 1], "asc");
    });
    expect(latestValue.facets?.[1]?.sortOptions).toEqual([
      {
        value: "title:asc",
        label: "",
        field: "title",
        dir: "asc",
      },
    ]);

    const removeButton = addedFacet?.querySelector(
      '[data-widget-control="listing-filters.facet.1.remove"]'
    );
    clickElement(removeButton);
    expect(latestValue.facets).toHaveLength(1);
    expect(onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ListingFilters wizard preserves support-owned custom field bindings until replaced", async () => {
  const { ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  let latestValue: ListingFiltersData = {
    listingQueryId: "query-1",
    facets: [
      {
        id: "legacy",
        kind: "checkbox",
        label: "Legacy facet",
        field: "metadata.custom.path",
        op: "in",
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);
    return (
      <ListingFiltersWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="default"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    const facetsSection = findSectionByTitle(view.container, "Facet setup") as HTMLElement;
    expect(facetsSection.textContent).toContain(
      "A custom field binding is already configured by support."
    );
    expect(facetsSection.textContent).not.toContain("metadata.custom.path");

    const fieldSelects = findSelectsByOptions(facetsSection, [
      "id",
      "title",
      "updatedAt",
      "__custom_field__",
    ]);
    expect(fieldSelects).toHaveLength(1);

    const fieldSelect = fieldSelects[0] as HTMLSelectElement;
    expect(Array.from(fieldSelect.options).map((option) => option.value)).not.toContain(
      "__no_field__"
    );

    React.act(() => {
      setSelectValue(fieldSelect, "__no_field__");
    });
    expect(latestValue.facets?.[0]?.field).toBe("metadata.custom.path");

    React.act(() => {
      setSelectValue(fieldSelect, "title");
    });
    expect(latestValue.facets?.[0]?.field).toBe("title");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters editors show fallback text for non-API query loading failures", async () => {
  const { ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  listingFiltersState.queryError = new Error("boom");

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>({} as ListingFiltersData);
    return <ListingFiltersWizardEditor value={value} onChange={setValue} variant="default" />;
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Failed to load listing queries.");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters editors retry one transient auth-shaped query loading failure", async () => {
  const { ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  listingFiltersState.queryFailuresBeforeSuccess = 1;

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>({} as ListingFiltersData);
    return <ListingFiltersWizardEditor value={value} onChange={setValue} variant="default" />;
  };

  const view = mount(<Harness />);

  try {
    await flush();
    await React.act(async () => {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    });
    await flush();
    expect(view.container.textContent).not.toContain("Not authenticated");
    expect(view.container.textContent).toContain("Select a listing query");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters wizard editor keeps draft facets visible and surfaces local validation feedback", async () => {
  const { ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  let latestValue: ListingFiltersData = {
    facets: [
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [
          {
            value: "updatedAt:desc",
            label: "Newest first",
            field: "updatedAt",
            dir: "desc",
          },
        ],
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);

    const handleChange = (next: ListingFiltersData) => {
      latestValue = next;
      setValue(next);
    };

    return <ListingFiltersWizardEditor value={value} onChange={handleChange} variant="default" />;
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain(
      "Select a listing query to enable canvas preview and facet mapping."
    );

    const querySection = findSectionByTitle(view.container, "Listing query source") as HTMLElement;
    const querySelect = findSelectsByOptions(querySection, ["__no_listing_query__", "query-1"])[0];
    React.act(() => {
      setSelectValue(querySelect, "query-1");
    });
    await flush();

    const facetsSection = findSectionByTitle(view.container, "Facet setup") as HTMLElement;
    clickByText(facetsSection, "Add facet");
    expect(findInputsByPlaceholder(facetsSection, "facet-id")).toHaveLength(0);
    expect(facetsSection.textContent).toContain("Choose a listing field for this facet.");

    const kindSelects = findSelectsByOptions(facetsSection, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);

    React.act(() => {
      setSelectValue(kindSelects[1], "radio");
    });

    expect(latestValue.facets).toHaveLength(2);
    expect(findInputsByPlaceholder(facetsSection, "facet-id")).toHaveLength(0);
    expect(facetsSection.textContent).toContain("Generated automatically");

    React.act(() => {
      const fieldSelects = findSelectsByOptions(facetsSection, [
        "__no_field__",
        "id",
        "title",
        "updatedAt",
      ]);
      setSelectValue(fieldSelects[fieldSelects.length - 1], "title");
    });

    expect(facetsSection.textContent).not.toContain("Choose a listing field for this facet.");
    expect(latestValue.facets?.[1]).toEqual(
      expect.objectContaining({
        id: "facet-2",
        field: "title",
      })
    );

    clickByText(facetsSection, "Add facet");
    expect(findInputsByPlaceholder(facetsSection, "facet-id")).toHaveLength(0);
    expect(facetsSection.textContent).not.toContain("Duplicate facet ID");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters editors preserve incomplete facet drafts when visual settings change", async () => {
  const { ListingFiltersVisualEditor, ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  let latestValue: ListingFiltersData = {
    facets: [
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [
          {
            value: "updatedAt:desc",
            label: "Newest first",
            field: "updatedAt",
            dir: "desc",
          },
        ],
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);

    const handleChange = (next: ListingFiltersData) => {
      latestValue = next;
      setValue(next);
    };

    return (
      <>
        <ListingFiltersWizardEditor value={value} onChange={handleChange} variant="default" />
        <ListingFiltersVisualEditor value={value} onChange={handleChange} variant="default" />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    const facetsSection = findSectionByTitle(view.container, "Facet setup") as HTMLElement;
    clickByText(facetsSection, "Add facet");
    expect(findInputsByPlaceholder(facetsSection, "facet-id")).toHaveLength(0);

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Filter results"), "Filters");
    });

    expect(findInputsByPlaceholder(facetsSection, "facet-id")).toHaveLength(0);
    expect(latestValue.facets).toHaveLength(2);
    expect(view.container.textContent).toContain("Choose a listing field for this facet.");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters visual editor covers taxonomy labels and range/date presentation controls", async () => {
  const { ListingFiltersVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  let latestValue: ListingFiltersData = {
    listingQueryId: "query-1",
    facets: [
      {
        id: "category",
        kind: "taxonomy",
        label: "Category",
        field: "category",
        op: "in",
        options: [{ value: "houses", label: "Houses" }],
      },
      {
        id: "price",
        kind: "range",
        label: "Price",
        field: "price",
        op: "between",
      },
      {
        id: "published-at",
        kind: "date-range",
        label: "Published at",
        field: "publishedAt",
        op: "between",
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);
    return (
      <ListingFiltersVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="default"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    const facetsSection = findSectionByTitle(view.container, "Facet presentation") as HTMLElement;
    const taxonomyFacet = facetsSection.querySelector(
      '[data-widget-control="listing-filters.facet.0"]'
    ) as HTMLElement | null;
    const rangeFacet = facetsSection.querySelector(
      '[data-widget-control="listing-filters.facet.1"]'
    ) as HTMLElement | null;
    const dateFacet = facetsSection.querySelector(
      '[data-widget-control="listing-filters.facet.2"]'
    ) as HTMLElement | null;

    expect(taxonomyFacet).toBeTruthy();
    expect(rangeFacet).toBeTruthy();
    expect(dateFacet).toBeTruthy();

    React.act(() => {
      const controlModeSelect = findSelectsByOptions(taxonomyFacet as HTMLElement, [
        "inline",
        "searchable",
      ])[0];
      setSelectValue(controlModeSelect, "searchable");
    });
    expect(latestValue.facets?.[0]).toMatchObject({
      presentation: { controlMode: "searchable" },
    });

    React.act(() => {
      setInputValue(
        findInputsByPlaceholder(taxonomyFacet as HTMLElement, "Option label").at(-1),
        "Homes"
      );
    });
    expect(latestValue.facets?.[0]).toMatchObject({
      options: [{ value: "houses", label: "Homes" }],
    });

    React.act(() => {
      const rangeModeSelect = findSelectsByOptions(rangeFacet as HTMLElement, [
        "inputs",
        "inputs-slider",
      ])[0];
      setSelectValue(rangeModeSelect, "inputs");
      setInputValue(
        findInputByPlaceholder(rangeFacet as HTMLElement, "Range step (optional)"),
        "10"
      );
    });
    expect(latestValue.facets?.[1]).toMatchObject({
      presentation: {
        rangeInputMode: "inputs",
        rangeStep: 10,
      },
    });

    React.act(() => {
      const dateModeSelect = findSelectsByOptions(dateFacet as HTMLElement, [
        "native-date",
        "text-fallback",
      ])[0];
      setSelectValue(dateModeSelect, "text-fallback");
    });
    expect(latestValue.facets?.[2]).toMatchObject({
      presentation: {
        dateInputMode: "text-fallback",
      },
    });
  } finally {
    view.cleanup();
  }
});

test("ListingFilters visual editor covers variant, width, and collapsible layout controls", async () => {
  const { ListingFiltersVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  let latestValue: ListingFiltersData = {
    listingQueryId: "query-1",
    facets: [
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "status",
        op: "in",
        options: [{ value: "published", label: "Published" }],
      },
    ],
  };
  let latestVariant = "default";

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);
    const [variant, setVariant] = useState(latestVariant);
    return (
      <ListingFiltersVisualEditor
        value={value}
        variant={variant}
        onVariantChange={(next) => {
          latestVariant = next;
          setVariant(next);
        }}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Variant and layout");

    const layoutSection = findSectionByTitle(view.container, "Variant and layout") as HTMLElement;
    clickByText(layoutSection, "Sidebar");
    expect(latestVariant).toBe("sidebar");

    React.act(() => {
      const widthSelect = findSelectsByOptions(layoutSection, [
        "narrow",
        "content",
        "wide",
        "full",
      ])[0];
      setSelectValue(widthSelect, "narrow");
    });
    expect(latestValue.layout?.maxWidth).toBe("narrow");

    const switches = Array.from(layoutSection.querySelectorAll('input[type="checkbox"]'));
    expect(switches).toHaveLength(2);
    clickElement(switches[0]);
    expect(latestValue.layout?.collapsibleFacets).toBe(true);

    const refreshedLayoutSection = findSectionByTitle(
      view.container,
      "Variant and layout"
    ) as HTMLElement;
    const refreshedSwitches = Array.from(
      refreshedLayoutSection.querySelectorAll('input[type="checkbox"]')
    );
    expect(refreshedSwitches.length).toBeGreaterThanOrEqual(3);
    clickElement(refreshedSwitches[1]);
    expect(latestValue.layout?.defaultCollapsed).toBe(true);
    clickElement(refreshedSwitches[2]);
    expect(latestValue.layout?.stickySidebar).toBe(true);

    clickByText(refreshedLayoutSection, "Drawer");
    expect(latestVariant).toBe("drawer");
    expect(view.container.textContent).toContain(
      "Drawer uses a native disclosure shell so filters stay usable without extra runtime JS."
    );
  } finally {
    view.cleanup();
  }
});
