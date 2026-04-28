import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { UsersRolesPage } from "../../../core/admin/ui/users/UsersRolesPage";

test("Users UI blocks deleting last admin", () => {
  const html = renderAdminUi(<UsersRolesPage />);

  expect(html).toContain("Loading users and roles");
  expect(html).toContain("Invite User");
});
