import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ThemesPage } from "../../../core/admin/ui/themes/ThemesPage";

test("ThemesPage renders admin UI theme layout", () => {
  const html = renderToString(<ThemesPage />);
  expect(html).toContain("Admin UI Theme");
  expect(html).toContain("Search templates");
  expect(html).toContain("Profiles");
});
