// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type {
  ProductTableData,
  ProductTableVariantId,
} from "../../../core/widgets/core/productTable";
import type { WidgetPreviewState } from "../../../core/widgets/types";

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
  listCommerceCollectionsCached: vi.fn(async () => [
    { id: "summer", name: "Summer", slug: "summer" },
    { id: "winter", name: "Winter", slug: "winter" },
  ]),
  listCommerceProductsCached: vi.fn(async () => []),
}));

const previewQueue = vi.hoisted(() => {
  const queue: Array<{
    promise: Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];

  return {
    push() {
      let resolve!: (value: unknown) => void;
      let reject!: (error: unknown) => void;
      const promise = new Promise((resolver, rejecter) => {
        resolve = resolver;
        reject = rejecter;
      });
      queue.push({ promise, resolve, reject });
      return queue[queue.length - 1];
    },
    shift() {
      return queue.shift() ?? null;
    },
    clear() {
      queue.splice(0, queue.length);
    },
  };
});

const previewRequestState = vi.hoisted(() => ({
  calls: [] as ProductTableData[],
  reset() {
    this.calls = [];
  },
}));

const previewProductTableMock = vi.hoisted(() =>
  vi.fn(async (input: ProductTableData) => {
    previewRequestState.calls.push(input);
    const next = previewQueue.shift();
    if (!next) {
      return {
        items: [],
        total: 0,
        resolvedAt: "2026-05-21T12:00:00.000Z",
      };
    }
    return next.promise;
  })
);

vi.mock("@/services/productTablePreviewClient", () => ({
  previewProductTable: previewProductTableMock,
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

const flushPromises = async () => {
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

const toggleCheckbox = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLInputElement)) return;
  React.act(() => {
    element.click();
  });
};

const clickButton = (container: ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((element) =>
    normalizeText(element.textContent).includes(normalizeText(label))
  );
  if (!(button instanceof HTMLButtonElement)) return;
  React.act(() => {
    button.click();
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

const findTextareaByLabel = (container: ParentNode, text: string) =>
  findLabeledField(container, text, "textarea");

const requirePreviewState = (state: WidgetPreviewState | null) => {
  if (!state) throw new Error("expected preview state");
  return state;
};

afterEach(() => {
  document.body.innerHTML = "";
  previewQueue.clear();
  previewRequestState.reset();
  previewProductTableMock.mockClear();
  vi.restoreAllMocks();
});

test("ProductTable editors normalize source, layout styles, export/currency controls, section header, full column registry, labels, and read-only preview diagnostics", async () => {
  const { ProductTableAdvancedEditor, ProductTableVisualEditor, ProductTableWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductTableEditors");

  let latestVariant: ProductTableVariantId = "default";
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
          productHref: null,
          media: {
            url: " /media/starter-home.jpg ",
            alt: " ",
            width: 640.8,
            height: -2,
          },
        },
      ],
      total: -2,
      resolvedAt: " 2026-03-09T12:00:00.000Z ",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<ProductTableData>(latestValue);
    const [variant, setVariant] = useState<ProductTableVariantId>(latestVariant);

    return (
      <>
        <ProductTableWizardEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            latestVariant = next as ProductTableVariantId;
            setVariant(next as ProductTableVariantId);
          }}
        />
        <ProductTableVisualEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            latestVariant = next as ProductTableVariantId;
            setVariant(next as ProductTableVariantId);
          }}
        />
        <ProductTableAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            latestVariant = next as ProductTableVariantId;
            setVariant(next as ProductTableVariantId);
          }}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flushPromises();

    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Table source"));
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved items: 1 · Total: 0")
    );
    expect(findInputByLabel(view.container, "Runtime error flag")).toBeUndefined();
    expect(findSelectByLabel(view.container, "Table variant")).toBeInstanceOf(HTMLSelectElement);
    expect(findSelectByLabel(view.container, "Row density")).toBeInstanceOf(HTMLSelectElement);
    expect(findSelectByLabel(view.container, "Row treatment")).toBeInstanceOf(HTMLSelectElement);
    expect(findInputByLabel(view.container, "Show row hover")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Use sticky header")).toBeInstanceOf(HTMLInputElement);
    expect(findSelectByLabel(view.container, "Table max width")).toBeInstanceOf(HTMLSelectElement);
    expect(findSelectByLabel(view.container, "Table alignment")).toBeInstanceOf(HTMLSelectElement);
    expect(findSelectByLabel(view.container, "Typography")).toBeInstanceOf(HTMLSelectElement);
    expect(findInputByLabel(view.container, "Section eyebrow")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Section title")).toBeInstanceOf(HTMLInputElement);
    expect(findTextareaByLabel(view.container, "Section description")).toBeInstanceOf(
      HTMLTextAreaElement
    );
    expect(findInputByLabel(view.container, "Show image")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Show product")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Show excerpt")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Show price")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Show stock quantity")).toBeInstanceOf(
      HTMLInputElement
    );
    expect(findInputByLabel(view.container, "Show search input")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Show collection filter")).toBeInstanceOf(
      HTMLInputElement
    );
    expect(findInputByLabel(view.container, "Show status filter")).toBeInstanceOf(HTMLInputElement);
    expect(findSelectByLabel(view.container, "Sorting UI")).toBeInstanceOf(HTMLSelectElement);
    expect(findSelectByLabel(view.container, "Pagination mode")).toBeInstanceOf(HTMLSelectElement);
    expect(findSelectByLabel(view.container, "Money locale")).toBeInstanceOf(HTMLSelectElement);
    expect(findSelectByLabel(view.container, "Currency display")).toBeInstanceOf(HTMLSelectElement);
    expect(findInputByLabel(view.container, "Show CSV export")).toBeInstanceOf(HTMLInputElement);
    expect(findSelectByLabel(view.container, "Linked column")).toBeInstanceOf(HTMLSelectElement);
    expect(findInputByLabel(view.container, "Image")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Slug")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Excerpt")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Compare at")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Stock")).toBeInstanceOf(HTMLInputElement);
    expect(findInputByLabel(view.container, "Collections")).toBeInstanceOf(HTMLInputElement);
    expect(
      (findInputByLabel(view.container, "Limit") as HTMLInputElement | null | undefined)?.value
    ).toBe("12");
    expect(
      (findSelectByLabel(view.container, "Sort field") as HTMLSelectElement | null | undefined)
        ?.value
    ).toBe("updatedAt");

    setSelectValue(findSelectByLabel(view.container, "Table variant"), "compact");
    setSelectValue(findSelectByLabel(view.container, "Row density"), "spacious");
    setSelectValue(findSelectByLabel(view.container, "Row treatment"), "striped");
    toggleCheckbox(findInputByLabel(view.container, "Show row hover"));
    toggleCheckbox(findInputByLabel(view.container, "Use sticky header"));
    setSelectValue(findSelectByLabel(view.container, "Table max width"), "wide");
    setSelectValue(findSelectByLabel(view.container, "Table alignment"), "center");
    setSelectValue(findSelectByLabel(view.container, "Typography"), "prominent");

    setInputValue(findInputByLabel(view.container, "Limit"), "52");
    setInputValue(findInputByLabel(view.container, "Search"), " starter suite ");
    setInputValue(findInputByLabel(view.container, "Section eyebrow"), " Featured catalog ");
    setInputValue(findInputByLabel(view.container, "Section title"), " Summer release ");
    setTextareaValue(
      findTextareaByLabel(view.container, "Section description"),
      " Curated context copy. "
    );
    expect(findInputByLabel(view.container, "Collection IDs fallback")).toBeUndefined();
    expect(view.container.textContent).toContain(
      "Manual collection keys are support-owned and hidden from setup."
    );
    toggleCheckbox(findInputByLabel(view.container, "Summer"));
    toggleCheckbox(findInputByLabel(view.container, "Winter"));
    setSelectValue(findSelectByLabel(view.container, "Sort field"), "pricing.amount");
    setSelectValue(findSelectByLabel(view.container, "Sort direction"), "asc");
    toggleCheckbox(findInputByLabel(view.container, "published"));
    toggleCheckbox(findInputByLabel(view.container, "archived"));
    toggleCheckbox(findInputByLabel(view.container, "published"));

    toggleCheckbox(findInputByLabel(view.container, "Show image"));
    toggleCheckbox(findInputByLabel(view.container, "Show product"));
    toggleCheckbox(findInputByLabel(view.container, "Show excerpt"));
    toggleCheckbox(findInputByLabel(view.container, "Show compare-at price"));
    toggleCheckbox(findInputByLabel(view.container, "Show price"));
    toggleCheckbox(findInputByLabel(view.container, "Show stock quantity"));
    toggleCheckbox(findInputByLabel(view.container, "Show status"));
    toggleCheckbox(findInputByLabel(view.container, "Show stock"));
    expect(findInputByLabel(view.container, "Show stock quantity")).toBeUndefined();
    toggleCheckbox(findInputByLabel(view.container, "Show collection count"));
    toggleCheckbox(findInputByLabel(view.container, "Show search input"));
    toggleCheckbox(findInputByLabel(view.container, "Show collection filter"));
    toggleCheckbox(findInputByLabel(view.container, "Show status filter"));
    setSelectValue(findSelectByLabel(view.container, "Sorting UI"), "interactive");
    setSelectValue(findSelectByLabel(view.container, "Pagination mode"), "paged");
    setInputValue(findInputByLabel(view.container, "Page size"), "7");
    setSelectValue(findSelectByLabel(view.container, "Money locale"), "pl-PL");
    setSelectValue(findSelectByLabel(view.container, "Currency display"), "code");
    toggleCheckbox(findInputByLabel(view.container, "Show CSV export"));
    setInputValue(findInputByLabel(view.container, "Export label"), "Download rows");
    setSelectValue(findSelectByLabel(view.container, "Linked column"), "slug");
    toggleCheckbox(findInputByLabel(view.container, "Show action column"));
    setInputValue(findInputByLabel(view.container, "Action label"), "Learn more");
    toggleCheckbox(findInputByLabel(view.container, "Open product links in new tab"));

    setInputValue(findInputByLabel(view.container, "Image"), "");
    setInputValue(findInputByLabel(view.container, "Product"), "Catalog item");
    setInputValue(findInputByLabel(view.container, "Excerpt"), "Summary");
    setInputValue(findInputByLabel(view.container, "Slug"), "Handle");
    setInputValue(findInputByLabel(view.container, "Price"), "");
    setInputValue(findInputByLabel(view.container, "Compare at"), "Was price");
    setInputValue(findInputByLabel(view.container, "Status"), "Availability");
    setInputValue(findInputByLabel(view.container, "Stock"), "Inventory");
    setInputValue(findInputByLabel(view.container, "Collections"), "Groups");
    setInputValue(findInputByLabel(view.container, "Title"), "Nothing to list");
    setInputValue(
      findInputByLabel(view.container, "Description"),
      "Adjust source filters or publish products."
    );

    expect(latestVariant).toBe("compact");
    expect(latestValue.style).toEqual({
      density: "spacious",
      rowTreatment: "striped",
      hoverRows: true,
      stickyHeader: true,
      maxWidth: "wide",
      align: "center",
      typography: "prominent",
    });
    expect(latestValue.source).toEqual({
      limit: 48,
      search: "starter suite",
      collectionIds: ["summer", "winter"],
      status: ["archived"],
      sortField: "pricing.amount",
      sortDir: "asc",
    });
    expect(latestValue.header).toMatchObject({
      eyebrow: "Featured catalog",
      title: "Summer release",
      description: "Curated context copy.",
    });
    expect(latestValue.fields).toEqual({
      showImage: true,
      showTitle: false,
      showExcerpt: true,
      showSlug: true,
      showPrice: false,
      showStatus: false,
      showStock: false,
      showStockQuantity: false,
      showCompareAt: true,
      showCollectionCount: true,
    });
    expect(latestValue.labels).toMatchObject({
      image: "Image",
      title: "Catalog item",
      excerpt: "Summary",
      slug: "Handle",
      price: "Price",
      compareAt: "Was price",
      status: "Availability",
      stock: "Inventory",
      collections: "Groups",
    });
    expect(latestValue.controls).toEqual({
      showSearchInput: true,
      showCollectionFilter: true,
      showStatusFilter: true,
      sorting: "interactive",
      pagination: "paged",
      pageSize: 7,
    });
    expect(latestValue.format).toEqual({
      moneyLocale: "pl-PL",
      currencyDisplay: "code",
    });
    expect(latestValue.export).toEqual({
      enabled: true,
      label: "Download rows",
    });
    expect(latestValue.links).toEqual({
      linkedColumn: "slug",
      showAction: true,
      actionLabel: "Learn more",
      openInNewTab: true,
    });
    expect(latestValue.emptyState).toEqual({
      title: "Nothing to list",
      description: "Adjust source filters or publish products.",
    });
    expect(latestValue.resolved).toMatchObject({
      total: 0,
      resolvedAt: "2026-03-09T12:00:00.000Z",
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
      media: {
        url: "/media/starter-home.jpg",
        alt: "Starter Home",
        width: 640,
        height: null,
      },
    });

    expect(view.container.querySelector("pre")).toBeNull();
    expect(view.container.textContent).toContain("Query summary");
    expect(view.container.textContent).toContain("Filtered by product search text");
    expect(view.container.textContent).toContain("2 selected collections");
    expect(view.container.textContent).toContain("Visitor sorting: Interactive headers");
    expect(view.container.textContent).toContain("Pagination: Previous and next");
    expect(view.container.textContent).not.toContain("Visitor sorting: interactive");
    expect(view.container.textContent).not.toContain("Pagination: paged");
    expect(view.container.textContent).not.toContain("pricing.amount");
    expect(view.container.textContent).not.toContain('"limit"');

    const writablePaths = Array.from(
      view.container.querySelectorAll(
        '[data-widget-control-path]:not([data-widget-control-readonly="true"])'
      )
    )
      .map((element) => element.getAttribute("data-widget-control-path"))
      .filter(Boolean);
    expect(writablePaths).toEqual(
      expect.arrayContaining([
        "source.limit",
        "source.search",
        "source.collectionIds",
        "source.status",
        "source.sortField",
        "source.sortDir",
        "style.density",
        "style.tableBackground",
        "header.title",
        "fields.showTitle",
        "labels.title",
        "controls.sorting",
        "controls.pagination",
        "format.moneyLocale",
        "export.enabled",
        "links.linkedColumn",
        "emptyState.title",
      ])
    );
  } finally {
    view.cleanup();
  }
});

test("ProductTable stock quantity control is gated by stock column visibility", async () => {
  const { ProductTableVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductTableEditors");

  let latestValue: ProductTableData = {};

  const Harness = () => {
    const [value, setValue] = useState<ProductTableData>(latestValue);

    return (
      <ProductTableVisualEditor
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
    expect(findInputByLabel(view.container, "Show stock quantity")).toBeInstanceOf(
      HTMLInputElement
    );

    toggleCheckbox(findInputByLabel(view.container, "Show stock quantity"));
    expect(latestValue.fields).toMatchObject({
      showStock: true,
      showStockQuantity: true,
    });

    toggleCheckbox(findInputByLabel(view.container, "Show stock"));
    expect(findInputByLabel(view.container, "Show stock quantity")).toBeUndefined();
    expect(latestValue.fields).toMatchObject({
      showStock: false,
      showStockQuantity: false,
    });
  } finally {
    view.cleanup();
  }
});

test("ProductTable link controls normalize linked column and action state", async () => {
  const { ProductTableVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductTableEditors");

  let latestValue: ProductTableData = {};

  const Harness = () => {
    const [value, setValue] = useState<ProductTableData>(latestValue);

    return (
      <ProductTableVisualEditor
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
    setSelectValue(findSelectByLabel(view.container, "Linked column"), "title");
    toggleCheckbox(findInputByLabel(view.container, "Show action column"));
    setInputValue(findInputByLabel(view.container, "Action label"), "View product");
    toggleCheckbox(findInputByLabel(view.container, "Open product links in new tab"));

    expect(latestValue.links).toEqual({
      linkedColumn: "title",
      showAction: true,
      actionLabel: "View product",
      openInNewTab: true,
    });
  } finally {
    view.cleanup();
  }
});

test("ProductTable visual editor restores guarded identity and pricing columns", async () => {
  const { ProductTableVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductTableEditors");

  let latestValue: ProductTableData = {};

  const Harness = () => {
    const [value, setValue] = useState<ProductTableData>(latestValue);

    return (
      <ProductTableVisualEditor
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
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("At least one identity column stays visible")
    );
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("At least one pricing column stays visible")
    );

    toggleCheckbox(findInputByLabel(view.container, "Show product"));
    expect(latestValue.fields).toMatchObject({
      showTitle: false,
      showSlug: true,
    });

    toggleCheckbox(findInputByLabel(view.container, "Show slug"));
    expect(latestValue.fields).toMatchObject({
      showTitle: true,
      showSlug: false,
    });

    toggleCheckbox(findInputByLabel(view.container, "Show compare-at price"));
    toggleCheckbox(findInputByLabel(view.container, "Show price"));
    expect(latestValue.fields).toMatchObject({
      showPrice: false,
      showCompareAt: true,
    });

    toggleCheckbox(findInputByLabel(view.container, "Show compare-at price"));
    expect(latestValue.fields).toMatchObject({
      showPrice: true,
      showCompareAt: false,
    });
  } finally {
    view.cleanup();
  }
});

test("ProductTable preview hook resolves admin preview state", async () => {
  const { ProductTableAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductTableEditors");

  const first = previewQueue.push();
  let latestPreviewState: WidgetPreviewState | null = null;

  const Harness = () => {
    const [previewState, setPreviewState] = useState<WidgetPreviewState | null>(null);

    return (
      <ProductTableAdvancedEditor
        value={{ source: { limit: 4 } }}
        onChange={() => undefined}
        variant="default"
        context={{
          surface: "page-builder",
          blockId: "table-1",
          editorMode: "advanced",
          previewState,
          setPreviewState: (next) => {
            latestPreviewState = next;
            setPreviewState(next);
          },
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flushPromises();
    first.resolve({
      items: [
        {
          id: "product-1",
          title: "Preview Home",
          slug: "preview-home",
          excerpt: "Preview excerpt",
          status: "published",
          pricing: {
            amount: 19900,
            currency: "USD",
            compareAtAmount: null,
          },
          stock: {
            state: "in_stock",
            quantity: 4,
            inStock: true,
          },
          primaryMediaId: null,
          mediaIds: [],
          collectionIds: [],
          productHref: "/products/preview-home",
        },
      ],
      total: 1,
      resolvedAt: "2026-05-21T12:00:00.000Z",
    });
    await flushPromises();

    expect(previewProductTableMock).toHaveBeenCalledTimes(1);
    expect(previewRequestState.calls[0]).toEqual({
      source: {
        limit: 4,
        search: "",
        collectionIds: [],
        status: [],
        sortField: "updatedAt",
        sortDir: "desc",
      },
      controls: {
        showSearchInput: false,
        showCollectionFilter: false,
        showStatusFilter: false,
        sorting: "none",
        pagination: "none",
        pageSize: 12,
      },
    });
    const resolvedPreviewState = requirePreviewState(latestPreviewState);
    expect(resolvedPreviewState.status).toBe("ready");
    expect(resolvedPreviewState.requestKey).toContain("table-1:");
    expect(resolvedPreviewState.dataPatch).toMatchObject({
      resolved: {
        total: 1,
        items: [{ title: "Preview Home" }],
      },
    });
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved items: 1 · Total: 1")
    );
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Visitor sorting: No sorting UI · Pagination: No pagination")
    );
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Refresh preview"));
    expect(view.container.querySelector("pre")).toBeNull();
    expect(view.container.textContent).not.toContain("Query preview");
    expect(view.container.textContent).not.toContain("Normalized query");
    expect(view.container.textContent).not.toContain("runtime resolver");
    expect(view.container.textContent).not.toContain("JSON");
    const advancedControls = Array.from(view.container.querySelectorAll("input, select, textarea"));
    expect(advancedControls).toHaveLength(0);
    const buttons = Array.from(view.container.querySelectorAll("button"));
    expect(buttons.map((button) => normalizeText(button.textContent))).toEqual(["refresh preview"]);
  } finally {
    view.cleanup();
  }
});

test("ProductTable advanced marks saved filters inactive without runtime options", async () => {
  const { ProductTableAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductTableEditors");

  const view = mount(
    <ProductTableAdvancedEditor
      value={{
        controls: {
          showCollectionFilter: true,
          showStatusFilter: true,
          sorting: "none",
          pagination: "none",
        },
        resolved: {
          items: [],
          total: 0,
          resolvedAt: "2026-05-21T12:00:00.000Z",
          runtime: {
            availableCollections: [],
            availableStatuses: ["published"],
          },
        },
      }}
      onChange={() => undefined}
      variant="default"
    />
  );

  try {
    const visitorControls = view.container.querySelector(
      '[data-widget-control="product-table.advanced.query-visitor-controls"] [data-widget-control-summary="true"]'
    );
    const visitorControlsText = normalizeText(visitorControls?.textContent);

    expect(visitorControlsText).toContain(
      normalizeText("Collection filters saved, inactive until at least two collections resolve")
    );
    expect(visitorControlsText).toContain(
      normalizeText("Status filter saved, inactive until at least two statuses resolve")
    );
    expect(visitorControlsText).not.toBe("collection filters");
  } finally {
    view.cleanup();
  }
});

test("ProductTable preview hook ignores stale async responses and retains the last safe patch on error", async () => {
  const { ProductTableWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductTableEditors");

  const first = previewQueue.push();
  const second = previewQueue.push();
  const third = previewQueue.push();
  let setSourceLimit: ((limit: number) => void) | null = null;
  let latestPreviewState: WidgetPreviewState | null = null;

  const Harness = () => {
    const [value, setValue] = useState<ProductTableData>({
      source: { limit: 4 },
    });
    const [previewState, setPreviewState] = useState<WidgetPreviewState | null>(null);

    setSourceLimit = (limit: number) =>
      setValue((current) => ({
        ...current,
        source: {
          ...(current.source ?? {}),
          limit,
        },
      }));

    return (
      <ProductTableWizardEditor
        value={value}
        onChange={setValue}
        variant="default"
        context={{
          surface: "page-builder",
          blockId: "table-1",
          editorMode: "wizard",
          previewState,
          setPreviewState: (next) => {
            latestPreviewState = next;
            setPreviewState(next);
          },
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flushPromises();
    React.act(() => {
      setSourceLimit?.(8);
    });
    await flushPromises();

    first.resolve({
      items: [
        {
          id: "product-1",
          title: "Stale preview",
          slug: "stale-preview",
          excerpt: null,
          status: "published",
          pricing: { amount: 1000, currency: "USD", compareAtAmount: null },
          stock: { state: "in_stock", quantity: 1, inStock: true },
          primaryMediaId: null,
          mediaIds: [],
          collectionIds: [],
          productHref: "/products/stale-preview",
        },
      ],
      total: 1,
      resolvedAt: "2026-05-21T12:00:00.000Z",
    });
    await flushPromises();

    expect(requirePreviewState(latestPreviewState).status).toBe("loading");

    second.resolve({
      items: [
        {
          id: "product-2",
          title: "Fresh preview",
          slug: "fresh-preview",
          excerpt: null,
          status: "published",
          pricing: { amount: 2000, currency: "USD", compareAtAmount: null },
          stock: { state: "in_stock", quantity: 2, inStock: true },
          primaryMediaId: null,
          mediaIds: [],
          collectionIds: [],
          productHref: "/products/fresh-preview",
        },
      ],
      total: 1,
      resolvedAt: "2026-05-21T12:01:00.000Z",
    });
    await flushPromises();

    expect(previewProductTableMock).toHaveBeenCalledTimes(2);
    expect(previewRequestState.calls[0]).toMatchObject({ source: { limit: 4 } });
    expect(previewRequestState.calls[1]).toMatchObject({ source: { limit: 8 } });
    const readyPreviewState = requirePreviewState(latestPreviewState);
    expect(readyPreviewState.status).toBe("ready");
    expect(readyPreviewState.dataPatch).toMatchObject({
      resolved: {
        items: [{ title: "Fresh preview" }],
      },
    });

    clickButton(view.container, "Refresh preview");
    await flushPromises();
    third.reject(new Error("Preview timed out"));
    await flushPromises();

    expect(previewProductTableMock).toHaveBeenCalledTimes(3);
    expect(previewRequestState.calls[2]).toMatchObject({ source: { limit: 8 } });
    const errorPreviewState = requirePreviewState(latestPreviewState);
    expect(errorPreviewState.status).toBe("error");
    expect(errorPreviewState.message).toBe("Preview timed out");
    expect(errorPreviewState.dataPatch).toMatchObject({
      resolved: {
        items: [{ title: "Fresh preview" }],
      },
    });
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Preview timed out"));
  } finally {
    view.cleanup();
  }
});
