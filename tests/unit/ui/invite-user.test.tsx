import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import type { RoleSummary } from "../../../core/admin/ui/roles/types";
import { InviteUserDialog } from "../../../core/admin/ui/users/InviteUserDialog";

const roles: RoleSummary[] = [
  {
    id: "editor",
    name: "Editor",
    description: "Content and media management permissions.",
    permissions: ["content:write", "content:publish", "media:write"],
  },
];

test("InviteUserDialog renders form fields and preview", () => {
  const html = renderToString(
    <InviteUserDialog open roles={roles} onOpenChange={() => undefined} />
  );

  expect(html).toContain("Invite User");
  expect(html).toContain("User Details");
  expect(html).toContain("Workspace Role");
  expect(html).toContain("Permissions Preview");
  expect(html).toContain("Send Invitation");
});
