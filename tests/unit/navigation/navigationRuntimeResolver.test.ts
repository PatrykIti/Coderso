import { expect, test } from "bun:test";

import { resolveNavigationRuntimeData } from "../../../core/services/navigation/navigationRuntimeResolver";
import { navigationDefaults } from "../../../core/widgets/core/navigation";
import type { MenuItemNode } from "../../../core/services/menus/treeBuilder";

test("resolveNavigationRuntimeData returns manual items and enforces minimum length", async () => {
  const resolved = await resolveNavigationRuntimeData({
    linksSource: "manual",
    items: [{ label: "One", href: "/one" }],
  });

  expect(resolved.linksSource).toBe("manual");
  expect(resolved.items).toEqual(navigationDefaults.items);
});

test("resolveNavigationRuntimeData resolves pages index when at least 2 pages match", async () => {
  let calls = 0;
  const resolved = await resolveNavigationRuntimeData(
    { linksSource: "pages", items: navigationDefaults.items },
    undefined,
    {
      listPublishedPagesForNavigation: async () => {
        calls += 1;
        return [
          { id: "p1", title: "Home", slug: "/", showInNav: true },
          { id: "p2", title: "About", slug: "/about", showInNav: true },
        ];
      },
    }
  );

  expect(calls).toBe(1);
  expect(resolved.linksSource).toBe("pages");
  expect(resolved.items.map((item) => item.href)).toEqual(["/", "/about"]);
});

test("resolveNavigationRuntimeData falls back to manual links when pages index is too small", async () => {
  const resolved = await resolveNavigationRuntimeData(
    { linksSource: "pages", items: navigationDefaults.items },
    undefined,
    {
      listPublishedPagesForNavigation: async () => [
        { id: "p1", title: "Only", slug: "/only", showInNav: true },
      ],
    }
  );

  expect(resolved.linksSource).toBe("manual");
  expect(resolved.items).toEqual(navigationDefaults.items);
});

test("resolveNavigationRuntimeData resolves menu source and maps pageId to slug", async () => {
  const nodes: MenuItemNode[] = [
    {
      id: "item-1",
      label: "Home",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [],
    },
    {
      id: "item-2",
      label: "About",
      href: null,
      pageId: "page-about",
      parentId: null,
      orderIndex: 1,
      children: [],
    },
  ];

  const resolved = await resolveNavigationRuntimeData(
    { linksSource: "menu", menuKey: "menu-1", items: navigationDefaults.items },
    undefined,
    {
      getMenuWithItems: async () =>
        ({ menu: { id: "menu-1" }, items: nodes } as any),
      getPageSlugsByIds: async () => new Map([["page-about", "/about"]]),
    }
  );

  expect(resolved.linksSource).toBe("menu");
  expect(resolved.items).toEqual([
    { label: "Home", href: "/", children: undefined },
    { label: "About", href: "/about", children: undefined },
  ]);
});

test("resolveNavigationRuntimeData falls back to menu location when menuKey is missing", async () => {
  let calledLocation = 0;
  const nodes: MenuItemNode[] = [
    {
      id: "item-1",
      label: "Home",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [],
    },
    {
      id: "item-2",
      label: "About",
      href: "/about",
      pageId: null,
      parentId: null,
      orderIndex: 1,
      children: [],
    },
  ];

  const resolved = await resolveNavigationRuntimeData(
    { linksSource: "menu", items: navigationDefaults.items },
    { menuLocationFallback: "primary" },
    {
      getMenuWithItemsByLocation: async () => {
        calledLocation += 1;
        return { menu: { id: "menu-primary" } as any, items: nodes } as any;
      },
      getPageSlugsByIds: async () => new Map(),
    }
  );

  expect(calledLocation).toBe(1);
  expect(resolved.linksSource).toBe("menu");
  expect(resolved.items.map((item) => item.href)).toEqual(["/", "/about"]);
});

