import { expect, test } from "vitest";

import {
  moveMenuItemToRoot,
  moveMenuItems,
  describeMenuLocationState,
  validateMenuItemsPayload,
} from "../../../core/admin/ui/menus/MenuEditorPage";
import { resolveMenuDropIntent } from "../../../core/admin/ui/menus/menuDnD";

const baseItem = (
  overrides: Partial<{
    id: string;
    label: string;
    href: string | null;
    pageId: string | null;
    parentId: string | null;
    orderIndex: number;
  }> = {}
) => ({
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

  const result = moveMenuItems(items, "a", "c", "before");
  const order = result
    .filter((item) => item.parentId === null)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => item.id);

  expect(order).toEqual(["b", "a", "c"]);
});

test("moveMenuItems inserts after target sibling", () => {
  const items = [
    baseItem({ id: "a", orderIndex: 0 }),
    baseItem({ id: "b", orderIndex: 1 }),
    baseItem({ id: "c", orderIndex: 2 }),
  ];

  const result = moveMenuItems(items, "a", "c", "after");
  const order = result
    .filter((item) => item.parentId === null)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => item.id);

  expect(order).toEqual(["b", "c", "a"]);
});

test("moveMenuItems nests item as child", () => {
  const items = [baseItem({ id: "a", orderIndex: 0 }), baseItem({ id: "b", orderIndex: 1 })];

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

test("moveMenuItems blocks before and after moves against descendants", () => {
  const items = [
    baseItem({ id: "parent", orderIndex: 0 }),
    baseItem({ id: "child", parentId: "parent", orderIndex: 0 }),
    baseItem({ id: "grandchild", parentId: "child", orderIndex: 0 }),
  ];

  expect(moveMenuItems(items, "parent", "grandchild", "before")).toEqual(items);
  expect(moveMenuItems(items, "parent", "grandchild", "after")).toEqual(items);
});

test("moveMenuItems moves item to new parent as sibling", () => {
  const items = [
    baseItem({ id: "a", orderIndex: 0 }),
    baseItem({ id: "b", orderIndex: 1 }),
    baseItem({ id: "c", parentId: "b", orderIndex: 0 }),
  ];

  const result = moveMenuItems(items, "c", "a", "before");
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

test("resolveMenuDropIntent maps row zones deterministically", () => {
  const rect = { left: 10, top: 20, height: 40 };

  expect(resolveMenuDropIntent({ clientX: 20, clientY: 24, rect })).toBe("before");
  expect(resolveMenuDropIntent({ clientX: 20, clientY: 55, rect })).toBe("after");
  expect(resolveMenuDropIntent({ clientX: 20, clientY: 40, rect })).toBe("child");
  expect(resolveMenuDropIntent({ clientX: 60, clientY: 40, rect })).toBe("child");
});

test("describeMenuLocationState explains empty, draft, and published slots", () => {
  expect(describeMenuLocationState({ location: " ", status: "draft" })).toBe(
    "Not assigned to a theme slot."
  );
  expect(describeMenuLocationState({ location: "primary", status: "draft" })).toBe(
    "Assigned to primary, but hidden from runtime until published."
  );
  expect(describeMenuLocationState({ location: "footer", status: "published" })).toBe(
    "Assigned to the footer theme slot."
  );
});
