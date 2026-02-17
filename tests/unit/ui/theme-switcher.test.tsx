import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AdminThemeSwitcher } from "../../../core/admin/ui/shared/AdminThemeSwitcher";

test("AdminThemeSwitcher renders theme trigger", () => {
  const html = renderAdminUi(<AdminThemeSwitcher />);

  expect(html).toContain("Theme");
});
