import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ResetPasswordPage } from "../../../core/admin/ui/auth/ResetPasswordPage";

test("ResetPasswordPage keeps copy and canonical back link", () => {
  const html = renderAdminUi(<ResetPasswordPage />);

  // preserved heading (NOT "Reset your password")
  expect(html).toContain("Reset password");
  expect(html).toContain("Send reset link");
  // canonical back link withAdminBasePath emits (present, NOT absent)
  expect(html).toContain("/admin/login");
});
