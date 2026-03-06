import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AuditList } from "../../../core/admin/ui/audit/AuditList";

test("AuditList renders filters and table", () => {
  const html = renderAdminUi(<AuditList />);

  expect(html).toContain("Audit Logs");
  expect(html).toContain("Export CSV");
  expect(html).toContain("Loading audit logs");
});
