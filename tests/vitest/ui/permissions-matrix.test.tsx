import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { PermissionsMatrixPage } from "../../../core/admin/ui/roles/PermissionsMatrixPage";

test("PermissionsMatrixPage renders matrix grid", () => {
  const html = renderAdminUi(<PermissionsMatrixPage permissions={["roles:read"]} />);

  expect(html).toContain("Permissions Matrix");
  expect(html).toContain("Loading permissions matrix");
});
