import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MenuItemRow } from "../../../core/admin/ui/menus/MenuItemRow";

const item = {
  id: "item-1",
  label: "About",
  href: "/about",
  pageId: null,
  parentId: "root",
  parentLabel: "Home",
  orderIndex: 0,
  pageTitle: null,
  status: "ok" as const,
  children: [],
};

test("MenuItemRow renders hierarchy hint and explicit action labels", () => {
  const html = renderAdminUi(
    <MenuItemRow
      item={item}
      depth={1}
      isDragTarget
      dropIntent="child"
    />
  );

  expect(html).toContain('data-menu-depth="1"');
  expect(html).toContain("Sub-item of Home");
  expect(html).toContain("Drop as sub-menu");
  expect(html).toContain('aria-label="Open details for About"');
  expect(html).toContain('aria-label="Delete About"');
});
