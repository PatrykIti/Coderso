import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PluginStorePage } from "../../../core/admin/ui/store/PluginStorePage";

test("PluginStorePage renders filters and grid", () => {
  const html = renderAdminUi(<PluginStorePage />);

  expect(html).toContain("Plugin Store");
  expect(html).toContain("Search plugins");
  expect(html).toContain("Install");
});
