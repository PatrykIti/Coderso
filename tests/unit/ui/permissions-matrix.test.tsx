import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PermissionsMatrixPage } from "../../../core/admin/ui/roles/PermissionsMatrixPage";

test("PermissionsMatrixPage renders matrix grid", () => {
  const html = renderAdminUi(<PermissionsMatrixPage />);

  expect(html).toContain("Permissions Matrix");
  expect(html).toContain("Loading permissions matrix");
});
