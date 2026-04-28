import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { LoginPage } from "../../../core/admin/ui/auth/LoginPage";

test("LoginPage renders form copy", () => {
  const html = renderAdminUi(<LoginPage />);

  expect(html).toContain("Welcome back");
  expect(html).toContain("Sign in");
});
