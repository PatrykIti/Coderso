import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ThemesPage } from "../../../core/admin/ui/themes/ThemesPage";

test("ThemesPage renders theme grid and actions", () => {
  const html = renderToString(<ThemesPage />);

  expect(html).toContain("Themes");
  expect(html).toContain("Active Theme");
  expect(html).toContain("Available Profiles");
  expect(html).toContain("Glassmorphism UI");
  expect(html).toContain("Activate");
  expect(html).toContain("Duplicate");
});
