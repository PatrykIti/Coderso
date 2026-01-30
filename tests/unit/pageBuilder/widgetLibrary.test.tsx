import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { WidgetLibraryPage } from "../../../core/admin/ui/widgets/WidgetLibraryPage";

test("Widget library renders core widgets", () => {
  const html = renderToString(<WidgetLibraryPage />);
  expect(html).toContain("Widget Library");
  expect(html).toContain("Hero");
});
