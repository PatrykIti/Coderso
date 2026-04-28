import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SetPasswordPage } from "../../../core/admin/ui/auth/SetPasswordPage";

test("SetPasswordPage renders strength list", () => {
  const html = renderAdminUi(<SetPasswordPage />);

  expect(html).toContain("Set new password");
  expect(html).toContain("Password strength");
  expect(html).toContain("/admin/login");
});
