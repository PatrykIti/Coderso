import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SearchPage } from "../../../core/admin/ui/search/SearchPage";

test("SearchPage renders empty state", () => {
  const html = renderAdminUi(<SearchPage />);

  expect(html).toContain("Search");
  expect(html).toContain("Type at least 2 characters to search.");
});
