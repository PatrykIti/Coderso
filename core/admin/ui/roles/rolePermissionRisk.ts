const HIGH_RISK_PERMISSIONS = new Set([
  "*",
  "roles:write",
  "sessions:write",
  "api-keys:write",
  "users:write",
  "settings:write",
  "plugins:manage",
  "backups:write",
  "themes:write",
  "solution-kits:write",
  "audit:read",
]);

const uniqueSorted = (permissions: string[]) =>
  Array.from(new Set(permissions.map((permission) => permission.trim()).filter(Boolean))).sort();

export function isHighRiskPermission(permission: string) {
  const normalized = permission.trim();
  return normalized === "*" || normalized.endsWith(":*") || HIGH_RISK_PERMISSIONS.has(normalized);
}

export function hasHighRiskPermissions(permissions: string[]) {
  return permissions.some(isHighRiskPermission);
}

export const normalizeRolePermissionSet = (permissions: string[], allPermissionIds: string[]) => {
  if (permissions.includes("*")) {
    return uniqueSorted(allPermissionIds);
  }
  return uniqueSorted(permissions);
};

export function hasFullAccessPermissionSet(permissions: string[], allPermissionIds: string[]) {
  if (permissions.includes("*")) return true;
  const normalized = new Set(normalizeRolePermissionSet(permissions, allPermissionIds));
  return (
    allPermissionIds.length > 0 &&
    allPermissionIds.every((permission) => normalized.has(permission))
  );
}

export type RolePermissionChangeRisk = {
  requiresConfirmation: boolean;
  fullAccess: boolean;
  fullAccessPromotion: boolean;
  addedHighRiskPermissions: string[];
};

export function classifyRolePermissionChange({
  beforePermissions,
  nextPermissions,
  allPermissionIds,
}: {
  beforePermissions: string[];
  nextPermissions: string[];
  allPermissionIds: string[];
}): RolePermissionChangeRisk {
  const before = normalizeRolePermissionSet(beforePermissions, allPermissionIds);
  const next = normalizeRolePermissionSet(nextPermissions, allPermissionIds);
  const beforeSet = new Set(before);
  const addedHighRiskPermissions = next
    .filter((permission) => !beforeSet.has(permission))
    .filter(isHighRiskPermission);
  const previousFullAccess = hasFullAccessPermissionSet(beforePermissions, allPermissionIds);
  const fullAccess = hasFullAccessPermissionSet(nextPermissions, allPermissionIds);
  const fullAccessPromotion = fullAccess && !previousFullAccess;

  return {
    requiresConfirmation: fullAccessPromotion || addedHighRiskPermissions.length > 0,
    fullAccess,
    fullAccessPromotion,
    addedHighRiskPermissions,
  };
}
