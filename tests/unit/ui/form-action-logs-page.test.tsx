import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { FormActionLogsPage } from "../../../core/admin/ui/forms/FormActionLogsPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

test("FormActionLogsPage renders logs shell", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/coderso/forms/form-1/action-runs">
      <FormActionLogsPage />
    </AdminRouterProvider>
  );

  expect(html).toContain("Form action logs");
  expect(html).toContain("Filter status");
  expect(html).toContain("Loading action runs");
});
