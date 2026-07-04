import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { LoginPage } from "../../../core/admin/ui/auth/LoginPage";

test("LoginPage renders restyled login card", () => {
  const html = renderAdminUi(<LoginPage />);

  expect(html).toContain("Welcome back");
  expect(html).toContain("Sign in");
  // new "or continue with email" divider between SSO and the email form
  expect(html).toContain("or continue with email");
  // de-SaaS: no self-serve sign-up CTA (admin accounts are invite-only)
  expect(html).not.toMatch(/Create one|Sign up/i);
  // withAdminBasePath emits the LITERAL "/admin/reset" (resolveAdminBasePath() →
  // "/admin" under SSR); assert the canonical href is PRESENT.
  expect(html).toContain('href="/admin/reset"');
});
