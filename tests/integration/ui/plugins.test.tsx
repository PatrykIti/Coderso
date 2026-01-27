import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PluginStorePage } from "../../../core/admin/ui/store/PluginStorePage";

test("Plugin store renders install and policy controls", () => {
  const html = renderToString(<PluginStorePage />);

  expect(html).toContain("Plugin Store");
  expect(html).toContain("Update plugin");
  expect(html).toContain("Installed");
});
