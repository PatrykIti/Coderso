import { expect, test } from "bun:test";

import {
  buildRoleAuditDiff,
  buildRoleAuditSnapshot,
  normalizeRoleAuditPermissionSet,
} from "../../../core/services/admin/roleAuditMetadata";

const allPermissions = [
  "content:read",
  "content:write",
  "roles:read",
  "roles:write",
  "settings:write",
];

test("normalizeRoleAuditPermissionSet expands full access and sorts unique permissions", () => {
  expect(
    normalizeRoleAuditPermissionSet(["content:write", "content:read"], allPermissions)
  ).toEqual(["content:read", "content:write"]);
  expect(normalizeRoleAuditPermissionSet(["*"], allPermissions)).toEqual(allPermissions);
});

test("buildRoleAuditDiff returns sorted added and removed permissions", () => {
  expect(
    buildRoleAuditDiff(
      ["content:read", "roles:read"],
      ["roles:write", "content:write", "content:read"],
      allPermissions
    )
  ).toEqual({
    addedPermissions: ["content:write", "roles:write"],
    removedPermissions: ["roles:read"],
  });
});

test("buildRoleAuditDiff handles full-access grants and duplicate inputs", () => {
  expect(buildRoleAuditDiff(["content:read", "content:read"], ["*"], allPermissions)).toEqual({
    addedPermissions: ["content:write", "roles:read", "roles:write", "settings:write"],
    removedPermissions: [],
  });
});

test("buildRoleAuditSnapshot records redacted permission ids and full-access state", () => {
  expect(buildRoleAuditSnapshot(["roles:write", "content:read", "roles:write"])).toEqual({
    permissions: ["content:read", "roles:write"],
    fullAccess: false,
  });
  expect(buildRoleAuditSnapshot(["*"])).toEqual({
    permissions: ["*"],
    fullAccess: true,
  });
});
