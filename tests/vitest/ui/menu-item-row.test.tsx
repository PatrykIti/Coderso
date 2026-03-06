import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

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
  const html = renderAdminUi(<MenuItemRow item={item} />);
  expect(html).toContain("cursor-grab");
  expect(html).toContain("select-none");
});
