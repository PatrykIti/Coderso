import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AdminThemeSwitcher } from "../../../core/admin/ui/shared/AdminThemeSwitcher";

test("AdminThemeSwitcher renders theme trigger", () => {
  const html = renderAdminUi(<AdminThemeSwitcher />);

  expect(html).toContain("Theme");
});
