import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SiteSettingsPage } from "../../../core/admin/ui/site/SiteSettingsPage";

test("SiteSettingsPage renders section navigation and actions", () => {
  const html = renderAdminUi(<SiteSettingsPage />);

  expect(html).toContain("Base URLs");
  expect(html).toContain("Homepage");
  expect(html).toContain("404");
  expect(html).toContain("Preview access");
  expect(html).toContain("Content routes");
  expect(html).toContain("Cache settings");
  expect(html).toContain("Performance");
  expect(html).toContain("Save changes");
  expect(html).toContain("View homepage");
  expect(html).toContain("Auto-save settings across all screens");
});
