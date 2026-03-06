import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SeoManagerPage } from "../../../core/admin/ui/seo/SeoManagerPage";
import { SeoDrawer } from "../../../core/admin/ui/seo/SeoDrawer";
import type { SeoItem } from "../../../core/admin/ui/seo/SeoTable";

test("SeoManagerPage renders table and drawer", () => {
  const html = renderAdminUi(<SeoManagerPage />);
  const item: SeoItem = {
    id: "seo-home",
    title: "Homepage",
    path: "/",
    score: 90,
    metaStatus: "optimized",
    socialStatus: "ready",
    metaTitle: "Home",
    metaDescription: "Description",
    keywords: ["cms"],
    previewUrl: "https://example.com",
    previewPath: "home",
    analysisStatus: "passed",
    analysisNotes: [],
  };
  const drawer = renderAdminUi(
    <SeoDrawer
      item={item}
      open
      onOpenChange={() => undefined}
      onSave={() => undefined}
    />
  );

  expect(html).toContain("SEO Manager");
  expect(html).toContain("Run Full Audit");
  expect(html).toContain("Loading SEO data...");
  expect(drawer).toContain("Quick SEO Edit");
  expect(drawer).toContain("Search Engine Preview");
});
