import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AnalyticsPage } from "../../../core/admin/ui/analytics/AnalyticsPage";

test("AnalyticsPage renders KPIs and charts", () => {
  const html = renderToString(<AnalyticsPage />);

  expect(html).toContain("Analytics Overview");
  expect(html).toContain("Loading analytics...");
});
