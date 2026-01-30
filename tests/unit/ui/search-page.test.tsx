import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SearchPage } from "../../../core/admin/ui/search/SearchPage";

test("SearchPage renders empty state", () => {
  const html = renderToString(<SearchPage />);

  expect(html).toContain("Search");
  expect(html).toContain("Type at least 2 characters to search.");
});
