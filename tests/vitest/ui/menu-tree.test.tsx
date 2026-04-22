import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MenuTree } from "../../../core/admin/ui/menus/MenuTree";

test("MenuTree renders nested hierarchy hints for child items", () => {
  const html = renderAdminUi(
    <MenuTree
      items={[
        {
          id: "root",
          label: "Home",
          href: "/",
          pageId: null,
          parentId: null,
          parentLabel: null,
          orderIndex: 0,
          status: "ok",
          children: [
            {
              id: "child",
              label: "About",
              href: "/about",
              pageId: null,
              parentId: "root",
              parentLabel: "Home",
              orderIndex: 0,
              status: "ok",
              children: [],
            },
          ],
        },
      ] as never}
      activeId="root"
      onSelect={() => undefined}
      onEdit={() => undefined}
      onDelete={() => undefined}
      onMove={() => undefined}
      onMoveToRoot={() => undefined}
    />
  );

  expect(html).toContain('data-menu-depth="1"');
  expect(html).toContain("Sub-item of Home");
});
