import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Rocket } from "lucide-react";

import { PluginCard } from "../../../core/admin/ui/store/PluginCard";
import type { PluginSummary } from "../../../core/admin/ui/store/types";

const plugin: PluginSummary = {
  id: "seo",
  name: "SEO Booster",
  description: "Optimizes metadata and sitemaps.",
  version: "1.2.0",
  status: "verified",
  icon: <Rocket className="h-5 w-5" />,
  tags: ["seo"],
  securityScore: 96,
  lastUpdated: "Jan 1, 2026",
  downloads: "1k installs",
  changelog: ["v1.2.0 Updated tags."],
};

test("PluginCard renders status and action", () => {
  const html = renderToString(<PluginCard plugin={plugin} />);

  expect(html).toContain("SEO Booster");
  expect(html).toContain("Verified");
  expect(html).toContain("Install");
});
