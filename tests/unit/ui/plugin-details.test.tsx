import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PluginDetailsPage } from "../../../core/admin/ui/store/PluginDetailsPage";

test("PluginDetailsPage renders tabs and details", () => {
  const html = renderAdminUi(<PluginDetailsPage />);

  expect(html).toContain("SEO Optimizer");
  expect(html).toContain("Auto-update");
  expect(html).toContain("Overview");
  expect(html).toContain("Permissions");
  expect(html).toContain("Changelog");
  expect(html).toContain("Settings");
  expect(html).toContain("Plugin information");
});
