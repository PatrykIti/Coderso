import { describe, expect, test } from "vitest";

import {
  buildRolePermissionDiffs,
  normalizeRolePermissionSet,
  summarizeRolePermissionDiffs,
} from "../../../core/admin/ui/roles/rolePermissionDiff";

const allPermissions = [
  "content:read",
  "content:write",
  "roles:read",
  "roles:write",
  "settings:write",
];

describe("role permission diff helpers", () => {
  test("normalizes full access to the catalog and sorts unique permissions", () => {
    expect(
      normalizeRolePermissionSet(["content:write", "content:read", "content:read"], allPermissions)
    ).toEqual(["content:read", "content:write"]);
    expect(normalizeRolePermissionSet(["*"], allPermissions)).toEqual(allPermissions);
  });

  test("builds sorted add and remove diffs per role", () => {
    const diffs = buildRolePermissionDiffs(
      [
        { id: "editor", name: "Editor", permissions: ["content:read"] },
        { id: "admin", name: "Admin", permissions: ["*"] },
      ],
      {
        editor: ["content:write", "content:read", "roles:write"],
        admin: ["content:read", "content:write"],
      },
      allPermissions
    );

    expect(diffs).toEqual([
      {
        roleId: "editor",
        roleName: "Editor",
        added: ["content:write", "roles:write"],
        removed: [],
        highRisk: true,
        requiresConfirmation: true,
        fullAccess: false,
        fullAccessPromotion: false,
        addedHighRiskPermissions: ["roles:write"],
      },
      {
        roleId: "admin",
        roleName: "Admin",
        added: [],
        removed: ["roles:read", "roles:write", "settings:write"],
        highRisk: false,
        requiresConfirmation: false,
        fullAccess: false,
        fullAccessPromotion: false,
        addedHighRiskPermissions: [],
      },
    ]);
  });

  test("omits no-op roles and unknown draft role ids", () => {
    expect(
      buildRolePermissionDiffs(
        [{ id: "viewer", name: "Viewer", permissions: ["content:read"] }],
        {
          viewer: ["content:read"],
          deleted: ["roles:write"],
        },
        allPermissions
      )
    ).toEqual([]);
  });

  test("treats missing draft role entries as unchanged but keeps explicit empty drafts", () => {
    expect(
      buildRolePermissionDiffs(
        [
          { id: "viewer", name: "Viewer", permissions: ["content:read"] },
          { id: "editor", name: "Editor", permissions: ["content:read"] },
        ],
        {
          editor: [],
        },
        allPermissions
      )
    ).toEqual([
      {
        roleId: "editor",
        roleName: "Editor",
        added: [],
        removed: ["content:read"],
        highRisk: false,
        requiresConfirmation: false,
        fullAccess: false,
        fullAccessPromotion: false,
        addedHighRiskPermissions: [],
      },
    ]);
  });

  test("marks full-access promotions as requiring confirmation", () => {
    expect(
      buildRolePermissionDiffs(
        [{ id: "viewer", name: "Viewer", permissions: ["content:read"] }],
        {
          viewer: allPermissions,
        },
        allPermissions
      )
    ).toEqual([
      {
        roleId: "viewer",
        roleName: "Viewer",
        added: ["content:write", "roles:read", "roles:write", "settings:write"],
        removed: [],
        highRisk: true,
        requiresConfirmation: true,
        fullAccess: true,
        fullAccessPromotion: true,
        addedHighRiskPermissions: ["roles:write", "settings:write"],
      },
    ]);
  });

  test("summarizes changed roles, permission counts, and high-risk grants", () => {
    const diffs = buildRolePermissionDiffs(
      [
        { id: "editor", name: "Editor", permissions: ["content:read"] },
        { id: "settings", name: "Settings", permissions: ["settings:write"] },
      ],
      {
        editor: ["content:read", "roles:write"],
        settings: [],
      },
      allPermissions
    );

    expect(summarizeRolePermissionDiffs(diffs)).toEqual({
      changedRoles: 2,
      addedPermissions: 1,
      removedPermissions: 1,
      highRisk: true,
    });
  });
});
