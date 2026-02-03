import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SiteSettingsPage } from "../../../core/admin/ui/site/SiteSettingsPage";

test("SiteSettingsPage renders wizard and actions", () => {
  const html = renderToString(<SiteSettingsPage />);

  expect(html).toContain("Site Settings");
  expect(html).toContain("Setup steps");
  expect(html).toContain("Save changes");
  expect(html).toContain("View homepage");
  expect(html).toContain("Test preview URL");
});
