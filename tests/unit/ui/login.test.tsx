import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { LoginPage } from "../../../core/admin/ui/auth/LoginPage";

test("LoginPage renders form copy", () => {
  const html = renderToString(<LoginPage />);

  expect(html).toContain("Welcome back");
  expect(html).toContain("Sign in");
});
