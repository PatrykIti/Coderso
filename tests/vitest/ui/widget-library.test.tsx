import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { WidgetLibraryPage } from "../../../core/admin/ui/widgets/WidgetLibraryPage";

test("WidgetLibraryPage renders categories and widget grid", () => {
  const html = renderAdminUi(<WidgetLibraryPage />);

  expect(html).toContain("Widget Library");
  expect(html).toContain("All Items");
  expect(html).toContain("All Widgets");
  expect(html).toContain("Recommended");
  expect(html).toContain("All widgets");
  expect(html).toContain("Advanced mode");
  expect(html).toContain("Templates");
  expect(html).toContain("Favorites");
  expect(html).toContain("Categories");
  expect(html).toContain("No items match your search.");
  expect(html).toContain("border-border/60");
  expect(html).toContain("Create Widget");
  expect(html).not.toContain("New Template");
  expect(html).toMatch(
    /<button[^>]*role="tab"[^>]*data-state="active"[^>]*>All widgets/
  );
});
