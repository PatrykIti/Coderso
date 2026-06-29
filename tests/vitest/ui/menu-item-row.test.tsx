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
  expect(html).toContain("self-center");
  expect(html).toContain("h-12");
  expect(html).toContain("w-12");
  expect(html).toContain("[&amp;_svg]:pointer-events-none");
  expect(html).toContain("pointer-events-none");
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('focusable="false"');
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

test("MenuItemRow renders the nested indent affordance only for child rows (TASK-479-10-L02)", () => {
  const childHtml = renderAdminUi(<MenuItemRow item={item} depth={1} />);
  expect(childHtml).toContain("data-menu-nested-indent");

  const rootHtml = renderAdminUi(
    <MenuItemRow item={{ ...item, parentId: null, parentLabel: null }} depth={0} />
  );
  expect(rootHtml).not.toContain("data-menu-nested-indent");
});

test("MenuItemRow marks the active row with the primary-soft selection hook (TASK-479-10-L02)", () => {
  const activeHtml = renderAdminUi(<MenuItemRow item={item} depth={0} active />);
  expect(activeHtml).toContain('data-menu-row-active="true"');
  expect(activeHtml).toContain("bg-primary-soft/40");

  const inactiveHtml = renderAdminUi(<MenuItemRow item={item} depth={0} />);
  expect(inactiveHtml).not.toContain('data-menu-row-active="true"');
});

test("MenuItemRow renders before and after indicators as stable overlays", () => {
  const beforeHtml = renderAdminUi(<MenuItemRow item={item} isDragTarget dropIntent="before" />);
  const afterHtml = renderAdminUi(<MenuItemRow item={item} isDragTarget dropIntent="after" />);

  expect(beforeHtml).toContain('data-menu-drop-line="item-1:before"');
  expect(beforeHtml).toContain("absolute");
  expect(beforeHtml).toContain("pointer-events-none");
  expect(beforeHtml).toContain("-top-3");
  expect(beforeHtml).toContain("Drop before");

  expect(afterHtml).toContain('data-menu-drop-line="item-1:after"');
  expect(afterHtml).toContain("absolute");
  expect(afterHtml).toContain("pointer-events-none");
  expect(afterHtml).toContain("-bottom-3");
  expect(afterHtml).toContain("Drop after");
});
