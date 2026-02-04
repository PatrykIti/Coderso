import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { WidgetLibraryPage } from "../../../core/admin/ui/widgets/WidgetLibraryPage";

test("WidgetLibraryPage renders categories and widget grid", () => {
  const html = renderToString(<WidgetLibraryPage />);

  expect(html).toContain("Widget Library");
  expect(html).toContain("All Items");
  expect(html).toContain("All Widgets");
  expect(html).toContain("Templates");
  expect(html).toContain("Favorites");
  expect(html).toContain("Categories");
  expect(html).toContain("No items match your search.");
  expect(html).not.toContain("New Template");
  expect(html).not.toContain("Create Widget");
});
