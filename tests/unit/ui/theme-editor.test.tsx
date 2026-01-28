import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ThemeEditorPage } from "../../../core/admin/ui/themes/ThemeEditorPage";

test("ThemeEditorPage renders preview and token editor", () => {
  const html = renderToString(<ThemeEditorPage />);

  expect(html).toContain("Theme Editor");
  expect(html).toContain("Empowering content creators with modern tools");
  expect(html).toContain("Active Token Properties");
  expect(html).toContain("theme.config.json");
  expect(html).toContain("Colors");
});
