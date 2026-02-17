import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ResetPasswordPage } from "../../../core/admin/ui/auth/ResetPasswordPage";

test("ResetPasswordPage renders instructions", () => {
  const html = renderAdminUi(<ResetPasswordPage />);

  expect(html).toContain("Reset password");
  expect(html).toContain("Send reset link");
  expect(html).toContain("/admin/login");
});
