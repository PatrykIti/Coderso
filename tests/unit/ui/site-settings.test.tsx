import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SiteSettingsPage } from "../../../core/admin/ui/site/SiteSettingsPage";

test("SiteSettingsPage renders section navigation and actions", () => {
  const html = renderToString(<SiteSettingsPage />);

  expect(html).toContain("Site Settings");
  expect(html).toContain("Base URLs");
  expect(html).toContain("Homepage");
  expect(html).toContain("Preview access");
  expect(html).toContain("Content routes");
  expect(html).toContain("Cache settings");
  expect(html).toContain("Performance");
  expect(html).toContain("Save changes");
  expect(html).toContain("View homepage");
  expect(html).toContain("Auto-save settings across all screens");
});
