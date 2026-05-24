// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ProductCompareData } from "../../../core/widgets/core/productCompare";
import type { WidgetEditorContext } from "../../../core/widgets/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const productComparePreviewState = {
  calls: [] as ProductCompareData[],
  response: {
    rows: [
      {
        id: "product-1",
        title: "Starter Home",
        slug: "starter-home",
        excerpt: "Compact modern home.",
        productHref: "/products/starter-home",
        imageUrl: "/media/starter-home.jpg",
        imageAlt: "Starter Home hero",
        priceAmount: 120000,
        currency: "USD",
        compareAtAmount: null,
        stockState: "in_stock" as const,
        stockQuantity: 3,
      },
    ],
    total: 1,
    resolvedAt: "2026-05-19T12:00:00.000Z",
  },
  reset() {
    this.calls = [];
  },
};

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    type,
    placeholder,
    min,
    max,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    min?: number;
    max?: number;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      min={min}
      max={max}
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

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    children?: React.ReactNode;
  }) => (
    <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/services/commerceClient", () => ({
  listCommerceCollectionsCached: vi.fn(async () => []),
  listCommerceProductsCached: vi.fn(async () => [
    {
      id: "product-1",
      title: "Starter Home",
      slug: "starter-home",
      status: "published",
      excerpt: null,
      description: null,
      pricing: { amount: 120000, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: 3 },
      collectionIds: [],
      mediaIds: [],
      variants: [],
      metadata: {},
      data: {},
      createdAt: "2026-05-19T12:00:00.000Z",
      updatedAt: "2026-05-19T12:00:00.000Z",
      publishedAt: "2026-05-19T12:00:00.000Z",
    },
    {
      id: "product-3",
      title: "Family Home",
      slug: "family-home",
      status: "published",
      excerpt: null,
      description: null,
      pricing: { amount: 240000, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: 5 },
      collectionIds: [],
      mediaIds: [],
      variants: [],
      metadata: {},
      data: {},
      createdAt: "2026-05-19T12:00:00.000Z",
      updatedAt: "2026-05-19T12:00:00.000Z",
      publishedAt: "2026-05-19T12:00:00.000Z",
    },
  ]),
}));

vi.mock("@/services/productComparePreviewClient", () => ({
  previewProductCompare: vi.fn(async (input: ProductCompareData) => {
    productComparePreviewState.calls.push(input);
    return productComparePreviewState.response;
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

const toggleCheckbox = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLInputElement)) return;
  React.act(() => {
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

const findSelectByOption = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("select")).find((element) =>
    normalizeText(element.textContent).includes(normalizeText(text))
  );

afterEach(() => {
  productComparePreviewState.reset();
  vi.restoreAllMocks();
});

test("ProductCompare wizard editor no longer owns advanced surfaces", async () => {
  const { ProductCompareWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductCompareEditors");

  const view = mount(
    <ProductCompareWizardEditor
      value={{}}
      onChange={() => undefined}
      variant="matrix"
      onVariantChange={() => undefined}
    />
  );

  try {
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Comparison source"));
    expect(normalizeText(view.container.textContent)).not.toContain(
      normalizeText("Table background")
    );
  } finally {
    view.cleanup();
  }
});

test("ProductCompare editors preserve selected product ids and expose all visual controls", async () => {
  const { ProductCompareAdvancedEditor, ProductCompareVisualEditor, ProductCompareWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductCompareEditors");

  const onChangeSpy = vi.fn();
  let latestValue: ProductCompareData = {};

  const Harness = () => {
    const [value, setValue] = useState<ProductCompareData>(latestValue);

    const handleChange = (next: ProductCompareData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    return (
      <>
        <ProductCompareWizardEditor
          value={value}
          onChange={handleChange}
          variant="matrix"
          onVariantChange={() => undefined}
        />
        <ProductCompareVisualEditor
          value={value}
          onChange={handleChange}
          variant="matrix"
          onVariantChange={() => undefined}
        />
        <ProductCompareAdvancedEditor
          value={value}
          onChange={handleChange}
          variant="matrix"
          onVariantChange={() => undefined}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect((findInputByLabel(view.container, "Limit") as HTMLInputElement | undefined)?.max).toBe(
      "12"
    );
    expect(
      (findInputByLabel(view.container, "Search") as HTMLInputElement | undefined)?.placeholder
    ).toBe("product title or slug");

    await flush();
    toggleCheckbox(findInputByLabel(view.container, "Family Home"));
    toggleCheckbox(findInputByLabel(view.container, "Starter Home"));
    setInputValue(findInputByLabel(view.container, "Limit"), "8");
    setInputValue(findInputByLabel(view.container, "Search"), " starter suite ");
    setSelectValue(findSelectByLabel(view.container, "Sort field"), "pricing.amount");
    setSelectValue(findSelectByLabel(view.container, "Sort direction"), "desc");

    toggleCheckbox(findInputByLabel(view.container, "Show price"));
    toggleCheckbox(findInputByLabel(view.container, "Show slug"));
    toggleCheckbox(findInputByLabel(view.container, "Show excerpt"));

    setInputValue(findInputByLabel(view.container, "Attribute column"), "Feature");
    setInputValue(findInputByLabel(view.container, "Quantity"), "Inventory");
    setInputValue(findInputByLabel(view.container, "Slug"), "Path");
    setInputValue(findInputByLabel(view.container, "Excerpt"), "Summary");
    setInputValue(findInputByLabel(view.container, "Backorder label"), "Ships soon");
    setSelectValue(findSelectByLabel(view.container, "CTA mode"), "view_product");
    setInputValue(findInputByLabel(view.container, "CTA label"), "Learn more");
    setSelectValue(findSelectByLabel(view.container, "Money locale"), "pl-PL");
    setSelectValue(findSelectByLabel(view.container, "Quantity display"), "compact");
    setInputValue(findInputByLabel(view.container, "Compact quantity limit"), "25");
    setSelectValue(findSelectByOption(view.container, "Starter Home"), "product-1");
    toggleCheckbox(findInputByLabel(view.container, "Sticky table header"));
    setInputValue(findInputByLabel(view.container, "Title"), "Compare our homes");
    setInputValue(findInputByLabel(view.container, "Description"), "Quick side-by-side overview.");
    setInputValue(findInputByLabel(view.container, "Table caption"), "Home comparison table");
    toggleCheckbox(findInputByLabel(view.container, "Hide caption visually"));

    expect(latestValue.source?.productIds).toEqual(["product-3", "product-1"]);
    expect(latestValue.source?.limit).toBe(8);
    expect(latestValue.source?.search).toBe("starter suite");
    expect(latestValue.source?.collectionIds).toEqual([]);
    expect(latestValue.rows?.find((row) => row.key === "price")?.visible).toBe(false);
    expect(latestValue.rows?.find((row) => row.key === "slug")?.visible).toBe(true);
    expect(latestValue.rows?.find((row) => row.key === "excerpt")?.visible).toBe(true);
    expect(latestValue.labels?.attributeHeader).toBe("Feature");
    expect(latestValue.labels?.quantity).toBe("Inventory");
    expect(latestValue.labels?.slug).toBe("Path");
    expect(latestValue.labels?.excerpt).toBe("Summary");
    expect(latestValue.labels?.backorder).toBe("Ships soon");
    expect(latestValue.header?.ctaMode).toBe("view_product");
    expect(latestValue.header?.ctaLabel).toBe("Learn more");
    expect(latestValue.format?.moneyLocale).toBe("pl-PL");
    expect(latestValue.format?.quantityDisplay).toBe("compact");
    expect(latestValue.format?.quantityCompactLimit).toBe(25);
    expect(latestValue.layout?.featuredProductId).toBe("product-1");
    expect(latestValue.layout?.stickyHeader).toBe(true);
    expect(latestValue.section?.title).toBe("Compare our homes");
    expect(latestValue.section?.description).toBe("Quick side-by-side overview.");
    expect(latestValue.section?.caption).toBe("Home comparison table");
    expect(latestValue.section?.hideCaption).toBe(false);
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText(
        "Product links and CTAs use the enabled products detail route from Site Settings."
      )
    );
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("can be hard to read on mobile")
    );
  } finally {
    view.cleanup();
  }
});

test("ProductCompare preview sync pushes transient preview state from the active editor mode", async () => {
  const { ProductCompareVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductCompareEditors");
  const setPreviewState = vi.fn();

  const context: WidgetEditorContext = {
    surface: "page-builder",
    editorMode: "visual",
    setPreviewState,
    previewState: null,
  };

  const view = mount(
    <ProductCompareVisualEditor
      value={{
        source: {
          limit: 3,
          productIds: ["product-1"],
        },
      }}
      onChange={() => undefined}
      variant="matrix"
      onVariantChange={() => undefined}
      context={context}
    />
  );

  try {
    await flush();
    expect(productComparePreviewState.calls).toHaveLength(1);
    expect(setPreviewState).toHaveBeenCalledWith({ status: "loading" });
    expect(setPreviewState).toHaveBeenLastCalledWith({
      status: "ready",
      dataPatch: {
        resolved: productComparePreviewState.response,
      },
    });
  } finally {
    view.cleanup();
  }
});

test("ProductCompare advanced editor keeps runtime diagnostics read-only and exposes refresh", async () => {
  const { ProductCompareAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductCompareEditors");

  const context: WidgetEditorContext = {
    surface: "page-builder",
    editorMode: "advanced",
    setPreviewState: () => undefined,
    previewState: {
      status: "ready",
      dataPatch: {
        resolved: {
          rows: productComparePreviewState.response.rows,
          total: 1,
          resolvedAt: "2026-05-19T12:00:00.000Z",
          error: "commerce_runtime_warning",
        },
      },
    },
  };

  const view = mount(
    <ProductCompareAdvancedEditor
      value={{}}
      onChange={() => undefined}
      variant="matrix"
      onVariantChange={() => undefined}
      context={context}
    />
  );

  try {
    expect(findInputByLabel(view.container, "Runtime error flag")).toBeUndefined();
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Refresh preview"));
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Runtime warning: commerce_runtime_warning")
    );
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Show raw query JSON")
    );
  } finally {
    view.cleanup();
  }
});
