import { expect, test } from "bun:test";
import {
  buildAdminPermissionSnapshotFromRoles,
  hasPermission,
  mergePermissions,
} from "../../../core/services/auth/roleService";

test("mergePermissions merges unique values", () => {
  const merged = mergePermissions([
    ["content:read", "content:write"],
    ["content:write", "users:read"],
  ]);

  expect(merged).toEqual(expect.arrayContaining(["content:read", "content:write", "users:read"]));
});

test("hasPermission respects wildcard", () => {
  expect(hasPermission(["*"], "content:read")).toBe(true);
  expect(hasPermission(["content:read"], "content:read")).toBe(true);
  expect(hasPermission(["content:read"], "content:write")).toBe(false);
});

test("buildAdminPermissionSnapshotFromRoles redacts roles and normalizes permissions", () => {
  const snapshot = buildAdminPermissionSnapshotFromRoles([
    {
      id: "role-2",
      name: "Content Editors",
      permissions: ["content:write", "content:read", "content:write", 123],
    },
    {
      id: "role-1",
      name: "Full Access",
      permissions: ["*"],
    },
    {
      id: "role-3",
      name: "Broken Permissions",
      permissions: "settings:read",
    },
  ]);

  expect(snapshot.permissions).toEqual(["*", "content:read", "content:write"]);
  expect(snapshot.roles).toEqual([
    { id: "role-3", slug: "broken-permissions", name: "Broken Permissions" },
    { id: "role-2", slug: "content-editors", name: "Content Editors" },
    { id: "role-1", slug: "full-access", name: "Full Access" },
  ]);
});
