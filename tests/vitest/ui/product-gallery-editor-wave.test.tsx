// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ProductGalleryData } from "../../../core/widgets/core/productGallery";
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
      title: "Preview Home",
      slug: "preview-home",
      status: "published",
      excerpt: null,
      description: null,
      pricing: { amount: 19900, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: 4 },
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
      id: "product-2",
      title: "Premium Home",
      slug: "premium-home",
      status: "published",
      excerpt: null,
      description: null,
      pricing: { amount: 49900, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: 6 },
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

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "catalog-page",
      title: "Catalog",
      slug: "catalog",
      status: "published",
      updatedAt: "2026-05-19T12:00:00.000Z",
      author: null,
    },
  ]),
}));

const previewProductGalleryMock = vi.hoisted(() =>
  vi.fn(async () => ({
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
      },
    ],
    total: 1,
    resolvedAt: "2026-05-19T12:00:00.000Z",
  }))
);

vi.mock("@/services/productGalleryPreviewClient", () => ({
  previewProductGallery: previewProductGalleryMock,
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
  });
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype,
    "value"
  );
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
  findLabeledField(container, text, "input");

const findInputByAriaLabel = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) => normalizeText(element.getAttribute("aria-label")) === normalizeText(text)
  );

const findSelectByLabel = (container: ParentNode, text: string) =>
  findLabeledField(container, text, "select");

const findSelectByOption = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("select")).find((element) =>
    normalizeText(element.textContent).includes(normalizeText(text))
  );

afterEach(() => {
  vi.restoreAllMocks();
  previewProductGalleryMock.mockClear();
});

test("ProductGallery editors update source, links, curation, and preview status", async () => {
  const { ProductGalleryAdvancedEditor, ProductGalleryVisualEditor, ProductGalleryWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductGalleryEditors");

  let latestValue: ProductGalleryData = {};
  let latestPreviewState: WidgetPreviewState | null = null;

  const Harness = () => {
    const [value, setValue] = useState<ProductGalleryData>(latestValue);
    const [previewState, setPreviewState] = useState<WidgetPreviewState | null>(null);

    return (
      <>
        <ProductGalleryWizardEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant="cards"
          context={{
            surface: "page-builder",
            blockId: "block-1",
            editorMode: "wizard",
            previewState,
            setPreviewState: (next) => {
              latestPreviewState = next;
              setPreviewState(next);
            },
          }}
        />
        <ProductGalleryVisualEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant="cards"
          context={{
            surface: "page-builder",
            blockId: "block-1",
            editorMode: "visual",
            previewState,
            setPreviewState: (next) => {
              latestPreviewState = next;
              setPreviewState(next);
            },
          }}
        />
        <ProductGalleryAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant="cards"
          context={{
            surface: "page-builder",
            blockId: "block-1",
            editorMode: "advanced",
            previewState,
            setPreviewState: (next) => {
              latestPreviewState = next;
              setPreviewState(next);
            },
          }}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flushPromises();
    expect(previewProductGalleryMock).toHaveBeenCalled();
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Preview ready"));

    setInputValue(findInputByLabel(view.container, "Limit"), "4");
    setInputValue(findInputByLabel(view.container, "Minimum price"), "199");
    setInputValue(findInputByLabel(view.container, "Maximum price"), "499");
    setSelectValue(findSelectByLabel(view.container, "Columns"), "4");
    setInputValue(findInputByLabel(view.container, "CTA label"), "View details");
    setSelectValue(findSelectByLabel(view.container, "CTA style"), "button");
    toggleCheckbox(findInputByLabel(view.container, "Show status badge"));
    setSelectValue(findSelectByLabel(view.container, "Product selection"), "manual");
    await flushPromises();
    toggleCheckbox(findInputByLabel(view.container, "Premium Home"));
    toggleCheckbox(findInputByLabel(view.container, "Preview Home"));
    setSelectValue(findSelectByLabel(view.container, "More products action"), "view-all");
    await flushPromises();
    setSelectValue(findSelectByOption(view.container, "Catalog"), "catalog-page");
    setInputValue(findInputByLabel(view.container, "Link label"), "Browse catalog");
    expect(findInputByLabel(view.container, "Show media hint")).toBeUndefined();
    expect(findInputByAriaLabel(view.container, "Card background value")).toBeUndefined();
    expect(normalizeText(view.container.textContent)).not.toContain(normalizeText("var(--color"));
    setInputValue(findInputByAriaLabel(view.container, "Card background swatch"), "#f8fafc");
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Preview needs refresh")
    );
    clickButton(view.container, "Refresh products");
    await flushPromises();

    expect(latestValue.source).toEqual(
      expect.objectContaining({
        limit: 4,
        minPriceMinor: 19900,
        maxPriceMinor: 49900,
      })
    );
    expect(latestValue.style).toEqual(
      expect.objectContaining({
        columns: "4",
        cardBackground: "#f8fafc",
      })
    );
    expect(latestValue.link).toEqual(
      expect.objectContaining({
        ctaLabel: "View details",
        ctaStyle: "button",
      })
    );
    expect(latestValue.fields).toEqual(
      expect.objectContaining({
        showStatus: true,
      })
    );
    expect(latestValue.curation).toEqual({
      mode: "manual",
      productIds: ["product-2", "product-1"],
    });
    expect(latestValue.pagination).toEqual({
      mode: "view-all",
      viewAllHref: "/catalog",
      viewAllLabel: "Browse catalog",
    });
    const resolvedPreviewState = latestPreviewState as WidgetPreviewState | null;
    expect(resolvedPreviewState?.status).toBe("ready");
    expect(previewProductGalleryMock.mock.calls.length).toBe(2);
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Source summary"));
    expect(normalizeText(view.container.textContent)).toContain(normalizeText("Surface summary"));
    expect(normalizeText(view.container.textContent)).not.toContain(normalizeText("Query preview"));
    expect(normalizeText(view.container.textContent)).not.toContain(normalizeText('"productIds"'));
    expect(view.container.querySelector("pre")).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("ProductGallery keeps daily presentation controls out of Wizard", async () => {
  const { ProductGalleryVisualEditor, ProductGalleryWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductGalleryEditors");

  const wizardView = mount(
    <ProductGalleryWizardEditor value={{}} onChange={() => undefined} variant="cards" />
  );

  try {
    expect(findSelectByLabel(wizardView.container, "Columns")).toBeUndefined();
    expect(findSelectByLabel(wizardView.container, "Card style")).toBeUndefined();
  } finally {
    wizardView.cleanup();
  }

  const visualView = mount(
    <ProductGalleryVisualEditor value={{}} onChange={() => undefined} variant="cards" />
  );

  try {
    expect(findSelectByLabel(visualView.container, "Columns")).toBeInstanceOf(HTMLSelectElement);
    expect(findSelectByLabel(visualView.container, "Card style")).toBeInstanceOf(HTMLSelectElement);
    expect(findInputByLabel(visualView.container, "Show media hint")).toBeUndefined();
    expect(findInputByAriaLabel(visualView.container, "Card background swatch")).toBeInstanceOf(
      HTMLInputElement
    );
    expect(findInputByAriaLabel(visualView.container, "Card background value")).toBeUndefined();
  } finally {
    visualView.cleanup();
  }
});

test("ProductGallery visual editor keeps an intentionally blank empty-state description", async () => {
  const { ProductGalleryVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ProductGalleryEditors");

  let latestValue: ProductGalleryData = {};

  const Harness = () => {
    const [value, setValue] = useState<ProductGalleryData>(latestValue);

    return (
      <ProductGalleryVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="cards"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const descriptionInputs = Array.from(view.container.querySelectorAll("input")).filter(
      (element) => normalizeText(element.closest("label")?.textContent).startsWith("description")
    );
    setInputValue(descriptionInputs[descriptionInputs.length - 1], "");
    expect(latestValue.emptyState).toEqual(
      expect.objectContaining({
        description: "",
      })
    );
  } finally {
    view.cleanup();
  }
});

test.each([
  ["wizard", "ProductGalleryWizardEditor"],
  ["visual", "ProductGalleryVisualEditor"],
] as const)(
  "ProductGallery %s mode defers preview hydration until Advanced is opened",
  async (editorMode, exportName) => {
    const editors = await import("../../../core/admin/ui/widgets/editors/ProductGalleryEditors");
    const Editor = editors[exportName];

    let latestPreviewState: WidgetPreviewState | null = null;

    const Harness = () => {
      const [previewState, setPreviewState] = useState<WidgetPreviewState | null>(null);

      return (
        <Editor
          value={{ source: { limit: 4 } }}
          onChange={() => undefined}
          variant="cards"
          context={{
            surface: "page-builder",
            blockId: "block-1",
            editorMode,
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
      expect(previewProductGalleryMock).not.toHaveBeenCalled();
      expect(latestPreviewState).toBeNull();
    } finally {
      view.cleanup();
    }
  }
);
