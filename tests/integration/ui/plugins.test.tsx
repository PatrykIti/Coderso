import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PluginStorePage } from "../../../core/admin/ui/store/PluginStorePage";

test("Plugin store renders install and policy controls", () => {
  const html = renderAdminUi(<PluginStorePage />);

  expect(html).toContain("Plugin Store");
  expect(html).toContain("Update plugin");
  expect(html).toContain("Installed");
});
