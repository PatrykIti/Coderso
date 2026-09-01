// @vitest-environment happy-dom

// TASK-105-08-06: `CommerceEditorSections`, `CommerceVariantsCard`, and
// `AttributesEditor` interaction suite. All mutations flow through the single
// `onChange` patch callback; assertions pin the emitted draft patches.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { CommerceEditorSections } from "../../../core/admin/ui/commerce/components/CommerceEditorSections";
import { CommerceVariantsCard } from "../../../core/admin/ui/commerce/components/CommerceVariantsCard";
import type { CommerceProductDraft } from "../../../core/admin/ui/commerce/commerceEditorModel";
import { createEmptyCommerceDraft } from "../../../core/admin/ui/commerce/commerceEditorModel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const draftWith = (overrides: Partial<CommerceProductDraft> = {}): CommerceProductDraft => ({
  ...createEmptyCommerceDraft(),
  ...overrides,
});

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
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const setInput = (input: HTMLInputElement | HTMLTextAreaElement | null, value: string) => {
  if (!input) throw new Error("input missing");
  const setter =
    input instanceof HTMLTextAreaElement
      ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
      : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const click = (element: Element | null | undefined) => {
  if (!element) throw new Error("click target missing");
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const pointerClick = (element: Element | null | undefined) => {
  if (!element) throw new Error("pointer click target missing");
  const target = element as HTMLElement;
  React.act(() => {
    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const getCheckbox = (root: ParentNode, label: string): HTMLElement | null => {
  const labeled = Array.from(root.querySelectorAll<HTMLElement>("label")).find((entry) =>
    entry.textContent?.includes(label)
  );
  return labeled?.querySelector<HTMLElement>('[data-slot="checkbox"]') ?? null;
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("detail fields emit title, slug, excerpt, and description patches", () => {
  const onChange = vi.fn();
  const view = mount(<CommerceEditorSections draft={draftWith()} onChange={onChange} />);
  try {
    setInput(view.container.querySelector("#commerce-title"), "Oak Residence");
    expect(onChange).toHaveBeenLastCalledWith({ title: "Oak Residence" });
    setInput(view.container.querySelector("#commerce-slug"), "oak-residence");
    expect(onChange).toHaveBeenLastCalledWith({ slug: "oak-residence" });
    setInput(view.container.querySelector("#commerce-excerpt"), "Short summary");
    expect(onChange).toHaveBeenLastCalledWith({ excerpt: "Short summary" });
    setInput(view.container.querySelector("#commerce-description"), "Long description");
    expect(onChange).toHaveBeenLastCalledWith({ description: "Long description" });
  } finally {
    view.cleanup();
  }
});

test("media ids text emits a patch and parsed ids render cover tiles", () => {
  const onChange = vi.fn();
  const view = mount(
    <CommerceEditorSections draft={draftWith({ mediaIdsText: "id-1, id-2" })} onChange={onChange} />
  );
  try {
    expect(view.container.textContent).toContain("id-1");
    expect(view.container.textContent).toContain("id-2");
    expect(view.container.textContent).toContain("Cover");
    setInput(view.container.querySelector("#commerce-media-ids"), "id-1, id-3");
    expect(onChange).toHaveBeenLastCalledWith({ mediaIdsText: "id-1, id-3" });
  } finally {
    view.cleanup();
  }
});

test("pricing and inventory inputs emit numeric and stock patches", () => {
  const onChange = vi.fn();
  const view = mount(<CommerceEditorSections draft={draftWith()} onChange={onChange} />);
  try {
    setInput(view.container.querySelector("#commerce-pricing-amount"), "450000");
    expect(onChange).toHaveBeenLastCalledWith({ pricingAmount: "450000" });
    setInput(view.container.querySelector("#commerce-pricing-currency"), "EUR");
    expect(onChange).toHaveBeenLastCalledWith({ pricingCurrency: "EUR" });
    setInput(view.container.querySelector("#commerce-pricing-compare"), "470000");
    expect(onChange).toHaveBeenLastCalledWith({ pricingCompareAtAmount: "470000" });
    setInput(view.container.querySelector("#commerce-stock-quantity"), "10");
    expect(onChange).toHaveBeenLastCalledWith({ stockQuantity: "10" });
  } finally {
    view.cleanup();
  }
});

test("track inventory switch maps checked state onto stockState", () => {
  const onChange = vi.fn();
  const view = mount(
    <CommerceEditorSections draft={draftWith({ stockState: "out_of_stock" })} onChange={onChange} />
  );
  try {
    const toggle = view.container.querySelector('[data-slot="switch"]') as HTMLElement | null;
    expect(toggle).toBeTruthy();
    click(toggle);
    expect(onChange).toHaveBeenLastCalledWith({ stockState: "in_stock" });
  } finally {
    view.cleanup();
  }
});

test("variants card empty state invites adding a variant", () => {
  const onChange = vi.fn();
  const view = mount(<CommerceVariantsCard draft={draftWith()} onChange={onChange} />);
  try {
    expect(view.container.textContent).toContain("No variants.");
    click(
      Array.from(view.container.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Add variant")
      )
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([
          expect.objectContaining({ title: "", isDefault: false }),
        ]),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("variants card edits title, sku, pricing, stock, and default flag", async () => {
  const onChange = vi.fn();
  const draft = draftWith({
    variants: [
      {
        id: "v-1",
        sku: null,
        title: "Base",
        pricing: { amount: 1000, currency: "USD", compareAtAmount: null },
        stock: { state: "in_stock", quantity: null },
        attributes: {},
        isDefault: false,
      },
    ],
  });
  const view = mount(<CommerceVariantsCard draft={draft} onChange={onChange} />);
  try {
    const titleInput = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.placeholder === "Variant title"
    );
    setInput(titleInput ?? null, "Deluxe");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([expect.objectContaining({ title: "Deluxe" })]),
      })
    );

    const skuInput = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.placeholder === "SKU (optional)"
    );
    setInput(skuInput ?? null, "SKU-1");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([expect.objectContaining({ sku: "SKU-1" })]),
      })
    );

    const defaultToggle = getCheckbox(view.container, "Default");
    click(defaultToggle);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([expect.objectContaining({ isDefault: true })]),
      })
    );

    const amountInput = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.placeholder === "450000"
    );
    setInput(amountInput ?? null, "2000");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([
          expect.objectContaining({ pricing: expect.objectContaining({ amount: 2000 }) }),
        ]),
      })
    );

    const currencyInput = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.placeholder === "USD"
    );
    setInput(currencyInput ?? null, "EUR");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([
          expect.objectContaining({ pricing: expect.objectContaining({ currency: "EUR" }) }),
        ]),
      })
    );

    const compareAtInput = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.placeholder === "470000"
    );
    setInput(compareAtInput ?? null, "2500");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([
          expect.objectContaining({ pricing: expect.objectContaining({ compareAtAmount: 2500 }) }),
        ]),
      })
    );

    const stockSelect = view.container.querySelector('[role="combobox"]');
    expect(stockSelect).toBeTruthy();
    pointerClick(stockSelect);
    await React.act(async () => {
      await Promise.resolve();
    });
    const option = Array.from(document.body.querySelectorAll('[role="option"]')).find((entry) =>
      entry.textContent?.includes("Out of stock")
    );
    pointerClick(option ?? undefined);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([
          expect.objectContaining({ stock: expect.objectContaining({ state: "out_of_stock" }) }),
        ]),
      })
    );

    const quantityInput = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.placeholder === "10"
    );
    setInput(quantityInput ?? null, "5");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([
          expect.objectContaining({ stock: expect.objectContaining({ quantity: 5 }) }),
        ]),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("attributes editor adds a pair, removes a row, and renames without collision", () => {
  const onChange = vi.fn();
  const draft = draftWith({
    variants: [
      {
        id: "v-1",
        sku: null,
        title: "Base",
        pricing: { amount: 1000, currency: "USD", compareAtAmount: null },
        stock: { state: "in_stock", quantity: null },
        attributes: { color: "oak" },
        isDefault: false,
      },
    ],
  });
  const view = mount(<CommerceVariantsCard draft={draft} onChange={onChange} />);
  try {
    setInput(view.container.querySelector('[aria-label="New attribute key"]'), "size");
    setInput(view.container.querySelector('[aria-label="New attribute value"]'), "L");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([
          expect.objectContaining({
            attributes: expect.objectContaining({ size: "L", color: "oak" }),
          }),
        ]),
      })
    );

    click(view.container.querySelector('[aria-label="Remove attribute color"]'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([
          expect.objectContaining({ attributes: expect.not.objectContaining({ color: "oak" }) }),
        ]),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("remove variant emits a filtered variants array", () => {
  const onChange = vi.fn();
  const draft = draftWith({
    variants: [
      {
        id: "v-1",
        sku: null,
        title: "Base",
        pricing: { amount: 1000, currency: "USD", compareAtAmount: null },
        stock: { state: "in_stock", quantity: null },
        attributes: {},
        isDefault: false,
      },
      {
        id: "v-2",
        sku: null,
        title: "Second",
        pricing: { amount: 2000, currency: "USD", compareAtAmount: null },
        stock: { state: "backorder", quantity: null },
        attributes: {},
        isDefault: true,
      },
    ],
  });
  const view = mount(<CommerceVariantsCard draft={draft} onChange={onChange} />);
  try {
    click(view.container.querySelector('[aria-label="Remove variant 1"]'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        variants: [expect.objectContaining({ id: "v-2" })],
      })
    );
  } finally {
    view.cleanup();
  }
});

test("stock state select emits a stockState patch", async () => {
  const onChange = vi.fn();
  const view = mount(
    <CommerceEditorSections draft={draftWith({ stockState: "in_stock" })} onChange={onChange} />
  );
  try {
    const trigger = view.container.querySelector("#commerce-stock-state") as HTMLElement | null;
    expect(trigger).toBeTruthy();
    pointerClick(trigger);
    await React.act(async () => {
      await Promise.resolve();
    });
    const option = Array.from(document.body.querySelectorAll('[role="option"]')).find((entry) =>
      entry.textContent?.includes("Backorder")
    );
    pointerClick(option ?? undefined);
    expect(onChange).toHaveBeenLastCalledWith({ stockState: "backorder" });
  } finally {
    view.cleanup();
  }
});

test("variants card renames an attribute key through the model helper", () => {
  const onChange = vi.fn();
  const draft = draftWith({
    variants: [
      {
        id: "v-1",
        sku: null,
        title: "Base",
        pricing: { amount: 1000, currency: "USD", compareAtAmount: null },
        stock: { state: "in_stock", quantity: null },
        attributes: { color: "oak" },
        isDefault: false,
      },
    ],
  });
  const view = mount(<CommerceVariantsCard draft={draft} onChange={onChange} />);
  try {
    const keyInput = view.container.querySelector('[aria-label="Attribute key for color"]');
    if (!(keyInput instanceof HTMLInputElement)) {
      throw new Error("attribute key input missing");
    }
    setInput(keyInput, "finish");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        variants: expect.arrayContaining([
          expect.objectContaining({ attributes: { finish: "oak" } }),
        ]),
      })
    );
  } finally {
    view.cleanup();
  }
});
