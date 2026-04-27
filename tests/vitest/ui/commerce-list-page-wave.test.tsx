// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type {
  CommerceCollectionRecord,
  CommerceProductRecord,
  CommerceProductUpdateInput,
} from "../../../core/admin/services/commerceClient";

type RefreshCommerceProductsMock = (
  options?: boolean | { force?: boolean; background?: boolean }
) => Promise<void>;

type UpdateCommerceProductMock = (
  id: string,
  input: CommerceProductUpdateInput
) => Promise<void>;

type DeleteCommerceProductMock = (id: string) => Promise<void>;

const commercePageState = vi.hoisted(() => ({
  navigate: vi.fn(),
  refreshProducts: vi.fn<RefreshCommerceProductsMock>(async () => undefined),
  updateCommerceProduct: vi.fn<UpdateCommerceProductMock>(
    async () => undefined
  ),
  deleteCommerceProduct: vi.fn<DeleteCommerceProductMock>(
    async () => undefined
  ),
  products: [
    {
      id: "product-1",
      title: "Oak Desk",
      slug: "oak-desk",
      status: "draft",
      excerpt: "Office furniture",
      description: null,
      pricing: { amount: 12000, currency: "USD", compareAtAmount: null },
      stock: { state: "in_stock", quantity: 4 },
      collectionIds: ["collection-1"],
      mediaIds: [],
      variants: [],
      metadata: {},
      data: {},
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      publishedAt: null,
    },
    {
      id: "product-2",
      title: "Walnut Shelf",
      slug: "walnut-shelf",
      status: "published",
      excerpt: "Wall storage",
      description: null,
      pricing: { amount: 9000, currency: "USD", compareAtAmount: null },
      stock: { state: "backorder", quantity: null },
      collectionIds: ["missing-collection"],
      mediaIds: [],
      variants: [],
      metadata: {},
      data: {},
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-03T00:00:00.000Z",
      publishedAt: "2026-03-03T00:00:00.000Z",
    },
  ] satisfies CommerceProductRecord[],
  collections: [
    {
      id: "collection-1",
      name: "Premium",
      slug: "premium",
      description: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
  ] satisfies CommerceCollectionRecord[],
  error: null as string | null,
  failingProductId: null as string | null,
  reset() {
    this.navigate.mockReset();
    this.refreshProducts.mockReset();
    this.refreshProducts.mockResolvedValue(undefined);
    this.updateCommerceProduct.mockReset();
    this.updateCommerceProduct.mockImplementation(async (id: string) => {
      if (id === this.failingProductId) throw new Error("status failed");
    });
    this.deleteCommerceProduct.mockReset();
    this.deleteCommerceProduct.mockImplementation(async (id: string) => {
      if (id === this.failingProductId) throw new Error("delete failed");
    });
    this.error = null;
    this.failingProductId = null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/services/commerceClient", () => ({
  updateCommerceProduct: commercePageState.updateCommerceProduct,
  deleteCommerceProduct: commercePageState.deleteCommerceProduct,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: commercePageState.navigate,
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
    title: string;
    description: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    confirmLabel,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  }) =>
    open ? (
      <div>
        <p>{title}</p>
        <button type="button" onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
      </div>
    ) : null,
}));

vi.mock("@/ui/shared/ListPaginationFooter", () => ({
  ListPaginationFooter: ({ resourceLabel }: { resourceLabel: string }) => (
    <div>{`pagination:${resourceLabel}`}</div>
  ),
}));

vi.mock("../../../core/admin/ui/commerce/CommerceFilters", () => ({
  CommerceFilters: () => <div>commerce-filters</div>,
}));

vi.mock("../../../core/admin/ui/commerce/CommerceBulkActionsBar", () => ({
  CommerceBulkActionsBar: ({
    selectedCount,
    onActionChange,
    onApply,
  }: {
    selectedCount: number;
    onActionChange: (value: "publish" | "archive" | "delete") => void;
    onApply: () => void;
  }) => (
    <div>
      <span>{`bulk:products:${selectedCount}`}</span>
      <button type="button" onClick={() => onActionChange("publish")}>
        choose-publish
      </button>
      <button type="button" onClick={() => onActionChange("archive")}>
        choose-archive
      </button>
      <button type="button" onClick={() => onActionChange("delete")}>
        choose-delete
      </button>
      <button type="button" onClick={onApply}>
        apply-bulk
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/commerce/CommerceTable", () => ({
  CommerceTable: ({
    items,
    selectedIds,
    onToggleProduct,
    onEdit,
    onPublish,
    onArchive,
    onDelete,
  }: {
    items: Array<{ id: string; title: string; collectionLabels: string[] }>;
    selectedIds: string[];
    onToggleProduct: (id: string) => void;
    onEdit: (id: string) => void;
    onPublish: (id: string) => void;
    onArchive: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <div>
      <span>{`product-count:${items.length}`}</span>
      <span>{`selected:${selectedIds.join(",")}`}</span>
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.collectionLabels.join("|")}</span>
          <button type="button" onClick={() => onToggleProduct(item.id)}>
            {`select-product:${item.title}`}
          </button>
          <button type="button" onClick={() => onEdit(item.id)}>
            {`edit-product:${item.title}`}
          </button>
          <button type="button" onClick={() => onPublish(item.id)}>
            {`publish-product:${item.title}`}
          </button>
          <button type="button" onClick={() => onArchive(item.id)}>
            {`archive-product:${item.title}`}
          </button>
          <button type="button" onClick={() => onDelete(item.id)}>
            {`delete-product:${item.title}`}
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/commerce/hooks/useCommerceCatalog", () => ({
  useCommerceCatalog: () => ({
    products: commercePageState.products,
    collections: commercePageState.collections,
    isLoadingProducts: false,
    isLoadingCollections: false,
    error: commercePageState.error,
    refreshProducts: commercePageState.refreshProducts,
  }),
}));

vi.mock("../../../core/admin/ui/commerce/commerceActionToasts", () => ({
  commerceListToasts: {
    success: vi.fn(),
    error: vi.fn((_action: string, error: unknown) =>
      error instanceof Error ? error.message : "Commerce action failed."
    ),
    summarizeBulkAction: vi.fn(
      (
        _action: string,
        ids: string[],
        results: PromiseSettledResult<unknown>[]
      ) => {
        const failedTargets = ids.filter(
          (_id, index) => results[index]?.status === "rejected"
        );
        return {
          ok: failedTargets.length === 0,
          toastMessage: "bulk product result",
          inlineMessage: "bulk product result",
          succeededCount: ids.length - failedTargets.length,
          failedCount: failedTargets.length,
          failedTargets,
        };
      }
    ),
    emitBulk: vi.fn(),
  },
}));

import {
  CommerceListPage,
  enrichCommerceProducts,
  filterCommerceProducts,
} from "../../../core/admin/ui/commerce/CommerceListPage";

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.click();
  });
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  commercePageState.reset();
});

afterEach(() => {
  vi.clearAllMocks();
});

test("Commerce list helpers enrich collections and filter product rows", () => {
  const enriched = enrichCommerceProducts(
    commercePageState.products,
    commercePageState.collections
  );

  expect(enriched[0]?.collectionLabels).toEqual(["Premium"]);
  expect(enriched[1]?.collectionLabels).toEqual(["Missing collection"]);
  expect(
    filterCommerceProducts(enriched, "storage", "all", "all", "all").map(
      (item) => item.id
    )
  ).toEqual(["product-2"]);
  expect(
    filterCommerceProducts(enriched, "", "published", "all", "backorder").map(
      (item) => item.id
    )
  ).toEqual(["product-2"]);
  expect(
    filterCommerceProducts(enriched, "", "all", "collection-1", "all").map(
      (item) => item.id
    )
  ).toEqual(["product-1"]);
});

test("CommerceListPage routes New, updates lifecycle, and confirms row delete", async () => {
  const view = mount(<CommerceListPage />);

  try {
    clickByText(view.container, "New");
    expect(commercePageState.navigate).toHaveBeenCalledWith(
      "/coderso/commerce/new"
    );

    clickByText(view.container, "edit-product:Oak Desk");
    expect(commercePageState.navigate).toHaveBeenCalledWith(
      "/coderso/commerce/product-1"
    );

    clickByText(view.container, "publish-product:Oak Desk");
    await flush();
    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith(
      "product-1",
      { status: "published" }
    );
    expect(commercePageState.refreshProducts).toHaveBeenCalledWith({
      force: true,
      background: true,
    });

    clickByText(view.container, "delete-product:Oak Desk");
    expect(commercePageState.deleteCommerceProduct).not.toHaveBeenCalled();
    clickByText(view.container, "Delete product");
    await flush();
    expect(commercePageState.deleteCommerceProduct).toHaveBeenCalledWith(
      "product-1"
    );
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage bulk actions use visible selection and keep failed rows selected", async () => {
  commercePageState.failingProductId = "product-2";
  const view = mount(<CommerceListPage />);

  try {
    clickByText(view.container, "select-product:Oak Desk");
    clickByText(view.container, "select-product:Walnut Shelf");
    expect(view.container.textContent).toContain("bulk:products:2");

    clickByText(view.container, "choose-archive");
    clickByText(view.container, "apply-bulk");
    await flush();

    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith(
      "product-1",
      { status: "archived" }
    );
    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith(
      "product-2",
      { status: "archived" }
    );
    expect(view.container.textContent).toContain("selected:product-2");
    expect(view.container.textContent).toContain("bulk product result");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage confirms bulk delete before mutating products", async () => {
  const view = mount(<CommerceListPage />);

  try {
    clickByText(view.container, "select-product:Oak Desk");
    clickByText(view.container, "choose-delete");
    clickByText(view.container, "apply-bulk");

    expect(commercePageState.deleteCommerceProduct).not.toHaveBeenCalled();
    clickByText(view.container, "Delete selected");
    await flush();

    expect(commercePageState.deleteCommerceProduct).toHaveBeenCalledWith(
      "product-1"
    );
  } finally {
    view.cleanup();
  }
});
