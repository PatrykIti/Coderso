import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SettingsSidebar } from "../../../core/admin/ui/settings/SettingsSidebar";

test("SettingsSidebar renders settings navigation items", () => {
  const html = renderToString(<SettingsSidebar activeId="security" />);

  expect(html).toContain("General");
  expect(html).toContain("/admin/settings/general");
  expect(html).toContain("Site");
  expect(html).toContain("/admin/settings/site");
  expect(html).toContain("Security");
  expect(html).toContain("/admin/settings/security");
  expect(html).toContain("API Keys");
  expect(html).toContain("/admin/settings/api-keys");
  expect(html).toContain("Webhooks");
  expect(html).toContain("/admin/settings/webhooks");
  expect(html).toContain("Email");
  expect(html).toContain("/admin/settings/email");
  expect(html).toContain("Storage");
  expect(html).toContain("/admin/settings/storage");
  expect(html).toContain("Integrations");
  expect(html).toContain("/admin/settings/integrations");
});
