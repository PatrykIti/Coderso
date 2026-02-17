import { expect, test } from "bun:test";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { UsersRolesPage } from "../../../core/admin/ui/users/UsersRolesPage";

test("Roles UI respects read-only permissions", () => {
  const html = renderAdminUi(
    <UsersRolesPage permissions={["users:read", "roles:read"]} />
  );

  expect(html).toContain("Read-only access");
});
