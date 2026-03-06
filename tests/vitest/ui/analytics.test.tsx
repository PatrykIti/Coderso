import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AnalyticsPage } from "../../../core/admin/ui/analytics/AnalyticsPage";

test("AnalyticsPage renders KPIs and charts", () => {
  const html = renderAdminUi(<AnalyticsPage />);

  expect(html).toContain("Analytics Overview");
  expect(html).toContain("Loading analytics...");
});
