// @vitest-environment happy-dom

import React, { act, useState } from "react";
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
  reset() {
    this.queryError = null;
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
  listListingQueriesCached: vi.fn(async () => {
    if (listingFiltersState.queryError) throw listingFiltersState.queryError;
    return listingFiltersState.queries;
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

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickElement = (element: Element | null | undefined) => {
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

const findInputsByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
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

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find(
    (section) => normalizeText(section.querySelector("p")?.textContent) === normalizeText(title)
  );

const findInputByValue = (container: ParentNode, value: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) => element instanceof HTMLInputElement && element.value === value
  );

afterEach(() => {
  vi.restoreAllMocks();
  listingFiltersState.reset();
});

test("ListingFilters editors cover listing query selection, runtime behavior, facets, sort config, and runtime snapshot", async () => {
  const {
    ListingFiltersAdvancedEditor,
    ListingFiltersVisualEditor,
    ListingFiltersWizardEditor,
  } = await import(
    "../../../core/admin/ui/widgets/editors/ListingFiltersEditors"
  );

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

    expect(view.container.textContent).toContain("Listing query");
    expect(view.container.textContent).toContain("Facet controls");
    expect(view.container.textContent).toContain("Runtime payload");

    act(() => {
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
      setInputValue(
        findInputByPlaceholder(view.container, "Apply filters"),
        "Run filters"
      );
    });

    const switches = Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    clickElement(switches[0]);
    clickElement(switches[1]);

    clickByText(view.container, "Add facet");
    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "facet-id"), "status");
      setInputValue(findInputByPlaceholder(view.container, "Facet label"), "Status");
      setInputValue(
        findInputByPlaceholder(view.container, "Field path (example: tags)"),
        "status"
      );
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "value|label\nnews|News"),
        "published|Published\ndraft|Draft"
      );
    });

    clickByText(view.container, "Add facet");
    const facetIdInputs = findInputsByPlaceholder(view.container, "facet-id");
    const facetLabelInputs = findInputsByPlaceholder(view.container, "Facet label");
    const facetFieldInputs = findInputsByPlaceholder(view.container, "Field path (example: tags)");
    const kindSelects = findSelectsByOptions(view.container, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);

    act(() => {
      setInputValue(facetIdInputs[1], "price");
      setInputValue(facetLabelInputs[1], "Price");
      setSelectValue(kindSelects[1], "range");
      setInputValue(facetFieldInputs[1], "price");
    });

    clickByText(view.container, "Add facet");
    const updatedFacetIdInputs = findInputsByPlaceholder(view.container, "facet-id");
    const updatedFacetLabelInputs = findInputsByPlaceholder(view.container, "Facet label");
    const updatedKindSelects = findSelectsByOptions(view.container, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);

    act(() => {
      setInputValue(updatedFacetIdInputs[2], "sort");
      setInputValue(updatedFacetLabelInputs[2], "Sort");
      setSelectValue(updatedKindSelects[2], "sort");
      setTextareaValue(
        findTextareasByPlaceholder(
          view.container,
          "updatedAt:desc|Newest first|updatedAt|desc"
        )[0],
        "updatedAt-desc|Newest first|updatedAt|desc\ntitle-asc|Title A-Z|title|asc"
      );
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
    expect(view.container.textContent).toContain('"resolved"');
  } finally {
    view.cleanup();
  }
});

test("ListingFilters editors surface listing query loading errors", async () => {
  const {
    ListingFiltersAdvancedEditor,
    ListingFiltersVisualEditor,
    ListingFiltersWizardEditor,
  } = await import(
    "../../../core/admin/ui/widgets/editors/ListingFiltersEditors"
  );

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

test("ListingFilters visual editor covers loading state, query reset, facet option parsing, kind fallbacks, and removal", async () => {
  const { ListingFiltersVisualEditor } = await import(
    "../../../core/admin/ui/widgets/editors/ListingFiltersEditors"
  );

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

    return <ListingFiltersVisualEditor value={value} onChange={handleChange} variant="default" />;
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Loading listing queries...");
    await flush();

    const querySection = findSectionByTitle(view.container, "Listing query");
    const facetsSection = findSectionByTitle(view.container, "Facet controls");
    expect(querySection).toBeTruthy();
    expect(facetsSection).toBeTruthy();

    const querySelect = findSelectsByOptions(querySection!, [
      "__no_listing_query__",
      "query-1",
    ])[0];
    act(() => {
      setSelectValue(querySelect, "query-1");
    });
    expect(latestValue.listingQueryId).toBe("query-1");

    act(() => {
      setSelectValue(querySelect, "__no_listing_query__");
    });
    expect(latestValue.listingQueryId).toBe("");

    expect(
      findInputsByPlaceholder(facetsSection as HTMLElement, "facet-id")
    ).toHaveLength(2);

    act(() => {
      setInputValue(findInputsByPlaceholder(facetsSection as HTMLElement, "facet-id")[1], "status");
      setInputValue(
        findInputsByPlaceholder(facetsSection as HTMLElement, "Facet label")[1],
        "Status"
      );
    });

    let kindSelects = findSelectsByOptions(facetsSection!, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);
    act(() => {
      setSelectValue(kindSelects[1], "radio");
    });
    expect(latestValue.facets?.[1]?.kind).toBe("radio");
    expect(latestValue.facets?.[1]?.op).toBe("eq");

    act(() => {
      setInputValue(
        findInputsByPlaceholder(
          facetsSection as HTMLElement,
          "Field path (example: tags)"
        )[0],
        "status.raw"
      );
    });
    expect(latestValue.facets?.[1]?.field).toBe("status.raw");

    let operatorSelects = findSelectsByOptions(facetsSection!, [
      "eq",
      "neq",
      "in",
      "nin",
      "contains",
      "startsWith",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
      "exists",
    ]);
    act(() => {
      setSelectValue(operatorSelects[0], "contains");
    });
    expect(latestValue.facets?.[1]?.op).toBe("contains");

    act(() => {
      setSelectValue(operatorSelects[0], "__unsupported__");
    });
    expect(latestValue.facets?.[1]?.op).toBe("contains");

    act(() => {
      setTextareaValue(
        findTextareasByPlaceholder(facetsSection as HTMLElement, "value|label\nnews|News")[0],
        "published|Published\narchived\n |Ignored"
      );
    });
    expect(latestValue.facets?.[1]?.options).toEqual([
      { value: "published", label: "Published" },
      { value: "archived", label: "archived" },
    ]);

    kindSelects = findSelectsByOptions(facetsSection!, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);
    act(() => {
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
    act(() => {
      setSelectValue(kindSelects[1], "sort");
    });
    expect(latestValue.facets?.[1]?.kind).toBe("sort");
    expect(latestValue.facets?.[1]?.field).toBeUndefined();
    expect(
      findInputByValue(facetsSection!, "Sort config uses per-option field + dir.")
    ).toBeTruthy();
    expect(findInputByValue(facetsSection!, "Sort does not use filter operators.")).toBeTruthy();

    const removeButtons = Array.from(facetsSection!.querySelectorAll("button")).filter((button) =>
      button.textContent?.includes("Remove")
    );
    clickElement(removeButtons[removeButtons.length - 1]);
    expect(
      findInputsByPlaceholder(facetsSection as HTMLElement, "facet-id")
    ).toHaveLength(1);
    expect(onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ListingFilters editors show fallback text for non-API query loading failures", async () => {
  const { ListingFiltersWizardEditor } = await import(
    "../../../core/admin/ui/widgets/editors/ListingFiltersEditors"
  );

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
