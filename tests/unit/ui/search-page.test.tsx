import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { SearchPage } from "../../../core/admin/ui/search/SearchPage";

test("SearchPage renders grouped results", () => {
  const html = renderToString(<SearchPage />);

  expect(html).toContain("Pages");
  expect(html).toContain("Entries");
  expect(html).toContain("Media");
  expect(html).toContain("Users");
  expect(html).toContain("Alex Rivera");
  expect(html).toContain("Draft");
});
