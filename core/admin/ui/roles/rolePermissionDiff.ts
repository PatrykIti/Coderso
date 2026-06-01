import { classifyRolePermissionChange, normalizeRolePermissionSet } from "./rolePermissionRisk";

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
  requiresConfirmation: boolean;
  fullAccess: boolean;
  fullAccessPromotion: boolean;
  addedHighRiskPermissions: string[];
};

export type RolePermissionDiffSummary = {
  changedRoles: number;
  addedPermissions: number;
  removedPermissions: number;
  highRisk: boolean;
};

export { normalizeRolePermissionSet } from "./rolePermissionRisk";

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
    const risk = classifyRolePermissionChange({
      beforePermissions: role.permissions,
      nextPermissions: draftPermissions[role.id] ?? [],
      allPermissionIds,
    });

    if (added.length === 0 && removed.length === 0) return [];

    return [
      {
        roleId: role.id,
        roleName: role.name,
        added,
        removed,
        highRisk: risk.requiresConfirmation,
        requiresConfirmation: risk.requiresConfirmation,
        fullAccess: risk.fullAccess,
        fullAccessPromotion: risk.fullAccessPromotion,
        addedHighRiskPermissions: risk.addedHighRiskPermissions,
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
