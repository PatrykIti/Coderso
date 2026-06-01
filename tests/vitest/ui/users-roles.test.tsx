import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { UsersRolesPage } from "../../../core/admin/ui/users/UsersRolesPage";

test("UsersRolesPage renders table and drawer", () => {
  const html = renderAdminUi(
    <UsersRolesPage permissions={["users:read", "users:write", "roles:read", "roles:write"]} />
  );

  expect(html).toContain("Users &amp; Roles");
  expect(html).toContain("Invite User");
  expect(html).toContain("Loading users and roles");
});
