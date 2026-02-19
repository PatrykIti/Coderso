import { expect, test } from "bun:test";

import {
  listPermissionIds,
  listPermissions,
} from "../../../core/services/admin/permissionsCatalog";

test("permissions catalog includes popups and reviews permissions", () => {
  const ids = listPermissionIds();

  expect(ids).toEqual(
    expect.arrayContaining([
      "popups:read",
      "popups:write",
      "reviews:read",
      "reviews:write",
    ])
  );
});

test("listPermissions returns cloned groups", () => {
  const before = listPermissions();
  before[0]?.permissions.push({
    id: "temp:permission",
    label: "Temp",
    description: "Temp",
  });

  const after = listPermissions();
  const allIds = after.flatMap((group) => group.permissions.map((permission) => permission.id));

  expect(allIds).not.toContain("temp:permission");
});
