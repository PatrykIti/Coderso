import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MenuItemRow } from "../../../core/admin/ui/menus/MenuItemRow";

const item = {
  id: "item-1",
  label: "Home",
  href: "/",
  pageId: null,
  parentId: null,
  orderIndex: 0,
  pageTitle: null,
  status: "ok" as const,
  children: [],
};

test("MenuItemRow includes drag affordance class", () => {
  const html = renderToString(<MenuItemRow item={item} />);
  expect(html).toContain("cursor-grab");
  expect(html).toContain("select-none");
});
