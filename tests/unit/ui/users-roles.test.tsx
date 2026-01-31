import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { UsersRolesPage } from "../../../core/admin/ui/users/UsersRolesPage";

test("UsersRolesPage renders table and drawer", () => {
  const html = renderToString(<UsersRolesPage />);

  expect(html).toContain("Users &amp; Roles");
  expect(html).toContain("Invite User");
  expect(html).toContain("Loading users and roles");
});
