import { isHighRiskPermission } from "./rolePermissionRisk";

export type RolePermissionDiffRole = {
  id: string;
  name: string;
  permissions: string[];
};

export type RolePermissionDiff = {
  roleId: string;
  roleName: string;
  added: string[];
  removed: string[];
  highRisk: boolean;
};

export type RolePermissionDiffSummary = {
  changedRoles: number;
  addedPermissions: number;
  removedPermissions: number;
  highRisk: boolean;
};

const uniqueSorted = (permissions: string[]) =>
  Array.from(new Set(permissions.map((permission) => permission.trim()).filter(Boolean))).sort();

export const normalizeRolePermissionSet = (permissions: string[], allPermissionIds: string[]) => {
  if (permissions.includes("*")) {
    return uniqueSorted(allPermissionIds);
  }
  return uniqueSorted(permissions);
};

export function buildRolePermissionDiffs(
  originalRoles: RolePermissionDiffRole[],
  draftPermissions: Record<string, string[]>,
  allPermissionIds: string[]
): RolePermissionDiff[] {
  return originalRoles.flatMap((role) => {
    if (!Object.prototype.hasOwnProperty.call(draftPermissions, role.id)) {
      return [];
    }

    const before = normalizeRolePermissionSet(role.permissions, allPermissionIds);
    const after = normalizeRolePermissionSet(draftPermissions[role.id] ?? [], allPermissionIds);
    const beforeSet = new Set(before);
    const afterSet = new Set(after);
    const added = after.filter((permission) => !beforeSet.has(permission));
    const removed = before.filter((permission) => !afterSet.has(permission));

    if (added.length === 0 && removed.length === 0) return [];

    return [
      {
        roleId: role.id,
        roleName: role.name,
        added,
        removed,
        highRisk: added.some(isHighRiskPermission),
      },
    ];
  });
}

export function summarizeRolePermissionDiffs(
  diffs: RolePermissionDiff[]
): RolePermissionDiffSummary {
  return diffs.reduce<RolePermissionDiffSummary>(
    (summary, diff) => ({
      changedRoles: summary.changedRoles + 1,
      addedPermissions: summary.addedPermissions + diff.added.length,
      removedPermissions: summary.removedPermissions + diff.removed.length,
      highRisk: summary.highRisk || diff.highRisk,
    }),
    {
      changedRoles: 0,
      addedPermissions: 0,
      removedPermissions: 0,
      highRisk: false,
    }
  );
}
