import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { MenuItemForm } from "../../../core/admin/ui/menus/MenuItemForm";

test("MenuItemForm renders required fields", () => {
  const html = renderToString(<MenuItemForm />);

  expect(html).toContain("Navigation Label");
  expect(html).toContain("Parent Item");
});
