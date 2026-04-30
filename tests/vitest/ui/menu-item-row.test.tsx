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
      keyboardActions={[
        {
          id: "move-up",
          label: "Move up",
          disabled: false,
          onSelect: () => undefined,
        },
        {
          id: "move-down",
          label: "Move down",
          disabled: true,
          onSelect: () => undefined,
        },
        {
          id: "indent",
          label: "Indent",
          disabled: false,
          onSelect: () => undefined,
        },
        {
          id: "outdent",
          label: "Outdent",
          disabled: false,
          onSelect: () => undefined,
        },
      ]}
    />
  );

  expect(html).toContain('data-menu-depth="1"');
  expect(html).toContain('data-menu-drag-handle="item-1"');
  expect(html).toContain('aria-label="Drag About"');
  expect(html).toContain('draggable="true"');
  expect(html).toContain('draggable="false"');
  expect(html).toContain("self-stretch");
  expect(html).toContain("Sub-item of Home");
  expect(html).toContain("Drop as sub-menu");
  expect(html).toContain('aria-label="Move up About"');
  expect(html).toContain('aria-label="Move down About"');
  expect(html).toContain('disabled=""');
  expect(html).toContain('aria-label="Indent About"');
  expect(html).toContain('aria-label="Outdent About"');
  expect(html).toContain('aria-label="Open details for About"');
  expect(html).toContain('aria-label="Delete About"');
});
