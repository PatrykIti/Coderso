import React from "react";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { resolveAdminRoute } from "../../../core/admin/app/adminRoutes";
import { CommerceCollectionsPage } from "../../../core/admin/ui/commerce/CommerceCollectionsPage";
import { CommerceEditorPage } from "../../../core/admin/ui/commerce/CommerceEditorPage";
import { CommerceListPage } from "../../../core/admin/ui/commerce/CommerceListPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("CommerceListPage renders shell and loading state", () => {
  const html = renderAdminUi(<CommerceListPage />, {
    path: "/admin/advanced/commerce",
  });

  expect(html).toContain("Commerce");
  expect(html).toContain("New");
  expect(html).toContain("Loading products");
});

test("CommerceListPage renders cached products without loading placeholder", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.commerceProductsList,
      JSON.stringify({
        value: [
          {
            id: "product-1",
            title: "Cached product",
            slug: "cached-product",
            status: "draft",
            excerpt: "Cache hydration smoke test",
            description: null,
            pricing: { amount: 1000, currency: "USD", compareAtAmount: null },
            stock: { state: "in_stock", quantity: 1 },
            collectionIds: ["collection-1"],
            mediaIds: [],
            variants: [],
            metadata: {},
            data: {},
            createdAt: "2026-02-19T00:00:00.000Z",
            updatedAt: "2026-02-19T00:00:00.000Z",
            publishedAt: null,
          },
        ],
        savedAt: Date.now(),
      })
    );
    storage.setItem(
      cacheKeys.commerceCollectionsList,
      JSON.stringify({
        value: [
          {
            id: "collection-1",
            name: "Premium",
            slug: "premium",
            description: null,
            createdAt: "2026-02-19T00:00:00.000Z",
            updatedAt: "2026-02-19T00:00:00.000Z",
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<CommerceListPage />, {
      path: "/admin/advanced/commerce",
    });

    expect(html).toContain("Cached product");
    expect(html).toContain("Premium");
    expect(html).toContain("Select all products");
    expect(html).not.toContain("Loading products");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("CommerceEditorPage renders product editor controls in create mode", () => {
  const html = renderAdminUi(<CommerceEditorPage />, {
    path: "/admin/advanced/commerce/new",
  });

  expect(html).toContain("New product");
  expect(html).toContain("Details");
  expect(html).toContain("Pricing");
  expect(html).toContain("Inventory");
  expect(html).toContain("Save changes");
  expect(html).toContain("Publish");
});

test("product editor renders the Variants card and Add variant control", () => {
  const html = renderAdminUi(<CommerceEditorPage />, {
    path: "/admin/advanced/commerce/new",
  });

  expect(html).toContain("Variants");
  expect(html).toContain("Add variant");
});

test("commerce list header exposes Manage collections", () => {
  const html = renderAdminUi(<CommerceListPage />, {
    path: "/admin/advanced/commerce",
  });

  expect(html).toContain("Manage collections");
});

test("editor collections panel exposes a working create-collection affordance", () => {
  const html = renderAdminUi(<CommerceEditorPage />, {
    path: "/admin/advanced/commerce/new",
  });

  expect(html).toContain("Create your first collection");
});

test("commerce collections page renders its heading", () => {
  const html = renderAdminUi(<CommerceCollectionsPage />, {
    path: "/admin/advanced/commerce/collections",
  });

  expect(html).toContain("Collections");
});

test("literal /advanced/commerce/collections route wins over the :id param route", () => {
  // First-match-wins: `collections` must resolve as a literal route (no `id`
  // param captured), while a real product id still resolves as `:id`.
  const collectionsRoute = resolveAdminRoute("/advanced/commerce/collections", {
    isProtected: false,
    canAccessRoute: () => true,
  });
  expect(collectionsRoute.params).toEqual({});
  expect(collectionsRoute.permission).toBe("commerce:read");

  const editorRoute = resolveAdminRoute("/advanced/commerce/product-1", {
    isProtected: false,
    canAccessRoute: () => true,
  });
  expect(editorRoute.params).toEqual({ id: "product-1" });
});
