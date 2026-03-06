import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SecuritySettingsPage } from "../../../core/admin/ui/settings/SecuritySettingsPage";

test("SecuritySettingsPage renders sections and cards", () => {
  const html = renderAdminUi(<SecuritySettingsPage />);

  expect(html).toContain("Security Settings");
  expect(html).toContain("Auth protection");
  expect(html).toContain("Rate limits");
  expect(html).toContain("CSRF");
  expect(html).toContain("CORS");
  expect(html).toContain("Security headers");
  expect(html).toContain("Sessions");
  expect(html).toContain("IP allowlist");
  expect(html).toContain("Sign-in protection");
  expect(html).toContain("Auto-save settings across all screens");
});
