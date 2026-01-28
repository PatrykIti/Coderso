import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { ImportExportPage } from "../../../core/admin/ui/import-export/ImportExportPage";

test("ImportExportPage renders export cards and import dropzone", () => {
  const html = renderToString(<ImportExportPage />);

  expect(html).toContain("Export Data");
  expect(html).toContain("Import Data");
  expect(html).toContain("Drop your files here");
  expect(html).toContain("Recent Imports");
});
