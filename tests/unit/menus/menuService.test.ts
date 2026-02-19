import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { menuItems, menus } from "../../../core/db/schema";
import {
  createMenu,
  getMenuWithItems,
  replaceMenuItems,
} from "../../../core/services/menus/menuService";
import {
  assertNoCycles,
  buildMenuTree,
  type MenuItemRecord,
} from "../../../core/services/menus/treeBuilder";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const cleanupMenu = async (menuId?: string) => {
  if (!menuId) return;
  await db.delete(menuItems).where(eq(menuItems.menuId, menuId));
  await db.delete(menus).where(eq(menus.id, menuId));
};

let createdMenuId: string | undefined;

afterAll(async () => {
  if (!hasDb) return;
  await cleanupMenu(createdMenuId);
});

test("buildMenuTree nests and orders items", () => {
  const items: MenuItemRecord[] = [
    {
      id: "1",
      label: "Home",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 1,
    },
    {
      id: "2",
      label: "Blog",
      href: "/blog",
      pageId: null,
      parentId: null,
      orderIndex: 0,
    },
    {
      id: "3",
      label: "Post",
      href: "/blog/post",
      pageId: null,
      parentId: "2",
      orderIndex: 0,
    },
  ];

  const tree = buildMenuTree(items);
  expect(tree[0]?.id).toBe("2");
  expect(tree[0]?.children[0]?.id).toBe("3");
});

test("assertNoCycles rejects cyclic items", () => {
  const items: MenuItemRecord[] = [
    {
      id: "1",
      label: "A",
      href: "/a",
      pageId: null,
      parentId: "2",
      orderIndex: 0,
    },
    {
      id: "2",
      label: "B",
      href: "/b",
      pageId: null,
      parentId: "1",
      orderIndex: 0,
    },
  ];

  expect(() => assertNoCycles(items)).toThrow("menu_items_cycle");
});

testIfDb("replaceMenuItems stores items", async () => {
  const menu = await createMenu({
    name: `Primary-${randomUUID()}`,
    location: "primary",
  });

  createdMenuId = menu?.id;
  if (!createdMenuId) throw new Error("menu_missing");

  await replaceMenuItems(createdMenuId, [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Child", href: "/about/child", parentId: "missing" },
  ]);

  const stored = await getMenuWithItems(createdMenuId);
  expect(stored?.items.length).toBe(3);
  expect(stored?.items[0]?.label).toBeDefined();

  await cleanupMenu(createdMenuId);
  createdMenuId = undefined;
});

testIfDb("replaceMenuItems normalizes menu metadata settings", async () => {
  const menu = await createMenu({
    name: `Meta-${randomUUID()}`,
    location: "meta",
  });

  createdMenuId = menu?.id;
  if (!createdMenuId) throw new Error("menu_missing");

  await replaceMenuItems(createdMenuId, [
    {
      label: "Offers",
      href: "/offers",
      settings: {
        visibility: "logged_out",
        badge: { label: " New ", tone: "accent" },
        description: " Seasonal promotions ",
        icon: " sparkles ",
      },
    },
  ]);

  const stored = await getMenuWithItems(createdMenuId);
  expect(stored?.items[0]?.settings).toEqual({
    visibility: "logged_out",
    badge: { label: "New", tone: "accent" },
    description: "Seasonal promotions",
    icon: "sparkles",
  });

  await cleanupMenu(createdMenuId);
  createdMenuId = undefined;
});

testIfDb("replaceMenuItems rejects missing page ids", async () => {
  const menu = await createMenu({
    name: `Primary-${randomUUID()}`,
    location: "primary",
  });

  createdMenuId = menu?.id;
  if (!createdMenuId) throw new Error("menu_missing");

  await expect(
    replaceMenuItems(createdMenuId, [
      { label: "Home", pageId: randomUUID() },
    ])
  ).rejects.toThrow("menu_item_page_missing");

  await cleanupMenu(createdMenuId);
  createdMenuId = undefined;
});
