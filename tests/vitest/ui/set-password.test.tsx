import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SetPasswordPage } from "../../../core/admin/ui/auth/SetPasswordPage";

test("SetPasswordPage renders strength meter + checklist", () => {
  const html = renderAdminUi(<SetPasswordPage token="t" />);

  // preserved heading (NOT "Create a new password")
  expect(html).toContain("Set new password");
  // PasswordStrengthList header + rule labels preserved
  expect(html).toContain("Password strength");
  expect(html).toContain("At least 8 characters");
  expect(html).toContain("At least 1 number");
  // preserved submit copy (NOT "Set password")
  expect(html).toContain("Update password");
  // canonical back link withAdminBasePath emits (present, NOT absent)
  expect(html).toContain("/admin/login");
});
