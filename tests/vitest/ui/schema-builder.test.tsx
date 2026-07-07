import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SchemaBuilderPage } from "../../../core/admin/ui/content-types/SchemaBuilderPage";

test("SchemaBuilderPage renders schema builder sections", () => {
  const html = renderAdminUi(<SchemaBuilderPage />);

  expect(html).toContain("Schema Builder");
  // Schema JSON preview is opt-in behind a toolbar toggle: the docked preview
  // panel ("Schema Preview" heading) is NOT rendered until the toggle is on.
  expect(html).not.toContain("Schema Preview");
  expect(html).toContain("Add new field");
});
