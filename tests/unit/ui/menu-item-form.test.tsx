import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MenuItemForm } from "../../../core/admin/ui/menus/MenuItemForm";

test("MenuItemForm renders required fields", () => {
  const html = renderAdminUi(
    <MenuItemForm
      value={{
        id: "item-1",
        label: "Home",
        linkType: "page",
        pageId: "page-1",
        href: "",
        parentId: null,
        visibility: "all",
        badgeLabel: "",
        badgeTone: "default",
        description: "",
        icon: "",
      }}
      pages={[
        { id: "page-1", title: "Home", slug: "home", status: "draft", updatedAt: "", author: null },
      ]}
      parentOptions={[]}
      onChange={() => {}}
    />
  );

  expect(html).toContain("Navigation Label");
  expect(html).toContain("Parent Item");
  expect(html).toContain("Visibility");
  expect(html).toContain("Badge Label");
});
