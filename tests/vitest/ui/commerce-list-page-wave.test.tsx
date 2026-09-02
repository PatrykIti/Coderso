// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type {
  CommerceCollectionRecord,
  CommerceProductRecord,
  CommerceProductUpdateInput,
} from "../../../core/admin/services/commerceClient";
import type { CommerceBulkActionValue } from "../../../core/admin/ui/commerce/CommerceBulkActionsBar";

type RefreshCommerceProductsMock = (
  options?: boolean | { force?: boolean; background?: boolean }
) => Promise<void>;

type UpdateCommerceProductMock = (id: string, input: CommerceProductUpdateInput) => Promise<void>;

type DeleteCommerceProductMock = (id: string) => Promise<void>;

const commercePageState = vi.hoisted(() => ({
  navigate: vi.fn(),
  refreshProducts: vi.fn<RefreshCommerceProductsMock>(async () => undefined),
  updateCommerceProduct: vi.fn<UpdateCommerceProductMock>(async () => undefined),
  deleteCommerceProduct: vi.fn<DeleteCommerceProductMock>(async () => undefined),
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    onOpenChange,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    confirmLabel: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void | Promise<void>;
  }) =>
    open ? (
      <div>
        <p>{title}</p>
        <button type="button" onClick={() => onOpenChange(false)}>
          dialog-close
        </button>
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
    onActionChange: (value: CommerceBulkActionValue | "") => void;
    onApply: () => void;
  }) => (
    <div>
      <span>{`bulk:products:${selectedCount}`}</span>
      <button type="button" onClick={() => onActionChange("publish")}>
        choose-publish
      </button>
      <button type="button" onClick={() => onActionChange("draft")}>
        choose-draft
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
    onToggleAll,
    onToggleProduct,
    onEdit,
    onPublish,
    onMoveToDraft,
    onArchive,
    onDelete,
  }: {
    items: Array<{ id: string; title: string; collectionLabels: string[] }>;
    selectedIds: string[];
    onToggleAll: () => void;
    onToggleProduct: (id: string) => void;
    onEdit: (id: string) => void;
    onPublish: (id: string) => void;
    onMoveToDraft: (id: string) => void;
    onArchive: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <div>
      <span>{`product-count:${items.length}`}</span>
      <span>{`selected:${selectedIds.join(",")}`}</span>
      <button type="button" onClick={onToggleAll}>
        toggle-all
      </button>
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
          <button type="button" onClick={() => onMoveToDraft(item.id)}>
            {`draft-product:${item.title}`}
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
      (_action: string, ids: string[], results: PromiseSettledResult<unknown>[]) => {
        const failedTargets = ids.filter((_id, index) => results[index]?.status === "rejected");
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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
};

const flush = async () => {
  await React.act(async () => {
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
    filterCommerceProducts(enriched, "storage", "all", "all", "all").map((item) => item.id)
  ).toEqual(["product-2"]);
  expect(
    filterCommerceProducts(enriched, "", "published", "all", "backorder").map((item) => item.id)
  ).toEqual(["product-2"]);
  expect(
    filterCommerceProducts(enriched, "", "all", "collection-1", "all").map((item) => item.id)
  ).toEqual(["product-1"]);
});

test("CommerceListPage routes New, updates lifecycle, and confirms row delete", async () => {
  const view = mount(<CommerceListPage />);

  try {
    clickByText(view.container, "New");
    expect(commercePageState.navigate).toHaveBeenCalledWith("/advanced/commerce/new");

    clickByText(view.container, "edit-product:Oak Desk");
    expect(commercePageState.navigate).toHaveBeenCalledWith("/advanced/commerce/product-1");

    clickByText(view.container, "publish-product:Oak Desk");
    await flush();
    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith("product-1", {
      status: "published",
    });
    expect(commercePageState.refreshProducts).toHaveBeenCalledWith({
      force: true,
      background: true,
    });

    clickByText(view.container, "delete-product:Oak Desk");
    expect(commercePageState.deleteCommerceProduct).not.toHaveBeenCalled();
    clickByText(view.container, "Delete product");
    await flush();
    expect(commercePageState.deleteCommerceProduct).toHaveBeenCalledWith("product-1");
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

    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith("product-1", {
      status: "archived",
    });
    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith("product-2", {
      status: "archived",
    });
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

    expect(commercePageState.deleteCommerceProduct).toHaveBeenCalledWith("product-1");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage row archive maps a status patch and edit navigates", async () => {
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "archive-product:Oak Desk");
    await flush();
    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith("product-1", {
      status: "archived",
    });
    commercePageState.updateCommerceProduct.mockClear();
    // product-2 is published; editing opens its editor route.
    clickByText(view.container, "edit-product:Walnut Shelf");
    await flush();
    expect(commercePageState.navigate).toHaveBeenCalledWith("/advanced/commerce/product-2");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage row delete failure keeps the row selected and surfaces the error", async () => {
  commercePageState.failingProductId = "product-1";
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "delete-product:Oak Desk");
    clickByText(view.container, "Delete product");
    await flush();
    expect(commercePageState.deleteCommerceProduct).toHaveBeenCalledWith("product-1");
    expect(view.container.textContent).toContain("delete failed");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage toggle-all selects and clears the visible selection", async () => {
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "select-product:Oak Desk");
    expect(view.container.textContent).toContain("selected:product-1");
    clickByText(view.container, "select-product:Oak Desk");
    expect(view.container.textContent).toContain("selected:");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage bulk failure surfaces the action error", async () => {
  commercePageState.failingProductId = "product-1";
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "select-product:Oak Desk");
    clickByText(view.container, "choose-publish");
    clickByText(view.container, "apply-bulk");
    await flush();
    // Partial failures surface the summary inline message.
    expect(view.container.textContent).toContain("bulk product result");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage bulk move-to-draft maps to a draft status patch", async () => {
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "select-product:Oak Desk");
    clickByText(view.container, "choose-draft");
    clickByText(view.container, "apply-bulk");
    await flush();
    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith("product-1", {
      status: "draft",
    });
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage row move-to-draft triggers a draft status patch", async () => {
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "draft-product:Walnut Shelf");
    await flush();
    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith("product-2", {
      status: "draft",
    });
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage toggle-all selects the visible rows", async () => {
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "toggle-all");
    expect(view.container.textContent).toContain("selected:product-1,product-2");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage single status failure surfaces the action error", async () => {
  commercePageState.failingProductId = "product-1";
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "publish-product:Oak Desk");
    await flush();
    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith("product-1", {
      status: "published",
    });
    expect(view.container.textContent).toContain("status failed");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage successful row delete drops the id from the selection", async () => {
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "select-product:Oak Desk");
    clickByText(view.container, "delete-product:Oak Desk");
    clickByText(view.container, "Delete product");
    await flush();
    expect(view.container.textContent).toContain("selected:");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage closing the delete dialog keeps the selection", async () => {
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "select-product:Oak Desk");
    clickByText(view.container, "delete-product:Oak Desk");
    clickByText(view.container, "dialog-close");
    expect(commercePageState.deleteCommerceProduct).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("selected:product-1");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage closing the bulk delete dialog cancels the bulk deletion", async () => {
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "select-product:Oak Desk");
    clickByText(view.container, "select-product:Walnut Shelf");
    clickByText(view.container, "choose-delete");
    clickByText(view.container, "apply-bulk");
    clickByText(view.container, "dialog-close");
    expect(commercePageState.deleteCommerceProduct).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("selected:product-1,product-2");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage bulk action refresh failure surfaces the fallback error", async () => {
  commercePageState.refreshProducts.mockRejectedValue(new Error("refresh failed"));
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "select-product:Oak Desk");
    clickByText(view.container, "choose-publish");
    clickByText(view.container, "apply-bulk");
    await flush();
    expect(commercePageState.updateCommerceProduct).toHaveBeenCalledWith("product-1", {
      status: "published",
    });
    expect(view.container.textContent).toContain("refresh failed");
  } finally {
    view.cleanup();
    commercePageState.refreshProducts.mockResolvedValue(undefined);
  }
});

test("CommerceListPage bulk apply with no action is a no-op", async () => {
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "select-product:Oak Desk");
    clickByText(view.container, "apply-bulk");
    expect(commercePageState.updateCommerceProduct).not.toHaveBeenCalled();
    expect(commercePageState.deleteCommerceProduct).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage manage collections navigates to the collections page", async () => {
  const view = mount(<CommerceListPage />);
  try {
    clickByText(view.container, "Manage collections");
    expect(commercePageState.navigate).toHaveBeenCalledWith("/advanced/commerce/collections");
  } finally {
    view.cleanup();
  }
});

test("CommerceListPage sorts collection options by label with multiple collections", () => {
  const previousCollections = commercePageState.collections;
  commercePageState.collections = [
    ...previousCollections,
    {
      id: "collection-2",
      name: "Basics",
      slug: "basics",
      description: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
  ];
  const view = mount(<CommerceListPage />);
  try {
    expect(view.container.textContent).toContain("product-count:2");
  } finally {
    view.cleanup();
    commercePageState.collections = previousCollections;
  }
});
