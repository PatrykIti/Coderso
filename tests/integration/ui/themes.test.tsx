import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ThemesPage } from "../../../core/admin/ui/themes/ThemesPage";

test("ThemesPage renders admin UI theme layout", () => {
  const html = renderAdminUi(<ThemesPage />);
  expect(html).toContain("Admin UI Theme");
  expect(html).toContain("Search templates");
  expect(html).toContain("Profiles");
});
