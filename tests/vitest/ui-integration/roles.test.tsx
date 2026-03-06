import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { UsersRolesPage } from "../../../core/admin/ui/users/UsersRolesPage";

test("Roles UI respects read-only permissions", () => {
  const html = renderAdminUi(
    <UsersRolesPage permissions={["users:read", "roles:read"]} />
  );

  expect(html).toContain("Read-only access");
});
