import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ThemeEditorPage } from "../../../core/admin/ui/themes/ThemeEditorPage";

test("ThemeEditorPage renders preview and token editor", () => {
  const html = renderToString(<ThemeEditorPage />);

  expect(html).toContain("Theme Editor");
  expect(html).toContain("Save Changes");
  expect(html).toContain("Loading theme profile");
});
