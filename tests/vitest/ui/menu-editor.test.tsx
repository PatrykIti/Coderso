import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { MenuEditorPage } from "../../../core/admin/ui/menus/MenuEditorPage";

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

test("MenuEditorPage renders route-selected editor shell without cross-menu switcher", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.menuDetail("menu-1"),
      JSON.stringify({
        value: {
          menu: {
            id: "menu-1",
            name: "Main Navigation",
            location: "primary",
            status: "published",
            publishedAt: "2026-04-22T00:00:00.000Z",
            createdAt: "2026-04-22T00:00:00.000Z",
          },
          items: [],
        },
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<MenuEditorPage />, {
      path: "/admin/menus/menu-1",
    });

    expect(html).toContain("Main Navigation");
    expect(html).not.toContain("Back to menus");
    expect(html).toContain("Theme location");
    expect(html).toContain("Move to Draft");
    expect(html).not.toContain("Active menu");
    expect(html).not.toContain("New Menu");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
