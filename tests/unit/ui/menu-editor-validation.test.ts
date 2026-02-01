import { expect, test } from "bun:test";

import { validateMenuItemsPayload } from "../../../core/admin/ui/menus/MenuEditorPage";

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
