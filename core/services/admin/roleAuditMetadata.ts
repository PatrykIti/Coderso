export type RoleAuditPermissionDiff = {
  addedPermissions: string[];
  removedPermissions: string[];
};

const uniqueSorted = (permissions: string[]) =>
  Array.from(new Set(permissions.map((permission) => permission.trim()).filter(Boolean))).sort();

export const normalizeRoleAuditPermissionSet = (
  permissions: string[],
  allPermissionIds: string[]
) => {
  if (permissions.includes("*")) {
    return uniqueSorted(allPermissionIds);
  }
  return uniqueSorted(permissions);
};

export function buildRoleAuditDiff(
  beforePermissions: string[],
  afterPermissions: string[],
  allPermissionIds: string[]
): RoleAuditPermissionDiff {
  const before = normalizeRoleAuditPermissionSet(beforePermissions, allPermissionIds);
  const after = normalizeRoleAuditPermissionSet(afterPermissions, allPermissionIds);
  const beforeSet = new Set(before);
  const afterSet = new Set(after);

  return {
    addedPermissions: after.filter((permission) => !beforeSet.has(permission)),
    removedPermissions: before.filter((permission) => !afterSet.has(permission)),
  };
}

export function buildRoleAuditSnapshot(permissions: string[]) {
  // Snapshots preserve the stored grant shape; diffs expand full access for reviewability.
  const normalized = uniqueSorted(permissions);
  return {
    permissions: normalized,
    fullAccess: normalized.includes("*"),
  };
}
