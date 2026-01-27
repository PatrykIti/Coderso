import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { UsersRolesPage } from "../../../core/admin/ui/users/UsersRolesPage";

test("Roles UI respects read-only permissions", () => {
  const html = renderToString(
    <UsersRolesPage permissions={["users:read", "roles:read"]} />
  );

  expect(html).toContain("Read-only access");
});
