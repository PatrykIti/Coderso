import React from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { StoreList } from "../../../core/admin/ui/store/StoreList";
import type { StoreCatalogItem } from "../../../core/admin/ui/store/types";

const items: StoreCatalogItem[] = [
  {
    id: "seo",
    name: "SEO Boost",
    description: "Improve metadata.",
    status: "verified",
    tags: ["seo"],
    securityScore: 95,
    lastUpdated: "Jan 20, 2026",
    downloads: "5k installs",
    latestVersion: "1.0.0",
    permissions: ["content:write"],
    versions: [{ version: "1.0.0", releaseType: "security", compatible: true }],
  },
];

test("StoreList renders search and items", () => {
  const html = renderToString(
    <StoreList
      items={items}
      selectedId="seo"
      query=""
      onQueryChange={() => undefined}
      onSelect={() => undefined}
    />
  );

  expect(html).toContain("Search plugins");
  expect(html).toContain("SEO Boost");
});
