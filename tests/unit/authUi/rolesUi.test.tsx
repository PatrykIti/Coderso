import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { RoleEditor } from "../../../core/admin/ui/roles/RoleEditor";
import { RoleList } from "../../../core/admin/ui/roles/RoleList";
import type { RoleSummary } from "../../../core/admin/ui/roles/types";

const roles: RoleSummary[] = [
  {
    id: "admin",
    name: "Admin",
    description: "Full access",
    permissions: ["*"],
    system: true,
  },
  {
    id: "editor",
    name: "Editor",
    description: "Content ops",
    permissions: ["content:read"],
  },
];

test("RoleList renders roles", () => {
  const html = renderToString(
    <RoleList
      roles={roles}
      usageCounts={{ admin: 1, editor: 2 }}
      onSelect={() => undefined}
      onEdit={() => undefined}
      onDuplicate={() => undefined}
      onDelete={() => undefined}
    />
  );

  expect(html).toContain("Admin");
  expect(html).toContain("Editor");
});

test("RoleEditor renders permission controls", () => {
  const html = renderToString(
    <RoleEditor
      open
      role={roles[0]}
      onOpenChange={() => undefined}
      onSave={() => undefined}
    />
  );

  expect(html).toContain("Select all");
  expect(html).toContain("Permission scope");
});
