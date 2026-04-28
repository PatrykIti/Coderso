import { expect, test } from "vitest";

import {
  listPermissionIds,
  listPermissions,
} from "../../../core/services/admin/permissionsCatalog";

test("permissions catalog includes coderso module permissions", () => {
  const ids = listPermissionIds();

  expect(ids).toEqual(
    expect.arrayContaining([
      "popups:read",
      "popups:write",
      "reviews:read",
      "reviews:write",
      "solution-kits:read",
      "solution-kits:write",
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
  const allIds = after.flatMap((group) =>
    group.permissions.map((permission) => permission.id)
  );

  expect(allIds).not.toContain("temp:permission");
});
