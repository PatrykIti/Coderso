import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { FormBuilderPage } from "../../../core/admin/ui/forms/FormBuilderPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";


test("FormBuilderPage renders form builder layout", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/forms/form-1">
      <FormBuilderPage />
    </AdminRouterProvider>
  );

  expect(html).toContain("Loading form builder");
  expect(html).toContain("Fields");
  expect(html).toContain("Library");
  expect(html).toContain("Form Settings");
  expect(html).toContain("Action logs");
  expect(html).toContain("Save form");
});
