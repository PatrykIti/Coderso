import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { AccessLogsPage } from "../../../core/admin/ui/security/AccessLogsPage";

test("AccessLogsPage renders filters and table", () => {
  const html = renderToString(<AccessLogsPage />);

  expect(html).toContain("Access Logs");
  expect(html).toContain("Export CSV");
  expect(html).toContain("Search user or IP");
  expect(html).toContain("Loading access logs");
});
