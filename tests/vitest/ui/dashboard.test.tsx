import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { DashboardPage } from "../../../core/admin/ui/dashboard/DashboardPage";

// `DashboardPage` loads its saved layout and widget data after mount. The SSR
// helper runs no effects, so assertions stay on the always-rendered configurable
// dashboard shell rather than data-gated widget rows.

test("DashboardPage renders header + loading affordance", () => {
  const html = renderAdminUi(<DashboardPage />);

  expect(html).toContain("Dashboard");
  expect(html).toContain("Dashboard Panels");
  expect(html).toMatch(/Loading dashboard|aria-busy="true"/);
});

test("DashboardPage renders configurable dashboard controls", () => {
  const html = renderAdminUi(<DashboardPage />);

  expect(html).toContain("Refresh");
  expect(html).toContain("Operational view for content, security, storage, and traffic.");
});
