import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MenuEditorPage } from "../../../core/admin/ui/menus/MenuEditorPage";

test("MenuEditorPage renders menus shell", () => {
  const html = renderToString(<MenuEditorPage />);

  expect(html).toContain("Menus");
  expect(html).toContain("New Menu");
});
