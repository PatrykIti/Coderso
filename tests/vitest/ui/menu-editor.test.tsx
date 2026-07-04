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
    // TASK-479-10-L02: dashed add-item affordance ported from the prototype.
    expect(html).toContain('data-menu-add-item="dashed"');
    expect(html).toContain("Add menu item");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

// --- TASK-504-04 §9 (defect B3): items-count badge counts TOTAL + pluralizes ---

const renderMenuWithItems = (items: unknown[]) => {
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
          items,
        },
        savedAt: Date.now(),
      })
    );
    return renderAdminUi(<MenuEditorPage />, { path: "/admin/menus/menu-1" });
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
};

/** Extract the editor's outline item-count badge text (scoped so unrelated
 *  admin-shell "N items" copy elsewhere in the page cannot pollute the match). */
const itemCountBadge = (html: string) =>
  html.match(/border-border text-foreground[^>]*">(\d+ items?)<\/span>/)?.[1];

test("items-count badge shows the TOTAL item count for a nested menu (not the root count)", () => {
  // 4 items total, only 1 root — the OLD `${rootCount} items` mislabeled "1 items".
  const html = renderMenuWithItems([
    {
      id: "products",
      label: "Products",
      href: "#",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [
        {
          id: "a",
          label: "A",
          href: "/a",
          pageId: null,
          parentId: "products",
          orderIndex: 0,
          children: [],
        },
        {
          id: "b",
          label: "B",
          href: "/b",
          pageId: null,
          parentId: "products",
          orderIndex: 1,
          children: [],
        },
        {
          id: "c",
          label: "C",
          href: "/c",
          pageId: null,
          parentId: "products",
          orderIndex: 2,
          children: [],
        },
      ],
    },
  ]);
  expect(itemCountBadge(html)).toBe("4 items");
});

test("items-count badge is singular for a single-item menu", () => {
  const html = renderMenuWithItems([
    {
      id: "only",
      label: "Only",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [],
    },
  ]);
  expect(itemCountBadge(html)).toBe("1 item");
});
