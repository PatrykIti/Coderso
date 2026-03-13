// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ProductTableData } from "../../../core/widgets/core/productTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    type,
    placeholder,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    rows,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
    [key: string]: unknown;
  }) => <textarea value={value} onChange={onChange} rows={rows} {...props} />,
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

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const setInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const toggleCheckbox = (element: Element | undefined) => {
  if (!(element instanceof HTMLInputElement)) return;
  act(() => {
    element.click();
  });
};

const findLabeledField = (
  container: ParentNode,
  text: string,
  selector: "input" | "select" | "textarea"
) =>
  Array.from(container.querySelectorAll("label"))
    .find((label) => normalizeText(label.textContent).startsWith(normalizeText(text)))
    ?.querySelector(selector);

const findInputByLabel = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("input")).find((element) =>
    normalizeText(element.closest("label")?.textContent).startsWith(normalizeText(text))
  );

const findSelectByLabel = (container: ParentNode, text: string) =>
  findLabeledField(container, text, "select");

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("ProductTable editors cover source controls, column toggles, label normalization, empty state, and runtime preview", async () => {
  const {
    ProductTableAdvancedEditor,
    ProductTableVisualEditor,
    ProductTableWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/ProductTableEditors");

  const onChangeSpy = vi.fn();
  let latestValue: ProductTableData = {
    resolved: {
      items: [
        {
          id: " product-1 ",
          title: " Starter Home ",
          slug: " starter-home ",
          excerpt: " model home ",
          status: "published",
          pricing: {
            amount: 120000,
            currency: " usd ",
            compareAtAmount: Number.NaN,
          },
          stock: {
            state: "in_stock",
            quantity: 3.8,
            inStock: true,
          },
          primaryMediaId: " ",
          mediaIds: ["hero", " ", "gallery"],
          collectionIds: ["summer", " ", "sale"],
        },
      ],
      total: -2,
      resolvedAt: " 2026-03-09T12:00:00.000Z ",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<ProductTableData>(latestValue);

    const handleChange = (next: ProductTableData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    return (
      <>
        <ProductTableWizardEditor
          value={value}
          onChange={handleChange}
          variant="default"
          onVariantChange={() => undefined}
        />
        <ProductTableVisualEditor
          value={value}
          onChange={handleChange}
          variant="default"
          onVariantChange={() => undefined}
        />
        <ProductTableAdvancedEditor
          value={value}
          onChange={handleChange}
          variant="default"
          onVariantChange={() => undefined}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Table source"));
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved items: 1 · Total: 0")
    );
    expect(
      (findInputByLabel(view.container, "Limit") as HTMLInputElement | undefined)?.value
    ).toBe("12");
    expect(
      (findSelectByLabel(view.container, "Sort field") as HTMLSelectElement | undefined)?.value
    ).toBe("updatedAt");
    expect(
      (
        findSelectByLabel(view.container, "Sort direction") as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("desc");
    expect(
      (findInputByLabel(view.container, "Show slug") as HTMLInputElement | undefined)?.checked
    ).toBe(true);
    expect(
      (
        findInputByLabel(view.container, "Show compare-at price") as
          | HTMLInputElement
          | undefined
      )?.checked
    ).toBe(false);

    setInputValue(findInputByLabel(view.container, "Limit"), "52");
    setInputValue(findInputByLabel(view.container, "Search"), " starter suite ");
    setInputValue(
      findInputByLabel(view.container, "Collection IDs (comma separated)"),
      "summer, winter, summer"
    );
    setSelectValue(findSelectByLabel(view.container, "Sort field"), "pricing.amount");
    setSelectValue(findSelectByLabel(view.container, "Sort direction"), "asc");
    toggleCheckbox(findInputByLabel(view.container, "published"));
    toggleCheckbox(findInputByLabel(view.container, "archived"));
    toggleCheckbox(findInputByLabel(view.container, "published"));

    toggleCheckbox(findInputByLabel(view.container, "Show slug"));
    toggleCheckbox(findInputByLabel(view.container, "Show status"));
    toggleCheckbox(findInputByLabel(view.container, "Show stock"));
    toggleCheckbox(findInputByLabel(view.container, "Show compare-at price"));
    toggleCheckbox(findInputByLabel(view.container, "Show collection count"));

    setInputValue(findInputByLabel(view.container, "Product"), "Catalog item");
    setInputValue(findInputByLabel(view.container, "Price"), "");
    setInputValue(findInputByLabel(view.container, "Status"), "Availability");
    setInputValue(findInputByLabel(view.container, "Title"), "Nothing to list");
    setInputValue(
      findInputByLabel(view.container, "Description"),
      "Adjust source filters or publish products."
    );
    setInputValue(findInputByLabel(view.container, "Runtime error flag"), "resolver-timeout");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.source).toEqual({
      limit: 48,
      search: "starter suite",
      collectionIds: ["summer", "winter"],
      status: ["archived"],
      sortField: "pricing.amount",
      sortDir: "asc",
    });
    expect(latestValue.fields).toEqual({
      showSlug: false,
      showStatus: false,
      showStock: false,
      showCompareAt: true,
      showCollectionCount: true,
    });
    expect(latestValue.labels).toMatchObject({
      title: "Catalog item",
      price: "Price",
      status: "Availability",
    });
    expect(latestValue.emptyState).toEqual({
      title: "Nothing to list",
      description: "Adjust source filters or publish products.",
    });
    expect(latestValue.resolved).toMatchObject({
      total: 0,
      resolvedAt: "2026-03-09T12:00:00.000Z",
      error: "resolver-timeout",
    });
    expect(latestValue.resolved?.items).toHaveLength(1);
    expect(latestValue.resolved?.items?.[0]).toMatchObject({
      id: "product-1",
      title: "Starter Home",
      slug: "starter-home",
      excerpt: "model home",
      pricing: {
        amount: 120000,
        compareAtAmount: null,
      },
      stock: {
        state: "in_stock",
        quantity: 3,
        inStock: true,
      },
      primaryMediaId: null,
      mediaIds: ["hero", "gallery"],
      collectionIds: ["summer", "sale"],
    });
    expect(
      (
        findInputByLabel(view.container, "Show compare-at price") as
          | HTMLInputElement
          | undefined
      )?.checked
    ).toBe(true);
    expect(
      (findInputByLabel(view.container, "Show slug") as HTMLInputElement | undefined)?.checked
    ).toBe(false);
    expect(
      (
        findInputByLabel(view.container, "Runtime error flag") as
          | HTMLInputElement
          | undefined
      )?.value
    ).toBe("resolver-timeout");

    const preview = view.container.querySelector("pre");
    expect(preview?.textContent).toContain('"limit": 48');
    expect(preview?.textContent).toContain('"field": "pricing.amount"');
    expect(preview?.textContent).toContain('"dir": "asc"');
    expect(preview?.textContent).toContain('"search": "starter suite"');
    expect(preview?.textContent).toContain('"collectionIds": [');
    expect(preview?.textContent).toContain('"summer"');
    expect(preview?.textContent).toContain('"winter"');
    expect(preview?.textContent).toContain('"status": [');
    expect(preview?.textContent).toContain('"archived"');
    expect(preview?.textContent).not.toContain('"published"');
  } finally {
    view.cleanup();
  }
});

test("ProductTable editors fall back to hardcoded wizard limit and empty runtime counts when normalized data is sparse", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/productTable", async () => {
    const actual = await vi.importActual<
      typeof import("../../../core/widgets/core/productTable")
    >("../../../core/widgets/core/productTable");

    return {
      ...actual,
      productTableDefaults: {
        ...actual.productTableDefaults,
        source: undefined,
      },
    };
  });

  const {
    ProductTableAdvancedEditor,
    ProductTableWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/ProductTableEditors");

  const view = mount(
    <>
      <ProductTableWizardEditor
        value={{}}
        onChange={() => undefined}
        variant="default"
        onVariantChange={() => undefined}
      />
      <ProductTableAdvancedEditor
        value={{}}
        onChange={() => undefined}
        variant="default"
        onVariantChange={() => undefined}
      />
    </>
  );

  try {
    expect(
      (findInputByLabel(view.container, "Limit") as HTMLInputElement | undefined)?.value
    ).toBe("12");
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved items: 0 · Total: 0")
    );
    expect(
      (findInputByLabel(view.container, "Runtime error flag") as HTMLInputElement | undefined)?.value
    ).toBe("");
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/widgets/core/productTable");
    vi.resetModules();
  }
});

test("ProductTable visual and advanced editors honor explicit toggle states and sparse runtime fallbacks", async () => {
  const { ProductTableAdvancedEditor, ProductTableVisualEditor } = await import(
    "../../../core/admin/ui/widgets/editors/ProductTableEditors"
  );

  const visualView = mount(
    <ProductTableVisualEditor
      value={{
        fields: {
          showSlug: false,
          showStatus: false,
          showStock: false,
          showCompareAt: true,
          showCollectionCount: true,
        },
      }}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );

  try {
    expect((findInputByLabel(visualView.container, "Show slug") as HTMLInputElement | undefined)?.checked).toBe(
      false
    );
    expect((findInputByLabel(visualView.container, "Show status") as HTMLInputElement | undefined)?.checked).toBe(
      false
    );
    expect((findInputByLabel(visualView.container, "Show stock") as HTMLInputElement | undefined)?.checked).toBe(
      false
    );
    expect(
      (findInputByLabel(visualView.container, "Show compare-at price") as
        | HTMLInputElement
        | undefined)?.checked
    ).toBe(true);
    expect(
      (findInputByLabel(visualView.container, "Show collection count") as
        | HTMLInputElement
        | undefined)?.checked
    ).toBe(true);
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <ProductTableAdvancedEditor
      value={{}}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );

  try {
    expect(normalizeText(advancedView.container.textContent)).toContain(
      normalizeText("Resolved items: 0 · Total: 0")
    );
    expect(
      (findInputByLabel(advancedView.container, "Runtime error flag") as
        | HTMLInputElement
        | undefined)?.value
    ).toBe("");
  } finally {
    advancedView.cleanup();
  }
});

test("ProductTable editors restore default labels and empty state when fields are cleared and drop blank runtime errors", async () => {
  const {
    ProductTableAdvancedEditor,
    ProductTableVisualEditor,
    ProductTableWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/ProductTableEditors");

  let latestValue: ProductTableData = {
    source: {
      limit: 4,
      search: "featured",
      collectionIds: ["sale"],
      status: ["published"],
      sortField: "title",
      sortDir: "desc",
    },
    fields: {
      showSlug: false,
      showStatus: false,
      showStock: false,
      showCompareAt: true,
      showCollectionCount: true,
    },
    labels: {
      title: "Table product",
      price: "Retail",
      status: "Lifecycle",
    },
    emptyState: {
      title: "Nothing here",
      description: "Update source filters.",
    },
    resolved: {
      items: [],
      total: 0,
      resolvedAt: "2026-03-09T13:00:00.000Z",
      error: "stale-preview",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<ProductTableData>(latestValue);

    const handleChange = (next: ProductTableData) => {
      latestValue = next;
      setValue(next);
    };

    return (
      <>
        <ProductTableWizardEditor
          value={value}
          onChange={handleChange}
          variant="default"
          onVariantChange={() => undefined}
        />
        <ProductTableVisualEditor
          value={value}
          onChange={handleChange}
          variant="default"
          onVariantChange={() => undefined}
        />
        <ProductTableAdvancedEditor
          value={value}
          onChange={handleChange}
          variant="default"
          onVariantChange={() => undefined}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect(
      (findInputByLabel(view.container, "Show slug") as HTMLInputElement | undefined)?.checked
    ).toBe(false);
    expect(
      (
        findInputByLabel(view.container, "Show compare-at price") as
          | HTMLInputElement
          | undefined
      )?.checked
    ).toBe(true);
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved items: 0 · Total: 0")
    );

    setInputValue(findInputByLabel(view.container, "Product"), "   ");
    setInputValue(findInputByLabel(view.container, "Price"), "");
    setInputValue(findInputByLabel(view.container, "Status"), " ");
    setInputValue(findInputByLabel(view.container, "Title"), " ");
    setInputValue(findInputByLabel(view.container, "Description"), " ");
    setInputValue(findInputByLabel(view.container, "Runtime error flag"), " ");

    expect(latestValue.labels).toMatchObject({
      title: "Product",
      price: "Price",
      status: "Status",
    });
    expect(latestValue.emptyState).toEqual({
      title: "No products available",
      description: "Publish products or adjust source query.",
    });
    expect(latestValue.resolved).toMatchObject({
      items: [],
      total: 0,
      resolvedAt: "2026-03-09T13:00:00.000Z",
    });
    expect(latestValue.resolved).not.toHaveProperty("error");

    expect(
      (findInputByLabel(view.container, "Product") as HTMLInputElement | undefined)?.value
    ).toBe("Product");
    expect(
      (findInputByLabel(view.container, "Price") as HTMLInputElement | undefined)?.value
    ).toBe("Price");
    expect(
      (findInputByLabel(view.container, "Status") as HTMLInputElement | undefined)?.value
    ).toBe("Status");
    expect(
      (findInputByLabel(view.container, "Title") as HTMLInputElement | undefined)?.value
    ).toBe("No products available");
    expect(
      (findInputByLabel(view.container, "Description") as HTMLInputElement | undefined)?.value
    ).toBe("Publish products or adjust source query.");
    expect(
      (
        findInputByLabel(view.container, "Runtime error flag") as
          | HTMLInputElement
          | undefined
      )?.value
    ).toBe("");

    const preview = view.container.querySelector("pre");
    expect(preview?.textContent).toContain('"limit": 4');
    expect(preview?.textContent).toContain('"field": "title"');
    expect(preview?.textContent).toContain('"dir": "desc"');
    expect(preview?.textContent).toContain('"search": "featured"');
    expect(preview?.textContent).toContain('"published"');
  } finally {
    view.cleanup();
  }
});

test("ProductTable advanced editor falls back when normalized resolved summary is sparse", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/productTable", async () => {
    const actual = await vi.importActual<
      typeof import("../../../core/widgets/core/productTable")
    >("../../../core/widgets/core/productTable");

    return {
      ...actual,
      normalizeProductTableData: (value: ProductTableData) => ({
        ...actual.normalizeProductTableData(value),
        resolved: {
          resolvedAt: "",
          error: "",
        } as ProductTableData["resolved"],
      }),
    };
  });

  const { ProductTableAdvancedEditor } = await import(
    "../../../core/admin/ui/widgets/editors/ProductTableEditors"
  );

  const view = mount(
    <ProductTableAdvancedEditor value={{}} onChange={() => undefined} variant="default" />
  );

  try {
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved items: 0 · Total: 0")
    );
    expect(
      (findInputByLabel(view.container, "Runtime error flag") as HTMLInputElement | undefined)?.value
    ).toBe("");
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/widgets/core/productTable");
    vi.resetModules();
  }
});
