import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { DashboardPage } from "../../../core/admin/ui/dashboard/DashboardPage";

test("DashboardPage renders key sections", () => {
  const html = renderAdminUi(<DashboardPage />);

  expect(html).toContain("Dashboard");
  expect(html).toContain("Loading dashboard...");
  expect(html).toContain("Recent Edits");
  expect(html).toContain("Site Health");
  expect(html).toContain("Security Status");
});
