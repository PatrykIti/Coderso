// @vitest-environment happy-dom

// TASK-105-08-06: `CommerceTable`, `CommerceFilters`, `CommerceCollectionsPanel`,
// and `CommerceContextPanel` interaction suite. Pure presentational components
// driven by controlled props; assertions pin rows, filters, price summary, and
// lifecycle copy.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { CommerceTable } from "../../../core/admin/ui/commerce/CommerceTable";
import { CommerceFilters } from "../../../core/admin/ui/commerce/CommerceFilters";
import { CommerceCollectionsPanel } from "../../../core/admin/ui/commerce/components/CommerceCollectionsPanel";
import { CommerceContextPanel } from "../../../core/admin/ui/commerce/components/CommerceContextPanel";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { CommerceProductListRow } from "../../../core/admin/ui/commerce/CommerceListPage";
import type { CommerceProductDraft } from "../../../core/admin/ui/commerce/commerceEditorModel";
import { createEmptyCommerceDraft } from "../../../core/admin/ui/commerce/commerceEditorModel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const row = (overrides: Partial<CommerceProductListRow> = {}): CommerceProductListRow => ({
  id: overrides.id ?? "product-1",
  title: overrides.title ?? "Oak Desk",
  slug: overrides.slug ?? "oak-desk",
  status: overrides.status ?? "draft",
  excerpt: overrides.excerpt ?? null,
  description: overrides.description ?? null,
  pricing: overrides.pricing ?? { amount: 12000, currency: "USD", compareAtAmount: null },
  stock: overrides.stock ?? { state: "in_stock", quantity: 4 },
  collectionIds: overrides.collectionIds ?? [],
  mediaIds: overrides.mediaIds ?? [],
  variants: overrides.variants ?? [],
  metadata: overrides.metadata ?? {},
  data: overrides.data ?? {},
  createdAt: overrides.createdAt ?? "2026-03-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-03-02T00:00:00.000Z",
  publishedAt: overrides.publishedAt ?? null,
  collectionLabels: overrides.collectionLabels ?? [],
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

const pickSelect = async (trigger: Element | null, label: string) => {
  if (!trigger) throw new Error("select trigger missing");
  pointerClick(trigger);
  await React.act(async () => {
    await Promise.resolve();
  });
  const option = Array.from(document.body.querySelectorAll('[role="option"]')).find((entry) =>
    entry.textContent?.includes(label)
  );
  pointerClick(option ?? undefined);
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

test("CommerceTable renders product rows with price, stock, and collection labels", () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/commerce">
      <CommerceTable
        items={[
          row({
            id: "a",
            title: "Oak Desk",
            pricing: { amount: 12000, currency: "USD", compareAtAmount: null },
            stock: { state: "in_stock", quantity: 4 },
            collectionLabels: ["Premium", "Featured", "Extra"],
            updatedAt: "2026-03-02T00:00:00.000Z",
          }),
        ]}
        onEdit={vi.fn()}
        onPublish={vi.fn()}
        onMoveToDraft={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    </AdminRouterProvider>
  );
  try {
    expect(view.container.textContent).toContain("Oak Desk");
    expect(view.container.textContent).toContain("/oak-desk");
    expect(view.container.textContent).toContain("$120.00");
    expect(view.container.textContent).toContain("In stock");
    expect(view.container.textContent).toContain("Premium");
    expect(view.container.textContent).toContain("+1");
    expect(view.container.textContent).toContain("Mar 2, 2026");
  } finally {
    view.cleanup();
  }
});

test("CommerceTable empty message renders when there are no rows", () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/commerce">
      <CommerceTable
        items={[]}
        emptyMessage="No products match your current filters."
        onEdit={vi.fn()}
        onPublish={vi.fn()}
        onMoveToDraft={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    </AdminRouterProvider>
  );
  try {
    expect(view.container.textContent).toContain("No products match your current filters.");
  } finally {
    view.cleanup();
  }
});

test("CommerceTable toggles all and individual rows through the checkboxes", () => {
  const onToggleAll = vi.fn();
  const onToggleProduct = vi.fn();
  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/commerce">
      <CommerceTable
        items={[row({ id: "a" }), row({ id: "b", title: "Second" })]}
        selectedIds={["a"]}
        isAllSelected={false}
        isIndeterminate
        onToggleAll={onToggleAll}
        onToggleProduct={onToggleProduct}
        onEdit={vi.fn()}
        onPublish={vi.fn()}
        onMoveToDraft={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    </AdminRouterProvider>
  );
  try {
    const all = view.container.querySelector('[aria-label="Select all products"]');
    click(all);
    expect(onToggleAll).toHaveBeenCalledTimes(1);
    click(view.container.querySelector('[aria-label="Select Oak Desk"]'));
    expect(onToggleProduct).toHaveBeenCalledWith("a");
  } finally {
    view.cleanup();
  }
});

test("CommerceTable shows out-of-stock and backorder badges with quantity", () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/commerce">
      <CommerceTable
        items={[
          row({ id: "o", title: "Sold Out", stock: { state: "out_of_stock", quantity: null } }),
          row({ id: "b", title: "Backorder Item", stock: { state: "backorder", quantity: 2 } }),
        ]}
        onEdit={vi.fn()}
        onPublish={vi.fn()}
        onMoveToDraft={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    </AdminRouterProvider>
  );
  try {
    expect(view.container.textContent).toContain("Out of stock");
    expect(view.container.textContent).toContain("Backorder");
    expect(view.container.textContent).toContain("(2)");
  } finally {
    view.cleanup();
  }
});

test("CommerceFilters search input and selects emit change callbacks", () => {
  const onSearchChange = vi.fn();
  const onStatusChange = vi.fn();
  const onCollectionChange = vi.fn();
  const onStockChange = vi.fn();
  const view = mount(
    <CommerceFilters
      search=""
      status="all"
      collection="all"
      stock="all"
      collectionOptions={[{ value: "c-1", label: "Premium" }]}
      onSearchChange={onSearchChange}
      onStatusChange={onStatusChange}
      onCollectionChange={onCollectionChange}
      onStockChange={onStockChange}
    />
  );
  try {
    const input = view.container.querySelector('input[aria-label^="Search products"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    React.act(() => {
      setter?.call(input, "oak");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onSearchChange).toHaveBeenCalledWith("oak");
    expect(view.container.textContent).toContain("Status: All");
    expect(view.container.textContent).toContain("Collection: All");
    expect(view.container.textContent).toContain("Stock: All");
  } finally {
    view.cleanup();
  }
});

test("CommerceCollectionsPanel renders price summary with discount and toggles collections", () => {
  const onToggleCollection = vi.fn();
  const view = mount(
    <CommerceCollectionsPanel
      collections={[
        {
          id: "c-1",
          name: "Premium",
          slug: "premium",
          description: null,
          createdAt: "x",
          updatedAt: "x",
        },
      ]}
      selectedIds={["c-1"]}
      status="draft"
      pricingAmount="10000"
      pricingCompareAtAmount="12000"
      pricingCurrency="USD"
      publishButtonLabel="Publish"
      isSaving={false}
      onToggleCollection={onToggleCollection}
      onStatusChange={vi.fn()}
      onPublish={vi.fn()}
      onCreateCollection={vi.fn()}
    />
  );
  try {
    expect(view.container.textContent).toContain("$100.00");
    expect(view.container.textContent).toContain("-17%");
    expect(view.container.textContent).toContain("1 selected");
    expect(view.container.textContent).toContain("/premium");
    click(getCheckbox(view.container, "Premium"));
    expect(onToggleCollection).toHaveBeenCalledWith("c-1", false);
  } finally {
    view.cleanup();
  }
});

test("CommerceCollectionsPanel invalid currency falls back to a plain label", () => {
  const view = mount(
    <CommerceCollectionsPanel
      collections={[]}
      selectedIds={[]}
      status="draft"
      pricingAmount="10000"
      pricingCompareAtAmount=""
      pricingCurrency="not-a-currency"
      publishButtonLabel="Publish"
      isSaving={false}
      onToggleCollection={vi.fn()}
      onStatusChange={vi.fn()}
      onPublish={vi.fn()}
      onCreateCollection={vi.fn()}
    />
  );
  try {
    expect(view.container.textContent).toContain("NOT-A-CURRENCY 100.00");
    expect(view.container.textContent).toContain("Create your first collection");
  } finally {
    view.cleanup();
  }
});

test("CommerceContextPanel create mode shows Not created and draft copy", () => {
  const view = mount(
    <CommerceContextPanel
      isCreateMode
      draft={{ ...createEmptyCommerceDraft(), status: "draft" }}
      product={null}
      hasUnsavedChanges
    />
  );
  try {
    expect(view.container.textContent).toContain("New product draft.");
    expect(view.container.textContent).toContain("Not created");
    expect(view.container.textContent).toContain("Unsaved");
  } finally {
    view.cleanup();
  }
});

test("CommerceContextPanel edit mode formats product timestamps and status", () => {
  const draft: CommerceProductDraft = { ...createEmptyCommerceDraft(), status: "published" };
  const view = mount(
    <CommerceContextPanel
      isCreateMode={false}
      draft={draft}
      product={{
        id: "product-1",
        title: "Oak Desk",
        slug: "oak-desk",
        status: "published",
        excerpt: null,
        description: null,
        pricing: { amount: 12000, currency: "USD", compareAtAmount: null },
        stock: { state: "in_stock", quantity: 1 },
        collectionIds: [],
        mediaIds: [],
        variants: [],
        metadata: {},
        data: {},
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-02T00:00:00.000Z",
        publishedAt: "2026-03-03T00:00:00.000Z",
      }}
      hasUnsavedChanges={false}
    />
  );
  try {
    expect(view.container.textContent).toContain("product-1");
    expect(view.container.textContent).toContain("Saved");
    expect(view.container.textContent).toContain("Mar 3, 2026");
  } finally {
    view.cleanup();
  }
});

test("CommerceFilters status, collection, and stock selects emit change callbacks", async () => {
  const onStatusChange = vi.fn();
  const onCollectionChange = vi.fn();
  const onStockChange = vi.fn();
  const view = mount(
    <CommerceFilters
      search=""
      status="all"
      collection="all"
      stock="all"
      collectionOptions={[{ value: "c-1", label: "Premium" }]}
      onSearchChange={vi.fn()}
      onStatusChange={onStatusChange}
      onCollectionChange={onCollectionChange}
      onStockChange={onStockChange}
    />
  );
  try {
    const triggers = Array.from(view.container.querySelectorAll('[role="combobox"]'));
    await pickSelect(triggers[0], "Draft");
    expect(onStatusChange).toHaveBeenCalledWith("draft");
    await pickSelect(triggers[1], "Premium");
    expect(onCollectionChange).toHaveBeenCalledWith("c-1");
    await pickSelect(triggers[2], "Backorder");
    expect(onStockChange).toHaveBeenCalledWith("backorder");
  } finally {
    view.cleanup();
  }
});

test("CommerceTable falls back for invalid currencies", () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/commerce">
      <CommerceTable
        items={[
          row({
            id: "bad-currency",
            title: "Broken Currency",
            pricing: { amount: 1000, currency: "XX-INVALID", compareAtAmount: null },
          }),
        ]}
        onEdit={vi.fn()}
        onPublish={vi.fn()}
        onMoveToDraft={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    </AdminRouterProvider>
  );
  try {
    expect(view.container.textContent).toContain("XX-INVALID 10.00");
  } finally {
    view.cleanup();
  }
});

test("CommerceCollectionsPanel status select emits onStatusChange", async () => {
  const onStatusChange = vi.fn();
  const view = mount(
    <CommerceCollectionsPanel
      collections={[]}
      selectedIds={[]}
      status="draft"
      pricingAmount="10000"
      pricingCompareAtAmount=""
      pricingCurrency="USD"
      publishButtonLabel="Publish"
      isSaving={false}
      onToggleCollection={vi.fn()}
      onStatusChange={onStatusChange}
      onPublish={vi.fn()}
      onCreateCollection={vi.fn()}
    />
  );
  try {
    const trigger = Array.from(view.container.querySelectorAll('[role="combobox"]')).find(
      (entry) => entry.id === "commerce-status"
    );
    await pickSelect(trigger ?? null, "Published");
    expect(onStatusChange).toHaveBeenCalledWith("published");
  } finally {
    view.cleanup();
  }
});

test("CommerceContextPanel renders raw timestamps for products without publish data", () => {
  const draft: CommerceProductDraft = {
    ...createEmptyCommerceDraft(),
    status: "published",
  };
  const view = mount(
    <CommerceContextPanel
      isCreateMode={false}
      draft={draft}
      product={row({ id: "p-1", updatedAt: "2026-03-01T00:00:00.000Z", publishedAt: null })}
      hasUnsavedChanges={false}
    />
  );
  try {
    expect(view.container.textContent).toContain("Mar 1, 2026");
    expect(view.container.textContent).toContain("—");
  } finally {
    view.cleanup();
  }
});

test("CommerceContextPanel falls back to the raw timestamp when it cannot be formatted", () => {
  const originalToLocaleString = Date.prototype.toLocaleString;
  Date.prototype.toLocaleString = function toLocaleString() {
    if (Number.isNaN(this.getTime())) {
      throw new RangeError("Invalid time value");
    }
    return originalToLocaleString.call(this);
  };
  const draft: CommerceProductDraft = {
    ...createEmptyCommerceDraft(),
    status: "published",
  };
  const view = mount(
    <CommerceContextPanel
      isCreateMode={false}
      draft={draft}
      product={row({ id: "p-1", updatedAt: "not-a-real-date", publishedAt: null })}
      hasUnsavedChanges={false}
    />
  );
  try {
    expect(view.container.textContent).toContain("not-a-real-date");
  } finally {
    Date.prototype.toLocaleString = originalToLocaleString;
    view.cleanup();
  }
});

test("CommerceTable falls back to the raw timestamp when a date cannot be formatted", () => {
  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function toLocaleDateString() {
    if (Number.isNaN(this.getTime())) {
      throw new RangeError("Invalid time value");
    }
    return originalToLocaleDateString.call(this);
  };
  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/commerce">
      <CommerceTable
        items={[row({ id: "bad-date", updatedAt: "not-a-real-date" })]}
        onEdit={vi.fn()}
        onPublish={vi.fn()}
        onMoveToDraft={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />
    </AdminRouterProvider>
  );
  try {
    expect(view.container.textContent).toContain("not-a-real-date");
  } finally {
    Date.prototype.toLocaleDateString = originalToLocaleDateString;
    view.cleanup();
  }
});

test("CommerceTable row actions fire edit, publish, draft, archive, and delete", async () => {
  const onEdit = vi.fn();
  const onPublish = vi.fn();
  const onMoveToDraft = vi.fn();
  const onArchive = vi.fn();
  const onDelete = vi.fn();
  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/commerce">
      <CommerceTable
        items={[
          row({ id: "a", title: "Oak Desk", status: "draft" }),
          row({ id: "b", title: "Published Item", status: "published" }),
        ]}
        onEdit={onEdit}
        onPublish={onPublish}
        onMoveToDraft={onMoveToDraft}
        onArchive={onArchive}
        onDelete={onDelete}
      />
    </AdminRouterProvider>
  );
  try {
    const openActions = async (rowTitle: string) => {
      const actionsButton = Array.from(view.container.querySelectorAll("button")).find(
        (button) =>
          button.closest("tr")?.textContent?.includes(rowTitle) &&
          button.getAttribute("data-slot") === "dropdown-menu-trigger"
      );
      pointerClick(actionsButton);
      await React.act(async () => {
        await Promise.resolve();
      });
    };
    const clickMenuItem = (label: string) => {
      const item = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((entry) =>
        entry.textContent?.includes(label)
      );
      pointerClick(item ?? undefined);
    };

    await openActions("Oak Desk");
    clickMenuItem("Edit");
    expect(onEdit).toHaveBeenCalledWith("a");
    await openActions("Oak Desk");
    clickMenuItem("Publish");
    expect(onPublish).toHaveBeenCalledWith("a");
    await openActions("Published Item");
    clickMenuItem("Move to draft");
    expect(onMoveToDraft).toHaveBeenCalledWith("b");
    await openActions("Oak Desk");
    clickMenuItem("Archive");
    expect(onArchive).toHaveBeenCalledWith("a");
    await openActions("Oak Desk");
    clickMenuItem("Delete");
    expect(onDelete).toHaveBeenCalledWith("a");
  } finally {
    view.cleanup();
  }
});
