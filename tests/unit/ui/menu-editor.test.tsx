import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MenuEditorPage } from "../../../core/admin/ui/menus/MenuEditorPage";

test("MenuEditorPage renders menu structure", () => {
  const html = renderToString(<MenuEditorPage />);

  expect(html).toContain("Main Menu Structure");
  expect(html).toContain("Add Menu Item");
});
