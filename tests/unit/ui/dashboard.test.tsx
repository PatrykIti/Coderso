import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { DashboardPage } from "../../../core/admin/ui/dashboard/DashboardPage";

test("DashboardPage renders key sections", () => {
  const html = renderToString(<DashboardPage />);

  expect(html).toContain("Dashboard");
  expect(html).toContain("Recent Edits");
  expect(html).toContain("Site Health");
});
