import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AccessLogsPage } from "../../../core/admin/ui/security/AccessLogsPage";

test("AccessLogsPage renders filters and table", () => {
  const html = renderAdminUi(<AccessLogsPage />);

  expect(html).toContain("Access Logs");
  expect(html).toContain("Export CSV");
  expect(html).toContain("Search user or IP");
  expect(html).toContain("Loading access logs");
});
