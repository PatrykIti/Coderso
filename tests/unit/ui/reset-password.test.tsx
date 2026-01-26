import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ResetPasswordPage } from "../../../core/admin/ui/auth/ResetPasswordPage";

test("ResetPasswordPage renders instructions", () => {
  const html = renderToString(<ResetPasswordPage />);

  expect(html).toContain("Reset password");
  expect(html).toContain("Send reset link");
});
