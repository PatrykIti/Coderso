import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { WidgetLibraryPage } from "../../../core/admin/ui/widgets/WidgetLibraryPage";

test("WidgetLibraryPage renders categories and widget grid", () => {
  const html = renderToString(<WidgetLibraryPage />);

  expect(html).toContain("Widget Library");
  expect(html).toContain("All Widgets");
  expect(html).toContain("Favorites");
  expect(html).toContain("Layout");
  expect(html).toContain("Insert");
});
