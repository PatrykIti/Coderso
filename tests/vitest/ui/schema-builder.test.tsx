import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { SchemaBuilderPage } from "../../../core/admin/ui/content-types/SchemaBuilderPage";

test("SchemaBuilderPage renders schema builder sections", () => {
  const html = renderAdminUi(<SchemaBuilderPage />);

  expect(html).toContain("Schema Builder");
  expect(html).toContain("Schema Preview");
  expect(html).toContain("Add new field");
});
