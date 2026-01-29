import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ThemesPage } from "../../../core/admin/ui/themes/ThemesPage";

test("ThemesPage renders theme grid and actions", () => {
  const html = renderToString(<ThemesPage />);

  expect(html).toContain("Admin UI Theme");
  expect(html).toContain("Create theme templates");
  expect(html).toContain("New Template");
  expect(html).toContain("Profiles");
  expect(html).toContain("New Profile");
  expect(html).toContain("Export JSON");
});
