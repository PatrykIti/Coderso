import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import { PluginFilters } from "../../../core/admin/ui/store/PluginFilters";

test("PluginFilters renders search and curated filter buttons", () => {
  const html = renderToString(<PluginFilters />);

  expect(html).toContain("Search plugins by name, tag, or ID...");
  expect(html).toContain("All plugins");
  expect(html).toContain("Popular");
  expect(html).toContain("New");
  expect(html).toContain("Security verified");
});
