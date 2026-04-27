import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { WidgetLibraryPage } from "../../../core/admin/ui/widgets/WidgetLibraryPage";

test("WidgetLibraryPage renders a Pages-style table shell by default", () => {
  const html = renderAdminUi(<WidgetLibraryPage />);

  expect(html).toContain("Widget Library");
  expect(html).toContain("Available widget library sections:");
  expect(html).toContain("All Items");
  expect(html).toContain("All Widgets");
  expect(html).toContain("Templates");
  expect(html).toContain("Favorites");
  expect(html).toContain("Categories");
  expect(html).toContain("Section:");
  expect(html).toContain("Default view: table");
  expect(html).toContain("Show widgets as table");
  expect(html).toContain("Select all visible widgets");
  expect(html).toContain("Actions");
  expect(html).toContain("Showing 0 of 0 items");
  expect(html).toContain("No items match your search.");
  expect(html).not.toContain("Recommended");
  expect(html).not.toContain("Advanced mode");
  expect(html).not.toContain("Create Widget");
  expect(html).not.toContain("New Template");
});
