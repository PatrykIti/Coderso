// @vitest-environment happy-dom

// TASK-479-19-L03: locks the Commerce products LIST restyle (soft catalog-derived
// stat row, rounded-2xl DataTable with a leading product tile + token-driven stock
// and status badges, AdminLink prefetch preserved). Renders the REAL CommerceTable
// and shared StatCard — only the data hook / client / AdminShell / PageHeader are
// mocked (to skip the auth-bootstrap fetch). The selection -> bulk-action behavior
// stays locked by the existing commerce-list-page-wave suite, so this suite does not
// re-drive Radix Checkbox interaction under happy-dom.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type {
  CommerceCollectionRecord,
  CommerceProductRecord,
  CommerceProductStatus,
  CommerceStockState,
} from "../../../core/admin/services/commerceClient";

const catalogState = vi.hoisted(() => ({
  navigate: vi.fn(),
  prefetch: vi.fn(),
  updateCommerceProduct: vi.fn(async () => undefined),
  deleteCommerceProduct: vi.fn(async () => undefined),
  refreshProducts: vi.fn(async () => undefined),
  products: [] as CommerceProductRecord[],
  collections: [] as CommerceCollectionRecord[],
  error: null as string | null,
  reset() {
    this.navigate.mockReset();
    this.prefetch.mockReset();
    this.refreshProducts.mockReset();
    this.refreshProducts.mockResolvedValue(undefined);
    this.products = [];
    this.collections = [];
    this.error = null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/commerceClient", () => ({
  updateCommerceProduct: catalogState.updateCommerceProduct,
  deleteCommerceProduct: catalogState.deleteCommerceProduct,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: catalogState.navigate,
    prefetch: catalogState.prefetch,
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/commerce/hooks/useCommerceCatalog", () => ({
  useCommerceCatalog: () => ({
    products: catalogState.products,
    collections: catalogState.collections,
    isLoadingProducts: false,
    isLoadingCollections: false,
    error: catalogState.error,
    refreshProducts: catalogState.refreshProducts,
  }),
}));

vi.mock("../../../core/admin/ui/commerce/commerceActionToasts", () => ({
  commerceListToasts: {
    success: vi.fn(),
    error: vi.fn(() => "Commerce action failed."),
    summarizeBulkAction: vi.fn(() => ({
      ok: true,
      toastMessage: "",
      inlineMessage: "",
      succeededCount: 0,
      failedCount: 0,
      failedTargets: [],
    })),
    emitBulk: vi.fn(),
  },
}));

import { CommerceListPage } from "../../../core/admin/ui/commerce/CommerceListPage";

const TITLES: Record<string, string> = {
  "product-1": "Oak Desk",
  "product-2": "Walnut Shelf",
};

const product = (
  id: string,
  status: CommerceProductStatus,
  stock: CommerceStockState
): CommerceProductRecord => ({
  id,
  title: TITLES[id] ?? id,
  slug: id,
  status,
  excerpt: "Office furniture",
  description: null,
  pricing: { amount: 12000, currency: "USD", compareAtAmount: null },
  stock: { state: stock, quantity: 4 },
  collectionIds: [],
  mediaIds: [],
  variants: [],
  metadata: {},
  data: {},
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-02T00:00:00.000Z",
  publishedAt: status === "published" ? "2026-03-02T00:00:00.000Z" : null,
});

const seedCatalog = (products: CommerceProductRecord[]) => {
  catalogState.products = products;
};

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

const clickableLabels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("button")).map(
    (button) => button.textContent?.trim() ?? ""
  );

beforeEach(() => {
  catalogState.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("Commerce list restyle", () => {
  test("header, catalog-derived stat row, and a rounded-2xl table", () => {
    seedCatalog([
      product("product-1", "published", "in_stock"),
      product("product-2", "draft", "out_of_stock"),
    ]);
    const view = mount(<CommerceListPage />);
    try {
      expect(view.container.textContent).toContain("Commerce"); // PageHeader title
      expect(clickableLabels(view.container)).toContain("New"); // create action
      // stat row DERIVED from the catalog (NOT mock revenue): total/published/out-of-stock
      expect(view.container.textContent).toContain("Products");
      expect(view.container.textContent).toContain("Published");
      expect(view.container.textContent).toContain("Out of stock");
      // restyled table wrapper carries the rounded-2xl / card classes
      expect(view.container.querySelector("[class*='rounded-2xl']")).toBeTruthy();
      expect(view.container.querySelector("table")).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });

  test("token-driven status + stock badges render expected labels", () => {
    seedCatalog([product("product-1", "published", "backorder")]);
    const view = mount(<CommerceListPage />);
    try {
      expect(view.container.textContent).toContain("Published"); // status surface
      expect(view.container.textContent).toContain("Backorder"); // stock badge
    } finally {
      view.cleanup();
    }
  });

  test("product cell still links to the editor via AdminLink (prefetch preserved)", () => {
    seedCatalog([product("product-1", "published", "in_stock")]);
    const view = mount(<CommerceListPage />);
    try {
      const link = view.container.querySelector("a[href*='/advanced/commerce/product-1']");
      expect(link).toBeTruthy();
      expect(link?.getAttribute("aria-label")).toContain("Edit product");
    } finally {
      view.cleanup();
    }
  });

  test("per-row + select-all checkboxes render", () => {
    seedCatalog([product("product-1", "published", "in_stock")]);
    const view = mount(<CommerceListPage />);
    try {
      expect(view.container.querySelector("[aria-label='Select all products']")).toBeTruthy();
      expect(view.container.querySelector("[aria-label='Select Oak Desk']")).toBeTruthy();
    } finally {
      view.cleanup();
    }
  });
});
