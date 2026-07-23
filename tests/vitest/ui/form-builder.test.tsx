import React from "react";
import { expect, test } from "vitest";
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
  // "Fields" is now the single EditorRailGroup library heading (no Fields/Library tab pair).
  expect(html).toContain("Fields");
  expect(html).toContain("Form Settings");
  expect(html).toContain("Action logs");
  expect(html).toContain("Save");
  // Deleted non-prototype chrome must be gone (FieldLibrary header + footer button).
  expect(html).not.toContain("Fields Library");
  expect(html).not.toContain("Advanced Fields");
});
