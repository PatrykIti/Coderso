import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { MenuListPage } from "../../../core/admin/ui/menus/MenuListPage";

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

test("MenuListPage renders shell and loading state", () => {
  const html = renderAdminUi(<MenuListPage />, {
    path: "/admin/menus",
  });

  expect(html).toContain("Menus");
  expect(html).toContain("New Menu");
  expect(html).toContain("Loading menus");
});

test("MenuListPage renders cached menus with editor links", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.menusList,
      JSON.stringify({
        value: [
          {
            id: "menu-1",
            name: "Cached Menu",
            location: "footer",
            status: "published",
            publishedAt: "2026-04-22T00:00:00.000Z",
            createdAt: "2026-04-22T00:00:00.000Z",
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<MenuListPage />, {
      path: "/admin/menus",
    });

    expect(html).toContain("Cached Menu");
    expect(html).toContain("footer");
    expect(html).toContain("/admin/menus/menu-1");
    expect(html).toContain("Open editor");
    expect(html).not.toContain("Loading menus");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
