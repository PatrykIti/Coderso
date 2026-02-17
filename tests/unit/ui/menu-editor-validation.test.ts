import { expect, test } from "bun:test";

import {
  moveMenuItemToRoot,
  moveMenuItems,
  validateMenuItemsPayload,
} from "../../../core/admin/ui/menus/MenuEditorPage";

const baseItem = (overrides: Partial<{
  id: string;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
}> = {}) => ({
  id: "item",
  label: "Home",
  href: "/",
  pageId: null,
  parentId: null,
  orderIndex: 0,
  ...overrides,
});

test("validateMenuItemsPayload rejects missing label", () => {
  const result = validateMenuItemsPayload([
    {
      id: "item-1",
      label: " ",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 0,
    },
  ]);

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.itemId).toBe("item-1");
    expect(result.message).toBe("Each menu item must have a label.");
  }
});

test("validateMenuItemsPayload rejects missing link", () => {
  const result = validateMenuItemsPayload([
    {
      id: "item-2",
      label: "Home",
      href: null,
      pageId: null,
      parentId: null,
      orderIndex: 0,
    },
  ]);

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.itemId).toBe("item-2");
    expect(result.message).toBe("Each menu item must link to a page or a custom URL.");
  }
});

test("validateMenuItemsPayload accepts page or url", () => {
  const result = validateMenuItemsPayload([
    {
      id: "item-3",
      label: "Home",
      href: null,
      pageId: "page-1",
      parentId: null,
      orderIndex: 0,
    },
    {
      id: "item-4",
      label: "Blog",
      href: "/blog",
      pageId: null,
      parentId: null,
      orderIndex: 1,
    },
  ]);

  expect(result.ok).toBe(true);
});

test("moveMenuItems reorders siblings", () => {
  const items = [
    baseItem({ id: "a", orderIndex: 0 }),
    baseItem({ id: "b", orderIndex: 1 }),
    baseItem({ id: "c", orderIndex: 2 }),
  ];

  const result = moveMenuItems(items, "a", "c", "sibling");
  const order = result
    .filter((item) => item.parentId === null)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => item.id);

  expect(order).toEqual(["b", "a", "c"]);
});

test("moveMenuItems nests item as child", () => {
  const items = [
    baseItem({ id: "a", orderIndex: 0 }),
    baseItem({ id: "b", orderIndex: 1 }),
  ];

  const result = moveMenuItems(items, "b", "a", "child");
  const moved = result.find((item) => item.id === "b");

  expect(moved?.parentId).toBe("a");
  expect(moved?.orderIndex).toBe(0);
});

test("moveMenuItems blocks cycles", () => {
  const items = [
    baseItem({ id: "a", orderIndex: 0 }),
    baseItem({ id: "b", parentId: "a", orderIndex: 0 }),
  ];

  const result = moveMenuItems(items, "a", "b", "child");
  expect(result).toEqual(items);
});

test("moveMenuItems moves item to new parent as sibling", () => {
  const items = [
    baseItem({ id: "a", orderIndex: 0 }),
    baseItem({ id: "b", orderIndex: 1 }),
    baseItem({ id: "c", parentId: "b", orderIndex: 0 }),
  ];

  const result = moveMenuItems(items, "c", "a", "sibling");
  const moved = result.find((item) => item.id === "c");

  expect(moved?.parentId).toBe(null);
  expect(moved?.orderIndex).toBe(0);
});

test("moveMenuItemToRoot moves nested item to root end", () => {
  const items = [
    baseItem({ id: "home", orderIndex: 0 }),
    baseItem({ id: "about", parentId: "home", orderIndex: 0 }),
  ];

  const result = moveMenuItemToRoot(items, "about", "end");
  const moved = result.find((item) => item.id === "about");
  const rootOrder = result
    .filter((item) => item.parentId === null)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => item.id);

  expect(moved?.parentId).toBe(null);
  expect(rootOrder).toEqual(["home", "about"]);
});

test("moveMenuItemToRoot moves item to root start", () => {
  const items = [
    baseItem({ id: "home", orderIndex: 0 }),
    baseItem({ id: "blog", orderIndex: 1 }),
    baseItem({ id: "about", parentId: "home", orderIndex: 0 }),
  ];

  const result = moveMenuItemToRoot(items, "about", "start");
  const rootOrder = result
    .filter((item) => item.parentId === null)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => item.id);

  expect(rootOrder[0]).toBe("about");
});
