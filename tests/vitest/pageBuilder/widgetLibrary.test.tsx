import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { WidgetLibraryPage } from "../../../core/admin/ui/widgets/WidgetLibraryPage";

test("Widget library renders core widgets", () => {
  const html = renderAdminUi(<WidgetLibraryPage />);
  expect(html).toContain("Widget Library");
  expect(html).toContain("Default view: table");
  expect(html).toContain("Select all visible widgets");
  expect(html).toContain("No items match your search.");
});
