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
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectValue: ({
      children,
      placeholder,
    }: {
      children?: React.ReactNode;
      placeholder?: string;
    }) => <>{children ?? placeholder ?? null}</>,
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
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    readOnly?: boolean;
    placeholder?: string;
    rows?: number;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      placeholder={placeholder}
      rows={rows}
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

const writablePaths = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-widget-control-path]"))
    .filter((element) => element.getAttribute("data-widget-control-readonly") !== "true")
    .map((element) => element.getAttribute("data-widget-control-path"));

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

test("SearchBox wizard owns source setup without copy or style controls", async () => {
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
    expect(
      view.container
        .querySelector("[data-widget-editor-section='search-box.wizard.source-setup']")
        ?.getAttribute("data-widget-editor-mode")
    ).toBe("wizard");
    expect(view.container.textContent).toContain("Loading listing queries...");
    await flush();

    setSelectValue(findSelectByOptions(view.container, ["listing", "global"]), "listing");
    setSelectValue(
      findSelectByOptions(view.container, ["__no_listing_query__", "query-1"]),
      "query-1"
    );

    expect(latestValue).toMatchObject({
      mode: "listing",
      listingQueryId: "query-1",
    });
    expect(writablePaths(view.container)).toEqual(["mode", "listingQueryId"]);
    expect(view.container.textContent).not.toContain("Search copy");
    expect(view.container.textContent).not.toContain("Search surface");
  } finally {
    view.cleanup();
  }
});

test("SearchBox wizard owns global and route-submit source configuration", async () => {
  const { SearchBoxWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/SearchBoxEditors");

  let latestValue: SearchBoxData = { mode: "global", endpoint: "/api/custom-search" };
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
    expect(writablePaths(view.container)).toEqual([
      "mode",
      "endpoint",
      "sources.pages",
      "sources.entries",
      "sources.posts",
    ]);

    setSelectValue(findSelectByOptions(view.container, ["listing", "global"]), "route-submit");
    setInputValue(findInputByPlaceholder(view.container, "/search"), "/results");
    setInputValue(findInputByPlaceholder(view.container, "q"), "term");

    expect(latestValue).toMatchObject({
      mode: "route-submit",
      targetRoute: "/results",
      queryParam: "term",
    });
  } finally {
    view.cleanup();
  }
});

test("SearchBox visual owns visitor copy, interaction, and surface only", async () => {
  const { SearchBoxVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/SearchBoxEditors");

  let latestValue: SearchBoxData = { mode: "listing" };
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
    setInputValue(findInputByPlaceholder(view.container, "Search"), "Catalog search");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Optional helper text."),
      "Find matching records."
    );
    setInputValue(findInputByPlaceholder(view.container, "Type to search..."), "Search catalog");
    setInputValue(
      Array.from(view.container.querySelectorAll("input")).find(
        (input) => input.placeholder === "Search" && input.value !== "Catalog search"
      ),
      "Run search"
    );
    setSelectValue(findSelectByOptions(view.container, ["full", "compact"]), "compact");
    setCheckboxValue(view.container.querySelector('input[type="checkbox"]'), false);
    setInputValue(findInputByPlaceholder(view.container, "var(--color-bg)"), "#ffffff");

    expect(latestValue).toMatchObject({
      title: "Catalog search",
      description: "Find matching records.",
      placeholder: "Search catalog",
      submitLabel: "Run search",
      displayMode: "compact",
      autoApply: false,
      style: {
        frameBackground: "#ffffff",
      },
    });
    expect(writablePaths(view.container)).toEqual([
      "title",
      "description",
      "placeholder",
      "submitLabel",
      "displayMode",
      "autoApply",
      "style.frameBackground",
      "style.frameBorderColor",
      "style.actionBackground",
    ]);
    expect(view.container.textContent).not.toContain("Search source");
  } finally {
    view.cleanup();
  }
});

test("SearchBox wizard exposes retry for listing query loading errors", async () => {
  const { SearchBoxWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/SearchBoxEditors");

  searchBoxState.error = makeApiClientError("Listing queries failed");

  const Harness = () => {
    const [value, setValue] = useState<SearchBoxData>({
      ...searchBoxDefaults,
      mode: "listing",
    });
    return (
      <SearchBoxWizardEditor
        value={value}
        onChange={setValue}
        variant="default"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Listing queries failed");
    const retryButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Retry")
    );
    expect(retryButton).toBeTruthy();

    searchBoxState.error = null;
    React.act(() => {
      retryButton?.click();
    });
    await flush();

    expect(view.container.textContent).not.toContain("Listing queries failed");
  } finally {
    view.cleanup();
  }
});

test("SearchBox advanced is read-only diagnostics and runtime payload", async () => {
  const { SearchBoxAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/SearchBoxEditors");

  const view = mount(
    <SearchBoxAdvancedEditor
      value={{
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
      }}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Runtime diagnostics");
    expect(view.container.textContent).toContain("Runtime payload");
    expect(view.container.textContent).toContain("Contract summary");
    expect(writablePaths(view.container)).toEqual([]);
    expect(view.container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);

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
