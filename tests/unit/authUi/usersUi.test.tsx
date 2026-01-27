import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { UserEditor } from "../../../core/admin/ui/users/UserEditor";
import { UserList } from "../../../core/admin/ui/users/UserList";
import type { RoleSummary } from "../../../core/admin/ui/roles/types";
import type { UserSummary } from "../../../core/admin/ui/users/types";

const roles: RoleSummary[] = [
  { id: "admin", name: "Admin", permissions: ["*"] },
  { id: "editor", name: "Editor", permissions: ["content:read"] },
];

const users: UserSummary[] = [
  {
    id: "admin-user",
    name: "Admin User",
    email: "admin@nextless.com",
    roleIds: ["admin"],
    status: "active",
    lastActive: "Just now",
  },
];

test("UserList highlights protected admin", () => {
  const html = renderToString(
    <UserList
      items={users}
      roles={roles}
      selectedId="admin-user"
      protectedIds={["admin-user"]}
      onSelect={() => undefined}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onResetPassword={() => undefined}
      onDelete={() => undefined}
    />
  );

  expect(html).toContain("Last admin");
});

test("UserEditor renders edit form", () => {
  const html = renderToString(
    <UserEditor
      open
      user={users[0]}
      roles={roles}
      onOpenChange={() => undefined}
      onSave={() => undefined}
    />
  );

  expect(html).toContain("Edit user");
  expect(html).toContain("Assign roles");
});
