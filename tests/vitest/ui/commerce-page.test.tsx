import React from "react";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
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
    path: "/admin/coderso/commerce",
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
      path: "/admin/coderso/commerce",
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
    path: "/admin/coderso/commerce/new",
  });

  expect(html).toContain("New product");
  expect(html).toContain("Identity");
  expect(html).toContain("Pricing");
  expect(html).toContain("Stock");
  expect(html).toContain("Save changes");
  expect(html).toContain("Publish");
});
