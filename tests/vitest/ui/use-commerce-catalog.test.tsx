// @vitest-environment happy-dom

// TASK-105-08-06: `useCommerceCatalog` lifecycle edges. The hook owns mount
// load, force/background refresh, cache-event rehydration, and error mapping.
// commerceClient functions are mocked; the real cacheBus drives events.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { ApiClientError } from "../../../core/admin/services/apiClient";
import type {
  CommerceCollectionRecord,
  CommerceProductRecord,
} from "../../../core/admin/services/commerceClient";

const catalogState = vi.hoisted(() => ({
  cachedProducts: null as CommerceProductRecord[] | null,
  cachedCollections: null as CommerceCollectionRecord[] | null,
  listProducts: vi.fn<(options?: { force?: boolean }) => Promise<CommerceProductRecord[]>>(),
  listCollections: vi.fn<(options?: { force?: boolean }) => Promise<CommerceCollectionRecord[]>>(),
  reset() {
    this.cachedProducts = null;
    this.cachedCollections = null;
    this.listProducts.mockReset();
    this.listCollections.mockReset();
  },
}));

vi.mock("../../../core/admin/services/commerceClient", () => ({
  getCachedCommerceProducts: () => catalogState.cachedProducts,
  getCachedCommerceCollections: () => catalogState.cachedCollections,
  listCommerceProductsCached: (options?: { force?: boolean }) => catalogState.listProducts(options),
  listCommerceCollectionsCached: (options?: { force?: boolean }) =>
    catalogState.listCollections(options),
}));

import { useCommerceCatalog } from "../../../core/admin/ui/commerce/hooks/useCommerceCatalog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product = (overrides: Partial<CommerceProductRecord> = {}): CommerceProductRecord => ({
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
});

const collection = (
  overrides: Partial<CommerceCollectionRecord> = {}
): CommerceCollectionRecord => ({
  id: overrides.id ?? "collection-1",
  name: overrides.name ?? "Premium",
  slug: overrides.slug ?? "premium",
  description: overrides.description ?? null,
  createdAt: overrides.createdAt ?? "2026-03-01T00:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-03-01T00:00:00.000Z",
});

type CatalogHarnessProps = { skip?: boolean };

function CatalogHarness({ skip }: CatalogHarnessProps) {
  const state = useCommerceCatalog({ skip });
  return (
    <output data-testid="catalog">
      <span data-products={state.products.map((row) => row.id).join(",")} />
      <span data-collections={state.collections.map((row) => row.id).join(",")} />
      <span data-loading-products={String(state.isLoadingProducts)} />
      <span data-loading-collections={String(state.isLoadingCollections)} />
      <span data-error={state.error ?? ""} />
      <button
        type="button"
        data-action="refresh-products"
        onClick={() => void state.refreshProducts()}
      >
        refresh products
      </button>
      <button
        type="button"
        data-action="force-products"
        onClick={() => void state.refreshProducts({ force: true })}
      >
        force products
      </button>
      <button
        type="button"
        data-action="background-products"
        onClick={() => void state.refreshProducts({ force: true, background: true })}
      >
        background products
      </button>
      <button
        type="button"
        data-action="refresh-collections"
        onClick={() => void state.refreshCollections()}
      >
        refresh collections
      </button>
    </output>
  );
}

const mount = (props?: CatalogHarnessProps) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<CatalogHarness {...props} />);
  });
  const read = () => {
    const node = container.querySelector('[data-testid="catalog"]');
    if (!node) throw new Error("catalog harness missing");
    const dataset = node.querySelectorAll<HTMLElement>("span");
    return {
      products: dataset[0]?.dataset.products ?? "",
      collections: dataset[1]?.dataset.collections ?? "",
      loadingProducts: dataset[2]?.dataset.loadingProducts,
      loadingCollections: dataset[3]?.dataset.loadingCollections,
      error: dataset[4]?.dataset.error ?? "",
    };
  };
  return {
    container,
    read,
    click: (action: string) => {
      const button = container.querySelector<HTMLElement>(`[data-action="${action}"]`);
      if (!button) throw new Error(`missing button ${action}`);
      React.act(() => {
        button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  catalogState.reset();
  document.body.innerHTML = "";
});

test("mount with no cache loads products and collections and clears loading", async () => {
  catalogState.listProducts.mockResolvedValue([product()]);
  catalogState.listCollections.mockResolvedValue([collection()]);

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(catalogState.listProducts).toHaveBeenCalledWith({ force: true });
    expect(catalogState.listCollections).toHaveBeenCalledWith({ force: true });
    const state = view.read();
    expect(state.products).toBe("product-1");
    expect(state.collections).toBe("collection-1");
    expect(state.loadingProducts).toBe("false");
    expect(state.loadingCollections).toBe("false");
    expect(state.error).toBe("");
  } finally {
    view.cleanup();
  }
});

test("mount keeps cached rows and forces a background refresh", async () => {
  catalogState.cachedProducts = [product({ id: "cached-product" })];
  catalogState.cachedCollections = [collection({ id: "cached-collection" })];
  catalogState.listProducts.mockResolvedValue([product({ id: "cached-product" })]);
  catalogState.listCollections.mockResolvedValue([collection({ id: "cached-collection" })]);

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(catalogState.listProducts).toHaveBeenCalledWith({ force: false });
    const state = view.read();
    expect(state.products).toBe("cached-product");
    expect(state.collections).toBe("cached-collection");
  } finally {
    view.cleanup();
  }
});

test("mount surfaces an API error while collections still load", async () => {
  catalogState.listProducts.mockRejectedValue(
    new ApiClientError("catalog_failed", "Catalog exploded", 500)
  );
  catalogState.listCollections.mockResolvedValue([collection()]);

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const state = view.read();
    expect(state.error).toBe("Catalog exploded");
    expect(state.products).toBe("");
    expect(state.collections).toBe("collection-1");
  } finally {
    view.cleanup();
  }
});

test("mount surfaces a generic error when the client throws a plain Error", async () => {
  catalogState.listProducts.mockRejectedValue(new Error("boom"));
  catalogState.listCollections.mockRejectedValue(new Error("boom"));

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.read().error).toBe("boom");
  } finally {
    view.cleanup();
  }
});

test("skip defers all loading until the option is removed", async () => {
  catalogState.listProducts.mockResolvedValue([product()]);
  catalogState.listCollections.mockResolvedValue([collection()]);

  const view = mount({ skip: true });
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(catalogState.listProducts).not.toHaveBeenCalled();
    expect(catalogState.listCollections).not.toHaveBeenCalled();
    expect(view.read().loadingProducts).toBe("true");
    expect(view.read().loadingCollections).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("a non-Error non-API failure maps to the generic catalog message", async () => {
  catalogState.listProducts.mockRejectedValue("plain string");
  catalogState.listCollections.mockResolvedValue([collection()]);
  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.read().error).toBe("Failed to load commerce catalog.");
  } finally {
    view.cleanup();
  }
});

test("refresh before hydration clears loading around a successful load", async () => {
  catalogState.listProducts.mockResolvedValue([product()]);
  catalogState.listCollections.mockResolvedValue([collection()]);
  const view = mount({ skip: true });
  try {
    view.click("force-products");
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(catalogState.listProducts).toHaveBeenCalledWith({ force: true });
    expect(view.read().loadingProducts).toBe("false");

    view.click("refresh-collections");
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(catalogState.listCollections).toHaveBeenCalledWith({ force: false });
    expect(view.read().loadingCollections).toBe("false");
  } finally {
    view.cleanup();
  }
});

test("refreshProducts refresh, force, and background overloads reload from the client", async () => {
  catalogState.listProducts.mockResolvedValue([product()]);
  catalogState.listCollections.mockResolvedValue([collection()]);
  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    catalogState.listProducts.mockClear();

    view.click("force-products");
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(catalogState.listProducts).toHaveBeenCalledWith({ force: true });
    expect(view.read().loadingProducts).toBe("false");

    catalogState.listProducts.mockClear();
    view.click("background-products");
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(catalogState.listProducts).toHaveBeenCalledWith({ force: true });

    catalogState.listProducts.mockClear();
    view.click("refresh-products");
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(catalogState.listProducts).toHaveBeenCalledWith({ force: false });
    expect(view.read().loadingProducts).toBe("false");
  } finally {
    view.cleanup();
  }
});

test("refreshProducts surfaces a refresh error and refreshCollections replaces rows", async () => {
  catalogState.listProducts.mockResolvedValue([product()]);
  catalogState.listCollections.mockResolvedValue([collection()]);
  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    catalogState.listProducts.mockRejectedValue(new Error("refresh boom"));
    view.click("refresh-products");
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.read().error).toBe("refresh boom");

    catalogState.listCollections.mockResolvedValue([collection({ id: "next-collection" })]);
    view.click("refresh-collections");
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.read().collections).toBe("next-collection");
  } finally {
    view.cleanup();
  }
});

test("cache events rehydrate products and collections then force refresh", async () => {
  catalogState.cachedProducts = [product()];
  catalogState.cachedCollections = [collection()];
  catalogState.listProducts.mockResolvedValue([product({ id: "fresh" })]);
  catalogState.listCollections.mockResolvedValue([collection({ id: "fresh-collection" })]);

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    catalogState.cachedProducts = [product({ id: "event-product" })];
    catalogState.listProducts.mockResolvedValue([product({ id: "event-product" })]);
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "update" });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.read().products).toBe("event-product");

    catalogState.cachedCollections = [collection({ id: "event-collection" })];
    catalogState.listCollections.mockResolvedValue([collection({ id: "event-collection" })]);
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.commerceCollectionsList, action: "update" });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.read().collections).toBe("event-collection");
  } finally {
    view.cleanup();
  }
});

test("cache events with no cached rows still force a refresh", async () => {
  catalogState.listProducts.mockResolvedValue([product({ id: "refreshed" })]);
  catalogState.listCollections.mockResolvedValue([collection()]);

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    catalogState.listProducts.mockClear();
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "update" });
      await Promise.resolve();
    });
    expect(catalogState.listProducts).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("unmount during a pending mount load ignores late results", async () => {
  let resolveProducts: ((items: CommerceProductRecord[]) => void) | null = null;
  let resolveCollections: ((items: CommerceCollectionRecord[]) => void) | null = null;
  catalogState.listProducts.mockImplementation(
    () =>
      new Promise<CommerceProductRecord[]>((resolve) => {
        resolveProducts = resolve;
      })
  );
  catalogState.listCollections.mockImplementation(
    () =>
      new Promise<CommerceCollectionRecord[]>((resolve) => {
        resolveCollections = resolve;
      })
  );

  const view = mount();
  view.cleanup();
  await React.act(async () => {
    resolveProducts?.([product({ id: "late-product" })]);
    resolveCollections?.([collection({ id: "late-collection" })]);
    await Promise.resolve();
  });
  expect(catalogState.listProducts).toHaveBeenCalled();
  expect(catalogState.listCollections).toHaveBeenCalled();
});

test("refreshCollections failure surfaces a mapped error", async () => {
  catalogState.listProducts.mockResolvedValue([product()]);
  catalogState.listCollections.mockResolvedValue([collection()]);
  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    catalogState.listCollections.mockRejectedValue(new Error("collection refresh boom"));
    view.click("refresh-collections");
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(view.read().error).toBe("collection refresh boom");
  } finally {
    view.cleanup();
  }
});

test("cache event refresh failures are swallowed after rehydration", async () => {
  catalogState.cachedProducts = [product()];
  catalogState.cachedCollections = [collection()];
  catalogState.listProducts.mockResolvedValue([product()]);
  catalogState.listCollections.mockResolvedValue([collection()]);

  const view = mount();
  try {
    await React.act(async () => {
      await Promise.resolve();
    });
    catalogState.listProducts.mockRejectedValue(new Error("refresh exploded"));
    catalogState.listCollections.mockRejectedValue(new Error("refresh exploded"));
    catalogState.cachedProducts = [product({ id: "rehydrated" })];
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.commerceProductsList, action: "update" });
      await Promise.resolve();
    });
    expect(view.read().products).toBe("rehydrated");

    catalogState.cachedCollections = [collection({ id: "rehydrated-collection" })];
    await React.act(async () => {
      broadcastCacheEvent({ key: cacheKeys.commerceCollectionsList, action: "update" });
      await Promise.resolve();
    });
    expect(view.read().collections).toBe("rehydrated-collection");
  } finally {
    view.cleanup();
  }
});
