// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { ProductGalleryData } from "../../../core/widgets/core/productGallery";

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

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    normalizeText(section.textContent).includes(normalizeText(title))
  );

afterEach(() => {
  vi.restoreAllMocks();
});

test("ProductGallery editors cover source, card fields, empty state, and runtime preview", async () => {
  const {
    ProductGalleryAdvancedEditor,
    ProductGalleryVisualEditor,
    ProductGalleryWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/ProductGalleryEditors");

  const onChangeSpy = vi.fn();
  let latestValue: ProductGalleryData = {
    resolved: {
      items: [
        {
          id: "product-1",
          title: "City Bike",
          slug: "city-bike",
          excerpt: "Light commuting bike",
          status: "published",
          pricing: {
            amount: 199.99,
            currency: "USD",
            compareAtAmount: 249.99,
          },
          stock: {
            state: "in_stock",
            quantity: 12,
            inStock: true,
          },
          primaryMediaId: "media-1",
          mediaIds: ["media-1"],
          collectionIds: ["featured"],
        },
      ],
      total: 3,
      resolvedAt: "2026-03-08T10:00:00.000Z",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<ProductGalleryData>(latestValue);

    const handleChange = (next: ProductGalleryData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    return (
      <>
        <ProductGalleryWizardEditor
          value={value}
          onChange={handleChange}
          variant="gallery"
          onVariantChange={() => undefined}
        />
        <ProductGalleryVisualEditor
          value={value}
          onChange={handleChange}
          variant="gallery"
          onVariantChange={() => undefined}
        />
        <ProductGalleryAdvancedEditor
          value={value}
          onChange={handleChange}
          variant="gallery"
          onVariantChange={() => undefined}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved items: 1 · Total: 3")
    );

    setInputValue(findInputByLabel(view.container, "Limit"), "4");
    setInputValue(findInputByLabel(view.container, "Search"), "bike");
    setInputValue(
      findInputByLabel(view.container, "Collection IDs (comma separated)"),
      "featured, sale, featured"
    );
    setSelectValue(findSelectByLabel(view.container, "Sort field"), "pricing.amount");
    setSelectValue(findSelectByLabel(view.container, "Sort direction"), "asc");
    toggleCheckbox(findInputByLabel(view.container, "published"));
    toggleCheckbox(findInputByLabel(view.container, "archived"));
    setSelectValue(findSelectByLabel(view.container, "Columns"), "4");
    setSelectValue(findSelectByLabel(view.container, "Card style"), "minimal");

    toggleCheckbox(findInputByLabel(view.container, "Show excerpt"));
    toggleCheckbox(findInputByLabel(view.container, "Show price"));
    toggleCheckbox(findInputByLabel(view.container, "Show stock badge"));
    toggleCheckbox(findInputByLabel(view.container, "Show media hint"));

    const emptyStateSection = findSectionByTitle(view.container, "Shown when query returns no products.");
    setInputValue(findInputByLabel(emptyStateSection ?? view.container, "Title"), "Nothing found");
    const emptyStateInputs = Array.from(
      (emptyStateSection ?? view.container).querySelectorAll("input")
    );
    setInputValue(emptyStateInputs[1], "Adjust query filters or publish products.");
    setInputValue(findInputByLabel(view.container, "Runtime error flag"), "resolver-timeout");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.source).toEqual({
      limit: 4,
      search: "bike",
      collectionIds: ["featured", "sale"],
      status: ["published", "archived"],
      sortField: "pricing.amount",
      sortDir: "asc",
    });
    expect(latestValue.style).toEqual({
      columns: "4",
      cardStyle: "minimal",
    });
    expect(latestValue.fields).toEqual({
      showExcerpt: false,
      showPrice: false,
      showStock: false,
      showMediaHint: true,
    });
    expect(latestValue.emptyState).toEqual({
      title: "Nothing found",
      description: "Adjust query filters or publish products.",
    });
    expect(latestValue.resolved).toMatchObject({
      total: 3,
      resolvedAt: "2026-03-08T10:00:00.000Z",
      error: "resolver-timeout",
    });
    expect(latestValue.resolved?.items).toHaveLength(1);

    const preview = view.container.querySelector("pre");
    expect(preview?.textContent).toContain('"limit": 4');
    expect(preview?.textContent).toContain('"field": "pricing.amount"');
    expect(preview?.textContent).toContain('"dir": "asc"');
    expect(preview?.textContent).toContain('"search": "bike"');
    expect(preview?.textContent).toContain('"collectionIds": [');
    expect(preview?.textContent).toContain('"featured"');
    expect(preview?.textContent).toContain('"sale"');
    expect(preview?.textContent).toContain('"status": [');
    expect(preview?.textContent).toContain('"published"');
    expect(preview?.textContent).toContain('"archived"');
  } finally {
    view.cleanup();
  }
});

test("ProductGallery visual editor updates the empty-state description in isolation", async () => {
  const { ProductGalleryVisualEditor } = await import(
    "../../../core/admin/ui/widgets/editors/ProductGalleryEditors"
  );

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
        variant="gallery"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const emptyStateSection = findSectionByTitle(view.container, "Shown when query returns no products.");
    const emptyStateInputs = Array.from(
      (emptyStateSection ?? view.container).querySelectorAll("input")
    );

    setInputValue(emptyStateInputs[1], "No catalog items yet.");

    expect(latestValue.emptyState).toEqual(
      expect.objectContaining({
        description: "No catalog items yet.",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("ProductGallery editors fall back to default layout values and empty runtime totals", async () => {
  const {
    ProductGalleryAdvancedEditor,
    ProductGalleryWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/ProductGalleryEditors");

  let latestValue: ProductGalleryData = {
    style: {
      columns: "bogus" as never,
      cardStyle: "unknown" as never,
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<ProductGalleryData>(latestValue);

    return (
      <>
        <ProductGalleryWizardEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant="gallery"
        />
        <ProductGalleryAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant="gallery"
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    const columnsSelect = findSelectByLabel(view.container, "Columns");
    const cardStyleSelect = findSelectByLabel(view.container, "Card style");

    expect((columnsSelect as HTMLSelectElement | undefined)?.value).toBe("3");
    expect((cardStyleSelect as HTMLSelectElement | undefined)?.value).toBe("outlined");
    expect(normalizeText(view.container.textContent)).toContain(
      normalizeText("Resolved items: 0 · Total: 0")
    );

    setSelectValue(columnsSelect, "invalid-columns");
    setSelectValue(cardStyleSelect, "invalid-card-style");

    expect(latestValue.style).toEqual(
      expect.objectContaining({
        columns: "3",
        cardStyle: "outlined",
      })
    );
  } finally {
    view.cleanup();
  }
});
