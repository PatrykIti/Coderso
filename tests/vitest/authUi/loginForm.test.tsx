import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { LoginPage } from "../../../core/admin/ui/auth/LoginPage";

test("LoginPage renders error state", () => {
  const html = renderToString(
    <LoginPage initialEmail="user@site.com" initialError="Invalid credentials" />
  );

  expect(html).toContain("Invalid credentials");
  expect(html).toContain("user@site.com");
  expect(html).toContain("/admin/reset");
  expect(html).toContain("Google");
  expect(html).toContain("GitHub");
  expect(html).toContain('data-brand-icon="github"');
  expect(html).toContain('fill="#4285F4"');
  expect(html.match(/data-brand-icon=/g)).toHaveLength(1);
});
