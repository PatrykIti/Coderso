// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { searchBoxDefaults, type SearchBoxData } from "../../../core/widgets/core/searchBox";

const searchBoxState = vi.hoisted(() => ({
  queries: [
    {
      id: "query-1",
      name: "Articles",
      description: "Article listing query",
      query: {
        source: "entries",
        sourceConfig: {},
        filters: [],
        sort: [],
        pagination: { limit: 12, offset: 0 },
        fields: ["id", "title"],
      },
      createdAt: "2026-03-09T10:00:00.000Z",
      updatedAt: "2026-03-09T10:00:00.000Z",
    },
  ],
  error: null as unknown,
  reset() {
    this.error = null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
}));

vi.mock("@/services/listingsClient", () => ({
  listListingQueriesCached: vi.fn(async () => {
    if (searchBoxState.error) throw searchBoxState.error;
    return searchBoxState.queries;
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

const setCheckboxValue = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  React.act(() => {
    element.click();
  });
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const makeApiClientError = (message: string) => {
  const error = new Error(message);
  error.name = "ApiClientError";
  return error;
};

afterEach(() => {
  document.body.innerHTML = "";
  searchBoxState.reset();
  vi.restoreAllMocks();
});

test("SearchBox wizard editor covers listing mode selection and copy updates", async () => {
  const { SearchBoxWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/SearchBoxEditors");

  let latestValue: SearchBoxData = {};
  const Harness = () => {
    const [value, setValue] = useState<SearchBoxData>(latestValue);
    return (
      <SearchBoxWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="default"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);
  try {
    expect(view.container.textContent).toContain("Loading listing queries...");
    await flush();

    const modeSelect = findSelectByOptions(view.container, ["listing", "global"]);
    const querySelect = findSelectByOptions(view.container, ["__no_listing_query__", "query-1"]);
    setSelectValue(modeSelect, "listing");
    setSelectValue(querySelect, "query-1");
    setInputValue(findInputsByPlaceholder(view.container, "Search")[0], "Catalog search");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Optional helper text."),
      "Find matching records."
    );
    setInputValue(findInputByPlaceholder(view.container, "Type to search..."), "Search catalog");
    setInputValue(findInputsByPlaceholder(view.container, "Search")[1], "Run search");

    const autoApplyToggle = Array.from(
      view.container.querySelectorAll('input[type="checkbox"]')
    )[0];
    setCheckboxValue(autoApplyToggle, false);

    expect(latestValue).toMatchObject({
      mode: "listing",
      listingQueryId: "query-1",
      description: "Find matching records.",
      placeholder: "Search catalog",
      submitLabel: "Run search",
      autoApply: false,
    });
  } finally {
    view.cleanup();
  }
});

test("SearchBox visual editor covers global mode endpoint and source toggles", async () => {
  const { SearchBoxVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/SearchBoxEditors");

  let latestValue: SearchBoxData = { mode: "global", endpoint: " /api/custom-search " };
  const Harness = () => {
    const [value, setValue] = useState<SearchBoxData>(latestValue);
    return (
      <SearchBoxVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="default"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);
  try {
    await flush();
    setInputValue(findInputByPlaceholder(view.container, "/api/search"), "/api/site-search");

    const toggles = Array.from(view.container.querySelectorAll('input[type="checkbox"]'));
    setCheckboxValue(toggles[0], false);
    setCheckboxValue(toggles[1], false);
    setCheckboxValue(toggles[2], true);

    expect(latestValue).toMatchObject({
      mode: "global",
      endpoint: "/api/site-search",
      sources: {
        pages: false,
        entries: false,
        posts: true,
      },
    });
  } finally {
    view.cleanup();
  }
});

test("SearchBox visual editor surfaces listing query API errors and normalizes listing copy fields", async () => {
  searchBoxState.error = makeApiClientError("Listing queries are restricted.");

  const { SearchBoxVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/SearchBoxEditors");

  let latestValue: SearchBoxData = {};
  const Harness = () => {
    const [value, setValue] = useState<SearchBoxData>(latestValue);
    return (
      <SearchBoxVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="default"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);
  try {
    await flush();
    expect(view.container.textContent).toContain("Listing queries are restricted.");

    setInputValue(findInputsByPlaceholder(view.container, "Search")[0], "Quick search");
    setInputValue(findInputsByPlaceholder(view.container, "Search")[1], "   ");
    const autoApplyToggle = Array.from(
      view.container.querySelectorAll('input[type="checkbox"]')
    )[0];
    setCheckboxValue(autoApplyToggle, false);

    expect(latestValue).toMatchObject({
      title: "Quick search",
      submitLabel: searchBoxDefaults.submitLabel,
      autoApply: false,
    });
  } finally {
    view.cleanup();
  }
});

test("SearchBox advanced editor covers runtime snapshot, global source toggles, and listing-query loading fallback", async () => {
  searchBoxState.error = new Error("boom");

  const { SearchBoxAdvancedEditor, SearchBoxWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/SearchBoxEditors");

  const errorView = mount(
    <SearchBoxWizardEditor
      value={{}}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );

  try {
    await flush();
    expect(errorView.container.textContent).toContain("Failed to load listing queries.");
  } finally {
    errorView.cleanup();
  }

  searchBoxState.error = null;

  let latestValue: SearchBoxData = {
    mode: "global",
    endpoint: "   ",
    sources: {
      entries: false,
      posts: true,
    },
    resolved: {
      query: " launch ",
      rejectedTokens: [" __page ", "", "bad"],
      error: " upstream-error ",
    },
  };
  const Harness = () => {
    const [value, setValue] = useState<SearchBoxData>(latestValue);
    return (
      <SearchBoxAdvancedEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="default"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Contract");

    const toggles = Array.from(view.container.querySelectorAll('input[type="checkbox"]'));
    expect(
      toggles.map((toggle) => (toggle instanceof HTMLInputElement ? toggle.checked : false))
    ).toEqual([true, false, true]);
    setCheckboxValue(toggles[0], false);
    setCheckboxValue(toggles[1], true);
    setCheckboxValue(toggles[2], false);

    expect(latestValue).toMatchObject({
      mode: "global",
      endpoint: searchBoxDefaults.endpoint,
      sources: {
        pages: false,
        entries: true,
        posts: false,
      },
    });

    const snapshot = view.container.querySelector("textarea[readonly]");
    const snapshotValue =
      snapshot instanceof HTMLTextAreaElement ? snapshot.value : (snapshot?.textContent ?? "");
    expect(snapshotValue).toContain('"query": "launch"');
    expect(snapshotValue).toContain('"rejectedTokens": [');
    expect(snapshotValue).toContain('"__page"');
    expect(snapshotValue).toContain('"bad"');
    expect(snapshotValue).toContain('"error": "upstream-error"');
  } finally {
    view.cleanup();
  }
});

test("SearchBox wizard editor covers unknown listing labels, mode switching, and query clearing", async () => {
  const { SearchBoxWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/SearchBoxEditors");

  let latestValue: SearchBoxData = {
    mode: "listing",
    listingQueryId: "missing-query",
  };

  const Harness = () => {
    const [value, setValue] = useState<SearchBoxData>(latestValue);
    return (
      <SearchBoxWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="default"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Auto apply on input");
    expect(
      (
        findSelectByOptions(view.container, ["__no_listing_query__", "query-1"]) as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("__no_listing_query__");

    setSelectValue(findSelectByOptions(view.container, ["listing", "global"]), "global");
    expect(latestValue.mode).toBe("global");
    expect(view.container.textContent).toContain("Global search sources");

    setInputValue(findInputByPlaceholder(view.container, "/api/search"), "/api/site-search");

    setSelectValue(findSelectByOptions(view.container, ["listing", "global"]), "listing");
    expect(latestValue.mode).toBe("listing");
    expect(view.container.textContent).toContain("Auto apply on input");

    const querySelect = findSelectByOptions(view.container, ["__no_listing_query__", "query-1"]);
    setSelectValue(querySelect, "query-1");
    expect(latestValue.listingQueryId).toBe("query-1");

    setSelectValue(querySelect, "__no_listing_query__");

    expect(latestValue).toMatchObject({
      mode: "listing",
      listingQueryId: "",
      endpoint: "/api/site-search",
    });
    expect(view.container.textContent).toContain("No listing query selected");
  } finally {
    view.cleanup();
  }
});
