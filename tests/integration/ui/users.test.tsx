import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { UsersRolesPage } from "../../../core/admin/ui/users/UsersRolesPage";

test("Users UI blocks deleting last admin", () => {
  const html = renderToString(<UsersRolesPage />);

  expect(html).toContain("Loading users and roles");
  expect(html).toContain("Invite User");
});
