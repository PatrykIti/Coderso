import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { FormListPage } from "../../../core/admin/ui/forms/FormListPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";

test("FormListPage renders list skeleton", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/forms">
      <FormListPage />
    </AdminRouterProvider>
  );
  expect(html).toContain("Forms");
  expect(html).toContain("New form");
});
