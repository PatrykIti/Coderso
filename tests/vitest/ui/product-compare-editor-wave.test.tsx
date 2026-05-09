// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ProductCompareData } from "../../../core/widgets/core/productCompare";

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
    <input value={value} onChange={onChange} type={type} placeholder={placeholder} {...props} />
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

afterEach(() => {
  vi.restoreAllMocks();
});

test("ProductCompare editors cover source controls, field toggles, label normalization, empty state, and runtime preview", async () => {
  const { ProductCompareAdvancedEditor, ProductCompareVisualEditor, ProductCompareWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductCompareEditors");

  const onChangeSpy = vi.fn();
  let latestValue: ProductCompareData = {
    resolved: {
      rows: [
        {
          id: "product-1",
          title: "Starter Home",
          slug: "starter-home",
          priceAmount: 120000,
          currency: "USD",
          compareAtAmount: 130000,
          stockState: "in_stock",
          stockQuantity: 3,
        },
      ],
      total: 2,
      resolvedAt: "2026-03-08T10:00:00.000Z",
    },
  };

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
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Current limit: 3."));
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved rows: 1 · Total: 2")
    );

    setInputValue(findInputByLabel(view.container, "Limit"), "5");
    setInputValue(findInputByLabel(view.container, "Search"), " starter suite ");
    setInputValue(
      findInputByLabel(view.container, "Collection IDs fallback"),
      "summer, winter, summer"
    );
    setSelectValue(findSelectByLabel(view.container, "Sort field"), "pricing.amount");
    setSelectValue(findSelectByLabel(view.container, "Sort direction"), "desc");

    toggleCheckbox(findInputByLabel(view.container, "published"));
    toggleCheckbox(findInputByLabel(view.container, "archived"));
    toggleCheckbox(findInputByLabel(view.container, "published"));

    toggleCheckbox(findInputByLabel(view.container, "Show compare-at price"));
    toggleCheckbox(findInputByLabel(view.container, "Show stock quantity"));
    toggleCheckbox(findInputByLabel(view.container, "Show slug"));

    setInputValue(findInputByLabel(view.container, "Price"), "");
    setInputValue(findInputByLabel(view.container, "Compare at"), "Was");
    setInputValue(findInputByLabel(view.container, "Stock"), "Inventory");
    setInputValue(findInputByLabel(view.container, "Title"), "Nothing to compare");
    setInputValue(
      findInputByLabel(view.container, "Description"),
      "Adjust filters and publish products."
    );
    setInputValue(findInputByLabel(view.container, "Runtime error flag"), "resolver-timeout");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.source).toEqual({
      limit: 5,
      search: "starter suite",
      collectionIds: ["summer", "winter"],
      status: ["archived"],
      sortField: "pricing.amount",
      sortDir: "desc",
    });
    expect(latestValue.fields).toEqual({
      showCompareAt: false,
      showStockQuantity: false,
      showSlug: true,
    });
    expect(latestValue.labels).toMatchObject({
      price: "Price",
      compareAt: "Was",
      stock: "Inventory",
    });
    expect(latestValue.emptyState).toEqual({
      title: "Nothing to compare",
      description: "Adjust filters and publish products.",
    });
    expect(latestValue.resolved).toMatchObject({
      total: 2,
      resolvedAt: "2026-03-08T10:00:00.000Z",
      error: "resolver-timeout",
    });
    expect(latestValue.resolved?.rows).toHaveLength(1);

    expect(
      (findInputByLabel(view.container, "Price") as HTMLInputElement | null | undefined)?.value
    ).toBe("Price");
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Current limit: 5."));

    const preview = view.container.querySelector("pre");
    expect(preview?.textContent).toContain('"limit": 5');
    expect(preview?.textContent).toContain('"field": "pricing.amount"');
    expect(preview?.textContent).toContain('"dir": "desc"');
    expect(preview?.textContent).toContain('"search": "starter suite"');
    expect(preview?.textContent).toContain('"collectionIds": [');
    expect(preview?.textContent).toContain('"summer"');
    expect(preview?.textContent).toContain('"winter"');
    expect(preview?.textContent).toContain('"status": [');
    expect(preview?.textContent).toContain('"archived"');
    expect(preview?.textContent).not.toContain('"published"');
    expect(
      (findInputByLabel(view.container, "Runtime error flag") as HTMLInputElement | undefined)
        ?.value
    ).toBe("resolver-timeout");
  } finally {
    view.cleanup();
  }
});

test("ProductCompare editors fall back to hardcoded wizard limit and empty runtime counts when normalized data is sparse", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/productCompare", async () => {
    const actual = await vi.importActual<
      typeof import("../../../core/widgets/core/productCompare")
    >("../../../core/widgets/core/productCompare");

    return {
      ...actual,
      productCompareDefaults: {
        ...actual.productCompareDefaults,
        source: undefined,
      },
    };
  });

  const { ProductCompareAdvancedEditor, ProductCompareWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductCompareEditors");

  const view = mount(
    <>
      <ProductCompareWizardEditor
        value={{}}
        onChange={() => undefined}
        variant="matrix"
        onVariantChange={() => undefined}
      />
      <ProductCompareAdvancedEditor
        value={{}}
        onChange={() => undefined}
        variant="matrix"
        onVariantChange={() => undefined}
      />
    </>
  );

  try {
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Current limit: 3."));
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved rows: 0 · Total: 0")
    );
    expect(
      (
        findInputByLabel(view.container, "Runtime error flag") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("");
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/widgets/core/productCompare");
    vi.resetModules();
  }
});

test("ProductCompare advanced editor falls back when normalized resolved summary is sparse", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/productCompare", async () => {
    const actual = await vi.importActual<
      typeof import("../../../core/widgets/core/productCompare")
    >("../../../core/widgets/core/productCompare");

    return {
      ...actual,
      normalizeProductCompareData: (value: ProductCompareData) => ({
        ...actual.normalizeProductCompareData(value),
        resolved: {
          resolvedAt: "",
          error: "",
        } as ProductCompareData["resolved"],
      }),
    };
  });

  const { ProductCompareAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductCompareEditors");

  const view = mount(
    <ProductCompareAdvancedEditor value={{}} onChange={() => undefined} variant="matrix" />
  );

  try {
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved rows: 0 · Total: 0")
    );
    expect(
      (
        findInputByLabel(view.container, "Runtime error flag") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("");
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/widgets/core/productCompare");
    vi.resetModules();
  }
});
