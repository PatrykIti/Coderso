import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AuditList } from "../../../core/admin/ui/audit/AuditList";

test("AuditList renders filters and table", () => {
  const html = renderToString(<AuditList />);

  expect(html).toContain("Audit Logs");
  expect(html).toContain("Export CSV");
  expect(html).toContain("Event");
  expect(html).toContain("IP Address");
});
