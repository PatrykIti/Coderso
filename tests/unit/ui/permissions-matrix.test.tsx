import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { PermissionsMatrixPage } from "../../../core/admin/ui/roles/PermissionsMatrixPage";

test("PermissionsMatrixPage renders matrix grid", () => {
  const html = renderToString(<PermissionsMatrixPage />);

  expect(html).toContain("Permissions Matrix");
  expect(html).toContain("Permission Name");
  expect(html).toContain("Create Pages");
  expect(html).toContain("Admin");
});
