import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PluginStorePage } from "../../../core/admin/ui/store/PluginStorePage";

test("PluginStorePage renders filters and grid", () => {
  const html = renderToString(<PluginStorePage />);

  expect(html).toContain("Plugin Store");
  expect(html).toContain("Search plugins");
  expect(html).toContain("Install");
});
