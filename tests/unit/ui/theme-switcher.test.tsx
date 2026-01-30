import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AdminThemeSwitcher } from "../../../core/admin/ui/shared/AdminThemeSwitcher";

test("AdminThemeSwitcher renders theme trigger", () => {
  const html = renderToString(<AdminThemeSwitcher />);

  expect(html).toContain("Theme");
});
