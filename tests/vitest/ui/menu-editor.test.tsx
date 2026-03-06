import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { MenuEditorPage } from "../../../core/admin/ui/menus/MenuEditorPage";

test("MenuEditorPage renders menus shell", () => {
  const html = renderAdminUi(<MenuEditorPage />);

  expect(html).toContain("Menus");
  expect(html).toContain("New Menu");
});
