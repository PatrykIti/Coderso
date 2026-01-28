import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SetPasswordPage } from "../../../core/admin/ui/auth/SetPasswordPage";

test("SetPasswordPage renders strength list", () => {
  const html = renderToString(<SetPasswordPage />);

  expect(html).toContain("Set new password");
  expect(html).toContain("Password strength");
  expect(html).toContain("/admin/login");
});
