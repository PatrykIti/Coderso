import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import {
  filterMenus,
  MenuListPage,
  type MenuLocationFilter,
  type MenuStatusFilter,
} from "../../../core/admin/ui/menus/MenuListPage";
import type { MenuSummary } from "../../../core/admin/services/menusClient";

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
  expect(html).toContain("New");
  expect(html).not.toContain("New Menu");
  expect(html).not.toContain("Refresh");
  expect(html).toContain("Search menus by name or location");
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
    const normalizedHtml = html.replaceAll("<!-- -->", "");

    expect(html).toContain("Cached Menu");
    expect(html).toContain("footer");
    expect(html).toContain("/admin/menus/menu-1");
    expect(html).toContain("Published");
    expect(html).toContain("Open menu actions");
    expect(normalizedHtml).toContain("Showing 1 of 1 menus");
    expect(html).toContain("Previous");
    expect(html).toContain("Next");
    expect(html).not.toContain("Open editor");
    expect(html).not.toContain("Loading menus");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

const makeMenu = (overrides: Partial<MenuSummary>): MenuSummary => ({
  id: "menu-1",
  name: "Primary",
  location: "primary",
  status: "published",
  publishedAt: "2026-04-22T00:00:00.000Z",
  createdAt: "2026-04-22T00:00:00.000Z",
  ...overrides,
});

test("filterMenus searches and filters by status and location", () => {
  const menus = [
    makeMenu({ id: "menu-1", name: "Primary", location: "primary" }),
    makeMenu({
      id: "menu-2",
      name: "Footer",
      location: null,
      status: "draft",
      publishedAt: null,
    }),
  ];

  const apply = (
    query: string,
    status: MenuStatusFilter,
    location: MenuLocationFilter
  ) => filterMenus(menus, query, status, location).map((menu) => menu.id);

  expect(apply("foot", "all", "all")).toEqual(["menu-2"]);
  expect(apply("assigned", "all", "unassigned")).toEqual(["menu-2"]);
  expect(apply("", "draft", "all")).toEqual(["menu-2"]);
  expect(apply("", "published", "location:primary")).toEqual(["menu-1"]);
});
