import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ImportExportPage } from "../../../core/admin/ui/import-export/ImportExportPage";

test("ImportExportPage renders export cards and import dropzone", () => {
  const html = renderAdminUi(<ImportExportPage />);

  expect(html).toContain("Export Data");
  expect(html).toContain("Import Data");
  expect(html).toContain("Drop your files here");
  expect(html).toContain("Recent Imports");
});
