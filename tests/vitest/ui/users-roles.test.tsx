// SSR-path smoke (no window): verifies the no-js render path only. Behavior coverage
// for UsersRolesPage lives in users-roles-users-invite / users-roles-permissions /
// users-page-list-editor-gaps. See TASK-105-08-09 ownership notes.
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
