import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PageListPage } from "../../../core/admin/ui/pages/PageListPage";

test("PageListPage renders header and table", () => {
  const html = renderToString(<PageListPage />);

  expect(html).toContain("Pages");
  expect(html).toContain("Create New Page");
  expect(html).toContain("Loading pages");
});
